# Training Path 15

A private, mobile-first training companion that maps the supplied workbook into 105 daily modules across 15 weeks. It includes exact weekly ramp-up and deload rules, calculated main-lift targets, per-set weight/RPE logging, Field Hour progression, Jefferson Curl quality checks, measurements, timers, and local backup/restore.

## Publish on GitHub Pages

1. Extract `training-path-15.zip`.
2. Create a new GitHub repository.
3. Upload the **contents of the extracted `training-path-15` folder** to the repository root.
4. Open the repository's **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and the `/docs` folder, then save.
7. GitHub will display the public Pages address after deployment finishes.

The ready-built site is already in `docs/`. Your workout history is never placed in the repository; it is saved only in the browser you use to open the app.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
npm run dev:github
```

Open the local address shown in the terminal.

## Rebuild the app

```bash
npm run build
```

This validates the program data, builds the application, and regenerates `docs/` for GitHub Pages.

## Quality checks

```bash
npm test
npm run lint
```

## Data and backups

- All workout logs, measurements, setup values, and preferences are stored in browser local storage.
- Use **Settings → Export backup** before clearing browser data or changing devices.
- Importing a backup asks for confirmation before replacing current data.
- No authentication, backend, analytics, or external service is used.

## Source of truth

The workbook's content is encoded in `src/data/program.json`. Program calculations and day generation live in `src/data/program.ts`. See `PROGRAM_SPEC.md` for a human-readable audit of the implemented rules.
