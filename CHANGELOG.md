# Changelog

## [0.39.5](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.39.4...v0.39.5) (2026-03-10)


### Bug Fixes

* show active vs dormant user counts in admin stats ([#210](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/210)) ([bb6bdda](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/bb6bdda806ddf4048d155eed0f02b9c3e7fd1bff))

## [0.39.4](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.39.3...v0.39.4) (2026-03-10)


### Bug Fixes

* pass explicit media type when sending converted files via WhatsApp ([#208](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/208)) ([6cab3dc](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/6cab3dc05c328a956daa64d8bd76793bc66ac751))

## [0.39.3](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.39.2...v0.39.3) (2026-03-10)


### Bug Fixes

* document processing failures — MIME inference, silent errors, and broken tool result extraction ([#206](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/206)) ([60c0f66](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/60c0f66889621321986d2b7bf8d73f64c11467f7)), closes [#202](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/202)

## [0.39.2](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.39.1...v0.39.2) (2026-03-10)


### Bug Fixes

* prevent silent reply drops and inline reflection leaks in extractResponseText ([#204](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/204)) ([7ee6036](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/7ee6036345468d5b86831195521b444056cd26f8))

## [0.39.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.39.0...v0.39.1) (2026-03-10)


### Bug Fixes

* admin template send broken by Twilio→360dialog field mismatch ([#201](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/201)) ([06e2dc1](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/06e2dc1a05a0f480c3b67c44a7a756d7ca157c30))

## [0.39.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.38.1...v0.39.0) (2026-03-10)


### Features

* template message policy — 7-day inactivity gate and opt-out coverage ([#199](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/199)) ([f42affc](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/f42affc92afc72a00ffdacbf18d9646fef985d4e))

## [0.38.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.38.0...v0.38.1) (2026-03-10)


### Bug Fixes

* proxy 360dialog media downloads to avoid 401 ([#197](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/197)) ([07080d8](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/07080d80b245437bcb6393f068bcbb3e7f3066f2))

## [0.38.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.37.1...v0.38.0) (2026-03-10)


### Features

* dormant user flag for pre-360dialog users ([#195](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/195)) ([f0a1db1](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/f0a1db10f70e533c6ee35324faa745e2ee576389))

## [0.37.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.37.0...v0.37.1) (2026-03-10)


### Bug Fixes

* suppress internal reflection text from leaking as WhatsApp messages ([#189](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/189)) ([ac3a514](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/ac3a51468fa19cee604c30fca73153ba6ba0205c))

## [0.37.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.36.3...v0.37.0) (2026-03-10)


### Features

* typing indicator via 360dialog Cloud API ([#187](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/187)) ([c530836](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/c5308363c2f24c76376968987a63c9dee2943532))

## [0.36.3](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.36.2...v0.36.3) (2026-03-10)


### Bug Fixes

* revert 360dialog media URL to correct v2 format ([#183](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/183)) ([dbdf5c8](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/dbdf5c897aae664ce662030f3303833b18c92922)), closes [#182](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/182)

## [0.36.2](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.36.1...v0.36.2) (2026-03-10)


### Bug Fixes

* add missing /v1/media/ path segment in 360dialog media download URL ([#180](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/180)) ([fe29d30](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/fe29d3087aea2d025d32d1c8703dcec2e936ea0a)), closes [#178](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/178)

## [0.36.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.36.0...v0.36.1) (2026-03-10)


### Bug Fixes

* allow unsigned webhooks + add template creation script ([#177](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/177)) ([9ff578d](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/9ff578d52862072181cf85e6cb5fefe88930096f))

## [0.36.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.35.2...v0.36.0) (2026-03-10)


### Features

* migrate WhatsApp BSP from Twilio to 360dialog ([#175](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/175)) ([cb0cc80](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/cb0cc80e51ad09228554e14d265e9fcdff87be7c))

## [0.35.2](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.35.1...v0.35.2) (2026-03-09)


### Bug Fixes

* cap message chunks to 3 — root cause of 100-message flood ([#171](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/171)) ([819183b](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/819183b9e14f3086823beabdc1f9ad6dd86c2008))

## [0.35.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.35.0...v0.35.1) (2026-03-09)


### Bug Fixes

* outbound rate guard, single-response guarantee, webhook hardening ([#169](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/169)) ([ec9b482](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/ec9b482a79b43036377825e81484a558abf65020))

## [0.35.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.34.0...v0.35.0) (2026-03-09)


### Features

* opt-out (stop/start) and account deletion flows ([#167](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/167)) ([5a86980](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/5a8698051bfaf43630747736ec87d6838b8405fb))

## [0.34.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.33.1...v0.34.0) (2026-03-08)


### Features

* Phase 2 — behavioral learning, milestones, proactive follow-ups ([#163](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/163)) ([f07ba83](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/f07ba83536a694db582c9c77fb575052bd1412ff))

## [0.33.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.33.0...v0.33.1) (2026-03-07)


### Bug Fixes

* replace dynamic import in migration + add scheduled tasks counter ([#161](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/161)) ([f352a42](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/f352a42b18c827171c526834df6ea0840cea6836))

## [0.33.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.32.1...v0.33.0) (2026-03-07)


### Features

* Phase 1 — default personality, language/timezone source of truth, personality bootstrap ([#158](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/158)) ([5104e92](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/5104e92d03aee723d6d71de02cbe03aa63ff7525))

## [0.32.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.32.0...v0.32.1) (2026-03-07)


### Bug Fixes

* replace em dash and add help command to welcome message footer ([#154](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/154)) ([3ccfd84](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/3ccfd84902b863737e8abde5623b7ebf93fd55bb)), closes [#153](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/153)

## [0.32.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.31.6...v0.32.0) (2026-03-07)


### Features

* simplify onboarding to single welcome message ([#151](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/151)) ([572ded5](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/572ded56b328debe0cccc119b38a9e4c62f6b0e9))

## [0.31.6](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.31.5...v0.31.6) (2026-03-07)


### Bug Fixes

* deduplicate ghali_chat_started Google Ads conversion event ([#148](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/148)) ([5151aab](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/5151aab0c7b5e93cd6401c27cf92f587e5c4e7e1))

## [0.31.5](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.31.4...v0.31.5) (2026-03-07)


### Bug Fixes

* **analytics:** replace posthog-node SDK with direct HTTP for reliable event delivery ([#145](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/145)) ([8e76e39](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/8e76e39355ad12ff74a1b3242c15ce3f983f41f3))

## [0.31.4](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.31.3...v0.31.4) (2026-03-07)


### Bug Fixes

* **analytics:** add $ai_trace_id to PostHog $ai_generation events ([#143](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/143)) ([f21e012](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/f21e012f5a9fdfb86d782e1cb988ebfd28f2244e))

## [0.31.3](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.31.2...v0.31.3) (2026-03-05)


### Bug Fixes

* **migrations:** improve LLM prompt and capture bare identity facts ([#141](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/141)) ([5f017e6](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/5f017e627e7f31d6eccb1a9ffe2415fddd9923a0))

## [0.31.2](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.31.1...v0.31.2) (2026-03-05)


### Bug Fixes

* **migrations:** detect cryptic snake_case keys in migrateProfileFormat ([#139](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/139)) ([d161495](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/d1614956c59ca96176fc3a4447653354c2e1dfcc))

## [0.31.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.31.0...v0.31.1) (2026-03-05)


### Bug Fixes

* **migrations:** handle users without profile file in migrateMemoryToProfile ([#137](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/137)) ([2bd9956](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/2bd995689a547042bb8290c736c7468e62e0ac06))

## [0.31.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.30.0...v0.31.0) (2026-03-05)


### Features

* **profile:** refactor to bullet-point sections with section-replace semantics ([#135](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/135)) ([48106b6](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/48106b6d05945db83df67183ec48e4b0d1c94e5e))

## [0.30.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.29.0...v0.30.0) (2026-03-05)


### Features

* **admin:** add onboarding infographic config and admin page ([#133](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/133)) ([c373022](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/c3730221c7fd81f4ca4c4dcbb09e749a7c4ba2fc))

## [0.29.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.28.0...v0.29.0) (2026-03-05)


### Features

* **admin:** add image-enabled broadcast template and upload support ([#131](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/131)) ([1fd8af8](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/1fd8af8d8c45216b764e10a4c0d38ae2645a4208))

## [0.28.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.27.0...v0.28.0) (2026-03-05)


### Features

* **agent:** add profile layer for structured identity facts ([#128](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/128)) ([dc9919e](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/dc9919e0766636f0dd932ec78c3de3dce4fba27e))

## [0.27.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.9...v0.27.0) (2026-03-05)


### Features

* **whatsapp:** add reply-to-text context for quoted messages ([#126](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/126)) ([a0246d4](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/a0246d434c49e6911d7f72a14608f6f621639044))

## [0.26.9](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.8...v0.26.9) (2026-03-04)


### Bug Fixes

* **analytics:** close user_new gap and fix user_returning session semantics ([#120](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/120)) ([65df80a](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/65df80aba553b41c8d96f4fe19ea3d9aab8a31a0))

## [0.26.8](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.7...v0.26.8) (2026-03-04)


### Bug Fixes

* **admin:** show rolling 7d/30d stats and consolidate duplicate queries ([#119](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/119)) ([5d2ee22](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/5d2ee22b86bf45d410afd9d4c719a5136397f050)), closes [#117](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/117)

## [0.26.7](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.6...v0.26.7) (2026-03-03)


### Bug Fixes

* ProWrite 'skip' produces no output and silent failure on Opus overload ([#113](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/113)) ([#115](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/115)) ([69cd258](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/69cd258460601df4b58d38e1c268dbc620f29b6c))

## [0.26.6](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.5...v0.26.6) (2026-03-03)


### Bug Fixes

* prevent agent retry/response loop during upstream API outages ([#109](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/109)) ([375f27b](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/375f27b59f38715480e3ae40dece50c946a22913))

## [0.26.5](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.4...v0.26.5) (2026-03-03)


### Bug Fixes

* **agent:** add conversational focus rule for ambiguous follow-ups ([#111](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/111)) ([272dbd4](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/272dbd499a35ea851002946c9183412311219d1a))

## [0.26.4](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.3...v0.26.4) (2026-03-02)


### Bug Fixes

* remove chat-based feedback submission, link-only ([#104](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/104)) ([e823fe6](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/e823fe6ae0c2d5aa254ebbcb945d0006f66e65ed))

## [0.26.3](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.2...v0.26.3) (2026-03-01)


### Bug Fixes

* **items:** sort queryItems results newest-first ([#99](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/99)) ([dda0852](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/dda0852fe2a97206239f2d5e0dba0c452b72e2cf))

## [0.26.2](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.1...v0.26.2) (2026-03-01)


### Bug Fixes

* update body/metadata on createItem duplicate title ([#100](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/100)) ([796210b](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/796210b094c2279f000410c67942bd9855c3368f))

## [0.26.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.26.0...v0.26.1) (2026-03-01)


### Bug Fixes

* track deep reasoning (Opus) calls as $ai_generation events ([#95](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/95)) ([3e124fc](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/3e124fc1e7a7cf89436df38f2d82471dc7672423))

## [0.26.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.25.0...v0.26.0) (2026-03-01)


### Features

* comprehensive SEO improvements ([#92](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/92)) ([#93](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/93)) ([804585a](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/804585a0fc93393c536edd6e77f9dfc1b7f70ba0))

## [0.25.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.24.0...v0.25.0) (2026-03-01)


### Features

* Arabic landing pages, dual pricing, sticky WhatsApp CTA, /start page, GTM ([#90](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/90)) ([758e642](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/758e6423f31f0035715b96309f18dd30e52097e8))

## [0.24.0](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.23.1...v0.24.0) (2026-03-01)


### Features

* add 'clear schedules' system command ([#85](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/85)) ([3e8a087](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/3e8a08770b0cff5ce15085456e60f55027bf6752))

## [0.23.1](https://github.com/ZenGardenDubai/ghali-ai-assistant/compare/v0.23.0...v0.23.1) (2026-03-01)


### Bug Fixes

* improve scheduled task execution prompt ([#82](https://github.com/ZenGardenDubai/ghali-ai-assistant/issues/82)) ([2e13bc2](https://github.com/ZenGardenDubai/ghali-ai-assistant/commit/2e13bc2ed74d9b95fa682a8b1467575985ca1a76))

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
