# Development contracts

The target blueprint is implemented incrementally under ADR-0003. The development app implements the initial four-domain resource flow; production deployment and the full target capability map remain open.

## Dependencies

| Packages | Purpose and scope |
| --- | --- |
| next, react, react-dom | One server-rendered web application |
| @clerk/nextjs | Hosted identity adapter; no development credentials committed |
| kysely, pg | Parameterized queries over one application PostgreSQL pool |
| zod | Validate untrusted input at boundaries |
| @electric-sql/pglite, pglite-socket, pglite-postgis | Development/test-only isolated PostgreSQL with loopback access; PostGIS WASM is experimental and does not replace standard PostgreSQL/PostGIS CI |
| kysely-codegen | Generate types from the migrated schema; no hand-maintained ORM schema |
| tsx | Cross-platform Node development scripts |
| typescript, @types/node, @types/pg, @types/react, @types/react-dom | Static checks and library declarations |
| eslint, eslint-config-next | Framework, React, accessibility and TypeScript checks |
| vitest | Domain/data tests added with the resource workflow |
| @playwright/test, @axe-core/playwright | Browser workflow and accessibility verification; development only |

Exact versions live in package.json and pnpm-lock.yaml. Node 24.22.2 and pnpm 10.34.9 are pinned. System fonts avoid build-time font downloads. English/Spanish catalogs cover the shared shell; Spanish requires a native-speaker review before public release.

## Current routes and checks

Public / exposes current checked resources or an honest empty/outage state. /profile requires identity and accesses only that user's preferences. /organization and /resources/[id]/edit require scoped organization/admin control. /community requires approved geographic/category membership for verification; /admin requires the database admin role, and category creation there is admin-only. Server actions independently authenticate and recheck authorization inside the catalog services. Resource creation, edits, category creation, approval, verification and profile deletion refresh affected views. No role or profile-user ID is trusted from form input.

Native Windows ARM64 typecheck, lint, PostgreSQL/PostGIS domain tests and browser workflow checks have been exercised using Node 24.22.2. CI separately checks Windows/Linux and standard PostgreSQL/PostGIS. Browser tests inspect public/admin/community/profile accessibility, language switching, mobile width and denied access. PR check results are authoritative for each commit. No production deployment is configured.

## Identity and route contract

Clerk verifies hosted account identity; application roles are always loaded from the private membership table, never user-editable metadata. An unknown verified Clerk user gets only the user role. The non-production admin bootstrap command can register/promote the founder's exact Clerk user ID.

The local launcher instead creates a random process secret and enables synthetic identities only on loopback. POST /api/dev-session requires that mode, a loopback request URL, and the exact configured Origin; it issues an HTTP-only SameSite=Strict signed one-hour session. It is rejected in production and hosted environments. No role is taken from a session token; membership is reloaded per request. GET /sign-in renders local identity choices only in that local mode, otherwise the configured Clerk sign-in or an honest configuration notice. GET /api/health is public and reports only dependency health, with 503 on failure.

Framework agent-file generation is disabled to preserve AGENTS.md. next-env.d.ts and .next are generated/ignored; typecheck runs next typegen before TypeScript so it also works immediately after a fresh clone.

## Native onboarding and browser isolation

scripts/run.ps1 prepares the exact Windows Node and pnpm pins in .local/toolchain, verifies the official Node archive SHA-256, and changes PATH only for its process. It works with the founder's existing global Node version untouched. A frozen install and helper version check were exercised on ARM64.

The browser launcher uses --test: an in-memory database, fixed port 3100 and ORAN_TEST_RUN=1 selecting .next-test. It never reuses the interactive development database/server. Normal development binds explicitly to port 3000 and fails if that port is occupied. Test database creation for externally supplied integration credentials uses unique disposable database names, never an existing catalog; the CI credentials need CREATEDB. Both migration idempotence and repeated integration runs are checked.

