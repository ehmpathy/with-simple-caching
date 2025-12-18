import type { UniDuration } from '@ehmpathy/uni-time';

/**
 * a simple cache which synchronously gets and sets values to its store
 */
export interface SimpleSyncCache<T> {
  get: (key: string) => T | undefined;
  set: (
    key: string,
    value: T | undefined,
    options?: { expiration?: UniDuration | null },
  ) => void;
}

/**
 * a simple cache which asynchronously gets and sets values to its store
 */
export interface SimpleAsyncCache<T> {
  get: (key: string) => Promise<T | undefined>;
  set: (
    key: string,
    value: T | undefined,
    options?: { expiration?: UniDuration | null },
  ) => Promise<void>;
}

/**
 * a simple cache
 */
export type SimpleCache<T> = SimpleAsyncCache<T> | SimpleSyncCache<T>;
