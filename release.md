# X2S Release Roadmap

## Goal

Ship Xerxisfy Elite Style Sheet as a production-ready npm package that frontend developers can install, run in CI, trust in daily development, and integrate into real projects without needing the repo open beside them.

Target outcome:

- `npm install x2s`
- stable `x2s` CLI
- documented Node support policy
- repeatable build and test pipeline
- versioned releases with changelog and rollback path

## Current strengths

The project already has the hard part in place:

- working parser and compiler
- CLI with compile, watch, purge, minify, source maps, and asset flags
- test suite covering major language features
- built-in modules
- source maps
- VS Code language support
- roadmap features implemented end to end

## Remaining release gaps

These are the main gaps to close after the initial npm release if X2S is going to be treated as a long-term production tool:

1. Package identity needs consolidation.
   - the npm package should now be standardized on `x2s`.
   - the old `xerxisfy-elite-style-sheet` package should be deprecated or removed if it still qualifies for unpublish.
   - the repo name and package branding should be kept consistent over time.

2. The published package shape can still be tightened.
   - the editor extension and compiler package are still bundled in one repository even if they may become separate release units.
   - install-from-tarball smoke tests should be part of every release.

3. QA and CI are not strong enough yet.
   - there is no GitHub Actions pipeline for Linux, macOS, and Windows.
   - there are no snapshot fixtures for representative X2S projects.
   - there is no automated publish gate against multiple Node versions.

4. Release operations are still manual.
   - there is no changelog workflow.
   - there is no prerelease channel.
   - there is no npm provenance or publish automation.

5. Public adoption docs still need expansion.
   - there is no migration guide from Sass/Less/Stylus.
   - there is no starter project.
   - there is no compatibility/support policy.

## Release phases

## Phase 1: Package identity and legal cleanup

Objective:
Make the package legally publishable and discoverable.

Tasks:

- choose the final npm package name and verify availability
- replace the placeholder repository URL with the real repo
- add `homepage` and `bugs` links
- change the license to a standard SPDX license or a clearly documented dual-license model
- confirm the package author/org name and npm ownership model
- decide whether the compiler package and the VS Code extension ship as one npm package or two separate packages

Exit criteria:

- `package.json` has correct public metadata
- license is acceptable for public npm consumers
- package name is reserved and owned by the right publisher account

## Phase 2: Publishable package hardening

Objective:
Make the npm artifact minimal, predictable, and safe to consume.

Tasks:

- add a `files` field so npm only publishes:
  - `dist/`
  - `README.md`
  - `LICENSE`
  - any required editor-support package files if intentionally bundled
- add an `exports` map for the public API
- emit `.d.ts` files by enabling TypeScript declaration output
- add an `engines.node` field with the supported runtime range
- add `prepublishOnly` checks so broken builds cannot be published
- verify `bin.x2s` works after `npm pack` and local install
- decide whether `editors/vscode/` should move to its own extension package

Recommended package shape:

- CLI/runtime package:
  - compiler
  - CLI
  - types
- editor package:
  - VS Code extension
  - icon theme
  - grammar

Exit criteria:

- `npm pack` produces a clean tarball
- installing the tarball exposes the `x2s` binary
- `import { compileEntry, compileString }` works with shipped type declarations

## Phase 3: CI, tests, and quality gates

Objective:
Guarantee that releases are reproducible across developer environments.

Tasks:

- add GitHub Actions for:
  - Node 18
  - Node 20
  - Node 22
  - Ubuntu
  - macOS
  - Windows
- run these jobs on every push and pull request:
  - `npm ci`
  - `npm run build`
  - `npm test`
  - CLI smoke tests
- add fixture-based integration tests for:
  - single-file compile
  - directory compile
  - watch mode bootstrap
  - purge
  - source maps
  - built-in modules
  - asset rewriting with a mocked converter
- add snapshot comparisons for representative compiled CSS outputs
- fail CI on warnings that should be treated as release blockers

Exit criteria:

- green CI matrix on all supported platforms
- fixture outputs are stable
- release branch cannot bypass tests

## Phase 4: Developer-facing release quality

Objective:
Make first-time adoption smooth for real teams.

Tasks:

- create an `examples/` directory with:
  - a small single-file project
  - a multi-file project with imports
  - a built-in-modules demo
  - a container-math/polyfill demo
- document recommended scripts for app teams:
  - `x2s src/styles app.css`
  - `x2s src/styles app.css --watch`
  - `x2s src/styles app.css --purge "./src,./public"`
- add a migration guide:
  - Sass nesting
  - mixins
  - variables
  - loops
  - imports
  - what is different in X2S