## Proposed conversational architecture (ADR-0004; not implemented)

One Next.js application and one canonical PostgreSQL catalog serve Seek, Chat, Map and Profile. Add an `assistance` boundary for conversation orchestration and replaceable provider adapters; keep deterministic matching, private profiles, resource queries and catalog acceptance independently usable. No separate vector database, agent service, queue, ORM or model vendor is selected. Introduce a dependency only with its contract and required decision. Existing native Windows ARM64 onboarding must still work without model credentials.

The server derives actor and consent, validates/limits the request, builds a minimized task context and exposes only permitted resource tools. The model may propose a tool call; application policy validates arguments, scope, quotas and result visibility before execution. Public catalog reads use the same publishability policy for every renderer. The client receives validated structured cards, supporting references and answer text, never credentials, SQL or hidden records.

| Proposed capability (names are design examples, not registered APIs) | Server-side contract |
| --- | --- |
| Search catalog / inspect resource | Bounded, parameterized filters and authorized service IDs; coverage/criteria predicates before ranking/limits; accepted revision and supporting evidence returned. |
| Search resource web / inspect source | Resource-purpose requests through bounded adapters; minimal coarse context, source/terms/visibility policy, retrieval limits and source references. A URL is not a trusted instruction. |
| Read permitted personal context | Resolve only the actor's consented fields; no arbitrary user ID, organization membership shortcut or full-profile default payload. |
| Propose resource facts | Validated evidence-backed assertions using source/assertion interfaces; actor, origin, policy version and idempotency recorded; no direct HSDS write or automatic verification. |
| Save resource / offer profile change | Authenticated own-user operation with CSRF/origin protections; saving links to a resource reference; material persistent profile changes require explicit confirmation. |
| Show results on map | Validated canonical/discovery references under the same visibility policy; no inference of confidential coordinates. |

There is no general SQL, shell, arbitrary HTTP, role-grant, bulk publication or organization-claim tool. Catalog acceptance rechecks permissions, evidence, expected revision and publication policy transactionally; the model cannot grant itself a stronger actor. An ingestion service identity has only proposal rights unless an approved automation policy authorizes specific acceptance operations. It never borrows the seeker's role or the broad admin connection.

**Domain scope:** resource-intent checks and task instructions constrain the conversation; tool permissions, output validation and quotas constrain effects. Handle ambiguous requests with a useful clarification. Briefly redirect unrelated requests. Evaluate both off-topic misuse and legitimate access questions to avoid rejecting people for unusual phrasing, language or disability-related communication. No classifier or prompt can guarantee zero misuse.

**Untrusted content:** treat user messages, imported descriptions, web pages and tool output as data, not policy. Source content cannot authorize new tools, alter the system's instructions or request profile disclosure. Validate source identity and links; outbound fetching blocks private/link-local/metadata destinations, unsafe schemes and redirect/DNS-rebinding bypasses. Bound response sizes, content types, extraction depth and execution time. Sanitize rendered text/links and test malicious resource descriptions as well as malicious websites.

**Privacy:** distinguish permission to use a field for local matching from permission to transmit it externally. Apply consent/minimization before every provider call; keep sensitive deterministic comparisons in ORAN when external sharing is not authorized. Never place full profiles, transcripts or precise locations in web queries. Explain unavoidable model/search-provider processing before a person starts that mode, including applicable retention. Do not promise anonymous processing means providers receive no network/account metadata. Profile/history deletion and provider-side retention limits need an explicit contract before integration.

**Cost and availability:** define per-request input/output, search-call, extraction-page and tool-iteration limits plus per-session/account/abuse budgets before release. Anonymous help remains available under bounded access. Model/web calls and candidate writes fail closed when quota/authorization cannot be checked; existing basic catalog reads retain their availability policy. Provide bounded timeouts, cancellation, clear partial results and retry/backoff. Deduplicate catalog enrichment across repeated searches. Cache reusable public facts under their source permission/freshness policy; do not share caches of personalized answers or sensitive queries. No raw prompt/profile telemetry; scrub provider errors and instrument aggregate latency, cost, refusal, grounding and proposal outcomes.

