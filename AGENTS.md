# AGENTS.md: ORAN 2.0 operating rules

Read this file first. It applies to every contributor, human or AI agent.

## 1. Authority

1. [docs/CONSTITUTION.md](docs/CONSTITUTION.md) is binding (rules C1–C23).
2. [docs/BLUEPRINT.md](docs/BLUEPRINT.md) explains the rules and is the single source of product and architecture intent until Gate 2. At Gate 2 it is split into the core documents listed in BLUEPRINT §11.4.
3. Founder decisions are recorded in [docs/DECISIONS.md](docs/DECISIONS.md). Architecture decisions are recorded in [docs/adr/](docs/adr/).
4. If a task conflicts with the Constitution or an open decision, **stop and report**, citing the rule or decision ID. Do not resolve the conflict yourself (C21).

## 2. Current phase

**Gate 0: the foundation is under review.** Until the founder approves D0 and Gate 1 is passed (BLUEPRINT §14):

- Do **not** add application code, schemas, migrations, dependencies, CI workflows, or infrastructure.
- Changes are limited to the foundation documents and ADRs, by pull request.

## 3. Fixed platform direction

Hosting is Vercel, the database is Supabase Postgres + PostGIS, and identity is Clerk. Azure and Foundry services are not used. Additions to the stack follow BLUEPRINT §10 and require decision D6.

## 4. Working rules

- **Work by pull request only.** Never push to `main`. Keep each PR to about 400 changed lines or fewer, excluding tests and fixtures (C17).
- **Reference repository.** ORAN 1.0 (`AutomatedEmpires/Open-Resource-Access-Network`) is read-only reference material. Port from it only by re-implementing with tests, citing the source path and commit `e0c9afd` (C23). Do not copy its documents into this repository.
- **No speculative documentation.** No new documents beyond the core set and ADRs (C22).
- **Honest status.** Never report work as done unless it runs end to end (C2, §13.3).
