# 0006. Resource foundation: listing record, publication, identity, flags and verification queue

- Status: Accepted for design; implementation proceeds in reviewed PRs
- Date: 2026-11-02
- Decider: Founder, approving each section of the design in turn
- Related: ADR-0005; D4, D13, D21, D24, D25; C3–C7, C12, C15, C18; BLUEPRINT §2.6, §5, §6; DATA_MODEL

## Context

ADR-0005 makes ORAN a nationwide directory. Complete records publish automatically with trust labels, and the directory is filled by an automated pipeline, by chat discovery, by organizations and by verifiers. Every seeker view (chat cards, Seek, Map) reads the same canonical listing.

The current schema cannot carry that:
- A listing is one `service` row with a ZIP-text `service_area`.
- `field_assertion` stores whole-form snapshots that are always "accepted".
- Publication is checked-only.
- Each account has exactly one role.
- Verification lasts a fixed 30 days.

## Options considered

1. **HSDS parts with per-fact provenance.** Use separate organization, service, location, address, phone, schedule, URL and service-area records, and record the source and time of every accepted value. This supports deduplication, field-level completeness checks, partial updates from the pipeline, structured hours and HSDS export. It costs the most up front. **Selected.**
2. **A wider form saved as one snapshot.** Fastest to build, but hours would be free text, no fact can be traced to its source, and conflicting writers would overwrite each other.
3. **Free-form documents per resource.** Weak for map, distance and deduplication queries. Rejected in BLUEPRINT §6.1.

## Decision

### 1. The listing record

**Structure**
- Use the HSDS 3.3.x objects:
  - `organization`, `service`, `location`, `service_at_location`, `address`, `phone`, `schedule`, `service_area`;
  - the service URL;
  - `taxonomy` and `taxonomy_term` for categories.
- Verify every field name against the tagged HSDS 3.3.1 schema before the migration that adds it.
- One organization can run many services at many locations.

**Locations**
- A location is one of: physical (address plus coordinates), remote, or phone-only.
- A **confidential** flag means the address and coordinates never leave the server. The location shows as "Call for location" and gets no map pin.

**Hours**
- Hours are structured weekly schedules with a time zone and exceptions, or one of the explicit values "24/7" or "By appointment".
- "Unknown" is stored as unknown.

**Provenance**
- Every accepted value records:
  - its assertion;
  - its origin: organization, verifier, admin, pipeline, chat discovery or flag;
  - its source reference: a URL or "phone call";
  - the time it was observed.
- History is kept. The listing shows the accepted value.

**Categories**
- Categories are data, not code: an ORAN taxonomy whose terms admins can add. A service may have several.
- The initial terms are Food, Housing & shelter, Bills & money, Health, Mental health, Work, Legal, Transportation, Childcare & family and Safety.
- **Safety** turns on quick exit and the confidential-location treatment by default.
- Planned future additions include veteran-specific and immigration resources. "Who it serves" audience tags (for example veterans or seniors) are a separate later concept.

**Accounts**
- An account may hold several memberships: user, organization staff, verifier, admin. Each has its own scope, approval and audit history.

### 2. Publication and labels

**When a listing publishes**
- A listing publishes automatically, in every category, when it has all of these:
  - a service name and an organization name;
  - at least one category;
  - an open/closed status;
  - hours (explicit "24/7" or "By appointment" counts);
  - at least one phone;
  - a location: a physical address, or a service area for remote, delivery or phone-only services, or a service area plus the confidential flag;
  - a link to the resource, but only when the listing originated from a web or pipeline discovery. Direct organization, verifier and admin entries do not need one.
- Otherwise the listing is an unpublished draft that lists its missing fields. The pipeline and chat keep looking for them, and verifiers can complete them.
- Publishability is recomputed in the acceptance transaction (C4).

**Labels**

| Situation | Label |
|---|---|
| A verifier checked within the window | "Verified · {N} days ago" |
| Everything else, including owner-entered listings | "Not independently verified by ORAN community" |
| Verification has expired | Adds "Last verified {date}" |
| The owner has edited | Adds "Updated by the organization · {N} days ago" |

**Verification windows**
- Food, Housing & shelter and Safety: 30 days.
- All other categories: 90 days.
- With several categories, the shortest window applies.
- Expiry moves the label back to "Not independently verified" and queues the listing again.
- A change to phone, hours, address or location, or open/closed status removes "Verified" at once. A description change does not.

**Visibility**
- The listing stays visible throughout. Only the label changes.

