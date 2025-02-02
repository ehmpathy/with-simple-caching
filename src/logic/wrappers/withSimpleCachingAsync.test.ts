import { createCache } from 'simple-in-memory-cache';

import { SimpleAsyncCache } from '../..';
import {
  createExampleAsyncCache,
  createExampleSyncCache,
} from '../../__test_assets__/createExampleCache';
import { withSimpleCachingAsync } from './withSimpleCachingAsync';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('withSimpleCachingAsync', () => {
  describe('asynchronous logic, synchronous cache', () => {
    it('should be possible to stringify the result of a promise in the cache', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          await sleep(100);
          return Math.random();
        },
        { cache: createExampleSyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi({ name: 'casey' });
      const result2 = await callApi({ name: 'katya' });
      const result3 = await callApi({ name: 'casey' });
      const result4 = await callApi({ name: 'katya' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice (once per name)
      expect(apiCalls.length).toEqual(2);
    });
    it('should be possible to wait for the get promise to resolve before deciding whether to set or return', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          return Math.random();
        },
        { cache: createExampleSyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi({ name: 'casey' });
      const result2 = await callApi({ name: 'katya' });
      const result3 = await callApi({ name: 'casey' });
      const result4 = await callApi({ name: 'katya' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice (once per name)
      expect(apiCalls.length).toEqual(2);
    });
    it('should expose the error, if an error was resolved by the promise returned by the function', async () => {
      // define an example fn
      const expectedError = new Error('surprise!');
      const callApi = withSimpleCachingAsync(
        async () => {
          throw expectedError;
        },
        { cache: createExampleSyncCache().cache },
      );

      // call the fn and check that we can catch the error
      try {
        await callApi();
        throw new Error('should not reach here');
      } catch (error) {
        expect(error).toEqual(expectedError);
      }
    });
  });
  describe('asynchronous logic, asynchronous cache', () => {
    it('should be possible for a cache to await and persist the resolved value, not the promise', async () => {
      const { cache, store } = createExampleAsyncCache();

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          await sleep(100);
          return Math.random();
        },
        { cache },
      );

      // call the fn a few times
      const result1 = await callApi({ name: 'casey' });
      const result2 = await callApi({ name: 'katya' });
      const result3 = await callApi({ name: 'casey' });
      const result4 = await callApi({ name: 'katya' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice (once per name)
      expect(apiCalls.length).toEqual(2);

      // check that the value in the cache is not the promise, but the value itself
      expect(typeof Promise.resolve(821)).toEqual('object'); // prove that a promise to resolve a number has a typeof object
      expect(typeof store[JSON.stringify([{ name: 'casey' }])]?.value).toEqual(
        'number',
      ); // now prove that the value saved into the cache for this name is definetly not a promise
    });
    it('should deduplicate parallel requests in memory even before async cache has finished resolving its first get', async () => {
      const store: Record<string, string | undefined> = {};
      const cache: SimpleAsyncCache<string> = {
        set: async (key: string, value: string | undefined) => {
          store[key] = value;
        },
        get: async (key: string) => {
          await sleep(1500); // act like it takes a while for the cache to resolve
          return store[key];
        },
      };

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          await sleep(100);
          return Math.random();
        },
        { cache },
      );

      // call the fn a few times, in parallel
      const [result1, result2, result3, result4] = await Promise.all([
        callApi({ name: 'casey' }),
        callApi({ name: 'katya' }),
        callApi({ name: 'casey' }),
        callApi({ name: 'katya' }),
      ]);

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice (once per name)
      expect(apiCalls.length).toEqual(2);

      // check that the value in the cache is not the promise, but the value itself
      expect(typeof Promise.resolve(821)).toEqual('object'); // prove that a promise to resolve a number has a typeof object
      expect(typeof store[JSON.stringify([{ name: 'casey' }])]).toEqual(
        'number',
      ); // now prove that the value saved into the cache for this name is definetly not a promise
    });
    it('should deduplicate parallel requests in memory via the passed in in-memory cache if one was passed in', async () => {
      const store: Record<string, string | undefined> = {};
      const cache: SimpleAsyncCache<string> = {
        set: async (key: string, value: string | undefined) => {
          store[key] = value;
        },
        get: async (key: string) => {
          await sleep(1500); // act like it takes a while for the cache to resolve
          return store[key];
        },
      };

      // define an example fn
      const apiCalls = [];
      const deduplicationCache = createCache();
      const callApi = (args: { name: string }) =>
        // note that this function instantiates a new wrapper each time -> requiring the deduplication cache to be passed in
        withSimpleCachingAsync(
          async ({ name }: { name: string }) => {
            apiCalls.push(name);
            await sleep(100);
            return Math.random();
          },
          { cache: { output: cache, deduplication: deduplicationCache } },
        )(args);

      // call the fn a few times, in parallel
      const [result1, result2, result3, result4] = await Promise.all([
        callApi({ name: 'casey' }),
        callApi({ name: 'katya' }),
        callApi({ name: 'casey' }),
        callApi({ name: 'katya' }),
      ]);

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice (once per name)
      expect(apiCalls.length).toEqual(2);

      // check that the value in the cache is not the promise, but the value itself
      expect(typeof Promise.resolve(821)).toEqual('object'); // prove that a promise to resolve a number has a typeof object
      expect(typeof store[JSON.stringify([{ name: 'casey' }])]).toEqual(
        'number',
      ); // now prove that the value saved into the cache for this name is definetly not a promise
    });
    it('should be possible to catch an error which was rejected by a promise set to the cache in an async cache which awaited the value onSet', async () => {
      const { cache, store } = createExampleAsyncCache();

      // define an example fn
      const expectedError = new Error('surprise!');
      const callApi = withSimpleCachingAsync(
        // eslint-disable-next-line no-empty-pattern
        async ({}: { name: string }) => {
          throw expectedError;
        },
        { cache },
      );

      // prove that we can catch the error
      try {
        await callApi({ name: 'casey' });
        throw new Error('should not reach here');
      } catch (error) {
        expect(error).toEqual(expectedError);
      }

      // prove that nothing was set to the cache
      expect(typeof store[JSON.stringify([{ name: 'casey' }])]?.value).toEqual(
        'undefined',
      );
    });
    it('should have appropriate types for an async cache that caches awaited values', async () => {
      const { cache, store } = createExampleAsyncCache();

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          await sleep(100);
          return Math.random();
        },
        { cache },
      );

      // call the fn a few times
      const result1 = await callApi({ name: 'casey' });
      const result2 = await callApi({ name: 'katya' });
      const result3 = await callApi({ name: 'casey' });
      const result4 = await callApi({ name: 'katya' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice (once per name)
      expect(apiCalls.length).toEqual(2);

      // check that the value in the cache is not the promise, but the value itself
      expect(typeof Promise.resolve(821)).toEqual('object'); // prove that a promise to resolve a number has a typeof object
      expect(typeof store[JSON.stringify([{ name: 'casey' }])]?.value).toEqual(
        'number',
      ); // now prove that the value saved into the cache for this name is definetly not a promise
    });
  });
  describe('(de)serialization', () => {
    it('should be possible to use a custom key serialization method', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          return name;
        },
        {
          cache: createExampleAsyncCache().cache,
          serialize: {
            key: ({ forInput }) => forInput[0].name.slice(0, 1), // serialize to only the first letter of the name arg
          },
        },
      );

      // call the fn a few times
      const result1 = await callApi({ name: 'casey' });
      const result2 = await callApi({ name: 'clarissa' });
      const result3 = await callApi({ name: 'chloe' });
      const result4 = await callApi({ name: 'charlotte' });

      // check that the response is the same each time
      expect(result1).toEqual('casey');
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(result3).toEqual(result4);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(1);
    });
    it('should be possible to use a custom value serialization and deserialization method', async () => {
      // define an example fn
      const apiCalls = [];
      const store: Record<string, string> = {};
      const callApi = withSimpleCachingAsync(
        async ({ names }: { names: string[] }): Promise<string[]> => {
          apiCalls.push(names);
          return names;
        },
        {
          cache: {
            get: async (key: string) => store[key], // never returns a response, so everyone runs against "set"
            set: async (key: string, value: string) => {
              if (typeof value !== 'string')
                throw new Error('value was not a string');
              store[key] = value;
            },
          },
          serialize: {
            value: (returned) => JSON.stringify(returned),
          },
          deserialize: {
            value: (cached) => JSON.parse(cached),
          },
        },
      );

      // call the fn a few times
      const result1 = await callApi({ names: ['casey'] });
      const result2 = await callApi({ names: ['chloe', 'charlotte'] });
      const result3 = await callApi({ names: ['casey'] });

      // check that the response is the same each time
      expect(result1).toEqual(['casey']);
      expect(result1).toEqual(result3);
      expect(result2).toEqual(['chloe', 'charlotte']);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(2);
    });
    it('should ensure cache-miss and cache-hit responses are equivalent in the cases of lossy serde', async () => {
      // define an example fn
      const apiCalls = [];
      const store: Record<string, string> = {};
      const callApi = withSimpleCachingAsync(
        async ({ names }: { names: string[] }): Promise<string[]> => {
          apiCalls.push(names);
          return names;
        },
        {
          cache: {
            get: async (key: string) => store[key], // never returns a response, so everyone runs against "set"
            set: async (key: string, value: string) => {
              if (typeof value !== 'string')
                throw new Error('value was not a string');
              store[key] = value;
            },
          },
          serialize: {
            value: (returned) => JSON.stringify(returned),
          },
          deserialize: {
            value: () => ['balloon'], // it's possible that the users deserialization method looses data. we should make sure their cache-miss response is the same as cache-hit resposes, to fail fast in these situations
          },
        },
      );

      // call the fn a few times
      const result1 = await callApi({ names: ['casey'] });
      const result2 = await callApi({ names: ['chloe', 'charlotte'] });
      const result3 = await callApi({ names: ['casey'] });
      const result4 = await callApi({ names: ['chloe', 'charlotte'] });

      // check that the response is the same each time
      expect(result1).toEqual(['balloon']);
      expect(result2).toEqual(result1);
      expect(result3).toEqual(result2);
      expect(result4).toEqual(result3);

      // check that "api" was called both times
      expect(apiCalls.length).toEqual(2);
    });
    it('should use the same key serialization for the in-memory request deduplication cache', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async ({ name }: { name: string; unserializableObject: any }) => {
          apiCalls.push(name);
          return name;
        },
        {
          cache: createExampleAsyncCache().cache,
          serialize: {
            key: ({ forInput }) => forInput[0].name.slice(0, 1), // serialize to only the first letter of the name arg
          },
        },
      );

      // create an object that for sure cant be serialized
      const objA = { name: 'dog', refs: undefined as any };
      const objB = { name: 'cat', refs: objA };
      objA.refs = objB; // creates a cyclical reference -> can't be serialized
      try {
        JSON.stringify(objA);
        throw new Error('should not reach here');
      } catch (error) {
        if (!(error instanceof Error)) throw error;
        expect(error.message).toContain(
          'Converting circular structure to JSON',
        );
      }

      // call the fn and prove that it didn't throw an error due to not being able to serialize the `unserializableObject` - it shouldn't have attempted since the custom serialization fn ignores it
      await callApi({ name: 'casey', unserializableObject: objA }); // no error
    });
  });
  describe('invalidation', () => {
    it('should consider the cached value as invalid if value resolved as undefined', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async () => {
          apiCalls.push(1);
          return undefined; // return undefined each time
        },
        {
          cache: createExampleAsyncCache().cache,
        },
      );

      // call the fn a few times
      const result1 = await callApi();
      const result2 = await callApi();
      const result3 = await callApi();

      // check that undefined was returned each time
      expect(result1).toEqual(undefined);
      expect(result2).toEqual(undefined);
      expect(result3).toEqual(undefined);

      // check that "api" was called each time, since it was not a valid cache value that was "set" each time
      expect(apiCalls.length).toEqual(3);
    });
    it('should support cache invalidation by calling the cache again if cache value was set to undefined externally', async () => {
      const { cache, store } = createExampleAsyncCache();

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async () => {
          apiCalls.push(1);
          return Math.random();
        },
        {
          cache,
        },
      );

      // call the fn a few times
      const result1 = await callApi();
      const result2 = await callApi();
      const result3 = await callApi();

      // check that the response is the same each time
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(1);

      // now set the value to undefined
      expect(store['[]']).toBeDefined(); // sanity check that we've defined the key correctly
      store['[]'] = undefined; // invalidate the key written to above

      // now call the api again
      const result4 = await callApi();

      // now we expect the value to be different
      expect(result4).not.toEqual(result1);

      // and we expect the api to have been called again
      expect(apiCalls.length).toEqual(2);
    });
    it('should treat null as a valid cached value', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async () => {
          apiCalls.push(1);
          return null; // return null each time
        },
        { cache: createExampleAsyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi();
      const result2 = await callApi();
      const result3 = await callApi();

      // check that the response is the same each time
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(1);
    });
  });
  describe('expiration', () => {
    it('should apply the secondsUntilExpiration option correctly', async () => {
      const { cache, store } = createExampleAsyncCache();

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCachingAsync(
        async () => {
          apiCalls.push(1);
          return Math.random();
        },
        {
          cache,
          expiration: { seconds: 3 }, // wait three seconds until expiration
        },
      );

      // call the fn
      await callApi();

      // confirm that it passed the secondsUntilExpiration through to the cache
      expect(store['[]']).toMatchObject({
        options: { expiration: { seconds: 3 } },
      });
    });
  });
});
