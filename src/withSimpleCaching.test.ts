import { createCache } from 'simple-in-memory-cache';
import { withSimpleCaching } from './withSimpleCaching';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('withSimpleCaching', () => {
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

    // check that the response is the same each time the input is the same
    expect(result1).toEqual(result3);
    expect(result2).toEqual(result4);

    // check that "api" was only called twice (once per name)
    expect(apiCalls.length).toEqual(2);
  });
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
});
