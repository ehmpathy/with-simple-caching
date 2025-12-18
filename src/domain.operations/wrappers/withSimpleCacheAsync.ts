import type { UniDuration } from '@ehmpathy/uni-time';
import { createCache, type SimpleInMemoryCache } from 'simple-in-memory-cache';
import { isNotUndefined, type NotUndefined } from 'type-fns';

import type { SimpleCache } from '@src/domain.objects/SimpleCache';
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

import { withExtendableCache } from './withExtendableCache';

export type AsyncLogic = (...args: any[]) => Promise<any>;

/**
 * options to configure cache for use with-simple-cache
 */
export interface WithSimpleCacheAsyncOptions<
  /**
   * the logic we are adding cache for
   */
  L extends AsyncLogic,
  /**
   * the type of cache being used
   */
  C extends SimpleCache<any>,
> {
  /**
   * the cache to persist outputs
   */
  cache:
    | WithSimpleCacheChoice<Parameters<L>, C>
    | {
        /**
         * the cache to cache output to
         */
        output: WithSimpleCacheChoice<Parameters<L>, C>;

        /**
         * the cache to use for parallel in memory request deduplication
         *
         * note
         * - by default, this method will use its own in-memory cache for deduplication
         * - if required, you can pass in your own in-memory cache to use
         *   - for example, if you're instantiating the wrapper on each execution of your logic, instead of globally
         *   - important: if passing in your own, make sure that the cache time is at least as long as your longest resolving promise (e.g., 15min) ⚠️
         */
        deduplication: SimpleInMemoryCache<any>;
      };
  serialize?: {
    key?: KeySerializationMethod<Parameters<L>>;
    value?: (
      output: Awaited<ReturnType<L>>,
    ) => NotUndefined<Awaited<ReturnType<C['get']>>>;
  };
  deserialize?: {
    value?: (
      cached: NotUndefined<Awaited<ReturnType<C['get']>>>,
    ) => Awaited<ReturnType<L>>;
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
 * method to get the output cache option chosen by the user from the cache input
 */
export const getOutputCacheOptionFromCacheInput = <
  /**
   * the logic we are adding cache for
   */
  L extends AsyncLogic,
  /**
   * the type of cache being used
   */
  C extends SimpleCache<any>,
>(
  cacheInput: WithSimpleCacheAsyncOptions<L, C>['cache'],
): WithSimpleCacheChoice<Parameters<L>, C> =>
  'output' in cacheInput ? cacheInput.output : cacheInput;

/**
 * method to get the output cache option chosen by the user from the cache input
 */
const getDeduplicationCacheOptionFromCacheInput = <
  /**
   * the logic we are adding cache for
   */
  L extends AsyncLogic,
  /**
   * the type of cache being used
   */
  C extends SimpleCache<any>,
>(
  cacheInput: WithSimpleCacheAsyncOptions<L, C>['cache'],
): SimpleInMemoryCache<any> =>
  'deduplication' in cacheInput
    ? cacheInput.deduplication
    : createCache({
        expiration: { minutes: 15 }, // support deduplicating requests that take up to 15 minutes to resolve, by default (note: we remove the promise as soon as it resolves through "serialize" method below)
      });

/**
 * a wrapper which adds asynchronous cache to asynchronous logic
 *
 * note
 * - utilizes an additional in-memory synchronous cache under the hood to prevent duplicate requests (otherwise, while async cache is resolving, a duplicate parallel request may have be made)
 * - can be given a synchronous cache, since what you can do on an asynchronous cache you can do on a synchronous cache, but not the other way around
 */
export const withSimpleCacheAsync = <
  /**
   * the logic we are adding cache for
   */
  L extends AsyncLogic,
  /**
   * the type of cache being used
   */
  C extends SimpleCache<any>,
>(
  logic: L,
  {
    cache: cacheOption,
    serialize: {
      key: serializeKey = defaultKeySerializationMethod, // default serialize key to JSON.stringify
      value: serializeValue = defaultValueSerializationMethod, // default serialize value to noOp
    } = {},
    deserialize: { value: deserializeValue = noOp } = {},
    expiration,
    bypass = {
      get: defaultShouldBypassGetMethod,
      set: defaultShouldBypassSetMethod,
    },
  }: WithSimpleCacheAsyncOptions<L, C>,
): L => {
  // add async cache to the logic
  const logicWithAsyncCache = (async (
    ...args: Parameters<L>
  ): Promise<ReturnType<L>> => {
    // define key based on args the function was invoked with
    const key = serializeKey(args[0], args[1]);

    // define cache based on options
    const cache = getCacheFromCacheChoice({
      forInput: args,
      cacheOption: getOutputCacheOptionFromCacheInput(cacheOption),
    });

    // see if its already cached
    const cachedValue: Awaited<ReturnType<C['get']>> = bypass.get?.(args)
      ? undefined
      : await cache.get(key);
    if (isNotUndefined(cachedValue)) return deserializeValue(cachedValue); // if already cached, return it immediately

    // if its not, grab the output from the logic
    const output: Awaited<ReturnType<L>> = await logic(...args);

    // if was asked to bypass cache.set, we can return the output now
    if (bypass.set?.(args)) return output;

    // set the output to the cache
    const serializedOutput = serializeValue(output);
    await cache.set(key, serializedOutput, { expiration });

    // if the output was undefined, we can just return here - no deserialization needed
    if (output === undefined) return output;

    // and now re-get from the cache, to ensure that output on first response === output on second response
    const cachedValueNow: Awaited<ReturnType<C['get']>> = await cache.get(key);
    if (isNotUndefined(cachedValueNow)) return deserializeValue(cachedValueNow);

    // otherwise, somehow, get-after-set returned undefined. warn about this and return output
    // eslint-disable-next-line no-console
    console.warn(
      // warn about this because it should never occur
      'withSimpleCacheAsync encountered a situation which should not occur: cache.get returned undefined immediately after having been set. returning the output directly to prevent irrecoverable failure.',
      { key },
    );
    return output;
  }) as L;

  // wrap the logic with extended sync cache, to ensure that duplicate requests resolve the same promise from in-memory (rather than each getting a promise to check the async cache + operate separately)
  const { execute, invalidate } = withExtendableCache(logicWithAsyncCache, {
    cache: getDeduplicationCacheOptionFromCacheInput(cacheOption),
    serialize: {
      key: serializeKey,
    },
  });

  // define a function which the user will run which kicks off the result + invalidates the in-memory cache promise as soon as it finishes
  const logicWithAsyncCacheAndInMemoryRequestDeduplication = async (
    ...args: Parameters<L>
  ): Promise<ReturnType<L>> => {
    // start executing the request w/ async cache + sync cache
    const promiseResult = execute(...args);

    // ensure that after the promise resolves, we remove it from the cache (so that unique subsequent requests can still be made)
    const promiseResultAfterInvalidation = promiseResult
      .finally(() => invalidate({ forInput: args }))
      .then(() => promiseResult);

    // return the result after invalidation
    return promiseResultAfterInvalidation;
  };

  // return the function w/ async cache and sync-in-memory-request-deduplication
  return logicWithAsyncCacheAndInMemoryRequestDeduplication as L;
};
