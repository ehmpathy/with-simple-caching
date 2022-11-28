import { isAFunction } from 'type-fns';
import { SimpleAsyncCache } from '../../domain/SimpleCache';
import { getCacheFromCacheOptionOrFromForKeyArgs } from '../options/getCacheFromCacheOptionOrFromForKeyArgs';
import { defaultKeySerializationMethod, defaultValueDeserializationMethod, defaultValueSerializationMethod } from '../serde/defaults';
import { withSimpleCachingAsync, WithSimpleCachingAsyncOptions } from './withSimpleCachingAsync';

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
export const hasForInputProperty = (obj: any): obj is { forInput: any } => !!obj.forInput;

/**
 * the shape of logic that was wrapped with extendable caching for an async cache
 */
export interface LogicWithExtendableCachingAsync<
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any) => Promise<any>,
  /**
   * the type of cache being used
   */
  C extends SimpleAsyncCache<any>
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
  ) => Promise<void>;

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
            | Awaited<ReturnType<L>>
            | ((args: { fromCachedOutput: Awaited<ReturnType<L>> | undefined }) => ReturnType<L> | Awaited<ReturnType<L>>);
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
            | Awaited<ReturnType<L>>
            | ((args: { fromCachedOutput: Awaited<ReturnType<L>> | undefined }) => ReturnType<L> | Awaited<ReturnType<L>>);

          /**
           * the cache to use, if the cache must be was defined from input parameters at runtime
           */
          cache?: C;
        },
  ) => Promise<void>;
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
export const withExtendableCachingAsync = <
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any) => Promise<any>,
  /**
   * the type of cache being used
   */
  C extends SimpleAsyncCache<any>
>(
  logic: L,
  options: WithSimpleCachingAsyncOptions<L, C>,
): LogicWithExtendableCachingAsync<L, C> => {
  const execute: LogicWithExtendableCachingAsync<L, C>['execute'] = withSimpleCachingAsync(logic, options);

  const invalidate: LogicWithExtendableCachingAsync<L, C>['invalidate'] = async (args) => {
    // define how to get the cache, with support for `forKey` input instead of full input
    const cache = getCacheFromCacheOptionOrFromForKeyArgs({ args, options, trigger: WithExtendableCachingTrigger.INVALIDATE });

    // define the key, with support for `forKey` input instead of `forInput`
    const serializeKey = options.serialize?.key ?? defaultKeySerializationMethod;
    const key = hasForInputProperty(args) ? serializeKey({ forInput: args.forInput }) : args.forKey;

    // set undefined into the cache for this key, to invalidate the cached value
    await cache.set(key, undefined);
  };

  const update: LogicWithExtendableCachingAsync<L, C>['update'] = async (args) => {
    // define how to get the cache, with support for `forKey` input instead of full input
    const cache = getCacheFromCacheOptionOrFromForKeyArgs({ args, options, trigger: WithExtendableCachingTrigger.UPDATE });

    // define the key, with support for `forKey` input instead of `forInput`
    const serializeKey = options.serialize?.key ?? defaultKeySerializationMethod;
    const key = hasForInputProperty(args) ? serializeKey({ forInput: args.forInput }) : args.forKey;

    // deserialize the cached value
    const cachedValue = await cache.get(key);
    const deserializeValue = options.deserialize?.value ?? defaultValueDeserializationMethod;
    const deserializedCachedOutput = cachedValue !== undefined ? deserializeValue(cachedValue) : undefined;

    // compute the new value
    const newValue: Awaited<ReturnType<L>> = isAFunction(args.toValue)
      ? await args.toValue({ fromCachedOutput: deserializedCachedOutput })
      : await args.toValue;

    // define the serialized new value
    const serializeValue = options.serialize?.value ?? defaultValueSerializationMethod;
    const serializedNewValue = serializeValue(newValue);

    // set the new value for this key
    await cache.set(key, serializedNewValue, { secondsUntilExpiration: options.secondsUntilExpiration });
  };

  return { execute, invalidate, update };
};
