# Development contracts

The target blueprint is implemented incrementally under ADR-0003. This is a development scaffold; no production deployment or complete four-domain application is claimed.

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
| @playwright/test | Browser verification added with the resource workflow |

Exact versions live in package.json and pnpm-lock.yaml. Node 24.22.2 and pnpm 10.34.9 are pinned. System fonts avoid build-time font downloads. English/Spanish catalogs cover the shared shell; Spanish requires a native-speaker review before public release.

## Current routes and checks

The initial shell exposes public / and honest loading/error/not-found states. Navigation identifies the four target experiences; resource and identity routes follow in the next reviewed slice. No fake resources, scores or verification badges are shipped.

Native Windows ARM64 typecheck, lint and production build passed on Node 24.22.2. Database, auth and browser flow checks are recorded when those workflows are implemented. No branch protection or deployment configuration is asserted merely because a workflow is described.

## Identity and route contract

Clerk verifies hosted account identity; application roles are always loaded from the private membership table, never user-editable metadata. An unknown verified Clerk user gets only the user role. The non-production admin bootstrap command can register/promote the founder's exact Clerk user ID.

The local launcher instead creates a random process secret and enables synthetic identities only on loopback. POST /api/dev-session requires that mode, a loopback request URL, and the exact configured Origin; it issues an HTTP-only SameSite=Strict signed one-hour session. It is rejected in production and hosted environments. No role is taken from a session token; membership is reloaded per request. GET /sign-in renders local identity choices only in that local mode, otherwise the configured Clerk sign-in or an honest configuration notice. GET /api/health is public and reports only dependency health, with 503 on failure.

Framework agent-file generation is disabled to preserve AGENTS.md. next-env.d.ts and .next are generated/ignored; typecheck runs next typegen before TypeScript so it also works immediately after a fresh clone.
