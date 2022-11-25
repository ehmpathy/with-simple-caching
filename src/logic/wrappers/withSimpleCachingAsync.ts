import { isNotUndefined, NotUndefined } from 'type-fns';
import { SimpleAsyncCache } from '../../domain/SimpleCache';
import { getCacheFromCacheOption, WithSimpleCachingCacheOption } from '../options/getCacheFromCacheOption';
import { defaultKeySerializationMethod, defaultValueSerializationMethod, KeySerializationMethod, noOp } from '../serde/defaults';

/**
 * options to configure caching for use with-simple-caching
 */
export interface WithSimpleCachingAsyncOptions<
  /**
   * the logic we are caching the responses for
   */
  L extends (...args: any) => any,
  /**
   * the type of cache being used
   */
  C extends SimpleAsyncCache<any>
> {
  cache: WithSimpleCachingCacheOption<Parameters<L>, C>;
  serialize?: {
    key?: KeySerializationMethod<Parameters<L>>;
    value?: (output: Awaited<ReturnType<L>>) => NotUndefined<Awaited<ReturnType<C['get']>>>;
  };
  deserialize?: {
    value?: (cached: NotUndefined<Awaited<ReturnType<C['get']>>>) => Awaited<ReturnType<L>>;
  };
  secondsUntilExpiration?: number;
}

/**
 * a wrapper which adds asynchronous caching to asynchronous logic
 *
 * note
 * - utilizes an additional in-memory synchronous cache under the hood to prevent duplicate requests (otherwise, while async cache is resolving, a duplicate parallel request may have be made)
 */
export const withSimpleCachingAsync = <
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
  {
    cache: cacheOption,
    serialize: {
      key: serializeKey = defaultKeySerializationMethod, // default serialize key to JSON.stringify
      value: serializeValue = defaultValueSerializationMethod, // default serialize value to noOp
    } = {},
    deserialize: { value: deserializeValue = noOp } = {},
    secondsUntilExpiration,
  }: WithSimpleCachingAsyncOptions<L, C>,
): L => {
  return ((async (...args: Parameters<L>): Promise<ReturnType<L>> => {
    // define key based on args the function was invoked with
    const key = serializeKey({ forInput: args });

    // define cache based on options
    const cache = getCacheFromCacheOption({ forInput: args, cacheOption });

    // see if its already cached
    const cachedValue: Awaited<ReturnType<C['get']>> = await cache.get(key);
    if (isNotUndefined(cachedValue)) return deserializeValue(cachedValue); // if already cached, return it immediately

    // if its not, grab the output from the logic
    const output: Awaited<ReturnType<L>> = await logic(...args);

    // set the output to the cache
    const serializedOutput = serializeValue(output);
    await cache.set(key, serializedOutput, { secondsUntilExpiration });

    // and now re-get from the cache, to ensure that output on first response === output on second response
    const cachedValueNow: Awaited<ReturnType<C['get']>> = await cache.get(key);
    if (isNotUndefined(cachedValueNow)) return deserializeValue(cachedValueNow);

    // otherwise, somehow, get-after-set returned undefined. warn about this and return output
    // eslint-disable-next-line no-console
    console.warn(
      // warn about this because it should never occur
      'withSimpleCachingAsync encountered a situation which should not occur: cache.get returned undefined immediately after having been set. returning the output directly to prevent irrecoverable failure.',
      { key },
    );
    return output;
  }) as any) as L;
};
