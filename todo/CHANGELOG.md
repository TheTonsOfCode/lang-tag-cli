# Changelog

All notable changes for the packages in this monorepo. Entries are grouped by package and follow semantic versioning for each package. Dates reflect commit timestamps. Minor/no-op commits (init/todo/log-only) are omitted. Versions before the 0.10.0 split are labeled as Core (the unified package before CLI separation).

## [CLI] 0.21.0 - 2025-12-05

### Changed

- Added a typed return type for TypeScript library tags to keep emitted definitions lightweight and consistent.

## [CLI] 0.20.0 - 2025-12-05

### Added

- Enforced private `_` prefix for library tags.
- Regenerated `getCurrentConfig` event signature and improved debug logging.
- Library config collection now works without namespace.

### Changed

- Hide the compiled exports command.

## [CLI] 0.19.0 - 2025-11-14

### Added

- Support for generic lang tags.
- Dictionary collector now appends namespace by default.

## [CLI] 0.18.1 - 2025-10-28

### Changed

- Added informational log for `init`.

## [CLI] 0.18.0 - 2025-10-28

### Added

- Interactive `init` command.

## [CLI] 0.17.0 - 2025-10-28

### Changed

- Renamed `config.ts` to `type.ts` and applied formatting cleanup.

## [CLI] 0.16.0 - 2025-10-28

### Changed

- Rewrote import of external library tags.

## [CLI] 0.15.0 - 2025-10-25

### Added

- Translation collectors.

## [CLI] 0.14.0 - 2025-10-23

### Changed

- Renamed `pathRules` to redirection and adjusted langtag blockade.
- Added trailing-comma detection in tags and refreshed `init-tag` templates.

## [CLI] 0.13.1 - 2025-10-14

### Changed

- Extended `onCollectFinish` event parameters.

## [CLI] 0.12.1–0.12.4 - 2025-10-11

### Fixed / Changed

- Stabilized `onCollectFinish` handling and config cleanup when translations shift position.
- Path-based algorithm now preserves variables other than namespace/path and fixes old-path removal.
- React template fixes; configKeeper `keepPropertyAtEnd` plus skip-save when unchanged.
- Evaluated `ignoreStructured` before root directory removal; improved file URL logs.

## [CLI] 0.11.1 - 2025-10-07

### Changed

- Path-based wording `folder` → `directory`.

## [CLI] 0.11.0 - 2025-10-07

### Added

- Predefined algorithm for PathBased tag configuration generation.

## [CLI] 0.10.0 - 2025-10-07

### Changed

- Split core and CLI packages.

## [Core] 0.11.0 - 2025-11-08

### Changed

- `createCallableTranslations` now accepts translations with optional keys.

## [Core] 0.10.1 - 2025-10-15

### Added

- Optional `namespace` support.

## [Core] 0.9.4 - 2025-10-07

### Fixed

- README rendering for npm registry.

## [Core] 0.9.3 - 2025-10-07

### Added

- `condense` flag for conflict logs and `clean` flag for `collect`.

## [Core] 0.9.2 - 2025-10-06

### Added

- Simple module detection during `config init`.

## [Core] 0.8.0 - 2025-10-04

### Changed

- Maintenance release (no functional changes noted).

## [Core] 0.7.3 - 2025-06-05

### Fixed

- Nested structure handling for `PartialFlexibleTranslations`.

## [Core] 0.7.2 - 2025-06-04

### Added

- `unprefixedPath` in `TranslationTransformContext`.

## [Core] 0.7.1 - 2025-05-25

### Changed

- Modified `onImport` arguments.

## [Core] 0.7.0 - 2025-05-24

### Changed

- Separated `lang-tag import` from `lang-tag collect --libraries`.

## [Core] 0.5.1 - 2025-05-22

### Added

- JSDoc and `lookupTranslation`.

## [Core] 0.5.0 - 2025-05-22

### Changed

- Renamed `mapTranslationObjectToFunctions` → `createCallableTranslations` and updated related types/docs/tests.

## [Core] 0.4.2 - 2025-05-22

### Changed

- Removed `ReversedFlexibleTranslations` in favor of `TranslationObjectToFunctions`.

## [Core] 0.4.0 - 2025-04-07

### Changed

- Maintenance release.

## [Core] 0.1.9 - 2025-04-05

### Fixed

- CLI commands reliability improvements.

## [Core] 0.1.8 - 2025-04-03

### Added

- Read-config test; fixed `module` error type.

## [Core] 0.1.7 - 2025-04-03

### Changed

- Publish from `dist`.

## [Core] 0.1.6 - 2025-04-03

### Changed

- Maintenance release.
