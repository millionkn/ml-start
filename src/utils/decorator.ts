import "reflect-metadata";

export class DecoratorError extends Error { }

const sym = Symbol();

export type ParamDecorator<R> = {
  [sym]: {
    meta: R,
    type: 'param',
  }
  (prototype: any, key: string, index: number): void
}
export type KeyDecorator<R> = {
  [sym]: {
    meta: R,
    type: 'key',
  }
  (prototype: any, key: string): void
}
export type KlassDecorator<R> = {
  [sym]: {
    meta: R,
    type: 'klass',
  }
  (prototype: any): void
}

type ParamDecoratorFactory<R> = (...args: any[]) => ParamDecorator<R>
type KeyDecoratorFactory<R> = (...args: any[]) => KeyDecorator<R>
type KlassDecoratorFactory<R> = (...args: any[]) => KlassDecorator<R>

const getFactorySym = ((store) => {
  return (factory: Function) => {
    if (!store.has(factory)) { store.set(factory, Symbol()) }
    return store.get(factory)!;
  }
})(new Map<Function, symbol>())

const getDecoratedParamsSym = ((store) => {
  return (factory: Function) => {
    if (!store.has(factory)) { store.set(factory, Symbol()) }
    return store.get(factory)!;
  }
})(new Map<Function, symbol>())

const getDecoratedKeysSym = ((store) => {
  return (factory: Function) => {
    if (!store.has(factory)) { store.set(factory, Symbol()) }
    return store.get(factory)!;
  }
})(new Map<Function, symbol>())

const getDecoratedKlassSet = ((store) => {
  return (factory: Function) => {
    if (!store.has(factory)) { store.set(factory, new Set()) }
    return store.get(factory)!;
  }
})(new Map<Function, Set<Function>>())

export function useParamDecorator<R>(
  factory: Function,
  metaFun: (prototype: any, key: string, index: number) => R,
): ParamDecorator<R> {
  const factorySym = getFactorySym(factory);
  return ((prototype: any, key: string, index: number) => {
    const handler = prototype[key];
    const meta = metaFun(prototype, key, index);
    if (!Reflect.hasOwnMetadata(factorySym, handler)) {
      Reflect.defineMetadata(factorySym, new Map(), handler);
    }
    const store = Reflect.getMetadata(factorySym, handler);
    store.set(index, [...(store.get(index) || []), meta])
  }) as ParamDecorator<R>;
}

export function useKeyDecorator<R>(
  factory: Function,
  metaFun: (prototype: any, key: string) => R,
): KeyDecorator<R> {
  const factorySym = getFactorySym(factory);
  const decoratedKeysSym = getDecoratedKeysSym(factory);
  return ((prototype: any, key: string) => {
    const meta = metaFun(prototype, key);
    if (!Reflect.hasOwnMetadata(decoratedKeysSym, prototype)) {
      Reflect.defineMetadata(decoratedKeysSym, [], prototype);
    }
    Reflect.getMetadata(decoratedKeysSym, prototype).push(key);
    if (!Reflect.hasOwnMetadata(factorySym, prototype, key)) {
      Reflect.defineMetadata(factorySym, [], prototype, key);
    }
    Reflect.getMetadata(factorySym, prototype, key).push(meta);
  }) as KeyDecorator<R>;
}

export function useKlassDecorator<R>(
  factory: Function,
  metaFun: (prototype: any) => R,
): KlassDecorator<R> {
  const factorySym = getFactorySym(factory)
  return ((klass: Function) => {
    const prototype = klass.prototype;
    const meta = metaFun(prototype);
    if (!Reflect.hasOwnMetadata(factorySym, prototype)) {
      Reflect.defineMetadata(factorySym, [], prototype);
    }
    Reflect.getMetadata(factorySym, prototype).push(meta);
    getDecoratedKlassSet(factory).add(klass);
  }) as KlassDecorator<R>
}