**Accuracy note**
- Every listing, verified or not, shows "Details can change. Confirm with the provider before relying on this information." Cards use the short form "Confirm before you go."
- All label and note strings live in the English and Spanish message catalogs (C18).

### 3. Identity, conflicting sources and monitoring

**Matching a new find**
1. **Same place:** the same normalized phone number, or the same normalized or geocoded address within a few doors, attaches the find to the existing location or organization.
2. **Same service:** a similar service name, or the same category from the same source page, at that place.

| Match | Result |
|---|---|
| Both place and service match | The find becomes another source of the existing listing. Its facts become proposed assertions. |
| Only one matches | No second listing publishes. A "Possible duplicate?" task is queued for a verifier or admin, who answers *Same* or *Different*. |

- Never merge on name alone. Merges are reversible and keep identity history.
- One resource found at many web addresses resolves to one listing with many sources.

**Precedence when sources disagree**
- Organization owner, then verifier check, then the provider's own website, then other web pages.
- Between equals, the newer value wins.
- If equal-strength sources conflict on phone, hours, address or status:
  - the current value stays;
  - the listing shows "Some details may have changed — call ahead";
  - the listing rises in the queue.

**Monitoring**
- Every registered source page is rechecked **monthly** using a content hash. Spending caps may lengthen the interval.
- When a page changes, it is extracted again and the new facts follow the rules above.
- A page stating the resource is permanently closed shows "May be closed — call ahead" and moves to the top of the queue.
- A page that has disappeared only creates a queue task.
- Sources are read only where their terms and robots rules allow it (C6).

### 4. Flags and the verification queue

**Flags**
- Anyone can flag a listing, with or without an account.
- Reasons: Closed, Wrong phone, Wrong hours, Wrong address, Not as described, Other, with an optional note that warns against personal details.
- An in-app answer of "It was closed" to "Did it help?" creates the same flag.
- Flags are protected by a bot check and a limit of one per device per listing per day.
- No reporter identifier or IP address is stored.
- A closed flag shows "Reported closed — call ahead" immediately.
- Flags never hide a listing (C7). Only a verifier's confirmation does.

**Queue order**
1. Reported closed.
2. Other flags, with more flags ranking higher.
3. Source conflicts and source pages that say "closed".
4. Possible duplicates.
5. "Verified" labels about to expire.
6. Never-verified listings, most-viewed first.

Within each group, Safety and Housing & shelter come first.

**Who works the queue**
- **Verifiers** (admin-approved volunteers and professional helpers) work tasks within their approved area and categories. They may also opt in to **remote phone checks anywhere in the country** for their categories. In-person checks stay within their approved area.
- A verifier cannot verify a listing they created.
- **Organizations** see and fix flags on their own listings. An owner's "we're open" removes the reported-closed note, but the task stays queued for an independent check.
- **Admins** see and reassign everything.

**Completing a check**
- The verifier records the method (phone, visit or website), ticks each fact confirmed, and adds a note. This writes a verification event.

| Outcome | Result |
|---|---|
| Open | "Verified · today" |
| Temporarily closed | The listing shows that status |
| Permanently closed | Removed from search, kept in history |

## Consequences

- **What this changes:** it replaces the checked-only publication, snapshot assertions, ZIP-only service area, single-role membership and fixed 30-day verification in the current bootstrap.
- **Migrations and tests:** migrations must move existing development data forward. Each step needs real PostgreSQL/PostGIS tests (C15) covering:
  - the publish rule and missing fields;
  - label and expiry computation;
  - removal of "Verified" on material changes;
  - matching and the possible-duplicate path;
  - precedence;
  - flags, rate limits and queue ordering;
  - scope checks, including remote phone checks and the self-verification ban;
  - confidential locations never reaching a public query.
- **Delivery:** in reviewed slices of about 400 lines:
  1. Multi-role membership and taxonomy categories.
  2. HSDS listing parts with per-field assertions.
  3. The publish rule, labels, accuracy note and expiry.
  4. Identity matching and the possible-duplicate queue.
  5. Flags, queue priority and remote phone checks.
  6. The source registry and monitoring-job contract. The fetching itself belongs to the procurement-pipeline project.
- **Still open:**
  - matching thresholds, tuned on real data;
  - geocoding and bot-check vendors (D6);
  - the background-work service for monitoring at national scale (D6);
  - the exact HSDS field names;
  - the content of the D21 kill switch and rollback.
- **Not implemented:** this ADR adds no code, route, table, dependency or environment variable. Each slice updates DATA_MODEL and ARCHITECTURE when it lands.
