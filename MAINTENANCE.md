# Maintenance

A runbook for situations that recur throughout a project's life — not one-time setup steps, but things that will come back around on their own schedule (a Dependabot run, an Expo release, a release build) as long as the project is alive. Kept as its own file, separate from `AGENTS.md`, so it survives even if `AGENTS.md` itself gets deleted — this information is worth keeping regardless of whether AI tooling is in the loop.

## Dependabot's `expo-sdk`-group PR fails CI

**Symptom:** A Dependabot PR for the `expo-sdk` group fails CI — usually `expo-doctor` flagging a version-set misalignment, sometimes a broken `npm test`.

**Why it happens:** Dependabot resolves each package's latest semver-compatible version independently. It has no concept of Expo's SDK-curated version set — the specific combination of `react`, `react-native`, `jest-expo` and the other `expo-*` packages that a given SDK release expects and tests against. A bump that's individually valid semver can still break that set. That's why `dependabot.yml` permanently `ignore`s the packages whose versions the SDK owns (`react`, `react-native`, `@types/react`, `jest`, `@types/jest`, `@react-native/jest-preset`, `typescript`, and `test-renderer`'s minor and major lines) — only `expo install` should move them.

**Fix:**

```bash
git checkout <dependabot-branch>       # or main, if the PR was already closed
npx expo install --fix                 # aligns every Expo-curated package
git add package.json package-lock.json
git commit -m "Align deps to Expo SDK's expected versions"
git push
```

Then let CI re-run and merge once green. If `expo install --fix` aborts with an `ERESOLVE` peer conflict (it did moving to SDK 57, over `@react-native/jest-preset`), install the packages named in the error explicitly, then re-run it.

**This is the expected, recurring way these packages get updated** — each Expo SDK release re-curates the set, so this will keep happening.

## Upgrading the Expo SDK

An SDK bump touches native modules, React, React Native, and the test toolchain at once, so it's worth doing the same way each time:

1. **Check that Expo Go supports the target SDK first.** Day-to-day development runs in Expo Go on a physical phone, and the Play Store build lags new SDKs, sometimes by months. A project bumped ahead of it can't be tested on the device. The build installed directly from Expo has supported new SDKs sooner.
2. **One major at a time, one commit per hop** (e.g. 56 → 57, not 54 → 57 in one go), so a breakage is attributable to a single SDK. Run `npx expo install expo@~<n>.0.0`, then `npx expo install --fix`, then `npx expo-doctor`.
3. **Run the checks, then the app.** Lint, typecheck, tests and a real Android bundle (`npx expo export --platform android`) catch most breakage. Two kinds are easy to miss: a removed API that doesn't crash but quietly stops doing anything at runtime (`StyleSheet.absoluteFillObject` went away in React Native 0.85; TypeScript flagged it, but spreading the missing property would otherwise have dropped the overlays' full-screen layout), and deprecation warnings that only log on a device (`expo-blur`'s prop rename). Treat typecheck errors as real, then open the app and read the console.
4. **Re-run `npm audit` afterwards** and follow the next section; SDK bumps change the audit outcome.
5. **Don't regenerate `android/` as a side effect.** See "Release builds" below.

## `eslint` major-version bump blocked

**Symptom:** `dependabot.yml` permanently ignores `eslint`'s major-version bumps (`update-types: ['version-update:semver-major']`) — minor and patch bumps still flow through normally.

**Why:** `eslint-plugin-react` doesn't support ESLint 10 yet; its peer range stops at 9.x. Letting the major bump through breaks `npm run lint`.

**Fix/check:** Periodically check [`eslint-plugin-react` on npm](https://www.npmjs.com/package/eslint-plugin-react) for ESLint 10 support in its `peerDependencies`. Once it lands, remove the `eslint` entry from `dependabot.yml`'s `ignore` list and let Dependabot retry the major bump.

## `npm audit` reports findings after a lockfile change

**Symptom:** After an SDK bump, a lockfile refresh, or a new Dependabot alert, `npm audit` flags packages — often dozens, because it reports the same advisory once per ancestor package.

**Fix, in this order:**

1. **Try an in-range refresh first.** `npm update <package>` or `npm audit fix` moves vulnerable transitive dependencies to patched versions without touching `package.json`. A stale lockfile, not an unfixable dependency, was the cause of the `brace-expansion` and `@xmldom/xmldom` findings here.
2. **Don't add `overrides` to silence a finding.** They pin transitive dependencies outside the ranges their parents declare, and they go stale and can break tools (a blanket `brace-expansion` override broke `minimatch`'s brace expansion across ESLint, Jest and Expo's toolchain). They were removed from this repo deliberately.
3. **Document what's left.** If the only fixes are downgrades or a major bump a pinned tool blocks, record the finding in [`SECURITY.md`](SECURITY.md) under Known Accepted Findings. Leave the matching Dependabot alert open: it keeps GitHub's reminder alive and lets Dependabot raise a fix PR as soon as a patch is published, whereas a dismissed alert does neither. If an alert becomes pure noise you have decided to accept, dismiss it with the reason "vulnerable code is not actually used" and rely on `npm audit` and the re-check triggers in `SECURITY.md` instead.

## Release builds

**Symptom:** A release APK is signed with the debug key, or builds for every ABI, with no error.

**Why:** `android/` is entirely gitignored, so the release signing config in `android/app/build.gradle` and the `arm64-v8a`-only restriction in `android/gradle.properties` live nowhere in version control. Any regeneration of the native project (`expo prebuild`, and sometimes `expo run:android`) silently resets both to template defaults. This has already happened once, after a package rename.

**Check before every release build:** the `release` build type uses `signingConfigs.release` (not `.debug`), and `reactNativeArchitectures` is `arm64-v8a`. The signing keystore and its passwords are read from the user's `~/.gradle/gradle.properties` (`MYAPP_RELEASE_*`), never from the repo. Before installing over an existing build, compare signing certificates: a mismatch makes `adb install` uninstall first, which wipes local photos and the database.

To test that prebuild still works without touching `android/`, run `npx expo prebuild --platform android --no-install` in a throwaway copy of the project (config files, `assets/` and a symlinked `node_modules`), not in the repo.

The lasting fix is to move these two settings into an Expo config plugin so every prebuild reapplies them; until then, the check above is the safeguard.

## CodeQL fails on a private repo

**Symptom:** The `CodeQL` workflow fails on every push with `Code scanning is not enabled for this repository`.

**Why:** CodeQL code scanning is free on public repos, but on a personal GitHub account it isn't available for private repos without GitHub Advanced Security. This repo is public, so it works today; the failure would only appear if the repo were made private.

**Fix:** Keep the repo public, purchase Advanced Security, or remove `.github/workflows/codeql.yml` — a permanently red check is worse than no check.
