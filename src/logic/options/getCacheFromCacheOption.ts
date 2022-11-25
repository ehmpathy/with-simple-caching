import { isAFunction } from 'type-fns';
import { BadRequestError } from '../../utils/errors/BadRequestError';
import { SimpleCache, SimpleCacheExtractionMethod } from '../../domain/SimpleCache';

/**
 * how the cache can be specified for use with simple caching
 * - either directly
 * - or through a cache extraction method, which grabs the cache from input args
 */
export type WithSimpleCachingCacheOption<LI extends any[], C extends SimpleCache<any>> = C | SimpleCacheExtractionMethod<LI, C>;

/**
 * how to extract the with simple caching cache option
 */
export const getCacheFromCacheOption = <LI extends any[], C extends SimpleCache<any>>({
  forInput,
  cacheOption,
}: {
  forInput: LI;
  cacheOption: WithSimpleCachingCacheOption<LI, C>;
}): C => {
  if (isAFunction(cacheOption)) {
    const foundCache = cacheOption({ fromInput: forInput });
    if (!foundCache) throw new BadRequestError('could not extract cache from input with cache resolution method', { forInput });
    return foundCache;
  }
  return cacheOption;
};
