import { SimpleSyncCache, SimpleCacheExecutionMode, SimpleAsyncCache } from '..';

export const createExampleSyncCache = () => {
  const store: Record<string, any> = {};
  const cache: SimpleSyncCache<any> = {
    meta: {
      execution: SimpleCacheExecutionMode.SYNCHRONOUS,
    },
    set: (key: string, value: any, options?: { secondsUntilExpiration?: number }) => {
      store[key] = options ? { value, options } : { value };
    },
    get: (key: string) => store[key]?.value,
  };
  return { cache, store };
};

export const createExampleAsyncCache = <T>() => {
  const store: Record<string, T | undefined> = {};
  const cache: SimpleAsyncCache<T> = {
    meta: {
      execution: SimpleCacheExecutionMode.ASYNCHRONOUS,
    },
    set: async (key: string, value: T | undefined) => {
      store[key] = await value;
    },
    get: async (key: string) => store[key],
  };
  return { cache, store };
};
