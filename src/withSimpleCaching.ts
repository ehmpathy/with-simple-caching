import { isAPromise } from './isAPromise';

export interface SimpleCache<T> {
  get: (key: string) => T | undefined | Promise<Awaited<T> | undefined>;
  set: (key: string, value: T) => void;
}

export type KeySerializationMethod<P> = (args: P) => string;

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
export const withSimpleCaching = <R extends any, L extends (...args: any[]) => R>(
  logic: L,
  {
    cache,
    serialize: { key: keySerializer } = {
      key: JSON.stringify, // default to json stringify
    },
  }: { cache: SimpleCache<R>; serialize?: { key: KeySerializationMethod<Parameters<L>> } },
) => {
  return ((...args: Parameters<L>) => {
    // define key based on args the function was invoked with
    const key = keySerializer(args);

    // start checking if its already cached
    const cachedValueOrPromise = cache.get(key);

    // define what to do with the value of this key in the cache
    const onCachedResolved = ({ cached }: { cached: R | undefined }) => {
      // return the value if its already cached
      if (cached) return cached;

      // if we dont, then grab the result of the logic
      const valueOrPromise = logic(...args);

      // cache the value and return it
      cache.set(key, valueOrPromise);
      return valueOrPromise;
    };

    // respond to the knowledge of whether its cached or not
    if (isAPromise(cachedValueOrPromise)) {
      return cachedValueOrPromise.then((cached) => onCachedResolved({ cached })); // if its a promise, wait for it to resolve and then run onCachedResolved
    }
    return onCachedResolved({ cached: cachedValueOrPromise }); // otherwise, its already resolved, run onCachedResolved now
  }) as L;
};
