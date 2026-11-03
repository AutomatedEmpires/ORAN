# ORAN 2.0 Constitution (v1.0-draft)

**Status:** Development baseline adopted within the founder-authorized bootstrap (D0 and ADR-0003). Pilot and public-release gates remain open; see [DECISIONS.md](DECISIONS.md).

**Authority:** These rules bind every contributor, human or AI agent. They are synchronized with §15 of [BLUEPRINT.md](BLUEPRINT.md), as amended by [ADR-0002](adr/0002-founder-vision-and-native-environment.md), and section references (§) point to that document. Changing a rule requires a founder-approved ADR in [adr/](adr/).

**On conflict:** follow C21. The explicit founder amendments in ADR-0002, [ADR-0004](adr/0004-conversational-resource-guide.md) and [ADR-0005](adr/0005-founder-vision-interview.md) supersede earlier contradictory product assumptions; unrelated decisions and detailed implementation policies remain open. ADR-0004, ADR-0005 and ADR-0007 preserve the rules below, including source permissions and the single catalog write path. ADR-0005 and ADR-0007 amend C8.

**Purpose and scope**

- **C1.** Every capability traces to a documented problem (§1–§2) and to its phase in §14. If it does not, do not build it; record it as an evidence item.
- **C2.** Never present functionality, data, status, or verification that is not real and operating end-to-end. No placeholder badges, scores, hardcoded statuses, or "coming soon" toggles in production.

**Data**

- **C3.** There is one canonical model: HSDS 3.3.x names and semantics, plus the ORAN extension entities in §6.3. Never create a parallel model, mirror table, or second ORM schema.
- **C4.** **There is one write path.** Only the `catalog` acceptance service writes HSDS tables, by applying accepted field assertions and recomputing `listing_state` in the same transaction.
- **C5.** Raw source records are immutable. Every accepted value is traceable to its assertion and origin.
- **C6.** A source must be registered, with its agreement or licence basis recorded, before its first import. Never scrape a source whose terms prohibit it.
- **C7.** Reports and upstream updates never hide a listing automatically, except under the rules in §5.6.
- **C8.** Anonymous discovery remains available. Store personal profiles only with voluntary consent, least-privilege access, retention and deletion controls. An account holder's one-time opt-in to guide memory is the consent for automatic saves, including sensitive details, and the opt-in says so. Each save is visible and reversible, and people can review, edit and delete what is remembered. Never log sensitive profile, search or location data. Profile data reaches an external model only after the memory opt-in, with minimized payloads (§2.1.1, §7, ADR-0005, ADR-0007).

**Architecture**

- **C9.** Use one deployable app, one database, one connection pool, and one scheduler (GitHub Actions jobs). New services, queues, vendors, or runtimes need an ADR and founder approval.
- **C10.** Respect module boundaries (§11.3). Import only through a module's `index.ts`. Only `platform` and `ui` are shared.
- **C11.** Use parameterized SQL through Kysely only. Types are generated from the database, never hand-written.
- **C12.** Every route declares an authorization policy; deny by default. Users access only their private profiles; organization control comes from scoped memberships and approved claims; community verification requires admin approval and assignment scope. Audit privileged actions (§2, §7).
- **C13.** New tables, environment variables, routes, dependencies, or feature flags each require an entry in their contract or ADR. Feature flags have an owner and an expiry date.

**Quality**

- **C14.** The Definition of Done (§13.3) applies to every change.
- **C15.** Integration tests that touch data or authorization run against real Postgres+PostGIS. Mocking the database or the auth policy in those tests is forbidden.
- **C16.** Never skip, disable, or weaken a test or check to get green.
- **C17.** Target about 400 authored changed lines per PR, excluding tests, fixtures and generated lock/type outputs reviewed separately. Split unrelated changes. ADR-0003 records the one-time existing foundation bootstrap exception.

**Design**

- **C18.** Build screens only from approved layouts and components. Seeker copy uses the trust vocabulary (§12.4) and message catalogs (EN + ES).
- **C19.** Every screen implements the required states (§12.5), including the honest outage state.

**Process**

- **C20.** Decisions that change architecture, data model, security, privacy, or scope go in a numbered ADR: context, options, decision, consequences. The founder approves.
- **C21.** Follow explicit founder amendments recorded in decisions and ADRs. For unresolved conflicts, report the specific rule or decision; do not invent approval or silently choose a new product direction.
- **C22.** Documentation is limited to the core set (§11.4) plus ADRs. Do not generate audit, scenario, or status documents inside the product repository.
- **C23.** Port code from ORAN 1.0 only by re-implementation with tests, citing the source path and commit.
