# ORAN: Open Resource Access Network

**By the people. For the people.** One assistance network with four foundational experiences: user, organization, approved community and admin.

This is the ORAN 2.0 development bootstrap. The [original repository](https://github.com/AutomatedEmpires/Open-Resource-Access-Network) is preserved as reference. The founder vision and development authorization are recorded in [ADR-0002](docs/adr/0002-founder-vision-and-native-environment.md) and [ADR-0003](docs/adr/0003-authorize-development-bootstrap.md).

## Product direction: a calm personal guide

The founder's expanded model has four pinned seeker experiences: **Seek** for direct search/filtering and optional matching; **Chat** for guided, resource-focused assistance using catalog and permitted web evidence; **Map** for locations, coverage and services; **Profile** for voluntary personalization and saved support. They share resource identities, evidence and session context. Organization, approved-community and admin workspaces maintain the same catalog.

Chat discoveries should improve the catalog through structured, source-backed proposals. Collecting a candidate, accepting facts, publishing a listing and independently verifying it remain distinct operations; source permissions and explicit automation/display policies apply. The target is explained in [Blueprint §2.3–§2.6](docs/BLUEPRINT.md#23-the-seeker-product-a-calm-personal-guide) and [§5.8](docs/BLUEPRINT.md#58-chat-assisted-acquisition-and-catalog-improvement), with the direction recorded in [ADR-0004](docs/adr/0004-conversational-resource-guide.md). Delivery slices and evaluation are in [Architecture](docs/ARCHITECTURE.md#proposed-delivery-slices-and-release-evidence).

[ADR-0005](docs/adr/0005-founder-vision-interview.md) records the founder's vision interview: nationwide scope, automatic publication of complete records with trust labels, automatic guide memory, "people reaching help" as the primary success measure, CC BY 4.0 data, AGPL-3.0 code and nonprofit form.

**This is target design.** Chat, web discovery/acquisition, interactive maps, expanded profiles and saved resources are not implemented in the current bootstrap. The native first-run workflow below remains credential-free.

## Pull and open in Cursor

From your intended projects folder, use native PowerShell:

```powershell
git clone https://github.com/AutomatedEmpires/ORAN.git oran
Set-Location oran
cursor .
.\scripts\run.ps1 install --frozen-lockfile
.\scripts\run.ps1 dev
```

Open <http://127.0.0.1:3000>. The helper prepares **Node 24.22.2 ARM64 and pnpm 10.34.9** inside the ignored .local folder and verifies the official Node archive checksum. It preserves your globally installed tools. If these pinned tools are already in your terminal, ordinary pnpm commands also work.

No WSL, Docker, API keys or cloud account are needed for local work. The launcher starts isolated PostgreSQL/PostGIS, applies migrations, and creates explicitly labeled development identities. Your development catalog persists in .local/postgres. No resources are seeded. Use synthetic profiles while developing.

## Try the resource workflow

1. Open **Switch identity → Admin**. Add a resource, its ZIP/category, published criteria, intake instructions and source note.
2. Under **Community approvals**, approve the development contributor for the same ZIP and relevant categories.
3. Switch to **Community**, review the assigned resource and record the method, evidence and fields checked.
4. Open **Find support**. The checked resource is now visible with its check date, method, scope and next review date.
5. Switch to **My profile**, consent to minimal ZIP/need preferences, and see explained matches. Delete the preferences at any time.

Organization staff create and edit only their own resources. Approved community contributors can also propose resources within their grants. Admins can add and edit resources directly. All channels share acceptance, provenance and audit history. Edits invalidate prior checks; overdue checks return to the due-date queue.

## Checks

```powershell
.\scripts\run.ps1 typecheck
.\scripts\run.ps1 lint
.\scripts\run.ps1 test
.\scripts\run.ps1 build
.\scripts\run.ps1 test:e2e
```

Browser tests use a separate fresh database, app port 3100, a loopback-only test database on port 3101, and the .next-test build folder. Windows uses installed Microsoft Edge when available; otherwise install the Playwright Chromium browser with the package runner. CI installs Chromium explicitly. Test traces are ignored.

CI checks Windows and Linux, standard PostgreSQL 17/PostGIS 3.6 integration and browser accessibility. Native Windows ARM64 has also been exercised locally. See the PR checks for the exact current result; a Linux build alone is not ARM64 evidence.

## Current scope

Implemented: direct admin/organization/community resource entry; organization-scoped edits; approved ZIP/category verification assignments; evidence and due dates; public checked-resource discovery; consented minimal matching preferences and deletion; deterministic explained matching; English/Spanish catalogs; admin-extendable categories (10 seeded, English and Spanish labels, multiple per resource); accounts holding several role memberships (admin, organization, community); staff, admins included, never verify their own organization's listings.

Still to build: the Seek/Chat/Map/Profile experience; richer profiles and saved resources; evaluated resource-focused model integration and permission-aware web discovery/proposals; real organization registration/claims and staff invitations; contributor application/revocation UI; reminders and full risk tiers; licensed external imports; production runtime roles, operations and deployment. No live model calls or institutional agreement are required for this bootstrap. Spanish requires native-speaker review before public release.

For dedicated remote development, copy .env.example to .env.local, configure an isolated non-production database and Clerk development instance, then use dev:remote. The db:migrate and admin:grant commands refuse production stage. Production readiness and unresolved founder decisions remain separate from this development handoff.

## Repository contracts

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Contributor authority, native environment and working rules |
| [Constitution](docs/CONSTITUTION.md) | Enforceable development rules |
| [Blueprint](docs/BLUEPRINT.md) | Target product and architecture |
| [Decisions](docs/DECISIONS.md) | Recorded direction and unresolved founder decisions |
| [Architecture](docs/ARCHITECTURE.md) | Dependencies, routes, identity and verification status |
| [Data model](docs/DATA_MODEL.md) | Implemented schema, provenance and environment contracts |
| [Design system](docs/DESIGN_SYSTEM.md) | Approved Blend tokens, layouts, components and seeker copy |

## License

ORAN's code is licensed under the [GNU Affero General Public License v3.0](LICENSE) (decision D16). ORAN-originated data is intended for release under CC BY 4.0 (D12); no data has been released yet.
