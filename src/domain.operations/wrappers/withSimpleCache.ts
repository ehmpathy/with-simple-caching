import type { UniDuration } from '@ehmpathy/uni-time';
import { isNotUndefined, type NotUndefined } from 'type-fns';

import type { SimpleSyncCache } from '@src/domain.objects/SimpleCache';
import {
  getCacheFromCacheChoice,
  type WithSimpleCacheChoice,
} from '@src/domain.operations/options/getCacheFromCacheChoice';
import {
  defaultKeySerializationMethod,
  defaultShouldBypassGetMethod,
  defaultShouldBypassSetMethod,
  defaultValueSerializationMethod,
  type KeySerializationMethod,
  noOp,
} from '@src/domain.operations/serde/defaults';

/**
 * options to configure cache for use with-simple-cache
 */
export interface WithSimpleCacheOptions<
  /**
   * the logic we are adding cache for
   */
  L extends (...args: any) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleSyncCache<any>,
> {
  cache: WithSimpleCacheChoice<Parameters<L>, C>;
  serialize?: {
    key?: KeySerializationMethod<Parameters<L>>;
    value?: (output: ReturnType<L>) => NotUndefined<ReturnType<C['get']>>;
  };
  deserialize?: {
    value?: (cached: NotUndefined<ReturnType<C['get']>>) => ReturnType<L>;
  };
  expiration?: UniDuration | null;

  /**
   * whether to bypass the cached for either the set or get operation
   */
  bypass?: {
    /**
     * whether to bypass the cache for the get
     *
     * note
     * - equivalent to the result not already being cached
     *
     * default
     * - process.env.CACHE_BYPASS_GET ? process.env.CACHE_BYPASS_GET === 'true' : process.env.CACHE_BYPASS === 'true'
     */
    get?: (input: Parameters<L>) => boolean;

    /**
     * whether to bypass the cache for the set
     *
     * note
     * - keeps whatever the previously cached value was, while returning the new value
     *
     * default
     * - process.env.CACHE_BYPASS_SET ? process.env.CACHE_BYPASS_SET === 'true' : process.env.CACHE_BYPASS === 'true'
     */
    set?: (input: Parameters<L>) => boolean;
  };
}

/**
 * a wrapper which uses a synchronous cache to cache the result of the wrapped logic
 *
 * for example:
 * ```ts
 * const getApiResult = withSimpleCache(({ name, number }) => axios.get(URL, { name, number }));
 * const result1 = getApiResult({ name: 'casey', number: 821 }); // calls the api, puts promise of results into cache, returns that promise
 * const result2 = getApiResult({ name: 'casey', number: 821 }); // returns the same promise from above, because it was found in cache - since same input as request above was used
 * expect(result1).toBe(result2); // same exact object - the promise
 * expect(await result1).toBe(await result2); // same exact object - the result of the promise
 * ```
 */
export const withSimpleCache = <
  /**
   * the logic we are adding cache for
   */
  L extends (...args: any[]) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleSyncCache<any>,
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
    expiration,
    bypass = {
      get: defaultShouldBypassGetMethod,
      set: defaultShouldBypassSetMethod,
    },
  }: WithSimpleCacheOptions<L, C>,
): L => {
  return ((...args: Parameters<L>): ReturnType<L> => {
    // define key based on args the function was invoked with
    const key = serializeKey(args[0], args[1]);

    // define cache based on options
    const cache = getCacheFromCacheChoice({ forInput: args, cacheOption });

    // see if its already cached
    const cachedValue: ReturnType<C['get']> = bypass.get?.(args)
      ? undefined
      : cache.get(key);
    if (isNotUndefined(cachedValue)) return deserializeValue(cachedValue); // if already cached, return it immediately

    // if its not, grab the output from the logic
    const output: ReturnType<L> = logic(...args);

    // if was asked to bypass cache.set, we can return the output now
    if (bypass.set?.(args)) return output;

    // set the output to the cache
    const serializedOutput = serializeValue(output);
    cache.set(key, serializedOutput, { expiration });

    // if the output was undefined, we can just return here - no deserialization needed
    if (output === undefined) return output;

    // and now re-get from the cache, to ensure that output on first response === output on second response
    const cachedValueNow: Awaited<ReturnType<C['get']>> = cache.get(key);
    if (isNotUndefined(cachedValueNow)) return deserializeValue(cachedValueNow);

    // otherwise, somehow, get-after-set returned undefined. warn about this and return output
    // eslint-disable-next-line no-console
    console.warn(
      // warn about this because it should never occur
      'withSimpleCache encountered a situation which should not occur: cache.get returned undefined immediately after having been set. returning the output directly to prevent irrecoverable failure.',
      { key },
    );
    return output;
  }) as L;
};
