# Development contracts

The target blueprint is implemented incrementally under ADR-0003. The development app implements the initial four-domain resource flow; production deployment and the full target capability map remain open.

## Dependencies

| Packages | Purpose and scope |
| --- | --- |
| next, react, react-dom | One server-rendered web application |
| @clerk/nextjs | Hosted identity adapter; no development credentials committed |
| kysely, pg | Parameterized queries over one application PostgreSQL pool |
| zod | Validate untrusted input at boundaries |
| @electric-sql/pglite, pglite-socket, pglite-postgis | Development/test-only isolated PostgreSQL with loopback access; PostGIS WASM is experimental and does not replace standard PostgreSQL/PostGIS CI |
| kysely-codegen | Generate types from the migrated schema; no hand-maintained ORM schema |
| tsx | Cross-platform Node development scripts |
| typescript, @types/node, @types/pg, @types/react, @types/react-dom | Static checks and library declarations |
| eslint, eslint-config-next | Framework, React, accessibility and TypeScript checks |
| vitest | Domain/data tests added with the resource workflow |
| @playwright/test, @axe-core/playwright | Browser workflow and accessibility verification; development only |

Exact versions live in package.json and pnpm-lock.yaml. Node 24.22.2 and pnpm 10.34.9 are pinned. System fonts avoid build-time font downloads. English/Spanish catalogs cover the shared shell; Spanish requires a native-speaker review before public release.

## Current routes and checks

Public / exposes current checked resources or an honest empty/outage state. /profile requires identity and accesses only that user's preferences. /organization and /resources/[id]/edit require scoped organization/admin control. /community requires approved geographic/category membership for verification; /admin requires the database admin role. Server actions independently authenticate and recheck authorization inside the catalog services. Resource creation, edits, approval, verification and profile deletion refresh affected views. No role or profile-user ID is trusted from form input.

Native Windows ARM64 typecheck, lint, PostgreSQL/PostGIS domain tests and browser workflow checks have been exercised using Node 24.22.2. CI separately checks Windows/Linux and standard PostgreSQL/PostGIS. Browser tests inspect public/admin/community/profile accessibility, language switching, mobile width and denied access. PR check results are authoritative for each commit. No production deployment is configured.

## Identity and route contract

Clerk verifies hosted account identity; application roles are always loaded from the private membership table, never user-editable metadata. An unknown verified Clerk user gets only the user role. The non-production admin bootstrap command can register/promote the founder's exact Clerk user ID.

The local launcher instead creates a random process secret and enables synthetic identities only on loopback. POST /api/dev-session requires that mode, a loopback request URL, and the exact configured Origin; it issues an HTTP-only SameSite=Strict signed one-hour session. It is rejected in production and hosted environments. No role is taken from a session token; membership is reloaded per request. GET /sign-in renders local identity choices only in that local mode, otherwise the configured Clerk sign-in or an honest configuration notice. GET /api/health is public and reports only dependency health, with 503 on failure.

Framework agent-file generation is disabled to preserve AGENTS.md. next-env.d.ts and .next are generated/ignored; typecheck runs next typegen before TypeScript so it also works immediately after a fresh clone.

## Native onboarding and browser isolation

scripts/run.ps1 prepares the exact Windows Node and pnpm pins in .local/toolchain, verifies the official Node archive SHA-256, and changes PATH only for its process. It works with the founder's existing global Node version untouched. A frozen install and helper version check were exercised on ARM64.

The browser launcher uses --test: an in-memory database, fixed port 3100 and ORAN_TEST_RUN=1 selecting .next-test. It never reuses the interactive development database/server. Normal development binds explicitly to port 3000 and fails if that port is occupied. Test database creation for externally supplied integration credentials uses unique disposable database names, never an existing catalog; the CI credentials need CREATEDB. Both migration idempotence and repeated integration runs are checked.
