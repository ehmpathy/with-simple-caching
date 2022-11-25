export enum SimpleCacheExecutionMode {
  ASYNCHRONOUS = 'ASYNCHRONOUS',
  SYNCHRONOUS = 'SYNCHRONOUS',
}

/**
 * a simple cache which asynchronously gets and sets values to its store
 */
export interface SimpleAsyncCache<T> {
  meta: {
    execution: SimpleCacheExecutionMode.ASYNCHRONOUS;
  };
  get: (key: string) => Promise<T | undefined>;
  set: (key: string, value: T | undefined, options?: { secondsUntilExpiration?: number }) => Promise<void>;
}

/**
 * a simple cache which synchronously gets and sets values to its store
 */
export interface SimpleSyncCache<T> {
  meta: {
    execution: SimpleCacheExecutionMode.SYNCHRONOUS;
  };
  get: (key: string) => T | undefined;
  set: (key: string, value: T | undefined, options?: { secondsUntilExpiration?: number }) => void;
}

/**
 * a simple cache
 */
export type SimpleCache<T> = SimpleAsyncCache<T> | SimpleSyncCache<T>;

/**
 * a method which specifies where how to extract a simple-cache from input args
 */
export type SimpleCacheExtractionMethod<LI extends any[], C extends SimpleCache<any>> = (args: { fromInput: LI }) => C;
