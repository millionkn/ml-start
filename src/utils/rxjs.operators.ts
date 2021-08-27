import { GroupedObservable, mapTo, merge, mergeMap, Observable, OperatorFunction, shareReplay, startWith, takeLast, takeUntil, takeWhile, tap } from "rxjs";

export function waitComplate(ob$: Observable<any>): Observable<null> {
  return ob$.pipe(
    startWith(null),
    takeLast(1),
    mapTo(null),
  )
}

export function cacheScan<T, R, K>(
  element: (ob$: GroupedObservable<K, T>) => Observable<R>,
): OperatorFunction<GroupedObservable<K, T>, Map<K, R>> {
  return (ob$) => {
    const cache = new Map<K, R>();
    return ob$.pipe(
      mergeMap((gob$) => element(gob$).pipe(
        (ob$) => merge(
          ob$.pipe(tap((input) => cache.set(gob$.key, input))),
          waitComplate(ob$).pipe(tap(() => cache.delete(gob$.key))),
        ),
      )),
      mapTo(cache),
    )
  }
}

export function complateIfEmpty<T>(): OperatorFunction<T | null | undefined, T> {
  return (ob$) => ob$.pipe(takeWhile((value) => value !== null && value !== undefined)) as any
}

export function publicReplay<T>(): OperatorFunction<T, T> {
  return (ob$) => {
    const result = ob$.pipe(shareReplay(1));
    result.subscribe({ error: () => { } });
    return result;
  }
}

export function startWith$<T>(cache$: Observable<T>): OperatorFunction<T, T> {
  return (ob$) => merge(
    ob$,
    cache$.pipe(takeUntil(ob$)),
  )
}