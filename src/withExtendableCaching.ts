import { withSimpleCaching, WithSimpleCachingOnSetTrigger } from '.';
import { isAFunction } from './isAFunction';
import {
  defaultKeySerializationMethod,
  defaultValueSerializationMethod,
  getCacheFromCacheOption,
  WithSimpleCachingOptions,
} from './withSimpleCaching';

export interface LogicWithExtendableCaching<LR extends any, CR extends any, L extends (...args: any[]) => LR> {
  /**
   * execute the logic with caching
   */
  execute: L;

  /**
   * invalidate the cached value for a given input
   *
   * note
   * - applies key serialization on the key input, just like execute
   */
  invalidate: (args: {
    /**
     * invalidate the cache for this input
     */
    forInput: Parameters<L>;
  }) => Promise<void>;

  /**
   * update the cached value for a given input
   *
   * note
   * - applies key serialization on the key input, just like execute
   * - applies value serialization on the value output, just like execute
   */
  update: (args: {
    /**
     * update the cache for this input
     */
    forInput: Parameters<L>;

    /**
     * update the cache to this value
     */
    toValue: ReturnType<L> | ((args: { cachedValue: CR | undefined }) => ReturnType<L>);
  }) => Promise<void>;
}

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
  options: WithSimpleCachingOptions<LR, CR, L>,
): LogicWithExtendableCaching<LR, CR, L> => {
  const execute: LogicWithExtendableCaching<LR, CR, L>['execute'] = withSimpleCaching(logic, options);

  const invalidate: LogicWithExtendableCaching<LR, CR, L>['invalidate'] = async ({ forInput }) => {
    const serializeKey = options.serialize?.key ?? defaultKeySerializationMethod;
    const cache = getCacheFromCacheOption({ forInput, cacheOption: options.cache });
    await cache.set(serializeKey(forInput), undefined as CR);
    if (options.hook?.onSet)
      // note: we do not wait for the hook to resolve; hooks do not block execution ℹ️
      options.hook.onSet({
        from: WithSimpleCachingOnSetTrigger.INVALIDATE,
        forInput,
        forKey: serializeKey(forInput),
        value: undefined,
      });
  };

  const update: LogicWithExtendableCaching<LR, CR, L>['update'] = async ({ forInput, toValue }) => {
    const serializeKey = options.serialize?.key ?? defaultKeySerializationMethod;
    const serializeValue = options.serialize?.value ?? defaultValueSerializationMethod;
    const cache = getCacheFromCacheOption({ forInput, cacheOption: options.cache });
    const newValue = isAFunction(toValue) ? toValue({ cachedValue: await cache.get(serializeKey(forInput)) }) : toValue;
    await cache.set(serializeKey(forInput), serializeValue(newValue), { secondsUntilExpiration: options.secondsUntilExpiration });
    if (options.hook?.onSet)
      // note: we do not wait for the hook to resolve; hooks do not block execution ℹ️
      options.hook.onSet({
        from: WithSimpleCachingOnSetTrigger.UPDATE,
        forInput,
        forKey: serializeKey(forInput),
        value: {
          output: newValue,
          cached: serializeValue(newValue),
        },
      });
  };

  return { execute, invalidate, update };
};
