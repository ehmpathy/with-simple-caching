import { isAPromise } from './isAPromise';

export interface SimpleCache<T> {
  get: (key: string) => T | undefined | Promise<Awaited<T> | undefined>;
  set: (key: string, value: T) => void;
}

export type KeySerializationMethod<P> = (args: P) => string;

const noOp = <LR, CR>(value: LR): CR => value as any;

/**
 * caches the promise of each invocation, based on serialization of the inputs.
 *
 * by default, this uses the `simple-in-memory-cache`, but you can pass in a `get` and `set` method for any persistent storage (e.g., local storage, cookie storage, dynamodb, etc)
 *
 * for example:
 * ```ts
 * const getApiResult = withSimpleCaching(({ name, number }) => axios.get(URL, { name, number }));
 * const result1 = getApiResult({ name: 'casey', number: 821 }); // calls the api, puts promise of results into cache, returns that promise
 * const result2 = getApiResult({ name: 'casey', number: 821 }); // returns the same promise from above, because it was found in cache - since same input as request above was used
 * expect(result1).toBe(result2); // same exact object - the promise
 * expect(await result1).toBe(await result2); // same exact object - the result of the promise
 * ```
 */
export const withSimpleCaching = <LR extends any, CR extends any, L extends (...args: any[]) => LR>(
  logic: L,
  {
    cache,
    serialize: {
      key: serializeKey = JSON.stringify, // default serialize key to JSON.stringify
      value: serializeValue = noOp, // default serialize value to noOp
    } = {},
    deserialize: { value: deserializeValue = noOp } = {},
  }: {
    cache: SimpleCache<CR>;
    serialize?: { key?: KeySerializationMethod<Parameters<L>>; value?: (returned: LR) => CR };
    deserialize?: { value?: (cached: CR) => LR };
  },
): L => {
  return ((...args: Parameters<L>): LR => {
    // define key based on args the function was invoked with
    const key = serializeKey(args);

    // start checking if its already cached
    const cachedValueOrPromise = cache.get(key);

    // define what to do with the value of this key in the cache
    const onCachedResolved = ({ cached }: { cached: CR | undefined }): LR => {
      // return the value if its already cached
      if (cached) return deserializeValue(cached);

      // if we dont, then grab the result of the logic
      const valueOrPromise = logic(...args);

      // start setting the value into the cache
      const confirmationOrPromise = cache.set(key, serializeValue(valueOrPromise));

      // respond to the confirmation of it being set into the cache
      if (isAPromise(confirmationOrPromise)) {
        return confirmationOrPromise.then(() => valueOrPromise) as LR; // if the confirmation is a promise, wait for it to resolve and then return the value
      }
      return valueOrPromise; // otherwise, its already resolved, return the value
    };

    // respond to the knowledge of whether its cached or not
    if (isAPromise(cachedValueOrPromise)) {
      return cachedValueOrPromise.then((cached) => onCachedResolved({ cached })) as LR; // if its a promise, wait for it to resolve and then run onCachedResolved
    }
    return onCachedResolved({ cached: cachedValueOrPromise }); // otherwise, its already resolved, run onCachedResolved now
  }) as L;
};
