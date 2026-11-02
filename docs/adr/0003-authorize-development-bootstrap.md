# 0003. Authorize the native development bootstrap and admin resource creation

- Status: Accepted within the founder-authorized development scope
- Date: 2026-11-02
- Decider: Founder
- Related: D0, D16, D19; C8, C12, C17; ADR-0001 and ADR-0002

## Context

After reviewing the proposed next steps, the founder said: “i want the ability as admin to add resources” and “go ahead and do those next steps. prepare the app for me to pull locally and work in cursor on it.” This authorizes implementation and reviewed merges needed for that handoff. It does not supply pilot research, a licence choice, a legal entity or deployment credentials.

## Decision

Build the native development scaffold and a small shared resource flow. Admins directly create resources; organizations maintain their scoped resources; approved community contributors verify assigned resources; users may save minimal voluntary matching preferences. Keep provenance, audit history, verification evidence and due dates separate from relevance.

Use Node 24 ARM64, pnpm, Next.js and TypeScript. An isolated embedded PostgreSQL development database may run in Node, bound to loopback, so local onboarding needs no WSL, Docker, cloud account or production credentials. It is a development-only tool. Real PostgreSQL/PostGIS CI remains mandatory for data and authorization. Supabase remains the production database direction; Clerk remains production identity. Local synthetic development identities must be explicitly enabled by the local launcher, loopback-only, and rejected in production.

Keep the initial schema an evolving HSDS-aligned subset with separate ORAN extensions. Generate Kysely types from the migrated database. Record environment, route and dependency contracts in the core documentation; do not claim full HSDS conformance or a completed schema freeze.

Preserve the existing foundation PR and history. The founder's instruction to execute the next steps authorizes landing that coherent imported foundation as a one-time bootstrap exception to C17; its large blueprint is reviewed as a whole. Subsequent changes target about 400 authored lines, with generated dependency lockfiles/types and tests reviewed separately.

The explicit instruction to prepare the app authorizes scaffold code while D16 remains open. No reuse licence is selected or granted by this decision. Record a founder-selected code/data licence before public release.

## Consequences

The previous documentation-only restriction and pre-implementation gate are amended only for this development scope. Pilot-region, staffing, organization form, budget, licensing, privacy review and public-launch gates remain unresolved until actually decided or evidenced. Do not invent outreach, interviews, compatibility results or approvals.

AI/model integration follows deterministic matching and evaluation; this bootstrap must not send personal data to a model or pretend AI is operating. Deployments, paid provisioning and changes to the old ORAN production system are outside this scope.
