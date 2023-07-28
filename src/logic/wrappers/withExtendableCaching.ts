import { isAFunction } from 'type-fns';

import { SimpleSyncCache } from '../../domain/SimpleCache';
import { getCacheFromCacheOptionOrFromForKeyArgs } from '../options/getCacheFromCacheOptionOrFromForKeyArgs';
import {
  defaultKeySerializationMethod,
  defaultValueDeserializationMethod,
  defaultValueSerializationMethod,
} from '../serde/defaults';
import {
  withSimpleCaching,
  WithSimpleCachingOptions,
} from './withSimpleCaching';

/**
 * enumerates the extendable methods which can trigger cache operations
 */
export enum WithExtendableCachingTrigger {
  EXECUTE = 'EXECUTE',
  INVALIDATE = 'INVALIDATE',
  UPDATE = 'UPDATE',
}

/**
 * a simple typeguard which checks if an object has a property named `forInput`
 */
export const hasForInputProperty = (obj: any): obj is { forInput: any } =>
  !!obj.forInput;

/**
 * the shape of logic that was wrapped with extendable caching for a sync cache
 */
export interface LogicWithExtendableCaching<
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleSyncCache<any>,
> {
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
  invalidate: (
    args:
      | {
          /**
           * invalidate the cache for this input
           */
          forInput: Parameters<L>;
        }
      | {
          /**
           * invalidate the cache for this key
           */
          forKey: string;

          /**
           * the cache to use, if the cache must be was defined from input parameters at runtime
           */
          cache?: C;
        },
  ) => void;

  /**
   * update the cached value for a given input
   *
   * note
   * - applies key serialization on the key input, just like execute
   * - applies value serialization on the value output, just like execute
   */
  update: (
    args:
      | {
          /**
           * update the cache for this input
           */
          forInput: Parameters<L>;

          /**
           * update the cache to this value
           */
          toValue:
            | ReturnType<L>
            | ((args: {
                fromCachedOutput: ReturnType<L> | undefined;
              }) => ReturnType<L>);
        }
      | {
          /**
           * update the cache for this string
           */
          forKey: string;

          /**
           * update the cache to this value
           */
          toValue:
            | ReturnType<L>
            | ((args: {
                fromCachedOutput: ReturnType<L> | undefined;
              }) => ReturnType<L>);

          /**
           * the cache to use, if the cache must be was defined from input parameters at runtime
           */
          cache?: C;
        },
  ) => void;
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
export const withExtendableCaching = <
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleSyncCache<any>,
>(
  logic: L,
  options: WithSimpleCachingOptions<L, C>,
): LogicWithExtendableCaching<L, C> => {
  const execute: LogicWithExtendableCaching<L, C>['execute'] =
    withSimpleCaching(logic, options);

  const invalidate: LogicWithExtendableCaching<L, C>['invalidate'] = (args) => {
    // define how to get the cache, with support for `forKey` input instead of full input
    const cache = getCacheFromCacheOptionOrFromForKeyArgs({
      args,
      options,
      trigger: WithExtendableCachingTrigger.INVALIDATE,
    });

    // define the key, with support for `forKey` input instead of `forInput`
    const serializeKey =
      options.serialize?.key ?? defaultKeySerializationMethod;
    const key = hasForInputProperty(args)
      ? serializeKey({ forInput: args.forInput })
      : args.forKey;

    // set undefined into the cache for this key, to invalidate the cached value
    cache.set(key, undefined);
  };

  const update: LogicWithExtendableCaching<L, C>['update'] = (args) => {
    // define how to get the cache, with support for `forKey` input instead of full input
    const cache = getCacheFromCacheOptionOrFromForKeyArgs({
      args,
      options,
      trigger: WithExtendableCachingTrigger.UPDATE,
    });

    // define the key, with support for `forKey` input instead of `forInput`
    const serializeKey =
      options.serialize?.key ?? defaultKeySerializationMethod;
    const key = hasForInputProperty(args)
      ? serializeKey({ forInput: args.forInput })
      : args.forKey;

    // deserialize the cached value
    const cachedValue = cache.get(key);
    const deserializeValue =
      options.deserialize?.value ?? defaultValueDeserializationMethod;
    const deserializedCachedOutput =
      cachedValue !== undefined ? deserializeValue(cachedValue) : undefined;

    // compute the new value
    const newValue: ReturnType<L> = isAFunction(args.toValue)
      ? args.toValue({ fromCachedOutput: deserializedCachedOutput })
      : args.toValue;

    // define the serialized new value
    const serializeValue =
      options.serialize?.value ?? defaultValueSerializationMethod;
    const serializedNewValue = serializeValue(newValue);

    // set the new value for this key
    cache.set(key, serializedNewValue, {
      secondsUntilExpiration: options.secondsUntilExpiration,
    });
  };

  return { execute, invalidate, update };
};
