import { isAFunction } from 'type-fns';
import { SimpleAsyncCache } from '../../domain/SimpleCache';
import { BadRequestError } from '../../utils/errors/BadRequestError';
import { getCacheFromCacheOption } from '../options/getCacheFromCacheOption';
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
 * the shape of logic that was wrapped with extendable caching
 */
export interface LogicWithExtendableCaching<
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => any,
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
 * a function which is capable of grabbing the cache from arguments to the `invalidate` or `update` commands, supporting both the case when invoked with `forInput` and when invoked with `forKey`
 */
export const getCacheFromCacheOptionOrFromForKeyArgs = <
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleAsyncCache<any>
>({
  args,
  options,
  trigger,
}: {
  args: Parameters<LogicWithExtendableCaching<L, C>['invalidate']>[0] | Parameters<LogicWithExtendableCaching<L, C>['update']>[0];
  options: WithSimpleCachingAsyncOptions<L, C>;
  trigger: WithExtendableCachingTrigger;
}): C => {
  // if the args have the forInput property, then we can grab the cache like normal
  if (hasForInputProperty(args)) return getCacheFromCacheOption({ forInput: args.forInput, cacheOption: options.cache });

  // otherwise, if the cache was explicitly declared, then use it
  if (!isAFunction(options.cache)) return options.cache;

  // otherwise, we require the cache to have ben defined as an input to this method, when using invalidate by input, since we expect to grab the cache off of the input
  if (!args.cache)
    throw new BadRequestError(
      `could not find the cache to ${trigger.toLowerCase()} in. ${trigger.toLowerCase()} was called forKey but the cache for this method was defined as a function which retrieves the cache from the input. therefore, since there is no input accessible, the cache should have been explicitly passed in on ${trigger.toLowerCase()}`,
      { args },
    );
  return args.cache;
};

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
  L extends (...args: any[]) => Promise<any>,
  /**
   * the type of cache being used
   */
  C extends SimpleAsyncCache<any>
>(
  logic: L,
  options: WithSimpleCachingAsyncOptions<L, C>,
): LogicWithExtendableCaching<L, C> => {
  const execute: LogicWithExtendableCaching<L, C>['execute'] = withSimpleCachingAsync(logic, options);

  const invalidate: LogicWithExtendableCaching<L, C>['invalidate'] = async (args) => {
    // define how to get the cache, with support for `forKey` input instead of full input
    const cache = getCacheFromCacheOptionOrFromForKeyArgs({ args, options, trigger: WithExtendableCachingTrigger.INVALIDATE });

    // define the key, with support for `forKey` input instead of `forInput`
    const serializeKey = options.serialize?.key ?? defaultKeySerializationMethod;
    const key = hasForInputProperty(args) ? serializeKey({ forInput: args.forInput }) : args.forKey;

    // set undefined into the cache for this key, to invalidate the cached value
    await cache.set(key, undefined);
  };

  const update: LogicWithExtendableCaching<L, C>['update'] = async (args) => {
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
