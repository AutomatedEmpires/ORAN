# ORAN: Open Resource Access Network

By the people. For the people. ORAN is a community-powered assistance network with four foundational domains: **user, organization, approved community, and admin**. Users discover support through optional profiles and grounded personalized matching; organizations own their resources; approved community contributors build and verify the catalog; admins govern it.

This repository is **ORAN 2.0**, a controlled restart. The original implementation is kept as a read-only reference at [AutomatedEmpires/Open-Resource-Access-Network](https://github.com/AutomatedEmpires/Open-Resource-Access-Network).

## Status

**Gate 0: foundation under review.** There is no application code yet. The [blueprint](docs/BLUEPRINT.md) sets the order of work: an evidence phase comes before any product build.

The [founder amendment](docs/adr/0002-founder-vision-and-native-environment.md) supersedes earlier partner-first, anonymous-only and no-AI assumptions. Organization/community acquisition must work independently of future 211 and other integrations. Public anonymous discovery remains available.

The target local workflow is **Windows 11 ARM64 + Cursor + native PowerShell + pnpm**, without mandatory WSL or Docker. See the [environment contract and onboarding checks](AGENTS.md#6-native-development-environment-contract). There is no package.json or runnable app yet.

## Start here

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Operating rules for every contributor, human or AI |
| [docs/CONSTITUTION.md](docs/CONSTITUTION.md) | Binding rules C1–C23 |
| [docs/BLUEPRINT.md](docs/BLUEPRINT.md) | Strategic foundation: charter, architecture, data model, roadmap |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Founder decision log and scope of recorded approvals |
| [docs/adr/](docs/adr/) | Architecture decision records |
