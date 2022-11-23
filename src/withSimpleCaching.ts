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
    onSet: (args: { forInput: Parameters<L>; forKey: string; value: { output: ReturnType<L>; cached: CR } }) => void;
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
