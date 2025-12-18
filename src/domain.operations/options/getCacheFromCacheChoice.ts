import { isAFunction } from 'type-fns';

import type { SimpleCache } from '@src/domain.objects/SimpleCache';
import { BadRequestError } from '@src/utils/errors/BadRequestError';

/**
 * a method which specifies where how to extract a simple-cache from input args
 */
export type SimpleCacheExtractionMethod<
  LI extends any[],
  C extends SimpleCache<any>,
> = (args: { fromInput: LI }) => C;

/**
 * how the cache can be specified for use with simple cache
 * - either directly
 * - or through a cache extraction method, which grabs the cache from input args
 */
export type WithSimpleCacheChoice<
  LI extends any[],
  C extends SimpleCache<any>,
> = C | SimpleCacheExtractionMethod<LI, C>;

/**
 * how to extract the with simple cache choice
 */
export const getCacheFromCacheChoice = <
  LI extends any[],
  C extends SimpleCache<any>,
>({
  forInput,
  cacheOption,
}: {
  forInput: LI;
  cacheOption: WithSimpleCacheChoice<LI, C>;
}): C => {
  if (isAFunction(cacheOption)) {
    const foundCache = cacheOption({ fromInput: forInput });
    if (!foundCache)
      throw new BadRequestError(
        'could not extract cache from input with cache resolution method',
        { forInput },
      );
    return foundCache;
  }
  return cacheOption;
};
