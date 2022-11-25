/**
 * a simple cache which synchronously gets and sets values to its store
 */
export interface SimpleSyncCache<T> {
  get: (key: string) => T | undefined;
  set: (key: string, value: T | undefined, options?: { secondsUntilExpiration?: number }) => void;
}

/**
 * a simple cache which asynchronously gets and sets values to its store
 */
export interface SimpleAsyncCache<T> {
  get: (key: string) => Promise<T | undefined>;
  set: (key: string, value: T | undefined, options?: { secondsUntilExpiration?: number }) => Promise<void>;
}

/**
 * a simple cache
 */
export type SimpleCache<T> = SimpleAsyncCache<T> | SimpleSyncCache<T>;

/**
 * a method which specifies where how to extract a simple-cache from input args
 */
export type SimpleCacheExtractionMethod<LI extends any[], C extends SimpleCache<any>> = (args: { fromInput: LI }) => C;
