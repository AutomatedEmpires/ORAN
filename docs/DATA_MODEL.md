# Implemented development data contract

The initial evolving subset uses HSDS 3.3.1 organization, service and service_area names and field semantics. Checked against tagged schemas before implementation:
[service](https://github.com/openreferral/specification/blob/3.3.1/schema/service.json),
[service_area](https://github.com/openreferral/specification/blob/3.3.1/schema/service_area.json),
[taxonomy](https://github.com/openreferral/specification/blob/3.3.1/schema/taxonomy.json),
[taxonomy_term](https://github.com/openreferral/specification/blob/3.3.1/schema/taxonomy_term.json),
[attribute](https://github.com/openreferral/specification/blob/3.3.1/schema/attribute.json).

All tables live in the private oran schema. The Supabase Data API is not used. RLS is enabled and no browser grants are made. The bootstrap uses an isolated owner connection for development/tests; a least-privilege runtime role, release migrations and deployment review are required before production.

| Tables | Contract |
| --- | --- |
| organization, service, service_area | One canonical resource model; the catalog acceptance service is the sole application writer |
| account | One row per signed-in person (Clerk user id and display name); target of every actor and owner reference; unreadable to browser roles |
| membership | One row per role grant for an account (admin, organization or community; never `user`), unique per account, role and organization; carries organization scope (required for, and only for, organization rows), an approval flag that gates every role's privileges, ZIP and explicit category grants; never trust a role submitted by the browser |
| revision | One row per accepted submission to a listing (service, actor, origin, time). `listing_state.revision_id` points at the latest one and is the verification stale-check token. Whole-form snapshots from before slice 2 stay read-only in `legacy_snapshot` |
| field_assertion | One value for one field of one organization, service or location, with entity type and id, field path, JSON value, origin (organization, verifier, admin, pipeline, chat_discovery, flag), source reference (url with address, phone_call, organization, legacy), observed time, status (proposed, accepted, superseded, rejected), and decided by/at. At most one accepted value per field; replaced values become superseded and stay as history. Only the catalog acceptance service writes it |
| audit_event | Privileged action history, committed atomically with the action (unchanged) |
| listing_state, verification_event, work_item | Unreviewed until evidence is recorded; current accepted revision, methods/fields/evidence, 30-day review due date and scoped assignment; edits invalidate verification and stale verification submissions are rejected |
| personal_profile | Own-user ZIP and selected needs only, explicit consent timestamp, update and deletion; no sensitive expanded fields yet |
| taxonomy, taxonomy_term, category_display, attribute | HSDS 3.3.1 taxonomy tables hold the ten ORAN categories as data; category_display is the ORAN presentation extension (sort order, English and draft Spanish labels). Service categories are attribute rows; the catalog acceptance service is the sole application writer |
| oran_meta.migration | Migration name and SHA-256; reject edits to already-applied migrations |

ZIP coverage is a stated text service area, not an inferred polygon or a capacity claim. Public discovery includes only active records with current checks. Expired checks leave public discovery and reappear in the due-date queue. Reminder delivery, full risk tiers, claims, external imports and complete HSDS export validation remain future work.

The local store is .local/postgres and contains development identities only by default. Use synthetic data. It persists between starts and is never committed. The signed local session expires after one hour and becomes invalid when the launcher restarts. No local identity mode is allowed with production/preview stage, production Node mode, hosted Vercel, or a remote database.

## Environment contract

| Variable | Scope |
| --- | --- |
| DATABASE_URL | Explicit environment database; the local launcher supplies only its isolated loopback database |
| ORAN_ENV | development, test, preview or production; no credential fallback |
| ORAN_DATABASE_HOST | Required hostname match for explicitly configured database environments |
| ORAN_APP_ORIGIN | Exact origin for state-changing HTTP endpoints |
| ORAN_LOCAL_DEV, ORAN_SESSION_SECRET | Local-launcher-only identity mode and random process secret; never configure on a hosted environment |
| ORAN_TEST_RUN | Test-launcher-only separate build output; it grants no permissions |
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY | Separate Clerk development instance for remote authenticated work; no secret is public |

pnpm db:migrate and pnpm admin:grant refuse production stage. Code generation uses the migrated schema; db.generated.ts is generated, never edited by hand. The standard PostgreSQL/PostGIS CI job must pass in addition to native embedded tests.

Acceptance, verification and contributor-scope changes serialize through one transaction advisory lock in this bootstrap, then lock resource rows consistently. This keeps assignments valid when scope and catalog edits race, including new resources created during an approval change. Reads remain concurrent; partitioning the write lock is a later measured optimization.

## Proposed conversational and template extensions (ADR-0004; not implemented)

This section is conceptual, not a migration or permission to assume these fields exist. The implemented tables above remain authoritative. Extend the single HSDS-aligned model through reviewed migrations and generated types; verify names/semantics against the pinned HSDS release before adding objects. Template modules are typed views/editors over canonical fields and justified ORAN extensions, not a second resource store.

| Concept | Proposed data contract |
| --- | --- |
| Resource identity and access | Stable organization/service IDs with location and service-at-location relationships, public address/coordinates where appropriate, schedules/timezones, service areas, contacts, intake, cost, published criteria and relevant module fields. Separate provider headquarters from where help is delivered. |
| Template definition | Versioned supported field groups, applicability, validation, visibility, purpose, HSDS mapping/extension and evidence requirements. Multiple modules can apply; preserve unknown/not provided/not applicable. No arbitrary per-organization schema or HTML. |
| Source and evidence | Registered source with display/storage/export permissions, attribution and withdrawal policy; immutable permitted payload/evidence reference and hash; retrieved time distinct from observed/effective dates; per-field source authority. Store only content the permission/retention policy allows. |
| Discovery candidate | Staging/proposal lifecycle linked to source records and proposed field assertions, identity-match candidates, extractor/policy version and processing outcome. It is not a parallel publicly authoritative catalog. Private conversation/user IDs are not public provenance. |
| Field assertion and decision | Proposed value, target identity/field, source evidence, expected catalog revision, observed time, actor/origin, accepted/rejected/superseded status, policy/decision actor and reason. Do not describe the current bootstrap snapshot format as already implementing this full conceptual field policy. |
| Verification and publication | Evidence method, fields covered, check date/expiry, independence and result; accepted revision and derived visibility remain distinct from extraction confidence, relevance or live capacity. Discovery cannot mint a successful independent verification event. |
| Personal context | Own-user optional profile sections with purpose/use and sharing controls, consent version/time, field freshness, retention/deletion. Ephemeral need/proxy context is separate from persistent profile facts. |
| Conversation continuity | Optional, private retained conversations only under an explicit history policy; opaque IDs, own-user access, minimal validated context, expiry/deletion and evidence/resource revision references. Do not store raw chain-of-thought or implicitly retain anonymous chats. |
| Saved resources and notes | Own-user references to canonical IDs or controlled discovery references, private notes and explicit retention. Resolve current facts/visibility at read time; never expose a stale confidential snapshot. A withdrawn source's discovery becomes unavailable under its policy. |
| Processing/audit work | Idempotency key from source identity/content hash, extractor/policy version and target revision; deduplicated processing outcome, review assignment and acceptance audit. Job metadata must not contain personal search content. |

**Promotion invariants:** proposals can be retained without changing a service; accepted field changes and publication recomputation happen atomically through catalog acceptance. Automatic acceptance requires the approved D21 policy. A stale expected revision forces re-comparison; neither a repeated model run nor repeated source mirror counts as independent evidence. Rejection preserves the accepted value and authorized provenance; correction/merge retains identity links and history without republishing suppressed facts.

**Missing and conflicting information:** store a missing operational field as unknown, with source coverage where appropriate. Do not substitute invented hours, eligibility, coordinates or stock. A confidence estimate measures an extraction/matching process and must not masquerade as a verification state. Preserve contradictory assertions for review with their dates and field authority. Accepted facts need revision/freshness references so answer rendering can detect changes or removal.

**No seeker-to-public-data linkage:** source extraction receives only the public page and relevant template definition. Remove personal need narratives, account identifiers, precise seeker location and conversation IDs before creating source records/assertions or community tasks. Public provider contacts must be distinguished from personal staff information. Reviewers need the evidence and service context, not the searcher's identity or circumstances. Private data is excluded from exports and public resource caches.

**Access and erasure:** profiles, saved resources, notes and opted-in history are separate private purposes with documented deletion behavior, including provider processing and backup limits. Revoking external sharing affects subsequent calls immediately; deleting a profile does not silently claim to erase unrelated public provider facts or records already processed externally. Identity/membership retention and privileged-action audit require their own justified policy; no shared admin/community role provides unrestricted seeker access.

**Map and coverage:** retain coordinate source/precision and public-display classification. A named ZIP service area is not proof of a verified intake location, a route or a service polygon. Confidential coordinates never enter public query projections or client caches. Service areas, location schedules and remote access belong to the appropriate entity relationships, not a single overloaded map pin.

No environment variable, provider key, table, route or dependency is added by this design. Future implementations must update the concrete contracts, migration and generated types together and test acceptance, visibility, source withdrawal, privacy and concurrent edits against real PostgreSQL/PostGIS.
