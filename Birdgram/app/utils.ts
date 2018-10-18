import Chance from 'chance';
import { SQLiteDatabase, ResultSet } from 'react-native-sqlite-storage';

// Export global:any, which would have otherwise come from DOM but we disable DOM for react-native (tsconfig -> "lib")
// @ts-ignore
export const global: any = window.global;

// Instantiate a global Chance
export const chance = new Chance();

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

export function querySql(
  db: SQLiteDatabase,
  sql: string,
  params?: any[],
): <X>(onResults: (results: ResultSet) => X) => Promise<X> {
  return onResults => new Promise((resolve, reject) => {
    // TODO How to also `await db.transaction`? (Do we even want to?)
    db.transaction(tx => {
      tx.executeSql( // [How do you use the Promise version of tx.executeSql without jumping out of the tx?]
        sql,
        params || [],
        (tx, results) => resolve(onResults(results)),
        e => reject(e),
      );
    });
  });
}