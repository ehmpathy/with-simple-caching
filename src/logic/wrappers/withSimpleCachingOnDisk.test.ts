import { withSimpleCachingOnDisk } from './withSimpleCachingOnDisk';

describe('withSimpleCachingOnDisk', () => {
  it('should be able to wrap a procedure that has a custom context', async () => {
    // given a procedure with custom context
    const procedure = async (
      input: { name: string },
      _: { dbConnection: string },
    ) => input.name;

    // then we should be able to wrap it
    const wrapped = withSimpleCachingOnDisk(procedure, {
      procedure: { name: 'test', version: '1' },
      directory: { mounted: { path: __dirname + '/.tmp' } },
    });

    // and it should work
    expect(await wrapped({ name: 'casey' }, { dbConnection: 'yes' })).toEqual(
      'casey',
    );
  });
});
