# Architecture decision records

Every decision that changes architecture, the data model, security, privacy, or scope gets a numbered ADR (Constitution C20). The founder approves ADRs.

## Naming

Files are named `NNNN-short-title.md`, numbered in sequence. A number is never reused.

## Status values

| Status | Meaning |
| --- | --- |
| `Proposed` | Written, awaiting approval |
| `Accepted` | Approved and in force |
| `Superseded by NNNN` | Replaced by a later ADR |
| `Rejected` | Not adopted |

## Template

```markdown
# NNNN. Title

- Status: Proposed
- Date: YYYY-MM-DD
- Deciders: Founder
- Related: Constitution rules, BLUEPRINT sections, decisions (D#)

## Context
What problem or evidence forces a decision?

## Options considered
For each option: summary, pros, cons.

## Decision
What we will do, stated so an agent can follow it without interpretation.

## Consequences
What becomes easier or harder. Which follow-up work, rules, or checks are needed.
```

## Index

| # | Title | Status |
| --- | --- | --- |
| [0001](0001-adopt-foundation-blueprint.md) | Adopt the ORAN 2.0 foundation blueprint and Constitution | Proposed |
