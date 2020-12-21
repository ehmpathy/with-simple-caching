# with-simple-caching

![ci_on_commit](https://github.com/uladkasach/with-simple-caching/workflows/ci_on_commit/badge.svg)
![deploy_on_tag](https://github.com/uladkasach/with-simple-caching/workflows/deploy_on_tag/badge.svg)

A wrapper that makes it simple to add caching to any function.

Notable features:

- Wrapper pattern for simple and clean usage
- Automatic cache key definition
- Customizable cache data store

# Install

```sh
npm install --save with-simple-caching
```

# Examples

### Add caching to an existing function

```ts
import { createCache } from 'simple-in-memory-cache';
import { withSimpleCaching } from 'with-simple-caching';

const getRecipesFromApiWithCaching = withSimpleCaching(getRecipesFromApi, { cache: createCache() });
```

### Define the function with caching directly

```ts
import { createCache } from 'simple-in-memory-cache';
import { withSimpleCaching } from 'with-simple-caching';

const getBookByName = withSimpleCaching(
  async (name: string) => {
    /* ... get the book ... */
    return book;
  },
  {
    cache: createCache(),
  },
);
```

### Use a custom persistance layer

local storage, for example:

```ts
import { withSimpleCaching } from 'with-simple-caching';

const getRecipesFromApiWithLocalStorageCaching = withSimpleCaching(getRecipesFromApi, {
  // just define how a cache can `get` from and `set` to this data store
  cache: {
    get: (key) => storage.getItem(key),
    set: (key, value) => storage.setItem(key, value),
  },
});
```

# Features

### Automatic cache key

The arguments your function is invoked with is used as the cache key, after serialization. For example:

```ts
import { createCache } from 'simple-in-memory-cache';
import { withSimpleCaching } from 'with-simple-caching';

const getZodiacSign = withSimpleCaching(async ({ birthday }: { birthday: string }) => /* ... */, { cache: createCache() });

getZodiacSign({ birthday: '2020-07-21' }); // here the cache key is `[{"birthday":"2020-07-21"}]`
```

_note: array order **does** matter_

### Customizable cache data store

You can easily use a custom cache or custom data store / persistance layer for caching with this wrapper.

```ts
import { withSimpleCaching } from 'with-simple-caching';

const getZodiacSign = withSimpleCaching(
  async ({ birthday }: { birthday: string }) => /* ... */,
  {
    cache: {
      get: (key: string) => /* ... how to get from your custom data store ... */,
      set: (key: string, value: any) => /** ... how to set to your custom data store ... */,
    }
  }
);
```
