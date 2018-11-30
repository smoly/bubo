import Foundation
import Surge

// Functions ported from python numpy
public enum np {

  public static func zeros(_ shape: Int) -> [Float] {
    return Array(repeating: 0, count: shape)
  }

  public static func zeros(_ shape: (Int, Int)) -> Matrix<Float> {
    return Matrix(rows: shape.0, columns: shape.1, repeatedValue: 0)
  }

  public static func arange(_ stop: Int) -> [Float] {
    return Array(0..<stop).map { Float($0) }
  }

  public static func linspace(_ start: Float, _ stop: Float, _ num: Int) -> [Float] {
    return Array(stride(from: start, through: stop, by: (stop - start) / Float(num - 1)))
  }

  public static func diff(_ xs: [Float]) -> [Float] {
    return Array(xs.slice(from: 1)) .- Array(xs.slice(to: -1))
  }

  // np.subtract.outer
  public static func subtract_outer(_ xs: [Float], _ ys: [Float]) -> Matrix<Float> {
    return op_outer(xs, ys) { $0 - $1 }
  }

  // For np.<op>.outer
  public static func op_outer(_ xs: [Float], _ ys: [Float], _ f: (Float, Float) -> Float) -> Matrix<Float> {
    var Z = Matrix(rows: xs.count, columns: ys.count, repeatedValue: Float.nan)
    for r in 0..<xs.count {
      for c in 0..<ys.count {
        Z[r, c] = f(xs[r], ys[c])
      }
    }
    return Z
  }

  public static func clip(_ X: Matrix<Float>, _ a: Float?, _ b: Float?) -> Matrix<Float> {
    return X.vect { clip($0, a, b) }
  }

  public static func clip(_ xs: [Float], _ a: Float?, _ b: Float?) -> [Float] {
    return Surge.clip(
      xs,
      low:  a ?? -Float.infinity,
      high: b ?? Float.infinity
    )
  }

  public static func minimum(_ xs: [Float], _ ys: [Float]) -> [Float] {
    precondition(xs.count == ys.count, "Collections must have the same size")
    return withUnsafeMemory(xs, ys) { xsm, ysm in
      var zs = Array<Float>(repeating: Float.nan, count: numericCast(xs.count))
      zs.withUnsafeMutableBufferPointer { zsp in
        vDSP_vmin(
          xsm.pointer, numericCast(xsm.stride), ysm.pointer, numericCast(ysm.stride), zsp.baseAddress!, 1, numericCast(xsm.count)
        )
      }
      return zs
    }
  }

  public static func maximum(_ xs: [Float], _ ys: [Float]) -> [Float] {
    precondition(xs.count == ys.count, "Collections must have the same size")
    return withUnsafeMemory(xs, ys) { xsm, ysm in
      var zs = Array<Float>(repeating: Float.nan, count: numericCast(xs.count))
      zs.withUnsafeMutableBufferPointer { zsp in
        vDSP_vmax(
          xsm.pointer, numericCast(xsm.stride), ysm.pointer, numericCast(ysm.stride), zsp.baseAddress!, 1, numericCast(xsm.count)
        )
      }
      return zs
    }
  }

  // TODO How to vectorize?
  public static func minimum(_ xs: [Float], _ y: Float) -> [Float] {
    var zs = Array<Float>(repeating: Float.nan, count: numericCast(xs.count))
    for i in 0..<xs.count {
      zs[i] = min(xs[i], y)
    }
    return zs
  }

  // TODO How to vectorize?
  public static func maximum(_ xs: [Float], _ y: Float) -> [Float] {
    var zs = Array<Float>(repeating: Float.nan, count: numericCast(xs.count))
    for i in 0..<xs.count {
      zs[i] = max(xs[i], y)
    }
    return zs
  }

  public static func broadcast_to(row: [Float], _ shape: (Int, Int)) -> Matrix<Float> {
    let (rows, columns) = shape
    precondition(row.count == columns)
    return Matrix(
      rows: rows,
      columns: columns,
      grid: Array(Array(repeating: row, count: rows).joined()) // grid is row major
    )
  }

  public static func broadcast_to(column: [Float], _ shape: (Int, Int)) -> Matrix<Float> {
    let (rows, columns) = shape
    precondition(column.count == rows)
    return transpose(broadcast_to(row: column, (columns, rows)))
  }

  // In the spirit of np.testing.assert_almost_equal(xs, np.zeros(len(xs)))
  public static func almost_zero(_ xs: [Float], tol: Float = 1e-7) -> Bool {
    return almost_equal(xs, zeros(xs.count), tol: tol)
  }