export function loadDecoratorData<R>(factory: KlassDecoratorFactory<R>, klass: Function): R;
export function loadDecoratorData<R>(factory: KeyDecoratorFactory<R>, klass: Function, key: string): R;
export function loadDecoratorData<R>(factory: ParamDecoratorFactory<R>, klass: Function, key: string, index: number): R;
export function loadDecoratorData(factory: any, klass: Function, key?: string, index?: number): any {
  if (index !== undefined && key !== undefined) {
    const arr = loadDecoratorDataArr(factory, klass, key, index);
    if (arr.length === 0) { throw new Error(`${klass.name}#${key}#${index}未被${factory.name}修饰`) }
    return arr[0];
  } else if (key !== undefined) {
    const arr = loadDecoratorDataArr(factory, klass, key);
    if (arr.length === 0) { throw new Error(`${klass.name}#${key}未被${factory.name}修饰`) }
    return arr[0];
  } else {
    const arr = loadDecoratorDataArr(factory, klass);
    if (arr.length === 0) { throw new Error(`${klass.name}未被${factory.name}修饰`) }
    return arr[0];
  }
}

export function loadDecoratorDataArr<R>(factory: KlassDecoratorFactory<R>, klass: Function): R[];
export function loadDecoratorDataArr<R>(factory: KeyDecoratorFactory<R>, klass: Function, key: string): R[];
export function loadDecoratorDataArr<R>(factory: ParamDecoratorFactory<R>, klass: Function, key: string, index: number): R[];
export function loadDecoratorDataArr(factory: Function, klass: Function, key?: string, index?: number): any[] {
  const factorySym = getFactorySym(factory);
  if (index !== undefined && key !== undefined) {
    const handler = klass.prototype[key]
    const store = Reflect.getMetadata(factorySym, handler);
    return store.get(index) || [];
  } else if (key !== undefined) {
    let target = klass.prototype;
    const result = [];
    while (target) {
      if (Reflect.hasOwnMetadata(factorySym, target, key)) {
        result.push(...Reflect.getMetadata(factorySym, target, key));
      }
      target = Object.getPrototypeOf(target);
    }
    return result;
  } else {
    let target = klass.prototype;
    const result = [];
    while (target) {
      if (Reflect.hasOwnMetadata(factorySym, target)) {
        result.push(...Reflect.getMetadata(factorySym, target));
      }
      target = Object.getPrototypeOf(target);
    }
    return result;
  }
}

export function loadDecoratedKlass(factory: KlassDecoratorFactory<any>): Function[] {
  return [...getDecoratedKlassSet(factory)]
}

export function loadDecoratedParams(factory: ParamDecoratorFactory<any>, klass: Function, key: string): number[] {
  const factorySym = getFactorySym(factory);
  const handler = klass.prototype[key];
  return [...Reflect.getMetadata(factorySym, handler).keys()];
}

export function loadDecoratedKeys(factory: KeyDecoratorFactory<any>, klass: Function): string[] {
  let target = klass.prototype;
  const decoratedKeysSym = getDecoratedKeysSym(factory);
  const keySet = new Set<any>();
  while (target) {
    if (Reflect.hasOwnMetadata(decoratedKeysSym, target)) {
      Reflect.getMetadata(decoratedKeysSym, target).forEach((key: any) => keySet.add(key));
    }
    target = Object.getPrototypeOf(target);
  }
  return [...keySet];
}
export function isDecorated(factory: KlassDecoratorFactory<any>, klass: Function): boolean;
export function isDecorated(factory: KeyDecoratorFactory<any>, klass: Function, key: string): boolean;
export function isDecorated(factory: Function, klass: Function, key?: string): boolean {
  const factorySym = getFactorySym(factory);
  if (key) {
    return Reflect.hasMetadata(factorySym, klass.prototype, key);
  } else {
    return Reflect.hasMetadata(factorySym, klass.prototype);
  }
}
