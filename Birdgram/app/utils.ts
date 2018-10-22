import Chance from 'chance';

// Export global:any, which would have otherwise come from DOM but we disable DOM for react-native (tsconfig -> "lib")
//  - Fallback to a mock `{}` for release builds, which run in jsc instead of chrome v8 and don't have window.global
//  - https://facebook.github.io/react-native/docs/javascript-environment
// @ts-ignore
export const global: any = window.global || {};

// Instantiate a global Chance
export const chance = new Chance();

//
// Promise
//

// TODO How to polyfill Promise.finally in react-native?
//  - Maybe: https://github.com/facebook/fbjs/pull/293
export async function finallyAsync<X>(p: Promise<X>, f: () => void): Promise<X> {
  try {
    return await p;
  } finally {
    f();
  }
}

//
// Utils
//

// `X0 extends X` so that x0 can't (quietly) generalize the type of the case patterns (e.g. to include null)
//  - e.g. fail on `match(X | null, ...)` if the case patterns don't include null
export function match<X, X0 extends X, Y>(x0: X0, ...cases: [X, Y][]): Y {
  for (let [x, y] of cases) {
    if (x0 === x) return y;
  }
  throw new Error(`No cases matched: ${x0} not in [${cases.map(([x, y]) => x)}]`);
}
