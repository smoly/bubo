// XXX Debug Bubo-macos
public func foo_bubo() -> Int { return 0 }

import Foundation

// Based on https://gist.github.com/nicklockwood/c5f075dd9e714ad8524859c6bd46069f
public enum AppError: Error, CustomStringConvertible {

  case message(String)
  case generic(Error)

  public init(_ message: String) {
    self = .message(message)
  }

  public init(_ error: Error) {
    if let error = error as? AppError {
      self = error
    } else {
      self = .generic(error)
    }
  }

  public var description: String {
    switch self {
      case let AppError.message(message): return message
      case let AppError.generic(error):   return (error as CustomStringConvertible).description
    }
  }

}

// Generic <X> i/o Never because Never isn't bottom [https://forums.swift.org/t/pitch-never-as-a-bottom-type/5920]
public func throw_<X>(_ e: Error) throws -> X {
  throw e
}

public func checkStatus(_ status: OSStatus) throws -> Void {
  if (status != 0) {
    throw NSError(domain: NSOSStatusErrorDomain, code: Int(status))
  }
}

public func pathJoin(_ paths: String...) -> String {
  return paths.joined(separator: "/")
}

public func / (x: String, y: String) -> String {
  return pathJoin(x, y)
}

public func pathDirname(_ path: String) -> String {
  return (path as NSString).deletingLastPathComponent
}

public func pathBasename(_ path: String) -> String {
  return (path as NSString).lastPathComponent
}

public func pathSplitExt(_ path: String) -> (String, String) {
  return (
    (path as NSString).deletingPathExtension,
    (path as NSString).pathExtension
  )
}

public func documentsDirectory() -> String {
  // https://stackoverflow.com/questions/24055146/how-to-find-nsdocumentdirectory-in-swift
  return NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
}

extension Comparable {

  public func clamped(_ lo: Self, _ hi: Self) -> Self {
    return min(max(self, lo), hi)
  }

}

extension Collection {

  public func flatMap(_ xs: Self, _ f: (Element) -> Self) -> FlattenCollection<[Self]> {
    return xs.map(f).joined()
  }

}

extension String {

  // https://stackoverflow.com/a/46133083/397334
  subscript(_ range: CountableRange<Int>) -> String {
    let a = index(startIndex, offsetBy: max(0, range.lowerBound))
    let b = index(startIndex, offsetBy: min(self.count, range.upperBound))
    return String(self[a..<b])
  }

  // Less fussy alternative to subscript[RangeExpression]
  //  - Ignores out-of-range indices (like py) i/o fatal-ing
  //  - Returns eager Collection i/o potentially lazy SubSequence (e.g. xs.slice(...) i/o Array(xs.slice(...)))
  //  - TODO Move up to Collection: how to generically init(...) at the end?
  public func slice(from: Int? = nil, to: Int? = nil) -> String {
    // precondition(to == nil || through == nil, "Can't specify both to[\(to)] and through[\(through)]") // TODO through:
    let (startIndex, endIndex) = (0, count)
    var a = from ?? startIndex
    var b = to   ?? endIndex
    if a < 0 { a = count + a }
    if b < 0 { b = count + b }
    a = a.clamped(startIndex, endIndex)
    b = b.clamped(a,          endIndex)
    return String(self[a..<b])
  }

}

extension Array {

  public func chunked(_ chunkSize: Int) -> [[Element]] {
    return stride(from: 0, to: count, by: chunkSize).map {
      Array(self[$0 ..< Swift.min($0 + chunkSize, count)])
    }
  }

  public func repeated(_ n: Int) -> [Element] {
    return [Element]([Array](repeating: self, count: n).joined())
  }

  // Less fussy alternative to subscript[RangeExpression]
  //  - Ignores out-of-range indices (like py) i/o fatal-ing
  //  - Returns eager Collection i/o potentially lazy SubSequence (e.g. xs.slice(...) i/o Array(xs.slice(...)))
  //  - Impose `Index == Int` constraint so we don't have to figure out how to do non-crashing arithmetic with .formIndex
  //  - TODO Move up to Collection: how to generically init(...) at the end?
  public func slice(from: Index? = nil, to: Index? = nil) -> Array {
    // precondition(to == nil || through == nil, "Can't specify both to[\(to)] and through[\(through)]") // TODO through:
    var a = from ?? startIndex
    var b = to   ?? endIndex
    if a < 0 { a = count + a }
    if b < 0 { b = count + b }
    a = a.clamped(startIndex, endIndex)
    b = b.clamped(a,          endIndex)
    return Array(self[a..<b])
  }

}

extension ArraySlice {

  public func chunked(_ chunkSize: Int) -> [[Element]] {
    return stride(from: 0, to: count, by: chunkSize).map {
      Array(self[$0 ..< Swift.min($0 + chunkSize, count)])
    }
  }

}

extension StringProtocol {

  public func padLeft(_ n: Int, _ element: Element = " ") -> String {
    return String(repeatElement(element, count: Swift.max(0, n - count))) + suffix(Swift.max(count, count - n))
  }

  public func padRight(_ n: Int, _ element: Element = " ") -> String {
    return suffix(Swift.max(count, count - n)) + String(repeatElement(element, count: Swift.max(0, n - count)))
  }

}

public func nowSeconds() -> Double {
  return Double(DispatchTime.now().uptimeNanoseconds) / 1e9
}

public class Timer {

  var startTime: Double = nowSeconds()

  public init() {}

  public func time() -> Double {
    return nowSeconds() - startTime
  }

  public func reset() -> Void {
    startTime = nowSeconds()
  }

  public func lap() -> Double {
    let _time = time()
    reset()
    return _time
  }

}
