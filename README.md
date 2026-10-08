# still

[![CI](https://github.com/allandominguez/still-app/actions/workflows/ci.yml/badge.svg)](https://github.com/allandominguez/still-app/actions/workflows/ci.yml)
[![CodeQL](https://github.com/allandominguez/still-app/actions/workflows/codeql.yml/badge.svg)](https://github.com/allandominguez/still-app/actions/workflows/codeql.yml)

> **Status:** 🚧 Active development — core capture-to-calendar flow (photo capture, calendar view, day detail, text notes) is built and working end-to-end on a personal test device. Reminders, settings, and backup are still to come.

A private, local-first daily photo journal. Capture one moment per day, with an optional note. All data lives on-device; no account required. One photo. One note. One day.

**_Capture. Reflect. Keep._**

> This repository contains the **mobile app** (React Native / Expo). An optional self-hosted sync service (`still-sync`) is planned but not yet developed.

---

## Key Features

**Shipped:**

- **One photo per day** — A single focused capture with optional text note, including replace and delete flows
- **Calendar view** — Monthly grid with photo thumbnails at a glance
- **Streak tracker** — Current and longest capture streaks to reinforce the daily habit
- **Local-first** — All data stored on-device; works entirely offline

**Planned:**

- **Daily reminders** — Time-based and location-based (geofence exit from home)
- **Google Drive backup** — Direct backup and restore from within the app
- **Optional sync** — Self-hosted Go service for multi-device sync (advanced users)

---

## Tech Stack

**Mobile:**

- React Native (Expo SDK 57)
- TypeScript (strict mode)
- React Navigation
- SQLite via `expo-sqlite`
- Secure credential storage via `expo-secure-store` (planned — arrives with Drive backup)

**Sync service:** (planned — not yet developed)

- Go
- Docker (multi-arch: amd64 + arm64 for NAS distribution)

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 22.13+ (Node 24 LTS recommended — see [`.nvmrc`](.nvmrc); this is what CI runs)
- [Expo Go](https://expo.dev/go) on your Android device, or a connected Android device with USB debugging enabled

### Node version

The repo pins Node via [`.nvmrc`](.nvmrc), and CI reads that same file. With [fnm](https://github.com/Schniz/fnm), `cd`-ing into the project selects the pinned version automatically (`brew install fnm`, add `eval "$(fnm env --use-on-cd)"` to your shell profile, then `fnm install`). [`nvm`](https://github.com/nvm-sh/nvm) works too, without the auto-switch.

### Installation

```bash
# Clone the repo
git clone https://github.com/allandominguez/still-app.git
cd still-app

# Install dependencies
npm ci
```

### Running the app

```bash
npm start      # prompts to choose platform
npm run android  # Android directly
```

---

## Project Structure

```
still-app/
├── features/
│   └── <name>/             # One folder per feature
│       ├── components/     # Screens and UI components
│       ├── hooks/          # Feature-specific hooks
│       └── types.ts        # Feature-specific types
├── lib/                    # Shared infrastructure (storage helpers, utilities)
├── navigation/             # React Navigation root and stack definitions
├── assets/
├── App.tsx                 # Root component, mounts navigation
├── index.ts                # Expo entry point
└── app.json
```

---

## Branching

| Branch                       | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `main`                       | Production-ready code                          |
| `add/desc`, `update/desc`    | New features                                   |
| `fix/desc`                   | Bug fixes                                      |
| `chore/desc`, `improve/desc` | Maintenance tasks (dependencies, config, etc.) |

---

## Development

```bash
npm run lint           # ESLint on .ts/.tsx
npm run typecheck      # tsc --noEmit
npm test               # Jest
npm run test:coverage  # Jest with the coverage floors CI enforces
npm run test:watch     # Jest in watch mode
npm run format         # Prettier
```

These run on every pull request and on pushes to `main` via [GitHub Actions](.github/workflows/ci.yml), alongside `expo-doctor` and CodeQL, and passing checks are required to merge. Pre-commit hooks run gitleaks (secrets scanning) and lint-staged (ESLint --fix, Prettier) on staged files.

---

## Architecture & Maintenance

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — the engineering principles this app is built on, with their sources and where each is practiced in the code
- [`AGENTS.md`](AGENTS.md) — codebase layout, commands and conventions, for developers and AI coding agents
- [`MAINTENANCE.md`](MAINTENANCE.md) — runbook for recurring situations (Expo upgrades, Dependabot, release builds)
- [`SECURITY.md`](SECURITY.md) — how to report a vulnerability, and known accepted dependency findings

---

## Project Goals

still is a portfolio piece demonstrating full-stack mobile product development — from local data modelling and camera APIs through to an optional self-hosted sync service in Go.

### Product-Focused Thinking

- Designing a minimal, habit-forming capture experience with intentional constraints
- Building a local-first architecture that eliminates entire classes of bugs (no sync conflicts, no offline error states, no auth flows for the core flow)
- Making deliberate UX decisions: one photo per day, calendar-centric navigation, streak reinforcement, unobtrusive reminders

### Technical Skills

- Mobile app development with React Native (Expo) and TypeScript
- On-device SQLite data modelling and typed data access layer
- Camera, gallery, and EXIF metadata APIs
- Secure credential storage with `expo-secure-store`
- Background tasks and geofencing with `expo-location`
- Google Drive OAuth and file backup via `expo-auth-session`
- Go service development: REST API, Docker, multi-arch builds

### Professional Practices

- Clean git history and meaningful commits
- Behaviour-driven tests with Jest and React Native Testing Library
- Code quality automation (ESLint, Prettier, Husky, lint-staged, gitleaks)
- CI/CD pipeline with GitHub Actions
- TypeScript strict mode throughout
- Feature-cohesion folder structure

---

## Contributing

This is a personal portfolio project — PRs aren't expected, but feedback and suggestions are welcome.

### Code style

- TypeScript throughout — `any` is a lint error
- Prettier and ESLint are configured — format on save is recommended
- Business logic in hooks, rendering in components

---

## Contact

**Allan Dominguez**
[Portfolio](https://allandominguez.dev/) | [GitHub](https://github.com/allandominguez) | [LinkedIn](https://www.linkedin.com/in/allan-dominguez-113625146/) | [Email](mailto:allan.c.dominguez@gmail.com)

_This project is part of my portfolio demonstrating full-stack mobile product development._

---

## License

MIT License — see [LICENSE](LICENSE) file for details.
