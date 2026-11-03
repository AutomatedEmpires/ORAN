# AGENTS.md: ORAN 2.0 operating rules

Read this file first. It applies to every contributor, human or AI agent.

## 1. Authority

1. [docs/CONSTITUTION.md](docs/CONSTITUTION.md) is binding (rules C1–C23).
2. [ADR-0002](docs/adr/0002-founder-vision-and-native-environment.md) records the authoritative founder amendment: four domains, voluntary profiles, grounded matching, independent acquisition and the native environment below. It supersedes conflicting earlier assumptions.
   [ADR-0004](docs/adr/0004-conversational-resource-guide.md) records the later calm personal guide direction: Seek / Chat / Map / Profile, bounded catalog-and-web assistance and structured acquisition. It supersedes earlier map/chat deferral and blanket web-extraction exclusion; detailed policies remain open.
   [ADR-0005](docs/adr/0005-founder-vision-interview.md) records the founder vision interview. It sets nationwide scope and automatic publication of complete records with trust labels, automatic guide memory (C8 amended), relevance-based crisis/quick-exit placement, CC BY 4.0 data, AGPL-3.0 code and nonprofit form. Where it conflicts with earlier documents, ADR-0005 governs.
3. [docs/BLUEPRINT.md](docs/BLUEPRINT.md) explains the amended rules and product and architecture intent until Gate 2. At Gate 2 it is split into the core documents listed in BLUEPRINT §11.4.
4. Founder decisions are recorded in [docs/DECISIONS.md](docs/DECISIONS.md). Architecture decisions are recorded in [docs/adr/](docs/adr/).
5. Follow explicit recorded founder amendments. Report unresolved conflicts with the rule/decision ID; do not invent approval (C21).

## 2. Current phase

**Development bootstrap authorized (2026-11-02).** The founder explicitly requested admin resource creation and directed us to execute the next steps and prepare the app for local Cursor work. [ADR-0003](docs/adr/0003-authorize-development-bootstrap.md) records the scope.

- Implement and test the development scaffold and small four-domain resource workflows through reviewed PRs.
- Admins can directly create resources, with the same acceptance, provenance, history and verification rules as other channels.
- Legal form, launch languages and data/code licensing are decided in ADR-0005. Funding, the assistant provider (D22), replacement milestones for the pilot-county gates and production readiness remain open. Do not mark gates complete without evidence.
- No production deployment or paid cloud provisioning is part of this bootstrap.

## 3. Fixed platform direction

Hosting is Vercel, the database is Supabase Postgres + PostGIS, and identity is Clerk. Azure and Foundry services are not used. Additions to the stack follow BLUEPRINT §10 and require decision D6.

## 4. Working rules

- **Work by pull request only.** Never push to `main`. Target about 400 authored lines per PR, excluding tests, fixtures and generated lock/type outputs reviewed separately (C17). ADR-0003 records the existing foundation bootstrap exception.
- **Reference repository.** ORAN 1.0 (`AutomatedEmpires/Open-Resource-Access-Network`) is read-only reference material. Port from it only by re-implementing with tests, citing the source path and commit `e0c9afd` (C23). Do not copy its documents into this repository.
- **No speculative documentation.** No new documents beyond the core set and ADRs (C22).
- **Honest status.** Never report work as done unless it runs end to end (C2, §13.3).

## 5. Founder product contract

- Four foundational experiences: **user, organization, approved community, admin**, sharing one app and canonical resource catalog.
- Primary success measure: **people reaching help** (D23). Scope is nationwide. Complete records publish automatically with trust labels; flags jump the verification queue; duplicates resolve to one listing (ADR-0005).
- Users can browse anonymously, or opt into a profile that also serves as the guide's automatic memory, with visible, reversible saves and ask-first sensitive categories (C8). Use deterministic eligibility/coverage rules plus staged AI-assisted interpretation and catalog-grounded explanations; expose unknowns and never guarantee qualification or capacity.
- Seek, Chat, Map and Profile are the foundational seeker views. Chat helps with resources and access steps, uses consent-filtered context and attributed catalog/web evidence, and produces structured proposals through the shared acceptance path. It never writes HSDS directly, establishes independent verification, or overrides permissions. See BLUEPRINT §2.3–§2.6 and §5.8; D21/D22 still gate display, automation and provider policies.
- Organizations own and maintain one or many resources through scoped staff memberships and approved claims. All channels use the acceptance service; ownership does not establish independent verification.
- Community contributors require admin approval and geographic/category-scoped assignments. They discover, propose, verify and periodically reverify resources with evidence. They do not gain access to seeker profiles or unrestricted edits to claimed listings.
- Admin directly adds resources and governs approvals, claims, disputes, publication, verification schedules, privacy and operations. Organization/community acquisition must work without a 211 or other institutional agreement; integrations are complementary.

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

If Node or pnpm is missing or mismatched, use scripts/run.ps1 to prepare the exact pins inside the ignored project-local toolchain. Preserve global tools used by other projects. Corepack is optional; do not assume the historical inventory is current.

**Current repository:** Native development app with pinned Node 24.22.2 and pnpm 10.34.9. From Cursor PowerShell, `scripts/run.ps1 install --frozen-lockfile` and `scripts/run.ps1 dev` prepare isolated tools and PostgreSQL/PostGIS without WSL, Docker or cloud credentials. Admin, organization, approved-community and minimal profile/matching flows are implemented. Run typecheck, lint, test, build and test:e2e through the same helper or pinned pnpm. README lists actual scope and remaining work; ARCHITECTURE.md/DATA_MODEL.md define the contracts.

**Target versus implemented:** The expanded chat/map/profile model is documented direction, not shipped functionality. No live model/web discovery, expanded profile, chat history or automatic catalog acquisition exists yet. Do not add credentials, new vendors or publication-policy changes merely because the target describes them. Preserve the credential-free native bootstrap while implementing evaluated slices.

Before handoff, record the exact pinned runtime/package-manager versions, PowerShell first run, environment-variable and database-isolation contracts, external dependencies, actual CI/branch-protection status and Windows ARM64 checks exercised. Identify untested behavior and open decisions honestly.