**Durability and stale answers:** source discovery and response generation do not imply candidate persistence. Persist approved proposals transactionally before any “saved” acknowledgement, use idempotency for retries and expose failure honestly. Where asynchronous enrichment becomes necessary, propose a durable job ledger/retry design under the single scheduler rather than relying on work after a serverless response ends. Source/reference changes invalidate cached facts; check the current revision and visibility when rendering saved or resumed results. No fabricated research progress, background monitoring or update-success claims.

## Proposed delivery slices and release evidence

This sequence is a recommendation under D20, not a replacement for the existing pilot/public-release gates. Each slice needs approved layouts/policies, appropriate tests and a reviewed PR; no all-at-once rewrite is authorized or required. Preserve existing admin/organization/community flows throughout.

| Slice | Reviewable outcome | Evidence needed before calling it complete |
| --- | --- | --- |
| 1. Shared seeker shell and resource identity | Seek/Chat/Map/Profile layouts, common card/detail design, context controls and permission-aware workspace switch | Approved prototype and required states, mobile/keyboard/screen-reader checks; production navigation exposes real features only. |
| 2. Direct discovery and useful profiles | Catalog filters/coverage/ranking, canonical detail, own-user saved resources and progressive profile controls | Real PostgreSQL/PostGIS authorization, consent/deletion and filters-before-pagination tests; native Cursor first run still passes. |
| 3. Catalog-grounded conversation | Preset question paths, editable context, bounded resource tools, evidence-backed cards and deterministic fallback | Supported-field and eligibility evaluations, adversarial scope/tool tests, multi-turn corrections, model outage/cancellation and cross-user isolation. |
| 4. Map over shared results | Public location pins, service summaries, coverage/remote list and synchronized filters | Coordinates/coverage accuracy, confidential-location suppression, accessible list equivalent, vendor/privacy/performance approval. Can progress alongside slice 3. |
| 5. Permission-aware web discovery | Search/source adapters, separate discovery cards and durable deduplicated proposals | D21/D22 settings, source reuse/attribution and withdrawal tests, malicious-page tests, honest unknown/conflict handling and persistence retry tests. |
| 6. Evaluated acceptance automation | Approved low-risk assertions auto-accepted; conflicts/high-risk changes queued; scoped verification and operational controls | Field/source/risk policy, measured error/review load, concurrent revision tests, idempotency, kill switch, rollback and audit reconstruction. No automatic independent-verification label. |

**Evaluation cases:** accurate address/hours/intake attribution; wrong-city or outside-service-area matches; unsupported eligibility and capacity guarantees; conflicting/expired sources; sparse catalog and zero results; no profile, partial profile, proxy search and revoked consent; multilingual phrasing; off-topic spam and prompt injection; secret/location exfiltration attempts; duplicate/multi-site organizations; changed/suppressed listings; quota, provider, database and persistence failures. Use permitted public facts and synthetic personal scenarios, not real seeker transcripts by default.

Measure field-level factual support, citation coverage/correctness, relevance and coverage constraints, useful next-action task success, privacy/authorization violations, inappropriate refusals, unsupported operational claims, cost/latency and proposal-review backlog. Distinguish source retrieval from truth: a valid citation can still support stale or incorrect information. Approve numerical release thresholds and sampling under D21/D22 before live release; publish no unmeasured accuracy claims. Required safety/authorization cases must pass, and failures block the affected capability.

**Capability references, not vendor selection:** [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search), [tool calling](https://developers.openai.com/api/docs/guides/function-calling), and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs) demonstrate search, application tools and schema-constrained extraction. Structured output does not establish factual truth. Verify the selected provider's current capabilities, privacy, terms, cost and native SDK behavior during D22 review.
