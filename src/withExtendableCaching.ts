import { withSimpleCaching } from '.';
import {
  CacheResolutionMethod,
  defaultKeySerializationMethod,
  defaultValueSerializationMethod,
  getCacheFromCacheOption,
  KeySerializationMethod,
  SimpleCache,
} from './withSimpleCaching';

/**
 * exposes the cache-wrapped method along with some primitives which enable extending the caching logic
 *
 * specifically
 * - exposes a way to `invalidate` the cache, for a given input (e.g., to support external triggers for invalidation)
 * - exposes a way to `update` the cache, for a given input (e.g., to support write-through caching and optimistic caching)
 *
 * relevance
 * - when wrapping logic to cache the user is able to specify several caching options (e.g., key serialization method, value serialization method, etc)
 * - in order to define their own `invalidation` and `update` methods, without this function, the user would need to access these caching options per function elsewhere
 * - this function makes it easy to utilize and extend cache invalidation + update commands for the wrapped logic, by managing the references to the caching options on behalf of the user
 */
export const withExtendableCaching = <LR extends any, CR extends any, L extends (...args: any[]) => LR>(
  logic: L,
  options: {
    cache: SimpleCache<CR> | CacheResolutionMethod<L, CR>;
    serialize?: { key?: KeySerializationMethod<Parameters<L>>; value?: (returned: LR) => CR };
    deserialize?: { value?: (cached: CR) => LR };
    secondsUntilExpiration?: number;
  },
) => {
  /**
   * execute the logic with caching
   */
  const execute = withSimpleCaching(logic, options);

  /**
   * invalidate the cached value for a given input
   *
   * note
   * - applies key serialization on the key input, just like execute
   */
  const invalidate = async ({
    forInput,
  }: {
    /**
     * invalidate the cache for this input
     */
    forInput: Parameters<L>;
  }) => {
    const serializeKey = options.serialize?.key ?? defaultKeySerializationMethod;
    const cache = getCacheFromCacheOption({ forInput, cacheOption: options.cache });
    await cache.set(serializeKey(forInput), undefined as CR);
  };

  /**
   * update the cached value for a given input
   *
   * note
   * - applies key serialization on the key input, just like execute
   * - applies value serialization on the value output, just like execute
   */
  const update = async ({
    forInput,
    toValue,
  }: {
    /**
     * update the cache for this input
     */
    forInput: Parameters<L>;

    /**
     * update the cache to this value
     */
    toValue: ReturnType<L>;
  }) => {
    const serializeKey = options.serialize?.key ?? defaultKeySerializationMethod;
    const serializeValue = options.serialize?.value ?? defaultValueSerializationMethod;
    const cache = getCacheFromCacheOption({ forInput, cacheOption: options.cache });
    await cache.set(serializeKey(forInput), serializeValue(toValue), { secondsUntilExpiration: options.secondsUntilExpiration });
  };

  /**
   * return the extendable cache-wrapped logic methods
   */
  return { execute, invalidate, update };
};
