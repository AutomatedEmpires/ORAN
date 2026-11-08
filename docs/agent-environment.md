# Agent environment

This page lists environment variables by name only. Never commit values. They belong in Doppler.

It was derived from the code on `main` at `d3e8080`: `src/modules/platform/index.ts`, `scripts/dev.ts`, `scripts/migrate.ts`, `scripts/seed.ts`, `src/server/session.ts`, `src/proxy.ts`, `src/app/sign-in/page.tsx`, `src/app/api/dev-session/route.ts`, `next.config.ts`, `playwright.config.ts`, `tests/support/disposable-database.ts`, `.github/workflows/ci.yml` and `.env.example`. If the code changes, re-derive this list from the code rather than trusting this page.

## Short version

Local development, typecheck, lint, unit tests, build and browser tests need no variables and no credentials. `pnpm dev` and the Playwright launcher set their own values inside their own process. Variables are only needed for:

- integration tests against a real PostgreSQL database
- `dev:remote`
- preview
- production

## What each step needs

### Local development: `pnpm dev` or `scripts/run.ps1 dev`

Nothing to set. `scripts/dev.ts` starts PGlite on loopback. It then sets these names in its own process:

- `DATABASE_URL`
- `ORAN_LOCAL_DEV=1`
- `ORAN_ENV=development`
- `ORAN_TEST_RUN`
- `ORAN_APP_ORIGIN`
- `ORAN_SESSION_SECRET`, which is random on each run

The launcher refuses to start in any of these cases:

- `DATABASE_URL` is already set
- `ORAN_ENV` is `preview` or `production`
- `NODE_ENV` is `production`
- `VERCEL` is set

So do not wrap `pnpm dev` in `doppler run` with a config that holds `DATABASE_URL`.

### Typecheck, lint, unit tests and build: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`

Nothing to set. The CI `quality` job runs all four with no environment. Tests that need a database start PGlite themselves.

### Browser tests: `pnpm test:e2e`

Nothing to set. Playwright launches `scripts/dev.ts --test`. That sets `ORAN_TEST_RUN=1`, which selects the `.next-test` build directory, plus the local values above on port 3100.

### Integration tests on real PostgreSQL and PostGIS: `pnpm test:integration`, then `db:migrate` and `db:types:check`

| Name | Rule |
|---|---|
| `DATABASE_URL` | A disposable test database. Without it, `test:integration` falls back to PGlite. |
| `ORAN_ENV` | Must be `test`, or the tests refuse to run. |
| `ORAN_DATABASE_HOST` | Must equal the host name in `DATABASE_URL`. |

The CI `postgres` job sets all three in `ci.yml`. They point at that job's own throwaway service container, so no stored secret is involved.

### Remote development: `pnpm dev:remote`, `pnpm db:migrate`, `pnpm admin:grant`

These commands read `.env.local` when it exists. Variables already in the environment take precedence, so `doppler run --project oran --config dev -- pnpm dev:remote` also works.

| Name | Rule |
|---|---|
| `ORAN_ENV` | `development` |
| `DATABASE_URL` | A dedicated non-production database. Without it, the app fails explicitly; it never falls back to another database. |
| `ORAN_DATABASE_HOST` | Must equal the host name in `DATABASE_URL`. |
| `ORAN_APP_ORIGIN` | The exact origin the browser uses. It drives same-origin checks and redirects. The default is `http://127.0.0.1:3000`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk development instance. Without both Clerk names, sign-in shows that identity is unavailable. |
| `CLERK_SECRET_KEY` | Clerk development instance. |

Do not set `ORAN_LOCAL_DEV` here. Local identity requires a loopback database.

### Preview and production on Vercel

Hosted environments need the same six names, with `ORAN_ENV` set to `preview` or `production`:

- `ORAN_ENV`
- `DATABASE_URL`
- `ORAN_DATABASE_HOST`
- `ORAN_APP_ORIGIN`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Never set `ORAN_LOCAL_DEV`, `ORAN_SESSION_SECRET` or `ORAN_TEST_RUN` in a hosted environment. `pnpm db:migrate` refuses `ORAN_ENV=production`, so production migrations still have no command. They need a reviewed release procedure.

### Set by the platform, never by hand

| Name | Set by | Effect |
|---|---|---|
| `NODE_ENV` | Next.js | Production mode turns off local identity and marks the language cookie `secure`. |
| `VERCEL` | Vercel | Turns off local identity and the local launcher. |
| `TZ` | Test code | Used only inside `tests/wall-clock.test.ts`. |

## Where each name belongs in Doppler, and what is missing

This was checked on 8 November 2026 with name-only commands.

- **Doppler:** there is no `oran` project. `doppler projects` lists only `exploreandearn` and `logloads`. `doppler secrets --only-names --project oran` fails for `dev`, `stg` and `prd`.
- **GitHub Actions:** the repository has no secrets or variables.

Every name below is therefore missing today. Creating the `oran` project is a founder decision. Until then, everything except integration tests against a real database and hosted environments works without it.

The shape below is proposed, not yet approved. It follows AE-Control's Doppler shape: `dev` for local and remote development, `stg` for preview, `prd` for production.

| Name | Exposure | `oran/dev` | `oran/stg` | `oran/prd` | Today |
|---|---|---|---|---|---|
| `ORAN_ENV` | Not secret | `development` | `preview` | `production` | Missing |
| `DATABASE_URL` | Secret, server only | Non-production database | Preview database | Production database | Missing |
| `ORAN_DATABASE_HOST` | Not secret | Host of that URL | Host of that URL | Host of that URL | Missing |
| `ORAN_APP_ORIGIN` | Not secret | Local or remote dev origin | Preview origin | Production origin | Missing |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Readable in the browser | Clerk development instance | Clerk development instance | Clerk production instance | Missing |
| `CLERK_SECRET_KEY` | Secret, server only | Clerk development instance | Clerk development instance | Clerk production instance | Missing |

The three environments must not share databases or Clerk instances (AGENTS.md section 6). Keep these names out of every Doppler config:

- `ORAN_LOCAL_DEV`, `ORAN_SESSION_SECRET` and `ORAN_TEST_RUN`, which the launcher generates
- `NODE_ENV`, `VERCEL` and `TZ`, which the platform or the tests set

CI needs no stored secret today.

## Not needed today

No code reads any key for Supabase, Resend, Stripe, Sentry, PostHog, Mapbox or Anthropic. Supabase is reached only through `DATABASE_URL`. Do not add those names or placeholders for them before the work that needs them is approved.
