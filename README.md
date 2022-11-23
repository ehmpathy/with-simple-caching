# with-simple-caching

![ci_on_commit](https://github.com/ehmpathy/with-simple-caching/workflows/ci_on_commit/badge.svg)
![deploy_on_tag](https://github.com/ehmpathy/with-simple-caching/workflows/deploy_on_tag/badge.svg)

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
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
  },
});
```


### Use a custom key serialization method

serialize the key as the sha hash of the args, for example

```ts
import { createCache } from 'simple-on-disk-cache';
import { withSimpleCaching } from 'with-simple-caching';

const getRecipesFromApiWithLocalStorageCaching = withSimpleCaching(getRecipesFromApi, {
  // just define how a cache can `get` from and `set` to this data store
  cache: createCache({ directory: { s3: { bucket: '__bucket__', prefix: '__prefix__' } } }),
  serialize: {
    key: (args) =>
        crypto.createHash('sha256').update(JSON.stringify(args)).digest('hex'),
  }
});
```


### Use a custom value serialization and deserialization method

if your cache requires you to store data as a string, you can define how to serialize and deserialize the response of your logic

```ts
import { createCache } from 'simple-on-disk-cache';
import { withSimpleCaching } from 'with-simple-caching';

const getRecipesFromApiWithLocalStorageCaching = withSimpleCaching(getRecipesFromApi, {
  // just define how a cache can `get` from and `set` to this data store
  cache: createCache({ directory: { s3: { bucket: '__bucket__', prefix: '__prefix__' } } }),
  serialize: {
    value: async (response) => JSON.stringify(await response),
  },
  deserialize: {
    value: async (cached) => JSON.parse(await cached)
  }
});
```

### Define the cache at runtime from function inputs

if your cache is defined as part of the inputs to your function (e.g., if you're using the input context pattern), you define where to find the cache in the inputs

for example
```ts
import { createCache, SimpleInMemoryCache } from 'simple-in-memory-cache';
import { withSimpleCaching } from 'with-simple-caching';

const getBookByName = withSimpleCaching(
  async ({ name: string}, context: { cache: SimpleInMemoryCache<Book> }) => {
    /* ... get the book ... */
    return book;
  },
  {
    cache: ({ fromInput }) => fromInput[1].context.cache, // grab the cache from the input's "context" parameter (the second input parameter)
  },
);

const book = await getBookByName({ name: 'Hitchhikers Guide to the Galaxy' }, { cache: createCache() });
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
