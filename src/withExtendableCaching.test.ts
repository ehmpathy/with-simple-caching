import { createCache } from 'simple-in-memory-cache';
import { withExtendableCaching } from './withExtendableCaching';

describe('withExtendableCaching', () => {
  describe('execute', () => {
    it('should be able to execute logic', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCaching(
        () => {
          apiCalls.push(1);
          return Math.random();
        },
        { cache: createCache() },
      );

      // call the fn a few times
      const result1 = callApi.execute();
      const result2 = callApi.execute();
      const result3 = callApi.execute();

      // check that the response is the same each time
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // check that "api" was only called once
      expect(apiCalls.length).toEqual(1);
    });
  });
  describe('invalidate', () => {
    it('should be able to invalidate a cached value by input', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCaching(
        ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createCache() },
      );

      // call the fn a few times
      const result1 = callApi.execute({ galaxy: 'andromeda' });
      const result2 = callApi.execute({ galaxy: 'pegasus' });
      const result3 = callApi.execute({ galaxy: 'andromeda' });
      const result4 = callApi.execute({ galaxy: 'pegasus' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // invalidate the cached value for one of the inputs
      await callApi.invalidate({ forInput: [{ galaxy: 'andromeda' }] });

      // now call the cache again for that invalidated value, and prove it called the api again
      const result5 = callApi.execute({ galaxy: 'andromeda' });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);
    });
  });
  describe('update', () => {
    it('should be able to update a cached value by input', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCaching(
        ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createCache() },
      );

      // call the fn a few times
      const result1 = callApi.execute({ galaxy: 'andromeda' });
      const result2 = callApi.execute({ galaxy: 'pegasus' });
      const result3 = callApi.execute({ galaxy: 'andromeda' });
      const result4 = callApi.execute({ galaxy: 'pegasus' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // update the cached value for one of the inputs
      await callApi.update({ forInput: [{ galaxy: 'andromeda' }], toValue: 821 });

      // now call the cache again
      const result5 = callApi.execute({ galaxy: 'andromeda' });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).toEqual(821);
      expect(result5).not.toEqual(result1);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
  });
});