- add a troubleshooting section for:
  - unknown import errors
  - lock failures
  - missing asset converter warnings
  - source map usage
- publish a support matrix:
  - supported Node versions
  - supported OSes
  - supported editor integration

Exit criteria:

- a new developer can install and run X2S from docs alone
- the top 10 support questions are already answered in the docs

## Phase 5: Release automation and versioning

Objective:
Remove manual release risk.

Tasks:

- adopt a release tool:
  - `changesets` is the most pragmatic choice here
  - `semantic-release` is also viable if you want full automation
- generate a changelog for every release
- publish npm releases from CI, not from local machines
- enable npm provenance
- add dist-tag strategy:
  - `next` for prereleases
  - `latest` for stable releases
- define semver policy:
  - use year-based semver for stable releases, for example `26.0.1`
  - first number: release year in two-digit form
  - second number: major line within that year
  - third number: patch/build increment for that line
  - prereleases can follow standard semver suffixes such as `26.0.1-beta.1`

Exit criteria:

- every release is reproducible from CI
- users can install prereleases without disturbing stable users
- change history is visible and trustworthy

## Phase 6: Beta rollout

Objective:
Get real-world feedback before calling the package stable.

Tasks:

- publish `26.0.1-beta.1` under `next`
- dogfood X2S in one or two internal or personal frontend projects
- collect issues specifically around:
  - watch mode behavior
  - source map quality
  - asset pipeline warnings
  - purge false positives
  - unexpected CSS output changes from auto polyfills/utilities
- fix the release-blocking issues before GA

Exit criteria:

- at least 2 real projects have used X2S successfully
- no critical correctness issues remain open

## Phase 7: General availability

Objective:
Publish the first public stable version developers can rely on.

Tasks:

- cut the first stable release
- tag the repository
- publish release notes
- announce install and quick-start steps
- open a public issue template for bugs and feature requests

GA checklist:

- package metadata finalized
- public license finalized
- clean tarball
- declaration files shipped
- CI green
- smoke tests green
- changelog generated
- npm provenance enabled
- examples and migration docs published

## Recommended immediate next actions

If you want the fastest path from this repo state to a credible npm release, do these next:

1. Fix `package.json` metadata.
   - real repository URL
   - public license
   - `files`
   - `exports`
   - `engines`

2. Enable TypeScript declaration output.

3. Add GitHub Actions for build, test, and tarball smoke tests.

4. Add `changesets` and publish prereleases under `next`.

5. Split or formalize the VS Code extension packaging decision.

6. Dogfood the tool in one real frontend project before GA.

## Suggested release commands

Local verification before publish:

```bash
npm ci
npm run build
npm test
npm pack
```

Tarball smoke test:

```bash
mkdir -p /tmp/x2s-smoke
cd /tmp/x2s-smoke
npm init -y
npm install /path/to/x2s-<version>.tgz
npx x2s ./example/app.x2s ./example/app.css --sourcemap
```

# Publish to npm 
<!-- NEEDED: 
1.You need to authorize this machine using `npm adduser`
2.Requires you to be logged in to https://registry.npmjs.org/ 
3 npm adduser -->
npm run build
npm test
npm pack --dry-run
npm publish --access public

<!-- run -->
git add package.json package-lock.json release.md publish.sh
git commit -m "Switch X2S to year-based versioning"
./publish.sh
<!-- verify -->
npm view x2s@26.0.1 version
<!-- Then -->
git push origin main
git tag v26.0.1
git push origin v26.0.1

## Rename and old package cleanup

When moving the public package name from `xerxisfy-elite-style-sheet` to `x2s`, publish `x2s` first and verify it installs correctly before touching the old package.

Recommended cleanup:

```bash
npm deprecate xerxisfy-elite-style-sheet@"*" "Package renamed to x2s. Install with: npm i -D x2s"
```

Only use unpublish if the old package still meets npm's unpublish policy:

```bash
npm unpublish xerxisfy-elite-style-sheet@1.0.0
npm unpublish xerxisfy-elite-style-sheet@26.0.1
```

If every published version is eligible for removal, you can remove the whole package:

```bash
npm unpublish xerxisfy-elite-style-sheet --force
```

Notes:

- `package@version` can never be reused after unpublish.
- if you remove the entire package, npm blocks republishing that package name for 24 hours.
- deprecation is the safer default when users may already depend on the old package.

## Definition of production ready

X2S is ready for production npm usage when all of the following are true:

- developers can install it from npm without cloning the repo
- the CLI works the same on macOS, Linux, and Windows
- output is stable under tests and fixtures
- releases are versioned, documented, and reproducible
- the package is legally safe for public consumption
- docs are strong enough that teams can adopt it without direct support from you
