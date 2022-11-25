import { SimpleSyncCache } from '../../domain/SimpleCache';
import { getCacheFromCacheOption, WithSimpleCachingCacheOption } from '../options/getCacheFromCacheOption';
import { defaultKeySerializationMethod, defaultValueSerializationMethod, KeySerializationMethod, noOp } from '../serde/defaults';

/**
 * options to configure caching for use with-simple-caching
 */
export interface WithSimpleCachingOptions<
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleSyncCache<any>
> {
  cache: WithSimpleCachingCacheOption<Parameters<L>, C>;
  serialize?: { key?: KeySerializationMethod<Parameters<L>>; value?: (output: ReturnType<L>) => ReturnType<C['get']> };
  deserialize?: { value?: (cached: ReturnType<C['get']>) => ReturnType<L> };
  secondsUntilExpiration?: number;
}

/**
 * a wrapper which uses a synchronous cache to cache the result of the wrapped logic
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
export const withSimpleCaching = <
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleSyncCache<any>
>(
  logic: L,
  {
    cache: cacheOption,
    serialize: {
      key: serializeKey = defaultKeySerializationMethod, // default serialize key to JSON.stringify
      value: serializeValue = defaultValueSerializationMethod, // default serialize value to noOp
    } = {},
    deserialize: {
      value: deserializeValue = noOp, // default deserialize value to noOp
    } = {},
    secondsUntilExpiration,
  }: WithSimpleCachingOptions<L, C>,
): L => {
  return ((...args: Parameters<L>): ReturnType<L> => {
    // define key based on args the function was invoked with
    const key = serializeKey({ forInput: args });

    // define cache based on options
    const cache = getCacheFromCacheOption({ forInput: args, cacheOption });

    // see if its already cached
    const cachedValue: ReturnType<C['get']> = cache.get(key);
    if (cachedValue !== undefined) return deserializeValue(cachedValue); // if already cached, return it immediately

    // if its not, grab the output from the logic
    const output: ReturnType<L> = logic(...args);

    // set the output to the cache
    const serializedOutput = serializeValue(output);
    cache.set(key, serializedOutput, { secondsUntilExpiration });

    // and now re-get from the cache, to ensure that output on first response === output on second response
    const cachedValueNow: ReturnType<C['get']> = cache.get(key);
    return deserializeValue(cachedValueNow);
  }) as L;
};
