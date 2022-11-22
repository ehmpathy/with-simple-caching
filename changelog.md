# Changelog

### [0.4.1](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.4.0...v0.4.1) (2022-11-22)


### Bug Fixes

* **invalidation:** ensure null is treated as a valid cached value; only undefined as the invalidation literal ([4a2327c](https://www.github.com/ehmpathy/with-simple-caching/commit/4a2327c5cfb40093ecf121c04e9980501fc26ee7))

## [0.4.0](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.3.0...v0.4.0) (2022-11-20)


### Features

* **async-caches:** explicitly support caches with async setters ([5b3bc22](https://www.github.com/ehmpathy/with-simple-caching/commit/5b3bc226728ff0be117953a15dcb2a9e84ff2c18))


### Bug Fixes

* **docs:** update readme example of custom serialize and deserialize ([a38d1d4](https://www.github.com/ehmpathy/with-simple-caching/commit/a38d1d4419dbd02ae7ee6e5a31bfe860ff179cc7))
* **tests:** add tests proving correct handing of errors ([0ad7f9b](https://www.github.com/ehmpathy/with-simple-caching/commit/0ad7f9b6fb6241933549361b17e401e58e6fcac5))

## [0.3.0](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.2.1...v0.3.0) (2022-10-06)


### Features

* **serde:** enable custom serialization and deserialization of cached value ([0065891](https://www.github.com/ehmpathy/with-simple-caching/commit/00658914abadc1172a285c17e31ac66427f91fe6))

### [0.2.1](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.2.0...v0.2.1) (2022-10-06)


### Bug Fixes

* **promises:** handle case where the cache get method is async ([45987fe](https://www.github.com/ehmpathy/with-simple-caching/commit/45987fee32d1233dd4d9da01386b5bb6be2ca7f4))

## [0.2.0](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.1.3...v0.2.0) (2022-10-06)


### Features

* **cicd:** add please-release to cicd ([b8fc9c5](https://www.github.com/ehmpathy/with-simple-caching/commit/b8fc9c5a7b5a7fa485e59978cd97b605a3ade41b))
* **serialize:** enable users to specify a custom key serialization method ([67041a1](https://www.github.com/ehmpathy/with-simple-caching/commit/67041a1c7508d23b90c0835ea4f10bffe4a94e66))


### Bug Fixes

* **types:** correctly support async caches that promise T | undefined ([c1c9c12](https://www.github.com/ehmpathy/with-simple-caching/commit/c1c9c120e7c63c37d98a04f4e3f17d9227d03573))
