# still-app

Reference documentation for this codebase's layout and commands, for developers and for whichever AI coding agent they use. For the engineering principles this app is built on — and the reasoning behind them — see [`ARCHITECTURE.md`](ARCHITECTURE.md). For recurring tooling situations that come back around on their own schedule (a Dependabot run, an Expo release, a release build), see [`MAINTENANCE.md`](MAINTENANCE.md). For known dependency findings and how to report a vulnerability, see [`SECURITY.md`](SECURITY.md).

## Expo has changed

Expo v57 changed enough from earlier versions that old habits or cached assumptions will lead you wrong — check the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before assuming a pattern still applies.

## Commands

```bash
# Start dev server (prompts to choose platform)
npm start

# Platform-specific (native builds via expo run:*)
npm run android
npm run ios
npm run web

# Quality checks (also run in CI on every PR + push to main)
npm run lint            # eslint .
npm run typecheck       # tsc --noEmit
npm test                # jest (jest-expo preset)
npm run test:coverage   # jest --coverage; fails if coverage drops below the floors in package.json
npm run test:watch      # jest --watchAll
npm run format          # prettier --write .
```

Node is pinned via `.nvmrc` and managed locally with fnm — `cd` into the repo auto-selects it. Non-interactive shells don't load the fnm hook, so use `fnm exec --using <version> -- <cmd>` when the Node version matters for a scripted run.

Pre-commit hooks (husky): `gitleaks` secret-scans staged files, then `lint-staged` runs `eslint --fix` + `prettier --write` on staged `.ts`/`.tsx`.

## Architecture

**React Native + Expo** app with TypeScript strict mode. Entry point is `index.ts` → `App.tsx`.

### Folder structure

Code is organized by feature under `features/`. Shared infrastructure lives in `lib/` and navigation in `navigation/`:

```
features/
  <name>/       # One folder per feature (calendar, capture, daydetail)
    components/ # Screens and UI components for this feature
    hooks/      # Feature-specific hooks
    types.ts    # Feature-specific types
    (+ api.ts, context.tsx, etc. as needed)
lib/            # Shared infrastructure
  db/           #   SQLite setup and schema migrations
  repositories/ #   Typed data access over the database
  storage/      #   Photo file handling
  location/     #   Device GPS, EXIF GPS, reverse geocoding
  design/       #   Colors, fonts, spacing, typography tokens
  hooks/        #   Hooks shared by more than one feature
  logging/      #   On-device trace log for the note-save/calendar journey (runs in production; never log note text or coordinates)
navigation/     # React Navigation root and stack definitions
App.tsx         # Root component, mounts navigation
index.ts        # Expo entry point
```

The reasoning behind this layout — and the rest of this project's engineering standards — is in [`ARCHITECTURE.md`](ARCHITECTURE.md). Don't create top-level `components/`, `hooks/`, or `services/` directories; if code is truly shared it lives in `lib/`.

### Conventions specific to still

- **Local-first** — all data lives on-device by default; no network calls in the default configuration. The optional sync service (`still-sync`) is purely additive and not built yet. Treating the device as the source of truth removes sync conflicts, offline error states, and auth flows from the core app.
- **Hooks own logic, components own rendering** — data fetching, validation and derived state live in custom hooks; components are thin. Components import only types from `lib/repositories`.
- **Secure storage for sensitive data** — tokens and credentials (e.g. Google Drive OAuth, once built) go in `expo-secure-store`, never `AsyncStorage`, which is unencrypted plaintext on the filesystem. Not yet a dependency; it arrives with the first feature that needs it.
- **Accessibility from day one** — add `accessibilityLabel` and `accessibilityRole` to interactive elements at authoring time, not as a retrofit.
- **Measure before memoizing** — don't reach for `useMemo`/`useCallback` speculatively; apply them only when a concrete performance problem is observed.

### Code style

- **ESLint** (flat config, run with `eslint .`): `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` are errors. `any` silently disables type checking; unused variables are dead code or a logic mistake.
- **Prettier**: no semicolons, single quotes, trailing commas, 100-character line width.
- **TypeScript**: strict mode.

### Testing

Jest via the `jest-expo` preset with `@testing-library/react-native` (v14).

- **Test behaviour, not implementation** — assert what the user or consumer observes (rendered output, state changes, navigation), not which internal functions were called.
- **Mock at system boundaries** — device APIs (camera, location, file system, SQLite) and the repository and photo-storage modules; not between a hook and the component that uses it, or between layers within a feature. A mock-call assertion is fine when the call itself is the outcome (a callback prop firing, a navigation action, a boundary mock receiving the data it should persist).
- **Test names read as user-facing scenarios** — "saves immediately on blur without waiting for the debounce", not "calls upsertDay with the correct argument".
- **Each commit that introduces logic includes its tests.** For UI work, settle the behaviour on a device first, then write the tests.
- **Coverage is enforced** by `npm run test:coverage`: an overall floor, plus a stricter one for the data layer (`lib/repositories`, `lib/storage`, `lib/db`). The floors are in `package.json`'s Jest config.

React Native Testing Library 14 gotchas:

- `render`, `renderHook`, `fireEvent.*`, `rerender`, `unmount` and `act` all return promises — `await` them.
- `await fireEvent.press(...)` waits for the press handler to finish. When a scenario deliberately holds an async handler pending (a save in flight, to see the overlay), start the press with `void fireEvent.press(...)` inside an `act` instead of awaiting it.
- `act` always flushes pending promises, so a test that relied on a sync `act` leaving a mocked promise unresolved will behave differently.
- Don't walk `.parent` to read host props; that depends on the renderer's tree shape. Assert the user-visible effect.

## Design considerations

- This is a portfolio piece — implementation should follow production quality: clean architecture, test coverage, secure practices, full flows and not just happy paths.
- v1 targets Android only (APK distribution); iOS via TestFlight is a planned follow-up.
- Design tokens (colors, fonts, spacing, typography) live in `lib/design`; use them instead of ad-hoc values.

## Intentional divergences from `expo-app-template`

This repo is aligned to the template, with these deliberate differences. They are decisions, not drift — don't "fix" them:

- `android` and `ios` scripts use `expo run:*` (native builds, needed for the release APK), not `expo start --android/--ios`.
- `lint` is `eslint .` with this repo's own flat config, not `expo lint`.
- `CLAUDE.md` is gitignored: it is a personal layer that imports this file and adds machine-specific paths. This file is the shared one.
- The CI `test` job runs `npm run test:coverage` (with coverage floors) instead of `npm test`.
- `codeql.yml` scans both `actions` and `javascript-typescript` (a language matrix), keeping the coverage GitHub's default setup had.
- `dependabot.yml` also groups `jest-expo` with the Expo SDK packages and ignores two extra Expo-curated packages (`@react-native/jest-preset`, and `test-renderer`'s minor and major lines).
- Android release signing and the `arm64-v8a` restriction live outside the repo (`android/` is gitignored; credentials are in `~/.gradle/gradle.properties`) — see the release-build section of [`MAINTENANCE.md`](MAINTENANCE.md).
