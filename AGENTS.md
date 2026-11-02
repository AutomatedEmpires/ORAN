# AGENTS.md: ORAN 2.0 operating rules

Read this file first. It applies to every contributor, human or AI agent.

## 1. Authority

1. [docs/CONSTITUTION.md](docs/CONSTITUTION.md) is binding (rules C1–C23).
2. [ADR-0002](docs/adr/0002-founder-vision-and-native-environment.md) records the authoritative founder amendment: four domains, voluntary profiles, grounded matching, independent acquisition and the native environment below. It supersedes conflicting earlier assumptions.
3. [docs/BLUEPRINT.md](docs/BLUEPRINT.md) explains the amended rules and product and architecture intent until Gate 2. At Gate 2 it is split into the core documents listed in BLUEPRINT §11.4.
4. Founder decisions are recorded in [docs/DECISIONS.md](docs/DECISIONS.md). Architecture decisions are recorded in [docs/adr/](docs/adr/).
5. Follow explicit recorded founder amendments. Report unresolved conflicts with the rule/decision ID; do not invent approval (C21).

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

## 5. Founder product contract

- Four foundational experiences: **user, organization, approved community, admin**, sharing one app and canonical resource catalog.
- Users can browse anonymously or opt into voluntary purpose-specific profiles and personalized matching. Use deterministic eligibility/coverage rules plus staged AI-assisted interpretation and catalog-grounded explanations; expose unknowns and never guarantee qualification or capacity.
- Organizations own and maintain one or many resources through scoped staff memberships and approved claims. All channels use the acceptance service; ownership does not establish independent verification.
- Community contributors require admin approval and geographic/category-scoped assignments. They discover, propose, verify and periodically reverify resources with evidence. They do not gain access to seeker profiles or unrestricted edits to claimed listings.
- Admin governs approvals, claims, disputes, publication, verification schedules, privacy and operations. Organization/community acquisition must work without a 211 or other institutional agreement; integrations are complementary.

## 6. Native development environment contract

Founder-reported workstation: Lenovo Yoga Slim 7x (83ED), Snapdragon X Elite X1E-78-100 ARM64, 12 cores, 16 GB RAM, 512 GB SSD, Windows 11 Home ARM64. Treat this as the target environment, not a freshly audited installed-app inventory.

- **Primary workflow:** GitHub → local Cursor → native Windows PowerShell → feature branch → reviewed PR. Claude Code or another coding agent is optional; the workflow must not depend on Claude Code Web.
- **No mandatory WSL, Ubuntu, Docker Desktop or local Supabase containers.** Do not invoke WSL or make bash/GNU utilities the only supported path. Prefer cross-platform Node scripts; provide PowerShell equivalents where needed. Specialized Linux/container checks run in CI or an explicit remote alternative.
- **Initial runtime baseline:** Node.js 24 LTS and pnpm 10.x, ARM64-native where available. Historical chat reports of Node 24.16.0/pnpm 10.12.4 are unverified; choose exact supported versions, pin Node and `packageManager`, and commit one pnpm lockfile when scaffolded. Verify installed versions and native dependencies at onboarding; never claim ARM64 testing from Linux CI alone.
- **Project home:** resolve the profile dynamically with `$env:USERPROFILE`; the founder's intended root is `AutomatedEmpires\Projects` with sibling logloads, oran and explore-and-earn repositories. Do not create or rearrange those folders as part of documentation work. No nested repositories.
- **Environment separation:** ORAN development/testing, preview/staging and production use separate credentials and data. Prefer an isolated remote development Postgres+PostGIS database for native work; CI verifies migrations, data and authorization against real Postgres+PostGIS. Fail explicitly on missing configuration; never fall back to production. No cloud provisioning is authorized by this contract.
- **Resources:** budget for 16 GB shared RAM; limit parallel builds and heavyweight generation, duplicated libraries and binary assets. Prefer native ARM64 dependencies and remote CI for expensive verification.
- **Independent projects:** LogLoads is a workflow reference, not ORAN's domain template. Do not share credentials, databases, migrations, authentication configuration or deployment resources with LogLoads or Explore&Earn.
- **Secrets:** never commit credentials or real user data. When the app is scaffolded, provide a credential-free `.env.example`, ignored local secret/cache/build files and a validated environment contract.

### PowerShell onboarding (read-only checks)

Run from the project folder in Cursor's integrated PowerShell terminal:

```powershell
node --version
node -p "process.platform + ' ' + process.arch"
pnpm --version
git --version
Get-Command node,pnpm,git,cursor -ErrorAction SilentlyContinue
$projects = Join-Path $env:USERPROFILE 'AutomatedEmpires\Projects'
```

If pnpm is unavailable, install the pinned version using a supported native method (Corepack only where supported) before dependencies. Resolve a runtime mismatch explicitly; do not assume the historical inventory is current. No tool installation is part of this documentation change.

**Current repository:** documentation only, no `package.json` or runnable app. After the approved scaffold exists, document `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` with actual scripts and isolated environment setup. Do not claim those commands work today.

Before handoff, record the exact pinned runtime/package-manager versions, PowerShell first run, environment-variable and database-isolation contracts, external dependencies, actual CI/branch-protection status and Windows ARM64 checks exercised. Identify untested behavior and open decisions honestly.
