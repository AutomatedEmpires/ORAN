# Founder decision log

These decisions come from BLUEPRINT §19, with the founder amendment recorded in ADR-0002. The 2026-11-02 continuation explicitly authorizes recording the four-domain vision and native environment; it does not approve the whole blueprint, implementation, infrastructure or unrelated recommendations.

- ADR-0003 authorizes the development bootstrap while unresolved pilot decisions remain open.
- Unresolved launch, licensing and operational decisions still gate public release; D17–D19 record founder direction.
- ADR-0004/D20 record the subsequent calm personal guide and Seek/Chat/Map/Profile direction. Detailed designs are proposed; D21/D22 preserve unresolved publication, automation, privacy, provider and release settings.

Only explicit founder direction changes a decision's status; contributors may record it with its source. Record each change with its date and a one-line rationale.

**Status values:** `Open`, `Approved`, `Amended` (approved with changes noted), `Rejected`.

| # | Decision | Recommendation | Status | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| D0 | Adopt the foundation with scoped bootstrap amendments | Develop the Cursor-ready app under ADR-0003 | **Amended** | 2026-11-02 | Founder directed execution of the next steps. This authorizes development, not a completed evidence phase or public launch. |
| D1 | Pilot region | Washington; choose the county in Phase 0 using the §4.2 criteria | Open | — | — |
| D2 | Independent acquisition | Organization/community first; partners complementary | **Amended** | 2026-11-02 | Founder direction: a functioning pilot cannot depend on a 211 agreement. Outreach owner/timing remains open. |
| D3 | Organizational form | Nonprofit or fiscal sponsor | Open | — | — |
| D4 | Verification labor and budget | About 0.5 FTE for the pilot | Open | — | — |
| D5 | Primary pilot user | Navigators first | Open | — | — |
| D6 | Stack: keep Vercel, Supabase and Clerk; add GitHub Actions jobs, Kysely, Supabase CLI migrations, Resend, the Census geocoder, an uptime monitor, and pnpm | Approve | Open | — | — |
| D7 | New repository | New repo; archive ORAN 1.0 after Gate 3 | **Approved** | 2026-11-02 | Founder created `AutomatedEmpires/ORAN` to build from scratch. Archive timing for 1.0 is still open. |
| D8 | Optional profiles and anonymous discovery | Voluntary purpose-specific profiles with consent and privacy controls | **Amended** | 2026-11-02 | Founder requires personalized profiles; this supersedes the earlier anonymous-only proposal. Detailed privacy implementation remains open. |
| D9 | Matching and release scope | Deterministic constraints plus resource-focused catalog/web assistance | **Amended** | 2026-11-02 | D20 expands grounded assistance and structured acquisition. Final qualification decisions and case management remain excluded; model/provider and measurable release settings remain open. |
| D10 | Launch languages | English and Spanish | Open | — | — |
| D11 | ORAN 1.0 production site | Honest maintenance mode | Open | — | — |
| D12 | Licence for ORAN-originated data | CC BY 4.0 | Open | — | — |
| D13 | Showing unreviewed Tier C listings | Show only if baseline accuracy is at least 80% | Open | — | — |
| D14 | Software budget ceiling | $150 per month | Open | — | — |
| D15 | Agent governance | Founder approves ADRs and gates; independent review at Gates 2–4; PRs of about 400 lines or fewer | Open | — | — |
| D16 | **Code licence for this public repository** (new; not in BLUEPRINT §19) | Choose before public release; development scaffold authorized by ADR-0003. Options: Apache-2.0 (permissive, patent grant), AGPL-3.0 (network copyleft), or MIT. | Open | — | This repository is public. Without a licence, others have no right to reuse the code. |
| D17 | Four foundational domains | User, organization, approved community, admin in one app | **Approved** | 2026-11-02 | Explicit founder direction: organization ownership; admin-approved scoped community verification and reverification; one shared resource system. |
| D18 | Native environment contract | Windows 11 ARM64, Cursor, PowerShell, Node/pnpm; no mandatory WSL/Docker | **Approved** | 2026-11-02 | Explicit continuation request and referenced setup. AGENTS.md records target and version-verification requirements, not an audited installation inventory. |
| D19 | Admin resource creation and app bootstrap | Admins directly add resources through the shared catalog acceptance path; prepare native local app | **Approved** | 2026-11-02 | Explicit founder request; production launch and unresolved business decisions are not implied. |
| D20 | Calm personal guide and conversational resource model | Foundational Seek / Chat / Map / Profile; voluntary profiles; bounded catalog/web guidance and structured discoveries | **Approved** | 2026-11-02 | Product direction only: founder selected “a calm personal guide,” proposed the four tabs and resource-only chat with catalog/web search and database updates, then requested substantial documentation expansion. ADR-0004 records authority; detailed layouts/implementation proposals are not yet approved or shipped. |
| D21 | Web discovery visibility and automatic acceptance | Define source permissions, field/risk allowlists, identity checks, evidence thresholds, suppression, review routing and rollback | Open | — | Needed before external-discovery display/auto-acceptance. Automatic candidate collection is D20 direction; no blanket unreviewed publication, sensitive-source exposure or change to D13 is approved. |
| D22 | Assistant provider, privacy and operating limits | Choose/evaluate model and search adapters, minimized payloads, consent/history retention, cost/latency limits and release thresholds | Open | — | No vendor, API key, paid service, sensitive-profile transmission or numerical evaluation threshold is selected by D20. Preserve model-independent discovery and native bootstrap. |
