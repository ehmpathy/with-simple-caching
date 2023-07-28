import { createExampleAsyncCache } from '../../__test_assets__/createExampleCache';
import { SimpleAsyncCache } from '../../domain/SimpleCache';
import { BadRequestError } from '../../utils/errors/BadRequestError';
import { withExtendableCachingAsync } from './withExtendableCachingAsync';

describe('withExtendableCachingAsync', () => {
  describe('execute', () => {
    it('should be able to execute logic', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCachingAsync(
        async () => {
          apiCalls.push(1);
          return Math.random();
        },
        { cache: createExampleAsyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi.execute();
      const result2 = await callApi.execute();
      const result3 = await callApi.execute();

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
      const callApi = withExtendableCachingAsync(
        async ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleAsyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi.execute({ galaxy: 'andromeda' });
      const result2 = await callApi.execute({ galaxy: 'pegasus' });
      const result3 = await callApi.execute({ galaxy: 'andromeda' });
      const result4 = await callApi.execute({ galaxy: 'pegasus' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // invalidate the cached value for one of the inputs
      await callApi.invalidate({ forInput: [{ galaxy: 'andromeda' }] });

      // now call the cache again for that invalidated value, and prove it called the api again
      const result5 = await callApi.execute({ galaxy: 'andromeda' });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);
    });
    it('should be able to invalidate a cached value by key', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCachingAsync(
        async ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleAsyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi.execute({ galaxy: 'andromeda' });
      const result2 = await callApi.execute({ galaxy: 'pegasus' });
      const result3 = await callApi.execute({ galaxy: 'andromeda' });
      const result4 = await callApi.execute({ galaxy: 'pegasus' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // invalidate the cached value for one of the inputs
      await callApi.invalidate({
        forKey: JSON.stringify([{ galaxy: 'andromeda' }]),
      });

      // now call the cache again for that invalidated value, and prove it called the api again
      const result5 = await callApi.execute({ galaxy: 'andromeda' });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);
    });
    it('should be able to invalidate a cached value by key when the cache is to be defined at runtime from inputs', async () => {
      // define an example fn
      const { cache } = createExampleAsyncCache<string>();
      const apiCalls = [];
      const callApi = withExtendableCachingAsync(
        async (
          { galaxy }: { galaxy: string },
          _: { cache: SimpleAsyncCache<string> },
        ) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        {
          cache: ({ fromInput }) => fromInput[1].cache,
          serialize: {
            key: ({ forInput }) => forInput[0].galaxy, // dont include cache as part of the key + simplify the key to just the galaxy
          },
        },
      );

      // call the fn a few times
      const result1 = await callApi.execute({ galaxy: 'andromeda' }, { cache });
      const result2 = await callApi.execute({ galaxy: 'pegasus' }, { cache });
      const result3 = await callApi.execute({ galaxy: 'andromeda' }, { cache });
      const result4 = await callApi.execute({ galaxy: 'pegasus' }, { cache });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // prove that it will throw a helpful error if we dont explicitly pass in the cache in this case
      try {
        await callApi.invalidate({ forKey: 'andromeda' });
        throw new Error('should not reach here');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        if (!(error instanceof BadRequestError))
          throw new Error('error should have been instance of BadRequestError'); // satisfy typescript defs
        expect(error.message).toContain(
          'could not find the cache to invalidate',
        );
        expect(error.message).toMatchSnapshot();
      }

      // invalidate the cached value for one of the inputs
      await callApi.invalidate({ forKey: 'andromeda', cache });

      // now call the cache again for that invalidated value, and prove it called the api again
      const result5 = await callApi.execute({ galaxy: 'andromeda' }, { cache });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);
    });
  });
  describe('update', () => {
    it('should be able to update a cached value by input', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCachingAsync(
        async ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleAsyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi.execute({ galaxy: 'andromeda' });
      const result2 = await callApi.execute({ galaxy: 'pegasus' });
      const result3 = await callApi.execute({ galaxy: 'andromeda' });
      const result4 = await callApi.execute({ galaxy: 'pegasus' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // update the cached value for one of the inputs
      await callApi.update({
        forInput: [{ galaxy: 'andromeda' }],
        toValue: 821,
      });

      // now call the cache again
      const result5 = await callApi.execute({ galaxy: 'andromeda' });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).toEqual(821);
      expect(result5).not.toEqual(result1);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
    it('should be able to update a cached value by key', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCachingAsync(
        async ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleAsyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi.execute({ galaxy: 'andromeda' });
      const result2 = await callApi.execute({ galaxy: 'pegasus' });
      const result3 = await callApi.execute({ galaxy: 'andromeda' });
      const result4 = await callApi.execute({ galaxy: 'pegasus' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // update the cached value for one of the inputs
      await callApi.update({
        forKey: JSON.stringify([{ galaxy: 'andromeda' }]),
        toValue: 821,
      });

      // now call the cache again
      const result5 = await callApi.execute({ galaxy: 'andromeda' });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).toEqual(821);
      expect(result5).not.toEqual(result1);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
    it('should be able to update a cached value by key when the cache is to be defined at runtime from inputs', async () => {
      // define an example fn
      const { cache } = createExampleAsyncCache<string>();
      const apiCalls = [];
      const callApi = withExtendableCachingAsync(
        async (
          { galaxy }: { galaxy: string },
          _: { cache: SimpleAsyncCache<string> },
        ) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        {
          cache: ({ fromInput }) => fromInput[1].cache,
          serialize: {
            key: ({ forInput }) => forInput[0].galaxy, // dont include cache as part of the key + simplify the key to just the galaxy
          },
        },
      );

      // call the fn a few times
      const result1 = await callApi.execute({ galaxy: 'andromeda' }, { cache });
      const result2 = await callApi.execute({ galaxy: 'pegasus' }, { cache });
      const result3 = await callApi.execute({ galaxy: 'andromeda' }, { cache });
      const result4 = await callApi.execute({ galaxy: 'pegasus' }, { cache });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // prove that it will throw a helpful error if we dont explicitly pass in the cache in this case
      try {
        await callApi.update({ forKey: 'andromeda', toValue: 821 });
        throw new Error('should not reach here');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        if (!(error instanceof BadRequestError))
          throw new Error('error should have been instance of BadRequestError'); // satisfy typescript defs
        expect(error.message).toContain('could not find the cache to update');
        expect(error.message).toMatchSnapshot();
      }

      // invalidate the cached value for one of the inputs
      await callApi.update({ forKey: 'andromeda', toValue: 821, cache });

      // now call the cache again
      const result5 = await callApi.execute({ galaxy: 'andromeda' }, { cache });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).toEqual(821);
      expect(result5).not.toEqual(result1);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
    it('should be able to update a cached value by input to a value based on prior value', async () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCachingAsync(
        async ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleAsyncCache().cache },
      );

      // call the fn a few times
      const result1 = await callApi.execute({ galaxy: 'andromeda' });
      const result2 = await callApi.execute({ galaxy: 'pegasus' });
      const result3 = await callApi.execute({ galaxy: 'andromeda' });
      const result4 = await callApi.execute({ galaxy: 'pegasus' });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // update the cached value for one of the inputs
      await callApi.update({
        forInput: [{ galaxy: 'andromeda' }],
        toValue: ({ fromCachedOutput }) => (fromCachedOutput ?? 0) * 2,
      });

      // now call the cache again
      const result5 = await callApi.execute({ galaxy: 'andromeda' });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).not.toEqual(result1);
      expect(result5).toEqual(result1 * 2);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
  });
});
