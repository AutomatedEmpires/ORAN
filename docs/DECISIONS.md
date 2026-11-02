# Founder decision log

These decisions come from BLUEPRINT §19, and the recommendations are summarized from it.

- **D0–D8** block Phase 0.
- **D9–D16** block Phase 1.

Only the founder changes a decision's status. Record each change with its date and a one-line rationale.

**Status values:** `Open`, `Approved`, `Amended` (approved with changes noted), `Rejected`.

| # | Decision | Recommendation | Status | Date | Notes |
| --- | --- | --- | --- | --- | --- |
| D0 | Approve the blueprint and Constitution | Approve with amendments | Open | — | — |
| D1 | Pilot region | Washington; choose the county in Phase 0 using the §4.2 criteria | Open | — | — |
| D2 | Data strategy and outreach owner | WA211 first, with fallback plans B and C; founder-led outreach within 2 weeks | Open | — | — |
| D3 | Organizational form | Nonprofit or fiscal sponsor | Open | — | — |
| D4 | Verification labor and budget | About 0.5 FTE for the pilot | Open | — | — |
| D5 | Primary pilot user | Navigators first | Open | — | — |
| D6 | Stack: keep Vercel, Supabase and Clerk; add GitHub Actions jobs, Kysely, Supabase CLI migrations, Resend, the Census geocoder, an uptime monitor, and pnpm | Approve | Open | — | — |
| D7 | New repository | New repo; archive ORAN 1.0 after Gate 3 | **Approved** | 2026-11-02 | Founder created `AutomatedEmpires/ORAN` to build from scratch. Archive timing for 1.0 is still open. |
| D8 | No seeker accounts; no circumstances stored on servers | Confirm | Open | — | — |
| D9 | MVP exclusions: chat, AI, map, eligibility determination, closed-loop referral | Confirm | Open | — | — |
| D10 | Launch languages | English and Spanish | Open | — | — |
| D11 | ORAN 1.0 production site | Honest maintenance mode | Open | — | — |
| D12 | Licence for ORAN-originated data | CC BY 4.0 | Open | — | — |
| D13 | Showing unreviewed Tier C listings | Show only if baseline accuracy is at least 80% | Open | — | — |
| D14 | Software budget ceiling | $150 per month | Open | — | — |
| D15 | Agent governance | Founder approves ADRs and gates; independent review at Gates 2–4; PRs of about 400 lines or fewer | Open | — | — |
| D16 | **Code licence for this public repository** (new; not in BLUEPRINT §19) | Choose before the first code lands. Options: Apache-2.0 (permissive, patent grant), AGPL-3.0 (network copyleft), or MIT. | Open | — | This repository is public. Without a licence, others have no right to reuse the code. |
