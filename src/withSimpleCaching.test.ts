import { createCache } from 'simple-in-memory-cache';
import { withSimpleCaching } from './withSimpleCaching';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('withSimpleCaching', () => {
  describe('synchronous logic, synchronous cache', () => {
    it('should only invoke the api once for a wrapped function after the first request', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        () => {
          apiCalls.push(1);
          return Math.random();
        },
        { cache: createCache() },
      );

      // call the fn a few times
      const result1 = callApi();
      const result2 = callApi();
      const result3 = callApi();

      // check that the response is the same each time
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(1);
    });
    it('should invoke the api once for each unique combination of inputs', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        ({ name }: { name: string }) => {
          apiCalls.push(name);
          return Math.random();
        },
        { cache: createCache() },
      );

      // call the fn a few times
      const result1 = callApi({ name: 'casey' });
      const result2 = callApi({ name: 'katya' });
      const result3 = callApi({ name: 'casey' });
      const result4 = callApi({ name: 'katya' });
      const result5 = callApi({ name: 'casey' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);
      expect(result3).toEqual(result5);

      // check that "api" was only called twice (once per name)
      expect(apiCalls.length).toEqual(2);
    });
    it('should expose the error, if an error was returned by the function', async () => {
      // define an example fn
      const expectedError = new Error('surprise!');
      const callApi = withSimpleCaching(
        () => {
          throw expectedError;
        },
        { cache: createCache() },
      );

      // call the fn and check that we can catch the error
      try {
        callApi();
        throw new Error('should not reach here');
      } catch (error) {
        expect(error).toEqual(expectedError);
      }
    });
  });
  describe('asynchronous logic, synchronous cache', () => {
    it('should be possible to stringify the result of a promise in the cache', async () => {
      // define an example cache that can only deal with strings or numbers
      const store: Record<string, any> = {};
      const cache = {
        set: (key: string, value: Promise<string | number>) => {
          store[key] = value;
        },
        get: (key: string) => store[key],
      };

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          await sleep(100);
          return Math.random();
        },
        {
          cache,
        },
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
      // define an example cache that can only deal with strings or numbers
      const store: Record<string, any> = {};
      const cache = {
        set: (key: string, value: Promise<string | number>) => {
          store[key] = value;
        },
        get: async (key: string) => store[key],
      };

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          return Math.random();
        },
        {
          cache,
        },
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
      const callApi = withSimpleCaching(
        async () => {
          throw expectedError;
        },
        { cache: createCache() },
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
      // define an example cache that can only deal with strings or numbers
      const store: Record<string, any> = {};
      const cache = {
        set: async (key: string, value: Promise<string | number>) => {
          store[key] = await value;
        },
        get: (key: string) => store[key],
      };

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        async ({ name }: { name: string }) => {
          apiCalls.push(name);
          await sleep(100);
          return Math.random();
        },
        {
          cache,
        },
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
      expect(typeof cache.get(JSON.stringify([{ name: 'casey' }]))).toEqual('number'); // now prove that the value saved into the cache for this name is definetly not a promise
    });
    it('should be possible to catch an error which was rejected by a promise set to the cache in an async cache which awaited the value onSet', async () => {
      // define an example cache that can only deal with strings or numbers
      const store: Record<string, any> = {};
      const cache = {
        set: async (key: string, value: Promise<string | number>) => {
          store[key] = await value;
        },
        get: (key: string) => store[key],
      };

      // define an example fn
      const expectedError = new Error('surprise!');
      const callApi = withSimpleCaching(
        // eslint-disable-next-line no-empty-pattern
        async ({}: { name: string }) => {
          throw expectedError;
        },
        {
          cache,
        },
      );

      // prove that we can catch the error
      try {
        await callApi({ name: 'casey' });
        throw new Error('should not reach here');
      } catch (error) {
        expect(error).toEqual(expectedError);
      }

      // prove that nothing was set to the cache
      expect(typeof cache.get(JSON.stringify([{ name: 'casey' }]))).toEqual('undefined');
    });
  });
  describe('(de)serialization', () => {
    it('should be possible to use a custom key serialization method', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        ({ name }: { name: string }) => {
          apiCalls.push(name);
          return name;
        },
        {
          cache: createCache(),
          serialize: {
            key: (args) => args[0].name.slice(0, 1), // serialize to only the first letter of the name arg
          },
        },
      );

      // call the fn a few times
      const result1 = callApi({ name: 'casey' });
      const result2 = callApi({ name: 'clarissa' });
      const result3 = callApi({ name: 'chloe' });
      const result4 = callApi({ name: 'charlotte' });

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
      const callApi = withSimpleCaching(
        ({ names }: { names: string[] }): string[] => {
          apiCalls.push(names);
          return names;
        },
        {
          cache: {
            get: (key: string) => store[key], // never returns a response, so everyone runs against "set"
            set: (key: string, value: string) => {
              if (typeof value !== 'string') throw new Error('value was not a string');
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
      const result1 = callApi({ names: ['casey'] });
      const result2 = callApi({ names: ['chloe', 'charlotte'] });
      const result3 = callApi({ names: ['casey'] });

      // check that the response is the same each time
      expect(result1).toEqual(['casey']);
      expect(result1).toEqual(result3);
      expect(result2).toEqual(['chloe', 'charlotte']);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(2);
    });
  });
  describe('invalidation', () => {
    it('should consider the cached value as invalid if value resolved as undefined', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        () => {
          apiCalls.push(1);
          return undefined; // return undefined each time
        },
        { cache: createCache() },
      );

      // call the fn a few times
      const result1 = callApi();
      const result2 = callApi();
      const result3 = callApi();

      // check that undefined was returned each time
      expect(result1).toEqual(undefined);
      expect(result2).toEqual(undefined);
      expect(result3).toEqual(undefined);

      // check that "api" was called each time, since it was not a valid cache value that was "set" each time
      expect(apiCalls.length).toEqual(3);
    });
    it('should support cache invalidation by calling the cache again if cache value was set to undefined externally', async () => {
      // define an example cache that can only deal with strings or numbers
      const store: Record<string, any> = {};
      const cache = {
        set: (key: string, value: Promise<string | number>) => {
          store[key] = value;
        },
        get: (key: string) => store[key],
      };

      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        () => {
          apiCalls.push(1);
          return Math.random();
        },
        { cache },
      );

      // call the fn a few times
      const result1 = callApi();
      const result2 = callApi();
      const result3 = callApi();

      // check that the response is the same each time
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(1);

      // now set the value to undefined
      expect(store['[]']).toBeDefined(); // sanity check that we've defined the key correctly
      store['[]'] = undefined; // invalidate the key written to above

      // now call the api again
      const result4 = callApi();

      // now we expect the value to be different
      expect(result4).not.toEqual(result1);

      // and we expect the api to have been called again
      expect(apiCalls.length).toEqual(2);
    });
    it('should treat null as a valid cached value', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        () => {
          apiCalls.push(1);
          return null; // return null each time
        },
        { cache: createCache() },
      );

      // call the fn a few times
      const result1 = callApi();
      const result2 = callApi();
      const result3 = callApi();

      // check that the response is the same each time
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(1);
    });
  });
  describe('expiration', () => {
    it('should apply the secondsUntilExpiration option correctly', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withSimpleCaching(
        () => {
          apiCalls.push(1);
          return Math.random();
        },
        {
          cache: createCache(),
          secondsUntilExpiration: 3, // wait three seconds until expiration
        },
      );

      // call the fn a few times
      const result1 = callApi();
      const result2 = callApi();
      const result3 = callApi();

      // check that the response is the same each time
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(1);

      // now wait 1 second
      await sleep(1000);

      // prove that calling the api still returns cached result
      const result4 = callApi();
      expect(result4).toEqual(result1);
      expect(apiCalls.length).toEqual(1);

      // now wait 2.5 more seconds, exceeding the expiration time since first call
      await sleep(2500);

      // and prove that a call now would actually hit the api
      const result5 = callApi();
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(2);
    });
  });
});
