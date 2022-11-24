# Changelog

### [0.9.2](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.9.1...v0.9.2) (2022-11-24)


### Bug Fixes

* **types:** simplify generics by removing extended input and output methods ([b492de1](https://www.github.com/ehmpathy/with-simple-caching/commit/b492de1625f5e8d5b0a18499ffe823d55696886c))

### [0.9.1](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.9.0...v0.9.1) (2022-11-24)


### Bug Fixes

* **types:** add a generic for the logic input, for extendability ([bfd78c9](https://www.github.com/ehmpathy/with-simple-caching/commit/bfd78c9082fcb15b2d9e6bf85da16c364ed35de1))

## [0.9.0](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.8.2...v0.9.0) (2022-11-23)


### Features

* **extendability:** enable invalidation and update of extendable cache forKey, not just forInput ([fa25170](https://www.github.com/ehmpathy/with-simple-caching/commit/fa25170f31e24174d955f97a6653a742c0ff7b7c))

### [0.8.2](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.8.1...v0.8.2) (2022-11-23)


### Bug Fixes

* **types:** update the name of the onset hooks trigger arg ([45139c4](https://www.github.com/ehmpathy/with-simple-caching/commit/45139c4e67d17defbbd5e3e0e09d693777b7a7cb))

### [0.8.1](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.8.0...v0.8.1) (2022-11-23)


### Bug Fixes

* **hooks:** trigger onset hook from extended invalidate and update methods ([e9f4fe5](https://www.github.com/ehmpathy/with-simple-caching/commit/e9f4fe5f3d33889525c548b05674fcf912fd93b7))

## [0.8.0](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.7.2...v0.8.0) (2022-11-23)


### Features

* **hooks:** allow users to specify an onSet hook, which gets triggered exactly after set is confirmed ([be77bf6](https://www.github.com/ehmpathy/with-simple-caching/commit/be77bf62c2bb6a0a39cf2562b87e3869c88693f1))

### [0.7.2](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.7.1...v0.7.2) (2022-11-23)


### Bug Fixes

* **references:** replace final references from uladkasach org to ehmpathy org ([e874165](https://www.github.com/ehmpathy/with-simple-caching/commit/e87416573c8562474254036aa15852eb727047a9))
* **types:** expose an explicit type for the output of logic wrapped with extendable caching ([87446c0](https://www.github.com/ehmpathy/with-simple-caching/commit/87446c0fbf1696aaa54ec2c08811218888644946))
* **types:** update the type of the cache resolution method for easier readability in implementation ([de4ce8d](https://www.github.com/ehmpathy/with-simple-caching/commit/de4ce8d833894e336ce4fd60cae87384a0fb42d4))

### [0.7.1](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.7.0...v0.7.1) (2022-11-23)


### Bug Fixes

* **tests:** ensure that expiration time test has delay buffer for reliability ([940cf03](https://www.github.com/ehmpathy/with-simple-caching/commit/940cf0343af6f0098e6d1935d2583b7e45643fd2))
* **types:** generalize WithSimpleCachingOptions and expose from package for extensibility ([bfa77a3](https://www.github.com/ehmpathy/with-simple-caching/commit/bfa77a3e2a0dfa3bdf5cc86c922810750b8c832e))

## [0.7.0](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.6.0...v0.7.0) (2022-11-23)


### Features

* **extend:** expose withExtendableCaching enabling easy external invalidation and update of the wrapped logic cache ([d86c628](https://www.github.com/ehmpathy/with-simple-caching/commit/d86c628ceaf0fe995faf692cae18f73295fda397))

## [0.6.0](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.5.0...v0.6.0) (2022-11-23)


### Features

* **cache:** enable defining cache from logic input args at runtime ([f96a291](https://www.github.com/ehmpathy/with-simple-caching/commit/f96a29146843e4ac6f987167532777a1ee9b9c9a))

## [0.5.0](https://www.github.com/ehmpathy/with-simple-caching/compare/v0.4.1...v0.5.0) (2022-11-22)


### Features

* **expiration:** enable using custom expiration policy per wrapper ([f4611dc](https://www.github.com/ehmpathy/with-simple-caching/commit/f4611dc4ad29f9f8941772a201d9500b0f537c0e))

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
