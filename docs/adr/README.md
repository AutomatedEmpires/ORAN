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
| [0001](0001-adopt-foundation-blueprint.md) | Adopt the ORAN 2.0 foundation blueprint and Constitution | Accepted for development scope, as amended by 0002, 0003 and 0005 |
| [0002](0002-founder-vision-and-native-environment.md) | Record founder vision and native environment amendment | Accepted for direction; D0 open |
| [0003](0003-authorize-development-bootstrap.md) | Native development bootstrap and direct admin entry | Accepted for development scope |
| [0004](0004-conversational-resource-guide.md) | Calm personal guide, four seeker views and structured web discovery | Accepted for product direction; detailed implementation policies open |
| [0005](0005-founder-vision-interview.md) | Founder vision interview: nationwide coverage-first directory, guide memory, licensing, nonprofit form | Accepted for product direction; amended by 0007 |
| [0006](0006-resource-foundation-design.md) | Resource foundation: listing record, publication, identity, flags and verification queue | Accepted for design; implementation in reviewed PRs |
| [0007](0007-memory-and-crisis-help-refinements.md) | Memory saves without asking, crisis help in the menu, quick exit details | Accepted |
