import { createExampleSyncCache } from '../../__test_assets__/createExampleCache';
import { SimpleCache } from '../../domain/SimpleCache';
import { BadRequestError } from '../../utils/errors/BadRequestError';
import { withExtendableCache } from './withExtendableCache';

describe('withExtendableCache', () => {
  describe('execute', () => {
    it('should be able to execute logic', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCache(
        () => {
          apiCalls.push(1);
          return Math.random();
        },
        { cache: createExampleSyncCache().cache },
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
    it('should be able to invalidate a cached value by input', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCache(
        ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleSyncCache().cache },
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
      callApi.invalidate({ forInput: [{ galaxy: 'andromeda' }] });

      // now call the cache again for that invalidated value, and prove it called the api again
      const result5 = callApi.execute({ galaxy: 'andromeda' });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);
    });
    it('should be able to invalidate a cached value by key', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCache(
        ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleSyncCache().cache },
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
      callApi.invalidate({ forKey: JSON.stringify([{ galaxy: 'andromeda' }]) });

      // now call the cache again for that invalidated value, and prove it called the api again
      const result5 = callApi.execute({ galaxy: 'andromeda' });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);
    });
    it('should be able to invalidate a cached value by key when the cache is to be defined at runtime from inputs', () => {
      // define an example fn
      const { cache } = createExampleSyncCache();
      const apiCalls = [];
      const callApi = withExtendableCache(
        ({ galaxy }: { galaxy: string }, _: { cache: SimpleCache<string> }) => {
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
      const result1 = callApi.execute({ galaxy: 'andromeda' }, { cache });
      const result2 = callApi.execute({ galaxy: 'pegasus' }, { cache });
      const result3 = callApi.execute({ galaxy: 'andromeda' }, { cache });
      const result4 = callApi.execute({ galaxy: 'pegasus' }, { cache });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // prove that it will throw a helpful error if we dont explicitly pass in the cache in this case
      try {
        callApi.invalidate({ forKey: 'andromeda' });
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
      callApi.invalidate({ forKey: 'andromeda', cache });

      // now call the cache again for that invalidated value, and prove it called the api again
      const result5 = callApi.execute({ galaxy: 'andromeda' }, { cache });
      expect(result5).not.toEqual(result1);
      expect(apiCalls.length).toEqual(3);
    });
  });
  describe('update', () => {
    it('should be able to update a cached value by input', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCache(
        ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleSyncCache().cache },
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
      callApi.update({ forInput: [{ galaxy: 'andromeda' }], toValue: 821 });

      // now call the cache again
      const result5 = callApi.execute({ galaxy: 'andromeda' });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).toEqual(821);
      expect(result5).not.toEqual(result1);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
    it('should be able to update a cached value by key', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCache(
        ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleSyncCache().cache },
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
      callApi.update({
        forKey: JSON.stringify([{ galaxy: 'andromeda' }]),
        toValue: 821,
      });

      // now call the cache again
      const result5 = callApi.execute({ galaxy: 'andromeda' });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).toEqual(821);
      expect(result5).not.toEqual(result1);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
    it('should be able to update a cached value by key when the cache is to be defined at runtime from inputs', () => {
      // define an example fn
      const { cache } = createExampleSyncCache();
      const apiCalls = [];
      const callApi = withExtendableCache(
        ({ galaxy }: { galaxy: string }, _: { cache: SimpleCache<string> }) => {
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
      const result1 = callApi.execute({ galaxy: 'andromeda' }, { cache });
      const result2 = callApi.execute({ galaxy: 'pegasus' }, { cache });
      const result3 = callApi.execute({ galaxy: 'andromeda' }, { cache });
      const result4 = callApi.execute({ galaxy: 'pegasus' }, { cache });

      // check that the response is the same each time the input is the same
      expect(result1).toEqual(result3);
      expect(result2).toEqual(result4);

      // check that "api" was only called twice
      expect(apiCalls.length).toEqual(2);

      // prove that it will throw a helpful error if we dont explicitly pass in the cache in this case
      try {
        callApi.update({ forKey: 'andromeda', toValue: 821 });
        throw new Error('should not reach here');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
        if (!(error instanceof BadRequestError))
          throw new Error('error should have been instance of BadRequestError'); // satisfy typescript defs
        expect(error.message).toContain('could not find the cache to update');
        expect(error.message).toMatchSnapshot();
      }

      // invalidate the cached value for one of the inputs
      callApi.update({ forKey: 'andromeda', toValue: 821, cache });

      // now call the cache again
      const result5 = callApi.execute({ galaxy: 'andromeda' }, { cache });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).toEqual(821);
      expect(result5).not.toEqual(result1);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
    it('should be able to update a cached value by input to a value based on prior value', () => {
      // define an example fn
      const apiCalls = [];
      const callApi = withExtendableCache(
        ({ galaxy }: { galaxy: string }) => {
          apiCalls.push(galaxy);
          return Math.random();
        },
        { cache: createExampleSyncCache().cache },
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
      callApi.update({
        forInput: [{ galaxy: 'andromeda' }],
        toValue: ({ fromCachedOutput }) => (fromCachedOutput ?? 0) * 2,
      });

      // now call the cache again
      const result5 = callApi.execute({ galaxy: 'andromeda' });

      // and prove that the value changed to what we wanted to update it to
      expect(result5).not.toEqual(result1);
      expect(result5).toEqual(result1 * 2);

      // and prove that we didn't call the api again
      expect(apiCalls.length).toEqual(2);
    });
  });
});
