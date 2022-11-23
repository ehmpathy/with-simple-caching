import { isAFunction } from './isAFunction';
import { isAPromise } from './isAPromise';

export interface SimpleCache<T> {
  get: (key: string) => T | undefined | Promise<Awaited<T> | undefined>;
  set: (key: string, value: T, options?: { secondsUntilExpiration?: number }) => void | Promise<void>;
}

export type KeySerializationMethod<P> = (args: P) => string;

export const noOp = <LR, CR>(value: LR): CR => value as any;
export const defaultKeySerializationMethod = JSON.stringify;
export const defaultValueSerializationMethod = noOp;

export type SimpleCacheResolutionMethod<L extends (...args: any[]) => any, CR extends any> = (args: { fromInput: Parameters<L> }) => SimpleCache<CR>;
export const getCacheFromCacheOption = <L extends (...args: any[]) => any, CR extends any>({
  forInput,
  cacheOption,
}: {
  forInput: Parameters<L>;
  cacheOption: SimpleCache<CR> | SimpleCacheResolutionMethod<L, CR>;
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
export type SimpleCacheOnSetHook<LR extends any, CR extends any, L extends (...args: any[]) => LR> = (args: {
  /**
   * the method which triggered this onSet hook
   */
  from: WithSimpleCachingOnSetTrigger;

  /**
   * the input for which set was called
   */
  forInput: Parameters<L>;
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
    cached: CR;
  };
}) => void;

/**
 * options to configure caching for use with-simple-caching
 */
export interface WithSimpleCachingOptions<
  /**
   * the response returned by the wrapped logic for the input
   */
  LR extends any,
  /**
   * the response returned by the cache for the key
   */
  CR extends any,
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any[]) => LR
> {
  cache: SimpleCache<CR> | SimpleCacheResolutionMethod<L, CR>;
  serialize?: { key?: KeySerializationMethod<Parameters<L>>; value?: (returned: LR) => CR };
  deserialize?: { value?: (cached: CR) => LR };
  secondsUntilExpiration?: number;
  hook?: {
    onSet: SimpleCacheOnSetHook<LR, CR, L>;
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
export const withSimpleCaching = <LR extends any, CR extends any, L extends (...args: any[]) => LR>(
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
  }: WithSimpleCachingOptions<LR, CR, L>,
): L => {
  return ((...args: Parameters<L>): LR => {
    // define key based on args the function was invoked with
    const key = serializeKey(args);

    // define cache based on options
    const cache = getCacheFromCacheOption({ forInput: args, cacheOption });

    // start checking if its already cached
    const cachedValueOrPromise = cache.get(key);

    // define what to do with the value of this key in the cache
    const onCachedResolved = ({ cached }: { cached: CR | undefined }): LR => {
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
            from: WithSimpleCachingOnSetTrigger.EXECUTE,
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
          .then(() => valueOrPromise) as LR; // and then return the result, after setConfirmation resolves and the onSet.hook is kicked off
      }
      triggerOnSetHookIfNeeded(); // otherwise, it is already resolved, kickoff the onset hook if needed
      return valueOrPromise; // and return the value
    };

    // respond to the knowledge of whether its cached or not
    if (isAPromise(cachedValueOrPromise)) {
      return cachedValueOrPromise.then((cached) => onCachedResolved({ cached })) as LR; // if its a promise, wait for it to resolve and then run onCachedResolved
    }
    return onCachedResolved({ cached: cachedValueOrPromise }); // otherwise, its already resolved, run onCachedResolved now
  }) as L;
};
