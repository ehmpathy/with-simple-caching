import { isAFunction, isAPromise } from 'type-fns';

export interface SimpleCache<T> {
  get: (key: string) => T | undefined | Promise<Awaited<T> | undefined>;
  set: (key: string, value: T, options?: { secondsUntilExpiration?: number }) => void | Promise<void>;
}

export type KeySerializationMethod<LI> = (args: { forInput: LI }) => string;

export const noOp = <LO, CV>(value: LO): CV => value as any;
export const defaultKeySerializationMethod: KeySerializationMethod<any> = ({ forInput }) => JSON.stringify(forInput);
export const defaultValueSerializationMethod = noOp;

export type SimpleCacheResolutionMethod<LI extends any[], CV extends any> = (args: { fromInput: LI }) => SimpleCache<CV>;
export const getCacheFromCacheOption = <LI extends any[], CV extends any>({
  forInput,
  cacheOption,
}: {
  forInput: LI;
  cacheOption: SimpleCache<CV> | SimpleCacheResolutionMethod<LI, CV>;
}) => {
  if (isAFunction(cacheOption)) return cacheOption({ fromInput: forInput });
  return cacheOption;
};

/**
 * enumerates all of the methods exposed by with-simple-caching which are capable of setting to the cache
 */
export enum WithSimpleCachingOnSetTrigger {
  /**
   * the execute method sets to the cache when your wrapped logic is executed
   */
  EXECUTE = 'EXECUTE',

  /**
   * the invalidate method sets to the cache when the invalidate method is executed
   */
  INVALIDATE = 'INVALIDATE',

  /**
   * the update method sets to the cache when the update method is executed
   */
  UPDATE = 'UPDATE',
}

/**
 * a hook which is triggered onSet to the cache
 *
 * note
 * - this hook is simply kicked off, it will not be awaited, therefore
 *   - make sure you catch any errors thrown any promises you may start in the hook
 * - this hook exposes the exact value that was used when setting to cache
 *   - it exposes the exact output value, returned by the logic (if logic is async, this will be a promise)
 *   - it exposes the exact serialized value, given to cache onSet (if logic was async, this will be a promise)
 */
export type SimpleCacheOnSetHook<
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => any,
  /**
   * the shape of the value in the cache
   */
  CV extends any
> = (args: {
  /**
   * the method which triggered this onSet hook
   */
  trigger: WithSimpleCachingOnSetTrigger;

  /**
   * the input for which set was called
   *
   * note
   * - this may be undefined if `invalidation` was called `forKey`, instead of `forInput`
   */
  forInput: Parameters<L> | undefined;

  /**
   * the cache key that the input was serialized into
   */
  forKey: string;

  /**
   * the value which was set to the cache, defined as either
   * - the value which was set to the cache + the output from which the cached value was serialized
   * or
   * - undefined, in the case where a cache invalidation occured
   */
  value?: {
    /**
     * the direct output value returned by the logic
     */
    output: ReturnType<L>;

    /**
     * the value produced by serializing the output, with which cache.set was called
     */
    cached: CV;
  };
}) => void;

/**
 * options to configure caching for use with-simple-caching
 */
export interface WithSimpleCachingOptions<
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => any,
  /**
   * the shape of the value in the cache
   */
  CV extends any
> {
  cache: SimpleCache<CV> | SimpleCacheResolutionMethod<Parameters<L>, CV>;
  serialize?: { key?: KeySerializationMethod<Parameters<L>>; value?: (output: ReturnType<L>) => CV };
  deserialize?: { value?: (cached: CV) => ReturnType<L> };
  secondsUntilExpiration?: number;
  hook?: {
    onSet: SimpleCacheOnSetHook<L, CV>;
  };
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
export const withSimpleCaching = <
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => any,
  /**
   * the shape of the value in the cache
   */
  CV extends any
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
  }: WithSimpleCachingOptions<L, CV>,
): L => {
  return ((...args: Parameters<L>): ReturnType<L> => {
    // define key based on args the function was invoked with
    const key = serializeKey({ forInput: args });

    // define cache based on options
    const cache = getCacheFromCacheOption({ forInput: args, cacheOption });

    // start checking if its already cached
    const cachedValueOrPromise = cache.get(key);

    // define what to do with the value of this key in the cache
    const onCachedResolved = ({ cached }: { cached: CV | undefined }): ReturnType<L> => {
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
