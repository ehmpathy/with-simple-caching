import { isAFunction, isAPromise } from 'type-fns';
import { SimpleCache } from '.';
import { BadRequestError } from './errors/BadRequestError';
import { SimpleCacheExtractionMethod } from './SimpleCache';
import { SimpleCacheOnSetHook, WithSimpleCachingOnSetTrigger } from './SimpleCacheOnSetHook';

export type KeySerializationMethod<LI> = (args: { forInput: LI }) => string;

export const noOp = <LO, CV>(value: LO): CV => value as any;
export const defaultKeySerializationMethod: KeySerializationMethod<any> = ({ forInput }) => JSON.stringify(forInput);
export const defaultValueSerializationMethod = noOp;
export const defaultValueDeserializationMethod = noOp;

/**
 * how the cache can be specified for use with simple caching
 * - either directly
 * - or through a cache extraction method, which grabs the cache from input args
 */
export type WithSimpleCachingCacheOption<LI extends any[], C extends SimpleCache<any>> = C | SimpleCacheExtractionMethod<LI, C>;

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
  C extends SimpleCache<any>
> {
  cache: WithSimpleCachingCacheOption<Parameters<L>, C>;
  serialize?: { key?: KeySerializationMethod<Parameters<L>>; value?: (output: ReturnType<L>) => ReturnType<C['get']> };
  deserialize?: { value?: (cached: ReturnType<C['get']>) => ReturnType<L> };
  secondsUntilExpiration?: number;
  hook?: {
    onSet: SimpleCacheOnSetHook<L, ReturnType<C['get']>>;
  };
}

/**
 * how to extract the with simple caching cache option
 */
export const getCacheFromCacheOption = <LI extends any[], C extends SimpleCache<any>>({
  forInput,
  cacheOption,
}: {
  forInput: LI;
  cacheOption: WithSimpleCachingCacheOption<LI, C>;
}): C => {
  if (isAFunction(cacheOption)) {
    const foundCache = cacheOption({ fromInput: forInput });
    if (!foundCache) throw new BadRequestError('could not extract cache from input with cache resolution method', { forInput });
    return foundCache;
  }
  return cacheOption;
};

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
export const withSimpleCaching = <
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleCache<any>
>(
  logic: L,
  {
    cache: cacheOption,
    serialize: {
      key: serializeKey = defaultKeySerializationMethod, // default serialize key to JSON.stringify
      value: serializeValue = defaultValueSerializationMethod, // default serialize value to noOp
    } = {},
    deserialize: { value: deserializeValue = noOp } = {},
    secondsUntilExpiration,
    hook,
  }: WithSimpleCachingOptions<L, C>,
): L => {
  return ((...args: Parameters<L>): ReturnType<L> => {
    // define key based on args the function was invoked with
    const key = serializeKey({ forInput: args });

    // define cache based on options
    const cache = getCacheFromCacheOption({ forInput: args, cacheOption });

    // start checking if its already cached
    const cachedValueOrPromise = cache.get(key);

    // define what to do with the value of this key in the cache
    const onCachedResolved = ({ cached }: { cached: ReturnType<C['get']> | undefined }): ReturnType<L> => {
      // return the value if its already cached
      if (cached !== undefined) return deserializeValue(cached);

      // if we dont, then grab the result of the logic
      const valueOrPromise = logic(...args) as ReturnType<L>;

      // define the serialized value
      const serializedValue = serializeValue(valueOrPromise);

      // start setting the value into the cache
      const confirmationOrPromise = cache.set(key, serializeValue(valueOrPromise), { secondsUntilExpiration });

      // define a function for how to trigger the onSet hook, if needed
      const triggerOnSetHookIfNeeded = () => {
        if (hook?.onSet)
          // note: we do not wait for the hook to resolve; hooks do not block execution ℹ️
          hook.onSet({
            trigger: WithSimpleCachingOnSetTrigger.EXECUTE,
            forInput: args,
            forKey: key,
            value: {
              output: valueOrPromise,
              cached: serializedValue,
            },
          });
      };

      // respond to the confirmation of it being set into the cache.
      if (isAPromise(confirmationOrPromise)) {
        return confirmationOrPromise // if it was a promise
          .then(triggerOnSetHookIfNeeded) // trigger the onset hook if needed, after the setConfirmation promise resolves
          .then(() => valueOrPromise) as ReturnType<L>; // and then return the result, after setConfirmation resolves and the onSet.hook is kicked off
      }
      triggerOnSetHookIfNeeded(); // otherwise, it is already resolved, kickoff the onset hook if needed
      return valueOrPromise; // and return the value
    };

    // respond to the knowledge of whether its cached or not
    if (isAPromise(cachedValueOrPromise)) {
      return cachedValueOrPromise.then((cached) => onCachedResolved({ cached })) as ReturnType<L>; // if its a promise, wait for it to resolve and then run onCachedResolved
    }
    return onCachedResolved({ cached: cachedValueOrPromise }); // otherwise, its already resolved, run onCachedResolved now
  }) as L;
};
