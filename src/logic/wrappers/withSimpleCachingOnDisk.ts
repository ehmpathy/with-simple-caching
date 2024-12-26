import { UniDuration } from '@ehmpathy/uni-time';
import { asSerialJSON, deSerialJSON, SerialJSON } from 'serde-fns';
import { castToSafeOnDiskCacheKey, createCache } from 'simple-on-disk-cache';
import { ProcedureInput, VisualogicContext } from 'visualogic';

import { withSimpleCachingAsync } from './withSimpleCachingAsync';

/**
 * .what = a utility to make it easier to use on-disk caching
 * .why =
 *   - embeds best practices of how to serialize and deserialize
 */
export const withSimpleCachingOnDisk = <I, R>(
  logic: (input: I, context: VisualogicContext) => Promise<R>,
  options: {
    procedure: {
      name: string;
      version: string | null;
    };
    expiration?: UniDuration | null;
    directory: ProcedureInput<typeof createCache>['directory'];
  },
) => {
  return withSimpleCachingAsync(logic, {
    cache: createCache({
      directory: options.directory,
      expiration: options.expiration,
    }),
    serialize: {
      key: ({ forInput }) =>
        castToSafeOnDiskCacheKey({
          procedure: options.procedure,
          execution: {
            input: forInput,
          },
        }),
      value: asSerialJSON,
    },
    deserialize: {
      value: (output) => deSerialJSON(output as SerialJSON),
    },
  });
};
