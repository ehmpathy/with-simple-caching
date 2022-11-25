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
