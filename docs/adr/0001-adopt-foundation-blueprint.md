# 0001. Adopt the ORAN 2.0 foundation blueprint and Constitution

- Status: Accepted for development scope, as amended by ADR-0002 and ADR-0003
- Date: 2026-11-02
- Deciders: Founder
- Related: [BLUEPRINT.md](../BLUEPRINT.md), [CONSTITUTION.md](../CONSTITUTION.md), decisions D0 and D7

## Context

The 2026-11-02 audit of ORAN 1.0 found a large codebase built around a very small data supply:

- about 131k lines of application TypeScript, 77 migrations, and three parallel data models;
- 458 published listings, all entered manually, and no automated acquisition path that publishes;
- a production database that was unreachable on the audit date.

The audit recommended a controlled restart. The founder approved a restart in principle and created this repository (D7). Many AI agents will work here, so the foundation must be fixed before implementation to prevent the architectural drift that shaped ORAN 1.0.

## Options considered

1. **Adopt the blueprint and Constitution as the governing foundation.**
   - Pros: one coherent source of intent; binding, citable rules (C1–C23); approval gates tied to evidence.
   - Cons: up-front planning time; some decisions are still open.
2. **Start implementation now and settle the architecture as we go.**
   - Pros: faster visible progress.
   - Cons: repeats ORAN 1.0's failure pattern of building ahead of evidence and drifting across agents.
3. **Port ORAN 1.0 incrementally into this repository.**
   - Pros: reuses work already done.
   - Cons: imports the parallel models and the patterns the audit identified as the main cost.

## Decision

Adopt option 1.

- `docs/CONSTITUTION.md` is binding on all contributors.
- `docs/BLUEPRINT.md` describes product and architecture intent until Gate 2, subject to the explicit founder amendment in [ADR-0002](0002-founder-vision-and-native-environment.md).
- ADR-0003 authorizes the development scaffold, schemas, dependencies and CI before pilot evidence is complete. Production and public-launch gates remain in force.

## Consequences

- The next work is Phase 0 evidence gathering (BLUEPRINT §4.3), which happens outside this repository.
- Unresolved pilot and public-release decisions remain open; ADR-0003 defines the current implementation authorization.
- Any amendment to the Constitution requires a new ADR.
