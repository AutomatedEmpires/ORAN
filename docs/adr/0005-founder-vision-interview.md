# 0005. Record the founder vision interview: nationwide coverage-first directory, guide memory, licensing and nonprofit form

- Status: Accepted for founder product direction; detailed designs require review before implementation. Amended by [ADR-0007](0007-memory-and-crisis-help-refinements.md): no ask-first saving, crisis help in the menu only
- Date: 2026-11-02
- Decider: Founder
- Related: D1, D3–D6, D8–D14, D16, D21–D25; C2, C6–C8, C18, C21; BLUEPRINT §1.3–§1.4, §2.3–§2.5, §5.6, §7.5, §8.3, §14; ADR-0002, ADR-0004

## Context

Most of the blueprint is agent-written elaboration of a few short founder instructions. On 2026-11-02 the founder asked an agent to read every document, report on the application, and interview the founder about the product vision before development continued. The founder answered 18 questions and approved a written-back brief. This ADR records those answers. Where they conflict with earlier agent recommendations, the answers govern (C21).

## Options considered

1. **Keep the existing recommendations** (pilot county, checked-only publication, confirm-before-saving profiles, navigators first). These contradict the founder's explicit answers.
2. **Record the answers in ADR-0005 and reconcile the binding text** (Constitution C8, decision log, AGENTS.md), naming every superseded passage. This gives agents one authoritative record without rewriting the whole blueprint. **Selected.**
3. **Rewrite BLUEPRINT now.** This would be a large, hard-to-review change before the designs below exist. Defer until the Gate 2 document split.

## Decision

**Identity and measure.** ORAN is a hybrid of a personal guide and a trustworthy directory. The primary measure of success is **people reaching help**. Directory coverage, trust, and funding are milestones.

**Seeker experience** (refines ADR-0004):
- **Chat** reads the profile, asks questions, searches the catalog and the web, recommends resources and adds discoveries to the directory through the acceptance service. It **finds and prepares**: it explains eligibility, what to bring and what to say, and drafts messages the person sends themselves. It never submits, books or contacts a provider on a person's behalf. It replies in the language the person writes in.
- **Chat layout and history:** chat follows the familiar chat-assistant layout. Signed-in users' conversations are saved privately and browsable in a history sidebar (a drawer on phones), and each can be deleted. Anonymous chats are not saved. There are no preset reply chips.
- **Directory (Seek)** personalizes from the profile and supports sorting, filtering and nearby results.
- **Map** shows a populated view of nearby help, so people see they are not alone.
- **Profile is the guide's memory.** Chat saves what it learns automatically, as mainstream chatbot memory does. Required controls:
  - an account holder's one-time memory opt-in;
  - a visible notice with undo on each save;
  - a memory view to edit or delete items, one at a time or all;
  - no memory for anonymous use or in "Helping someone else" mode;
  - an explicit ask before saving health, immigration, abuse or criminal-record details.
