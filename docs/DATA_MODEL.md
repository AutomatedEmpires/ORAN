# Implemented development data contract

The initial evolving subset uses HSDS 3.3.1 organization, service and service_area names and field semantics. Checked against tagged schemas before implementation:
[service](https://github.com/openreferral/specification/blob/3.3.1/schema/service.json),
[service_area](https://github.com/openreferral/specification/blob/3.3.1/schema/service_area.json).

All tables live in the private oran schema. The Supabase Data API is not used. RLS is enabled and no browser grants are made. The bootstrap uses an isolated owner connection for development/tests; a least-privilege runtime role, release migrations and deployment review are required before production.

| Tables | Contract |
| --- | --- |
| organization, service, service_area | One canonical resource model; the catalog acceptance service is the sole application writer |
| membership | Server-trusted role, organization scope, community approval and ZIP scope; never trust a role submitted by the browser |
| field_assertion, audit_event | Accepted resource input, prior service snapshot, actor/origin and privileged action history, committed atomically |
| listing_state, verification_event, work_item | Unreviewed until evidence is recorded; methods/fields/evidence, 30-day review due date and scoped assignment; edits invalidate verification |
| personal_profile | Own-user ZIP and selected needs only, explicit consent timestamp, update and deletion; no sensitive expanded fields yet |
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
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY | Separate Clerk development instance for remote authenticated work; no secret is public |

pnpm db:migrate and pnpm admin:grant refuse production stage. Code generation uses the migrated schema; db.generated.ts is generated, never edited by hand. The standard PostgreSQL/PostGIS CI job must pass in addition to native embedded tests.
