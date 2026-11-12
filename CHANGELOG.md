# Changelog

All notable changes to FINIX are recorded here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: see [CONTRIBUTING.md](CONTRIBUTING.md#versioning-strategy).

## [Unreleased]

### Added
* Repository documentation suite (`README`, `RULE`, `DESIGN`, `RISK`, `SECURITY`, `LICENSE`, `COPYRIGHT`), contribution guide, roadmap and issue/PR templates.
* Gitleaks, dependency and image scanning workflows; optional, approval-gated GHCR publishing workflow; Dependabot configuration.

### Changed
* CI restructured: frontend typecheck/build/UI tests, backend tests with Testcontainers, Docker image builds with vulnerability scan.
* Playwright and TypeScript build artefacts are no longer tracked in Git.

## [0.1.0-dev] - Not yet released

Planned first development preview. See [docs/releases/v0.1.0-dev.md](docs/releases/v0.1.0-dev.md) for the draft notes and the release checklist.
