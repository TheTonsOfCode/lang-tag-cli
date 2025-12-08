# Contributing

- Branch from `main`, keep PRs small, use conventional commits: `feat(cli): ...`, `fix(core): ...`, `chore(presets): ...`.
- Touch the right package only (`packages/cli`, `packages/core`, `packages/presets`, `packages/docs` – docs are not published to npm).
- Before a PR: `npm ci`, `npm run test --workspace lang-tag`, `npm run test-full --workspace @lang-tag/cli` (includes e2e).
- After merge to `main`, release-please opens a release PR for packages that changed; review versions and changelog, then merge it.
- After the release PR merges, the workflow publishes new versions to npm using each package’s `publish.sh`; `NPM_TOKEN` secret is required.
- Changelog is shared (`CHANGELOG.md`) and groups entries per component (CLI/Core/Presets).
- Do not commit `dist/`; CI builds artifacts for publish.
- PR Tests workflow: Node 18/20, runs `npm ci`, core tests and CLI tests (including e2e).
