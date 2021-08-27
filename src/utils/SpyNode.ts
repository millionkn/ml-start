const spySym = Symbol();
export type SpyNode<T, R> = T & {
  [key in keyof T]: SpyNode<T[key], R>
} & {
  [spySym]: R
}

export function createSpyNode<T, K>(proxyTarget: K, init: T, fun: (key: string, pre: T) => T): SpyNode<K, T> {
  const cache = new Map<string, SpyNode<any, any>>();
  return new Proxy<any>(proxyTarget, {
    get(target, key) {
      if (key === spySym) { return init; }
      if (typeof key === 'symbol') { throw new Error('cant use symbol') }
      if (typeof key === 'number') { throw new Error('cant use number') }
      if (!cache.has(key)) {
        cache.set(key, createSpyNode(target[key], fun(key, init), fun))
      }
      return cache.get(key)
    }
  })
}

export function resolveSpy<R>(sypNode: SpyNode<{}, R>): R {
  return sypNode[spySym]
}