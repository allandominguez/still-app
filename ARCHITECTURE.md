# Architecture & Engineering Principles

This is a deliberately curated statement of the principles this app is built on — not an AI-context file, and not an attempt to cite every well-known idea in software design. Each entry below is included because it maps to something concretely practiced here; where a principle from established literature doesn't have a real instance in this codebase yet, it's left out rather than padded in for the citation, and added later if a real instance shows up.

## Structure: package-by-feature

**Source:** Robert C. Martin, _Clean Architecture_ — "Screaming Architecture."

Code is organized by feature (`features/<name>/`), not by technical layer (`components/`, `hooks/`, `services/`). Martin's argument is that a codebase's top-level structure should announce what the system _does_, not which framework it uses — opening the top level of this repo should tell you it's a calendar of daily photos, not just "a React Native project." A layer-first structure inverts that: opening `hooks/` or `components/` tells you nothing about the product, and every change to one feature touches directories shared by every other feature, inviting accidental coupling.

**In this repo right now:** `features/` holds three features — `calendar`, `capture`, and `daydetail` — each with its own `components/` and `hooks/`. What several features genuinely share lives in `lib/` (`db`, `repositories`, `storage`, `location`, `design`, `logging`, `dates`), and `navigation/` holds the root stack. There is no top-level `components/` or `hooks/` directory.

## Responsibility: hooks own logic, components own rendering

**Source:** SOLID's Single Responsibility Principle, applied to React's component model; the boundary-mocking approach below follows from SOLID's Dependency Inversion Principle.

Business logic (data fetching, validation, derived state) lives in custom hooks; components stay thin rendering layers. This is SRP applied at the hook/component boundary rather than the class boundary SOLID was originally written for: a component has one reason to change (the UI changed), a hook has a different one (the logic changed). Testing follows from this — mock at system boundaries (device APIs, external services), not between a hook and the component that calls it. That's only a coherent testing strategy because the component depends on the hook's _interface_, not its internals — Dependency Inversion, not just a testing convenience.

**In this repo right now:** components never touch the data layer. The only thing a component imports from `lib/repositories` is the `DayEntry` type (`CalendarGrid`, `DayDetailScreen`, `DayDetailPage`); every read and write goes through a hook (`useCapture`, `useCalendarData`, `useDayDetailFeed`, `useNoteEditor`). That is what lets the hook tests assert on state and the component tests assert on rendered output without either needing the other.

## Simplicity: YAGNI, simple design, and earned abstraction

**Sources:** Kent Beck's four rules of simple design (passes its tests, reveals intent, no duplication, fewest elements — in that priority order); "You Aren't Gonna Need It" (Extreme Programming); Martin Fowler / Sandi Metz's observation that duplication is cheaper to live with than the wrong abstraction.

Don't build for a requirement you don't have yet. Three similar lines of code are better than a premature shared abstraction — the abstraction can always be extracted once a real third use case proves what it should actually look like; guessing at that shape upfront usually guesses wrong, and the wrong abstraction costs more to unwind than the duplication would have cost to tolerate. The same reasoning applies one level up, to whole dependencies: don't wire in a library for a need the project doesn't have yet, even if you're fairly sure you'll want it eventually — and one level down, to individual optimizations: don't reach for `useMemo`/`useCallback` speculatively. React's reconciler handles most re-renders cheaply on its own; memoizing before a concrete performance problem is observed adds complexity with no measurable benefit, and obscures the actual data flow.

**In this repo right now:** the dependency list is short and every entry earns its place. There is no state-management library, data-fetching library, or ORM — state is React state plus repository functions over `expo-sqlite`. Packages for features that are planned but not started are not installed: no `expo-secure-store` or `expo-auth-session` (Drive backup and pairing credentials), and no notifications package (the daily reminder). Each arrives with the feature that needs it. Memoization follows the same rule: every remaining `useMemo`/`useCallback` exists because something depends on the value's identity (React Navigation's `useFocusEffect`, an effect's dependency or cleanup, a list's `data`/`extraData`) or because the computation has a measured cost (the streak calculation). The ones that did neither were removed.

## Testing: Kent Beck's Test Desiderata

**Source:** Kent Beck's Test Desiderata — the properties a good test should have (isolated, deterministic, behavioral, fast, readable, and others).

- **Test behaviour, not implementation** — assert what a user or consumer observes (rendered output, state changes, navigation), not which internal functions were called. A behavioral test survives a refactor that doesn't change behaviour; an implementation test breaks on it anyway.
- **Mock at system boundaries** — device APIs, external services — not between layers within a feature. A boundary mock verifies the feature's actual contract; mocking a sibling hook or component couples the test to internal wiring instead.
- **A mock-call assertion is still behavioural when the call itself is the outcome being verified** — a callback prop firing, a navigation action, a boundary mock receiving the data it should persist. These have no other observable signal in a test environment.
- **Test names read as user-facing scenarios** — "saves immediately on blur without waiting for the debounce," not "calls upsertDay with the correct argument." A failing test should tell you what broke for the user, not just which function was involved.

**In this repo right now:** the mocks sit at real boundaries — the repository and photo-storage modules, and the device APIs (`expo-sqlite`, `expo-image-picker`, `expo-location`, `expo-file-system`, `expo-image-manipulator`). Test names read as scenarios (`useNoteEditor`: "resets the debounce on each keystroke rather than saving early"). One deliberate exception: `features/calendar/__tests__/streaks.test.ts` mocks the sibling `utils` module to stub the clock. It exists as a wiring guard against a past timezone bug (the default "today" must keep delegating to the local-date helper, not a UTC one-liner), and the helper's own correctness is tested separately in `utils.test.ts`.

Coverage is enforced in CI (`npm run test:coverage`): an overall floor for the whole app, plus a stricter one for the data layer — repositories, database setup and migrations, and photo storage — because a bug there loses a user's photos or notes rather than just misrendering something. The floors in `package.json`'s Jest config are the source of truth; they sit just under current levels so a regression fails the build, and get raised as coverage improves.

## Professional practices (not tied to a named principle)

Some things here are deliberate discipline rather than an application of citable literature — worth stating plainly rather than force-fitting a source that doesn't really apply:

- **Accessibility from day one** — add `accessibilityLabel`/`accessibilityRole` at authoring time, not as a retrofit. Cheap while you're already reasoning about what an element does; expensive to add back later across every component. Interactive elements here carry both from the start; calendar cells, for example, announce as "20, has photo" or "21, add photo."
- **Vulnerability triage is documented, not silent** — `npm audit` findings that are safe to accept get a written rationale in [`SECURITY.md`](SECURITY.md) (what the finding is, why it can't reach the shipped bundle, what would trigger re-triage), rather than being silently ignored, hidden behind `overrides`, or force-fixed with a breaking change.
