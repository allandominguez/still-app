# Security Policy

## Reporting a Vulnerability

Please do not open a public issue for a security problem. Report it privately through GitHub's private vulnerability reporting:
<https://github.com/allandominguez/still-app/security/advisories/new>

## Known Accepted Findings

Findings from `npm audit` (or other dependency/security scanners) that are confirmed to have no runtime reachability into the
device bundle are documented here with the reasoning, rather than silently ignored, hidden behind `overrides`, or forced through
with a breaking fix.

`npm audit` reports each advisory once per ancestor package, so its headline count overstates things: the four advisories below
are the only root findings. For each, the vulnerable package is absent from the production Android
bundle — checked by listing the bundle's source map (see "How to re-verify") — so none of them can execute on a user's device.

Dependabot alerts for these are deliberately left open rather than dismissed, so GitHub keeps surfacing them and can open a fix
pull request the moment a patch is published. An open alert for one of the findings below is expected, not an oversight.

### `braces` <= 3.0.3 (high) — via `jest` → `@jest/core` → `micromatch`

**Advisory:** [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) — stack exhaustion (denial of service)
on deeply nested brace patterns.

**Risk:** `braces` is used by `micromatch` to expand glob patterns when Jest decides which test files to run. The patterns come
from this repo's own Jest config and the developer's command line, not from untrusted input, and it only runs on a developer's
machine or in CI. It is not part of the app bundle.

**Why no fix is applied:** no patched version of `braces` exists (the latest release, 3.0.3, is the affected one). `jest-expo`
also pins Jest 29, so moving to a newer Jest is not available either.

### `node-forge` <= 1.4.0 (high) — via `expo` → `@expo/cli` → `@expo/code-signing-certificates`

**Advisory:** [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) — RSA PKCS#1 v1.5 signature verification
accepts extra nested DigestAlgorithm elements.

**Risk:** `node-forge` is used by Expo's CLI to generate and validate certificates for its code-signing feature, which is part of
the developer tooling (`expo start` and related commands). This app does not use `expo-updates` or Expo code signing, so there is
no signature of untrusted origin to verify, and the package is not part of the app bundle.

**Why no fix is applied:** no patched version of `node-forge` exists (the latest release, 1.4.0, is the affected one), and the
dependency sits inside Expo's own CLI, so it can only move when Expo moves it.

### `sprintf-js` <= 1.1.3 (moderate) — via `@react-native/jest-preset` → `babel-jest` → … → `js-yaml` 3 → `argparse` 1

**Advisory:** [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) — denial of service through unbounded
precision specifiers.

**Risk:** the chain runs through Babel's coverage instrumentation (`babel-plugin-istanbul` → `@istanbuljs/load-nyc-config`), which
reads YAML config with `js-yaml` 3. `js-yaml` 3 only depends on `argparse` (and so `sprintf-js`) for its own command-line tool;
its library code, which is all Jest uses, never loads it. Even then it would run only when coverage is collected, on a developer's
machine or in CI, with no external input. It is not part of the app bundle.

**Why no fix is applied:** no patched version of `sprintf-js` exists (the latest release, 1.1.3, is affected), and the old
`js-yaml` 3 / `argparse` 1 pair that pins it is inside Jest's coverage tooling.

### `uuid` < 11.1.1 (moderate) — via `expo-sharing` → `@expo/config-plugins` → `xcode`

**Advisory:** [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) — missing buffer bounds check in `uuid`
v3/v5/v6 when a buffer is supplied by the caller.

**Risk:** `uuid` is used by `xcode` (a `.pbxproj` manipulation library), which `@expo/config-plugins` calls only during native
project generation (`expo prebuild`). That runs on the developer's machine or build server and is not part of the app bundle. The
vulnerable code path is also never taken: `xcode` only calls `uuid.v4()`, and the advisory concerns v3, v5 and v6 with a
caller-supplied buffer.

**Why no fix is applied:** patched `uuid` releases exist (11.1.1, 12.0.1, 13.0.1), but `xcode` 3.0.1 — its latest release — pins
`uuid@^7.0.3`. Landing a patched `uuid` would mean forcing an `overrides` entry across a major version into a range its author
declared as `^7.x`, untested against `expo prebuild`. This repo deliberately carries no `overrides`.

## Re-check triggers

Re-run `npm audit` and re-triage whenever:

- a **patched release appears** for `braces`, `node-forge` or `sprintf-js`, or `xcode` moves off `uuid@7` — the finding should then
  resolve with a plain `npm update` or `npm audit fix` and its entry here should be deleted;
- an **Expo SDK or Jest upgrade** changes the chains above (see [`MAINTENANCE.md`](MAINTENANCE.md));
- an advisory appears that is **not listed here**, or any finding is **critical**;
- any listed package turns up in the production bundle (the check below), which would make it runtime-reachable.

Re-verify that a finding is still the same advisory through the same dependency chain before assuming this write-up still applies.

## How to re-verify

```bash
npm audit --json                              # root advisories (the "via" entries that are objects)
npm explain <package>                         # what pulls it in
npx expo export --platform android --dump-sourcemap --output-dir <tmp>
# then list the .map file's "sources" and check that no path contains node_modules/<package>/
```