- **Features available to everyone:** "Helping someone else" (temporary context kept out of the helper's memory) and "Share this list" (a link, text or printout with current listing facts and no personal details). There is no separate professional mode.
- **Follow-up:** record taps on call, directions and website. Ask "Did it help?" in the app on the next visit. Signed-in history is private to the account; anonymous follow-up state stays on the device. A "closed" or "didn't help" answer becomes a flag.
- **Interface:** English and Spanish. A mobile-first installable website; no app-store apps for now. Anonymous use remains available.

**Coverage and publication** (supersedes checked-only publication, BLUEPRINT §1.3 "truth over coverage", and the related §5.6 hiding rules):
- **Scope:** nationwide from day one. The directory grows from chat discoveries and from an automated nationwide procurement pipeline that runs independently of chat. Procurement is front-loaded, followed by maintenance and new additions.
- **Automatic publication:** a resource is published automatically, in every category, once it has a minimum operational record: location, open/closed status, hours, phone and a link to the resource. The exact field rule, including handling for remote or phone-only services, is designed in the resource-foundation project. Incomplete records stay unpublished candidates.
- **Labels:** each published listing says either "Not independently verified by ORAN community" or "Verified", with a date. "Verified" expires on a risk-based interval and then returns the listing to the queue. Stale listings stay visible with their label rather than being hidden.
- **Flags:** a flag (closed, inaccurate, etc.) moves the listing to the top of the verification queue. A "closed" flag shows "Reported closed — call ahead" immediately.
- **Deduplication:** the same resource found at different web addresses must resolve to one listing. Sources are monitored for changes.
- **Confidential locations:** addresses are never published. They show as "Call for location".
- **Organizations:** they claim existing listings and take ownership. Owner edits stay visible, labeled "Updated by the organization". Owners get a monthly one-tap accuracy check, their flags, and aggregate-only impact counts. Live time-limited updates (events, open beds, closures) are a planned later step.
- **Verifiers:** admin-approved volunteers and professional helpers, scoped by geography and category. Ownership is never independent verification.

**Safety placement** (amends BLUEPRINT §7.5):
- **Crisis help:** a "Get help now" control in the menu. Crisis numbers are shown prominently when relevant: crisis signs in chat, crisis-related categories and searches (shelter, domestic violence, mental health), and error or outage screens.
- **Quick exit:** at minimum in chat and in the domestic violence, shelter and safety categories, plus a keyboard shortcut.

**Organization, funding and licensing:**
- **Legal form:** ORAN becomes a nonprofit, either through a fiscal sponsor followed by its own 501(c)(3) or by filing directly.
- **Funding:** grants and partner AI credits. Model and search adapters stay replaceable so ORAN can use whichever credits it receives. Software spending caps are required.
- **Licensing:** ORAN-originated data uses **CC BY 4.0**, the license funders prefer most. It may change before the first data release if a specific funder requires otherwise. Code uses **AGPL-3.0**.
- **Protection against copying:** maintained freshness, a trademark on the name, and anti-scraping protections on the public site.
- **Unchanged:** the source-permission rules. Facts from sources whose terms forbid reuse are never redistributed (C6).

**Delivery.** There is no deadline. The design system and the resource-foundation design proceed in parallel with multiple agents. Then come the procurement pipeline, the directory and map, and chat, with organization claims and verifier onboarding alongside. Of three mockup directions, the founder chose **"Blend: official structure, hopeful warmth"**: deep teal for actions and trust, a marigold accent for personal and hopeful moments, and the Figtree typeface. Exact tokens are recorded when the design system document is written. The stack stays Vercel, Supabase and Clerk, with the founder as sole admin. ORAN 1.0 may be taken down whenever convenient.

## Consequences

- **Superseded:** C8 is amended to permit automatic guide memory with the controls above. CONSTITUTION and BLUEPRINT §15 stay synchronized. D1, D3–D5, D8–D14, D16 and D21 are amended or approved as recorded in DECISIONS.md, and D23–D25 are added. BLUEPRINT passages that conflict with this ADR (§1.3–§1.4, §2.4 profile confirmation, §4 pilot-county assumptions, §5.6 hiding rules, §7.5, §8.3 national exclusion, D14's $150 figure) are superseded where they conflict. They will be rewritten at the Gate 2 document split.
- **Gates:** the pilot-county criteria in BLUEPRINT §14 no longer fit nationwide scope. Replacement milestones tied to people reaching help need a later founder-approved ADR. Until then, no gate is marked passed.
- **Still open:** D22 (provider, payload minimization, retention, abuse and cost limits). Privacy counsel review of automatic memory under state consumer-health laws, such as Washington's My Health My Data Act, before public release. D21 implementation details (exact field rule, source-permission checks, dedupe thresholds, kill switch and rollback). The fiscal sponsor choice. Trademark filing. The LICENSE file, in its own PR. If partner credits come from Azure, AGENTS.md §3, which excludes Azure, must be revisited by ADR.
- **Unchanged:** C2, C4–C7 (one write path, immutable sources, source permissions, reports never auto-hide), real-database testing and the native Windows contract. This ADR adds no route, table, dependency, environment variable, model call or deployment.
