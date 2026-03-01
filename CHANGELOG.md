# Changelog

## [0.23.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.22.0...v0.23.0) (2026-03-01)


### Features

* add scheduled tasks frontend and documentation ([#80](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/80)) ([a642475](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/a642475239ce4e4255ee30e2ec39e27400f334de))

## [0.22.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.21.0...v0.22.0) (2026-02-28)


### Features

* add migration script for reminders to scheduled tasks ([#78](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/78)) ([f31960e](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/f31960e55b836bbf451f249467b0cd407f2b2904))

## [0.21.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.20.0...v0.21.0) (2026-02-28)


### Features

* add scheduled tasks agent tools, analytics, and integration ([#76](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/76)) ([c7f6f87](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/c7f6f87d0dacdeca40b8c3a9b8ee6791f7193ccc))

## [0.20.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.19.2...v0.20.0) (2026-02-28)


### Features

* add scheduled tasks foundation — schema, core logic, tests ([#74](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/74)) ([14d49b6](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/14d49b67c2b4dbe7a495549b2106bfc499f1fcbb))

## [0.19.2](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.19.1...v0.19.2) (2026-02-28)


### Bug Fixes

* enforce WhatsApp 24h session window for all message types ([#72](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/72)) ([a6e6a37](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/a6e6a37840bab57e087b4ac416fc9ebbf25612a4))

## [0.19.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.19.0...v0.19.1) (2026-02-28)


### Bug Fixes

* resolve feedback CORS issue and improve agent tool reliability ([#69](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/69)) ([360aceb](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/360aceb5466a511db5fa9a1bdfadd8ca66329053))

## [0.19.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.18.1...v0.19.0) (2026-02-28)


### Features

* add feedback & suggestions system ([#66](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/66)) ([36da98f](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/36da98f42722d596218f0cf2a45021c89bf3cdfb))

## [0.18.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.18.0...v0.18.1) (2026-02-28)


### Bug Fixes

* use PAT for Claude workflow to trigger CI on PRs ([#65](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/65)) ([0dc88fe](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/0dc88fe8801297f16de4a57c4d75011719927f1c))

## [0.18.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.17.0...v0.18.0) (2026-02-27)


### Features

* **analytics:** add ProWrite LLM tracking + feature_used event ([#62](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/62)) ([2499e49](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/2499e492f6c41a0b4058f883577a7d5c34dea4c5))

## [0.17.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.16.3...v0.17.0) (2026-02-27)


### Features

* add ProWrite multi-LLM professional writing pipeline ([#60](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/60)) ([6ee9ef7](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/6ee9ef74c9dc88a4a65fe66dccd53ab24c0315c5))

## [0.16.3](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.16.2...v0.16.3) (2026-02-27)


### Bug Fixes

* **items:** add silent dedup to createItem — prevent duplicate items on repeated saves ([#57](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/57)) ([f443260](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/f4432601b3f941b13826c9308fe93c9fb06aec2a)), closes [#50](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/50)

## [0.16.2](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.16.1...v0.16.2) (2026-02-27)


### Bug Fixes

* prevent phantom items in query results ([#55](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/55)) ([46a5d98](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/46a5d985fa8b3d4192e402c5e3cdab8eda0b6d28))

## [0.16.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.16.0...v0.16.1) (2026-02-27)


### Bug Fixes

* scope queryItems by collectionName when querying specific item type ([#53](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/53)) ([67fbc6a](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/67fbc6af3e37db720b6798ea4559e7066d975a9c)), closes [#48](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/48)

## [0.16.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.15.0...v0.16.0) (2026-02-27)


### Features

* structured data docs + landing page + feature page ([#51](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/51)) ([6268b6d](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/6268b6d0b4775466a05403e64cf30eac7b8669c0))

## [0.15.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.14.0...v0.15.0) (2026-02-27)


### Features

* embedding pipeline + vector search + hybrid fallback ([#46](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/46)) ([3b6b933](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/3b6b93378581fa0f08b757becd9b6608825ddc69))

## [0.14.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.13.0...v0.14.0) (2026-02-27)


### Features

* add agent item/collection tools + JSON refactor ([#44](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/44)) ([7939e5d](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/7939e5d429438b728bef9685ce2ab42931c7385f))

## [0.13.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.12.2...v0.13.0) (2026-02-27)


### Features

* add structured data schema + CRUD (items & collections) ([#42](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/42)) ([ce5580b](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/ce5580bdb80443b5408d52dc7d0cae4f426f20c3))

## [0.12.2](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.12.1...v0.12.2) (2026-02-26)


### Bug Fixes

* surface text/* documents to agent via resolveMedia ([#37](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/37)) ([fc276a9](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/fc276a963474f958e17ecf9e86ea96d67fefbde7))

## [0.12.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.12.0...v0.12.1) (2026-02-26)


### Bug Fixes

* reminders fire late due to wrong tool and silent send failure ([#36](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/36)) ([5fc91df](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/5fc91dfc6f906fed5c35bf66522fad900cff06de))

## [0.12.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.11.0...v0.12.0) (2026-02-26)


### Features

* open all features to basic users — Pro = more credits only ([#30](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/30)) ([1645f5a](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/1645f5ac235ac54edd3607c78cb7e753f9f95d39))

## [0.11.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.10.0...v0.11.0) (2026-02-26)


### Features

* structured memory system with auto-compaction ([#28](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/28)) ([1a33411](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/1a3341156b5d7f89ce43878f880f607886064ac3))

## [0.10.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.9.0...v0.10.0) (2026-02-26)


### Features

* add reprocessMedia tool for extracting content from previous files ([#26](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/26)) ([f3dd8bb](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/f3dd8bb8009514076623479cab9cb3b96eb482d4))

## [0.9.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.8.0...v0.9.0) (2026-02-26)


### Features

* add resolveMedia tool for generic media referencing by type ([#24](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/24)) ([5801981](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/5801981077c7e540d1cc13fe9c18131f95f7d3fa))

## [0.8.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.7.1...v0.8.0) (2026-02-26)


### Features

* add file conversion via CloudConvert agent tool ([#21](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/21)) ([9ba2a77](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/9ba2a77c9f611c3c55e8dc12c7f1b860ab4de95a))

## [0.7.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.7.0...v0.7.1) (2026-02-26)


### Bug Fixes

* store voice notes for reply-to-media support ([#20](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/20)) ([84aa705](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/84aa705441507ac33cd8dc3afecf8de4095343ca))
* use RELEASE_PLEASE_TOKEN in CI workflows ([#17](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/17)) ([2f0c3da](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/2f0c3da887354bc9140282f3cb3b8d7dcf0a5216)), closes [#16](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/16)

## [0.7.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.6.0...v0.7.0) (2026-02-25)


### Features

* add account page and fix sign-in redirect flow ([#5](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/5)) ([e2d0749](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/e2d074951c485890b5e0cb5d7967937920e7f52f)), closes [#3](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/3)
* add Dubai-timezone daily stats alongside rolling 24h stats ([#11](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/11)) ([adf48fa](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/adf48faf02db1c6c9de5de7ae8996f003cb1a8bf))
* expand phone country detection to comprehensive E.164 coverage ([#12](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/12)) ([693fc93](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/693fc935de5cb136fd6f5d88d078fff03e72c485))
* redesign account page with credit gauge and live data ([#8](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/8)) ([979a0c6](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/979a0c63aa68d63855a16fb957189c3328e6548e))


### Bug Fixes

* prevent horizontal overflow on /features pages on mobile ([#6](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/6)) ([16814a9](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/16814a9bb4556a9946b7ef84428563f02b20b525)), closes [#4](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/4)
