# 0004. Adopt the conversational resource guide product direction

- Status: Accepted for founder product direction and documentation; detailed implementation policies remain open as identified below
- Date: 2026-11-02
- Decider: Founder
- Related: D8, D9, D13, D17–D22; C2–C6, C8–C14, C18–C22; ADR-0002 and ADR-0003

## Context

After the native bootstrap, the founder requested a visionary, inviting application that connects people to relevant resources quickly and selected **“a calm personal guide.”** The founder then proposed **“seek. chat. map. profile.”** as pinned seeker navigation, profile-aware guided chat querying both the database and the web, resource-only scope, and collecting resource template information to update the database. The subsequent instruction was **“update docs and etc. expand on it substantially.”** This authorizes recording and developing the product model, without claiming its features already run.

The earlier blueprint deferred maps and conversation and excluded web extraction from the initial scope. Those product exclusions now conflict with founder direction. Existing evidence, privacy, source permissions, ownership, scoped community approval and the single acceptance path still apply. The implemented development bootstrap remains intact.

## Options considered

1. **Catalog browsing with conversation/map deferred indefinitely.** Simple initial surface, but contradicts the new foundational experiences and misses guided discovery and demand-informed acquisition.
2. **An unrestricted chatbot with direct database edits.** Broad generation and immediate writes are easy to describe, but cannot preserve resource scope, source evidence, authorization, revision history or independent verification.
3. **A resource-focused guide over a shared catalog, permitted web discovery and structured proposals.** Preserves direct control through Seek/Map, personal context through Profile/Chat, and improves the catalog through existing acceptance and governance boundaries. Selected for product direction.

## Decision

- Adopt Seek, Chat, Map and Profile as foundational seeker experiences within the existing four-domain application. These navigation views are distinct from user/organization/approved-community/admin authorization domains.
- Make resource discovery and practical access guidance the assistant's purpose. Support natural conversation and preset need-specific questions, voluntary profile context, source-backed cards and useful next actions. Preserve anonymous direct discovery and deterministic/model-independent fallback.
- Use existing model capabilities through replaceable, bounded adapters; training a proprietary foundation model is not required by this direction. No vendor, model, new paid service, credential or external sensitive-data transfer is selected or authorized here.
- Support catalog queries and permitted web discovery. Extract supported service-template facts into durable, idempotent proposals with source evidence. Only catalog acceptance can apply accepted values and recompute publication; chat never receives arbitrary SQL or unrestricted write authority.
- Keep candidate collection, field acceptance, public display and independent verification separate. Automatic candidate acquisition is the target. D21 remains open for web-discovery visibility, source/field/risk auto-acceptance rules and measurable release thresholds; this ADR does not approve unreviewed publication or alter D13 implicitly.
- Preserve organization ownership and direct admin entry. Approved community members verify/reverify within assigned geography/category; neither a model extraction nor an owner claim grants independent verification.
- Record expanded experience, onboarding, template, acquisition and design requirements in BLUEPRINT; proposed boundaries and evaluation in ARCHITECTURE; conceptual data changes in DATA_MODEL. Remain within the core documentation set (C22).

## Consequences

This amendment supersedes the earlier blanket web-extraction exclusion and evidence-trigger-only deferral of foundational map/chat. It does not remove evidence-based release checks, source registration/permissions (C6), voluntary privacy controls (C8), existing launch gates or the native Windows ARM64 contract. The existing public catalog continues to show only currently checked records until reviewed implementation changes its policy.

The detailed designs and delivery sequence are proposals for implementation review, with open settings in D21/D22. No route, dependency, migration, environment variable, model call, public launch or cloud provisioning is introduced by this documentation change. Implementation proceeds in reviewed vertical slices, each updating contracts and demonstrating real behavior. Required follow-up includes layout approval, profile/history consent and deletion design, source permission/display policy, provider/budget choice, abuse controls, field-grounding evaluations and real PostgreSQL/PostGIS authorization tests.
