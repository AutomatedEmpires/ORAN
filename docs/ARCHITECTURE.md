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
