# ORAN 2.0 Constitution (v1.0-draft)

**Status:** Draft, pending founder approval (decision D0 in [DECISIONS.md](DECISIONS.md)).

**Authority:** These rules bind every contributor, human or AI agent. They are copied verbatim from §15 of [BLUEPRINT.md](BLUEPRINT.md), and section references (§) point to that document. Changing a rule requires a founder-approved ADR in [adr/](adr/).

**On conflict:** if a task conflicts with any rule, stop and report the conflict, citing the rule ID (C1–C23). Do not resolve it yourself.

**Purpose and scope**

- **C1.** Every capability traces to a documented problem (§1–§2) and to its phase in §14. If it does not, do not build it; record it as an evidence item.
- **C2.** Never present functionality, data, status, or verification that is not real and operating end-to-end. No placeholder badges, scores, hardcoded statuses, or "coming soon" toggles in production.

**Data**

- **C3.** There is one canonical model: HSDS 3.3.x names and semantics, plus the ORAN extension entities in §6.3. Never create a parallel model, mirror table, or second ORM schema.
- **C4.** **There is one write path.** Only the `catalog` acceptance service writes HSDS tables, by applying accepted field assertions and recomputing `listing_state` in the same transaction.
- **C5.** Raw source records are immutable. Every accepted value is traceable to its assertion and origin.
- **C6.** A source must be registered, with its agreement or licence basis recorded, before its first import. Never scrape a source whose terms prohibit it.
- **C7.** Reports and upstream updates never hide a listing automatically, except under the rules in §5.6.
- **C8.** Never store seeker identity or circumstances on the server. Never log seeker search free text or location.

**Architecture**

- **C9.** Use one deployable app, one database, one connection pool, and one scheduler (GitHub Actions jobs). New services, queues, vendors, or runtimes need an ADR and founder approval.
- **C10.** Respect module boundaries (§11.3). Import only through a module's `index.ts`. Only `platform` and `ui` are shared.
- **C11.** Use parameterized SQL through Kysely only. Types are generated from the database, never hand-written.
- **C12.** Every route declares an authorization policy. Deny by default. Organization scope comes from memberships.
- **C13.** New tables, environment variables, routes, dependencies, or feature flags each require an entry in their contract or ADR. Feature flags have an owner and an expiry date.

**Quality**

- **C14.** The Definition of Done (§13.3) applies to every change.
- **C15.** Integration tests that touch data or authorization run against real Postgres+PostGIS. Mocking the database or the auth policy in those tests is forbidden.
- **C16.** Never skip, disable, or weaken a test or check to get green.
- **C17.** Every PR is ≤ ~400 changed lines excluding tests and fixtures. Split larger work.

**Design**

- **C18.** Build screens only from approved layouts and components. Seeker copy uses the trust vocabulary (§12.4) and message catalogs (EN + ES).
- **C19.** Every screen implements the required states (§12.5), including the honest outage state.

**Process**

- **C20.** Decisions that change architecture, data model, security, privacy, or scope go in a numbered ADR: context, options, decision, consequences. The founder approves.
- **C21.** Agents do not resolve conflicts between this Constitution and a task. They stop and report the conflict.
- **C22.** Documentation is limited to the core set (§11.4) plus ADRs. Do not generate audit, scenario, or status documents inside the product repository.
- **C23.** Port code from ORAN 1.0 only by re-implementation with tests, citing the source path and commit.
