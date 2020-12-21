import { isAPromise } from './isAPromise';
import { serialize } from './serialize';

export interface SimpleCache<T> {
  get: (key: string) => T | null;
  set: (key: string, value: T) => void;
}

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
export const withSimpleCaching = <R extends any, L extends (...args: any[]) => R | Promise<R>>(logic: L, { cache }: { cache: SimpleCache<R> }) => {
  return (async (...args: Parameters<L>) => {
    // define key based on args the function was invoked with
    const key = serialize({ args });

    // see if we already have this result cached
    const cached = cache.get(key);
    if (cached) return cached; // return the value if its already cached

    // if we dont, then grab the result of the logic
    const valueOrPromise = logic(...args);

    // if the result of the logic was a promise, then return a promise which cache's the result after the promise resolves; // NOTE: we only do this if the result was a promise so we only make the function async if the logic was already async
    if (isAPromise(valueOrPromise)) {
      return valueOrPromise.then((value) => {
        cache.set(key, value);
        return value;
      });
    }

    // since the result of the logic was not a promise, then cache the value and return it immediately
    const value = valueOrPromise;
    cache.set(key, value);
    return value;
  }) as L;
};