  // In the spirit of np.testing.assert_almost_equal(xs, ys)
  public static func almost_equal(_ xs: [Float], _ ys: [Float], tol: Float = 1e-7) -> Bool {
    return (xs .- ys).allSatisfy { abs($0) < tol }
  }

  public enum random {

    public static func rand(_ n: Int) -> [Float] {
      return (0..<n).map { _ in Float.random(in: 0..<1) }
    }

    public static func rand(_ rows: Int, _ columns: Int) -> Matrix<Float> {
      return Matrix(rows: rows, columns: columns, grid: rand(rows * columns))
    }

  }

  public enum fft {
    // vDSP docs advise to prefer vDSP_DFT_* over vDSP_fft_*
    //  - "Use the DFT routines instead of these wherever possible"
    //  - https://developer.apple.com/documentation/accelerate/vdsp/fast_fourier_transforms

    // Like py np.abs(np.rfft(xs))
    //  - Includes abs() because I don't have a great representation of complex numbers
    //  - Based on:
    //    - https://github.com/dboyliao/NumSwift/blob/master/NumSwift/Source/FFT.swift
    //    - https://forum.openframeworks.cc/t/a-guide-to-speeding-up-your-of-app-with-accelerate-osx-ios/10560
    public static func abs_rfft(_ xs: [Float]) -> [Float] {
      // print("rfft") // XXX Debug

      let n  = xs.count
      let nf = Int(n / 2) + 1

      // Checks
      //  - https://developer.apple.com/documentation/accelerate/1449930-vdsp_dct_createsetup
      let k = Int(log2(Double(n)))
      precondition(
        k >= 4 && [1, 3, 5, 15].contains(where: { f in n == 1 << k * f }),
        "n[\(n)] must be 2**k * f, where k ≥ 4 and f in [1,3,5,15]"
      )

      // Setup DFT
      //  - TODO Meaningfully faster to reuse setup across calls?
      guard let setup = vDSP_DFT_zop_CreateSetup(
        nil,                       // To reuse previous setup (optional)
        vDSP_Length(n),            // (vDSP_Length = UInt)
        vDSP_DFT_Direction.FORWARD // vDSP_DFT_FORWARD | vDSP_DFT_INVERSE
      ) else {
        assertionFailure("Failed to vDSP_DFT_zop_CreateSetup")
        return [Float](repeating: .nan, count: nf) // Return for Release, which omits assert [NOTE but not precondition]
      }
      defer {
        vDSP_DFT_DestroySetup(setup)
      }

      // Compute DFT (like np.fft.fft)
      let xsReal = xs
      let xsImag = [Float](repeating: 0,    count: n)
      var fsReal = [Float](repeating: .nan, count: n)
      var fsImag = [Float](repeating: .nan, count: n)
      vDSP_DFT_Execute(setup, xsReal, xsImag, &fsReal, &fsImag)
      // sig(" fsReal ", fsReal) // XXX Debug
      // sig(" fsImag ", fsImag) // XXX Debug

      // Compute complex magnitude (like np.abs)
      let fs = sqrt(pow(fsReal, 2) .+ pow(fsImag, 2))
      // sig(" fs     ", fs) // XXX Debug

      // Drop symmetric values (b/c real-to-real)
      return fs.slice(from: 0, to: nf)

    }

    // Based on:
    //  - https://developer.apple.com/documentation/accelerate/vdsp/discrete_fourier_transforms/signal_extraction_from_noise
    //  - TODO Untested!
    public static func dct(_ xs: [Float], _ type: vDSP_DCT_Type) -> [Float] {

      // Setup DCT
      let n = xs.count // Must be f*2**n, where f in [1,3,5,15] and n≥4 [https://developer.apple.com/documentation/accelerate/1449930-vdsp_dct_createsetup]
      guard let setup = vDSP_DCT_CreateSetup(
        nil,            // To reuse previous setup (optional)
        vDSP_Length(n), // (vDSP_Length = UInt)
        type            // Supports .II/.III/.IV
      ) else {
        assertionFailure("Failed to vDSP_DCT_CreateSetup")
        return [Float](repeating: .nan, count: n) // Return for Release, which omits assert [NOTE but not precondition]
      }
      defer {
        vDSP_DFT_DestroySetup(setup)
      }

      // Compute DCT
      var fs = [Float](repeating: .nan, count: n)
      vDSP_DCT_Execute(setup, xs, &fs)

      return fs
    }

  }

}

// XXX Debug
private func sig(_ name: String, _ xs: [Float], limit: Int? = 7) {
  print(String(format: "%@ %3d %@", name, xs.count, show(xs.slice(to: limit), prec: 3)))
}
