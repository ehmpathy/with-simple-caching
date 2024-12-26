import { UniDuration } from '@ehmpathy/uni-time';

import { SimpleAsyncCache, SimpleSyncCache } from '../domain/SimpleCache';

export const createExampleSyncCache = () => {
  const store: Record<string, any> = {};
  const cache: SimpleSyncCache<any> = {
    set: (
      key: string,
      value: any,
      options?: { expiration?: UniDuration | null },
    ) => {
      store[key] = options ? { value, options } : { value };
    },
    get: (key: string) => store[key]?.value,
  };
  return { cache, store };
};

export const createExampleAsyncCache = <T>() => {
  const store: Record<string, { value: T; options?: any } | undefined> = {};
  const cache: SimpleAsyncCache<T> = {
    set: async (
      key: string,
      value: T | undefined,
      options?: { expiration?: UniDuration | null },
    ) => {
      // eslint-disable-next-line no-nested-ternary
      store[key] =
        value !== undefined
          ? options
            ? { value, options }
            : { value }
          : undefined;
    },
    get: async (key: string) => store[key]?.value,
  };
  return { cache, store };
};
