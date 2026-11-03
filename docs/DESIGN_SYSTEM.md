# ORAN design system: Blend

"Blend: official structure, hopeful warmth." Deep teal means action and trust. Marigold means "about you" and hope. Figtree is the only typeface.

## 1. Status and authority

- **Status.** The founder chose the Blend direction (D25, [ADR-0005](adr/0005-founder-vision-interview.md)). This document records its exact tokens, layouts, components and seeker copy. Once merged after founder review, it is the approved set under **C18**: screens use only the layouts and components defined here.
- **Precedence.** CONSTITUTION, then the ADRs (a later ADR wins over an earlier one: ADR-0005, [ADR-0006](adr/0006-resource-foundation-design.md), [ADR-0007](adr/0007-memory-and-crisis-help-refinements.md)), then this document, then BLUEPRINT §12. This document supersedes BLUEPRINT §12.2's "system font stack", the §12.4 trust vocabulary (replaced by the ADR-0006 labels in §7) and §12.7 QuestionChoices (withdrawn: chat has no preset replies, D25). It renames §12.3 items: ListingCard → ResourceCard, VerificationBadge → TrustLabel, ReportProblemForm → FlagForm, CrisisStrip → GetHelpNow (inline), ChatComposer → Composer.
- **Sources.** The approved Blend mockups are Seek, Resource detail, Map, Profile and Chat v2 (phone, history drawer, desktop). The earlier Blend chat mockup with preset reply chips is superseded. The mockups are not in this repository, so this document is the normative record. Where it differs from a mockup, this document wins; the differences are listed in §11.
- **Scope.** Seeker screens. Organization, community and admin workspaces use the same tokens and controls; their layouts are not designed yet (§11).
- **Proposing a component or token.** Open a PR that edits this document. Give the purpose, anatomy, variants and states, tokens, accessibility notes, the screens that need it and why existing components do not fit. Add it to the component catalog route in every state, with axe and visual tests. The founder approves in review; until merged it is proposed, not approved. Changing copy that comes from an ADR requires an ADR.

## 2. Principles

1. **One next step.** Every seeker screen answers one question and shows the obvious next action (Call, Directions, Send).
2. **Plain language.** Grade 6–8 reading level, no agency jargon, verbs first.
3. **Truthful status.** Use the exact trust copy (§7). Show unknowns. No invented match scores. Status never relies on color alone.
4. **Color has meaning.** Teal: actions, links, "Verified", the active tab and "you are here". Marigold fill: the send button, "You're not alone.", the logo sun and the "Today" tag in hours. Marigold tint with brown text: anything personal (memory, "Using your profile", "Why it fits"). Never use marigold for warnings or teal for decoration.
5. **Calm.** Soft tinted surfaces and light shadows instead of heavy borders. Generous space. No alarming motion, fake typing urgency or profile pressure.
6. **Works everywhere.** Server-rendered seeker pages; core search and detail work without client JavaScript; the map always has a list.
7. **Consistent.** Only the components below, built only from the tokens below.

## 3. Tokens

### 3.1 Color

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#F2F4F5` | Page ground (Seek, Map, Profile), desktop sidebar, skeletons |
| `--color-surface` | `#FFFFFF` | Cards, bars, sheets, drawer, chat and detail surfaces |
| `--color-surface-user` | `#EEF1F3` | User chat bubble |
| `--color-surface-neutral` | `#EBEEF1` | Unverified label, Exit button, switch-off track |
| `--color-scrim` | `rgba(28, 39, 51, 0.45)` | Behind the drawer and dialogs |
| `--color-text` | `#1C2733` | Body text, titles |
| `--color-text-secondary` | `#4A5563` | Secondary text, inactive tabs, quiet icons, placeholders, unverified label text |
| `--color-primary` | `#17596B` | Primary buttons, links, "Verified", active tab, focus ring, switch on |
| `--color-primary-hover` | `#0F4150` | Hover and pressed for primary buttons and links |
| `--color-primary-tint` | `#E2EEF0` | Secondary buttons, chips, Verified label, current history row |
| `--color-primary-tint-strong` | `#D3E6EA` | Active tab pill, active sidebar item, secondary button hover |
| `--color-on-primary` | `#FFFFFF` | Text and icons on teal or red fills |
| `--color-accent` | `#F4B740` | Send button, "You're not alone.", logo sun, "Today" tag, selected-pin halo |
| `--color-on-accent` | `#1C2733` | Text and icons on marigold (same value as `--color-text`) |
| `--color-accent-tint` | `#FCEFD2` | Personal surfaces: MemoryNote, "Using your profile", memory tiles, today's hours row |
| `--color-text-personal` | `#7A4A00` | "Why it fits:", "Using your profile" text, personal icons |
| `--color-status-open` | `#1E6B47` | "Open now" / "Open until …" (always with words and a clock icon) |
| `--color-danger` | `#B42318` | Destructive actions, StatusNote text and icon |
| `--color-danger-tint` | `#FDECEA` | StatusNote background (new; not in the mockups) |
| `--color-border` | `#E1E6EA` | Bar hairlines, card border on white, sidebar edge |
| `--color-border-subtle` | `#EDF0F3` | List dividers, chat header, drawer sections |
| `--color-border-input` | `#808C99` | Text input and composer outlines, sheet handle |
| `--color-control-off` | `#6B7683` | Switch-off outline and thumb |

Category pin colors are in §6. Do not add a color without a contrast check and a PR to this document.

### 3.2 Computed contrast (WCAG 2.x relative luminance)

Text must reach 4.5:1 (3:1 for text at least 24px, or at least 18.66px bold). Non-text UI and graphics must reach 3:1. Every allowed text pair passes at the normal-text level.

| Foreground | Background | Ratio | Used for |
|---|---|---|---|
| text `#1C2733` | surface `#FFFFFF` / bg `#F2F4F5` | 15.14 / 13.72 | Body, titles |
| text | user bubble `#EEF1F3` / neutral `#EBEEF1` | 13.34 / 13.00 | User messages, Exit |
| text | primary tint `#E2EEF0` / accent tint `#FCEFD2` | 12.77 / 13.27 | Text on tints, MemoryNote, today's hours |
| text | accent `#F4B740` | 8.43 | "You're not alone.", "Today" tag, send icon |
| text | danger tint `#FDECEA` | 13.24 | Text inside StatusNote |
| secondary `#4A5563` | surface / bg | 7.58 / 6.87 | Meta lines, captions |
| secondary | neutral / accent tint / user bubble | 6.51 / 6.65 / 6.68 | Unverified label, notes on tints |
| primary `#17596B` | surface / bg | 7.84 / 7.11 | Links, quiet buttons |
| primary | primary tint / tint strong | 6.62 / 6.08 | Secondary buttons, chips, Verified, active tab |
| primary | accent tint | 6.88 | "Undo" in MemoryNote |
| primary hover `#0F4150` | surface | 11.10 | Link hover |
| on-primary `#FFFFFF` | primary / primary hover | 7.84 / 11.10 | Primary buttons, map banner, avatar, count badge |
| personal `#7A4A00` | accent tint / surface | 6.56 / 7.48 | Personal text, "Why it fits:" |
| open `#1E6B47` | surface / bg | 6.46 / 5.86 | Open status |
| danger `#B42318` | surface / bg / danger tint | 6.57 / 5.96 / 5.75 | Delete actions, StatusNote |
| on-primary `#FFFFFF` | danger | 6.57 | Filled destructive confirm |

| Non-text element | Against | Ratio | Result |
|---|---|---|---|
| Input outline `#808C99` | surface / bg | 3.43 / 3.11 | Pass |
| Mockup composer outline `#C9D1D8` | surface | **1.54** | **Fail.** Replaced by `--color-border-input` |
| Switch-off `#6B7683` | surface / neutral track | 4.62 / 3.97 | Pass (mockup track `#E4E8EC`, 3.75, merged into `--color-surface-neutral`) |
| Focus ring and switch-on `#17596B` | surface / bg / mockup map ground `#E8ECE7` | 7.84 / 7.11 / 6.57 | Pass |
| Send icon `#1C2733` | accent | 8.43 | Pass. The marigold fill against white is only 1.80, so the dark icon is what identifies the button and must stay |
| Hairlines `#E1E6EA` / `#EDF0F3` | surface | 1.26 / 1.14 | Decorative only; never the only boundary of a control |

### 3.3 Typography

Family: `--font-family-base: 'Figtree', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`. Weights: `--font-weight-regular` 400, `--font-weight-semibold` 600, `--font-weight-bold` 700, `--font-weight-heavy` 800. Weight 500 is unused, so do not load it.

| Token | Size / line height | Use | Mockup sizes merged |
|---|---|---|---|
| `--font-size-xs` / `--line-height-xs` | 12 / 16px | Tab labels, composer disclaimer, count badge, "Today" tag | 12 |
| `--font-size-sm` / `--line-height-sm` | 14 / 20px | Meta lines, chips, trust labels, status notes, compact buttons, history group headings, helper text | 13, 14 |
| `--font-size-md` / `--line-height-md` | 16 / 24px | Body, chat messages, inputs, buttons, list rows, section headings (700) | 15, 16 |
| `--font-size-lg` / `--line-height-lg` | 18 / 24px | Card titles, sheet title (700) | 17, 18 |
| `--font-size-xl` / `--line-height-xl` | 24 / 30px | Page title h1 (700, letter-spacing −0.01em) | 24 |

- That is five steps. A sixth step is reserved and needs approval.
- Body text and all inputs use 16px. Inputs under 16px make iOS zoom on focus.
- Prose is at most 65ch, about 75 characters, even inside the 760px chat column.
- The "ORAN" wordmark (18–20px in the mockups, 800, letter-spacing 0.06em, teal) is a logo asset, not a type step.

### 3.4 Spacing, size, radius, shadow, focus, motion

- **Spacing (4-based):** `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-5` 20, `--space-6` 24, `--space-7` 32, `--space-8` 48 (px).
  - The side gutter is `--space-4`. The gap between cards is `--space-3`. Card padding is `--space-3` by `--space-4`.
  - The only off-scale value is 2px, for optical icon alignment and the focus offset.
- **Sizes:** `--size-target` 44px (minimum hit area of every interactive element); `--size-control-lg` 48px (search field, Detail call button, map banner, sheet actions); `--size-topbar` 56px; `--size-tabbar` 76px plus the safe area; `--size-sidenav` 272px; `--size-drawer` min(316px, 85vw); `--size-chat-column` 760px.
- **Radius:** `--radius-badge` 10px (trust labels, status notes, 32–40px icon tiles, today's hours row), `--radius-control` 12px (buttons, chips, inputs, nav items, tab pill, MemoryNote), `--radius-card` 14px (cards, grouped lists, sheet top corners), `--radius-bubble` 20px (user bubble), `--radius-full` 9999px (switches, map banner, composer, send button, avatar).
- **Shadow:** `--shadow-1` `0 1px 2px rgba(28,39,51,.06), 0 2px 10px rgba(28,39,51,.05)` for cards and grouped lists on `--color-bg`, raised buttons, the composer and the switch thumb. `--shadow-2` `0 4px 14px rgba(28,39,51,.16)` for controls over the map, the drawer and the bottom sheet, with the offset pointing away from the attached edge. Bars use a 1px `--color-border` hairline instead; cards on white use a 1px `--color-border` border and no shadow.
- **Focus:** `:focus-visible { outline: 3px solid var(--color-primary); outline-offset: 2px }` on every interactive element. Never remove it without an equal replacement. The offset keeps the ring visible around teal fills. Use `:focus-within` on the composer pill.
- **Motion:** `--motion-fast` 120ms (hover, press), `--motion-base` 200ms (drawer, sheet, toast), `--motion-easing` `cubic-bezier(.2, 0, 0, 1)`. Under `prefers-reduced-motion: reduce`, transitions are instant, nothing slides or scales, scrolling is not smooth and skeleton shimmer is off. Never use fake typing, bouncing, auto-playing animation or pulsing crisis content.
- **Layers:** bars `--layer-bar` 10, map overlays `--layer-map-overlay` 20, sheet `--layer-sheet` 30, drawer and scrim `--layer-drawer` 40, dialog `--layer-dialog` 50, toast `--layer-toast` 60.

## 4. Layout

| Breakpoint | Width | Shell |
|---|---|---|
| Phone | 360–767px | TopBar plus SeekerTabBar |
| Tablet | 768–1023px | Phone shell, content max 640px, centered (not mocked; see §11) |
| Desktop | ≥1024px | SideNav plus main area; no tab bar |

- **Minimum width** is 360px. Layouts must still reflow without horizontal page scrolling at 320 CSS px and at 400% zoom (WCAG 1.4.10).
- **Breakpoints** are constants, not custom properties. Use logical CSS properties so the layout is RTL-ready.
- **Phone shell.** A sticky TopBar, a scrolling main region and a fixed SeekerTabBar, in `100dvh` with viewport meta `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`. Pad bars with `env(safe-area-inset-*)`. Set `scroll-padding` to the bar heights so focus is never hidden behind a bar (WCAG 2.4.11).
- **Phone chat.** TopBar (chat variant), conversation (scrolls), composer dock (Composer plus disclaimer), tab bar. While the on-screen keyboard is open, the tab bar hides and the composer sits directly above the keyboard. New content scrolls into view only if the person was already at the bottom.
- **Desktop.** The SideNav on the left (`--color-bg`, right hairline); the main area on `--color-surface`.
  - **Chat:** a 56px header (conversation title as h1, md/700; QuickExit on the right). The conversation and the docked composer share one centered column of at most 760px with 20px side padding.
  - **Seek, Profile and Detail** use a 760px content column (not mocked). **Map** fills the main area.

**Page layouts.** Build these screens from these blocks, in this order:

| Screen | Order |
|---|---|
| Seek | TopBar (brand) → h1 "Find support" → SearchField → ContextChips → FilterBar → ResourceCard list |
| Resource detail | TopBar (back) → white surface. Top block: h1 name, organization (md, secondary), open status (md/600), StatusNote, TrustLabel and its lines, AccuracyNote (full). Then "Call {phone}" (primary, large, full width), and Directions / Website / Share (secondary, three columns). Hairline. Sections, each with an 18px teal icon, an md/700 heading and md body text indented 26px: Who it's for, How to get help, What to bring, Hours (HoursTable), Address (or "Call for location"). Last, the FlagForm entry link |
| Map | TopBar (brand) → full-bleed map → MapBanner, callout and List toggle → category Chips → BottomSheet on selection |
| Profile | TopBar (brand) → h1 "What ORAN remembers" → memory Switch row (with its helper text) → memory ListRows → "Helping someone else" Switch row → "Saved" (lg) ListRows → Language row → "Get help now" row → "Delete everything ORAN remembers" |
| Chat | Phone and desktop shells above; ChatMessage stream → Composer |

## 5. Components

### 5.1 Navigation

| Component | Purpose and anatomy | Variants and states | Accessibility |
|---|---|---|---|
| **TopBar** | 56px white bar with a bottom hairline and 16px gutters. Logo: a 28px teal rounded square (radius 8) with a marigold half-sun, a white horizon line and marigold rays, plus the wordmark | **brand**: logo left; QuickExit on the right where §5.6 requires it. No "Get help now" button (ADR-0007). **back**: "Back to results" (primary, md/700, chevron) left; QuickExit on the right where §5.6 requires it. **chat**: "Open chat history" button, centered logo, QuickExit, "New chat" | `<header>`. The wordmark may hide below 380px so actions fit; the mark stays. Icon buttons are named |
| **SeekerTabBar** | Bottom bar with four equal items: Seek (magnifier), Chat (speech bubble), Map (folded map), Profile (person). A 22px icon in a 56×32 pill (`--radius-control`) over an xs label | Active: tint-strong pill, primary color, 800 weight, 2.1 stroke. Inactive: secondary color, 600 weight, 1.8 stroke. Hidden while the keyboard is open | `<nav aria-label="Main">` with links and `aria-current="page"`. Labels are always visible; each item is at least 44px |
| **SideNav** | Desktop, 272px. Logo and "Collapse sidebar". The four items as 44px rows (20px icon, md/600). Divider. "New chat" (white, `--shadow-1`, primary 700). "Search chats". History groups "Today", "Previous 7 days" and "Older" (sm/700 secondary headings), each row 44px. Footer: the GetHelpNow row and the account row (32px teal avatar with an initial, name md/700, "Profile and memory" sm) | Active item: tint-strong and primary 800. Current chat: primary tint, primary 700, plus "Options for {chat title}" (…), which offers Delete. Anonymous: no history and no account row | `<nav aria-label="ORAN">`. `aria-current` on the active item and the current chat. The options button follows the menu-button pattern |
| **ChatHistoryDrawer** | The phone and tablet history, opened from the chat TopBar. A left panel `--size-drawer` wide, white, `--shadow-2`, over `--color-scrim`. Contents: logo and "Close chat history"; "Search chats"; "New chat"; "Get help now"; hairline; history groups; a lock icon with "Your chats are private to your account. Delete any chat from its menu."; the account row | Row states as in SideNav. Anonymous: only New chat and Get help now | Modal: focus moves in and is trapped. Esc or a scrim tap closes it and returns focus to the history button. Slides in over 200ms; instant with reduced motion |

### 5.2 Chat

There are **no preset reply chips** or suggested-question buttons (D25). The person types or speaks.

| Component | Purpose and anatomy | Variants and states | Accessibility |
|---|---|---|---|
| **ChatMessage** | **User:** a right-aligned bubble, `--color-surface-user`, `--radius-bubble`, padding 12/16, at most 80% of the column (70% on desktop), md text. **Assistant:** plain md text on white with no bubble. It may contain a MemoryNote, ResourceCards (chat variant: stacked on phones, wrapping two-up at 280px or wider on desktop), "See {N} more options" (primary link) and AnswerActions | Streaming; complete; stopped; failed (an inline ErrorState with retry that keeps the person's text); partial (catalog results first, saying when web search is unavailable) | `<section aria-label="Conversation">`. Set `aria-busy` while streaming and announce the finished answer once in a polite live region, never token by token. Never move focus while streaming |
| **MemoryNote** | Shown after an automatic save. `--color-accent-tint`, `--radius-control`, a person-check icon in `--color-text-personal`, "**Remembered:** {items joined by ' · '}", then "Undo" (primary, underlined, 44px target) | Only for signed-in users with memory on; never for anonymous use or in "Helping someone else". Sensitive details (health, immigration, abuse, criminal record) save the same way, with no extra prompt (ADR-0007). Undo deletes the item | Undo's name says what it undoes ("Undo remembering 2 kids and no car"). The note is announced politely |
| **AnswerActions** | Four 44×44 quiet icon buttons under each finished answer, with 18px secondary icons: "Copy answer", "This helped", "This did not help", "Read answer aloud" | Helped and Did not help are toggles (`aria-pressed`; the icon turns primary and filled). Copy confirms briefly. Read aloud toggles to stop. Hidden while streaming | A tooltip with the same text appears on hover and on focus |

**Composer.** This is the only input in Chat.
- **Shape:** a `--radius-full` pill, at least 52px tall (56px on desktop), white, with a 1px `--color-border-input` outline and `--shadow-1`.
- **Field:** an auto-growing textarea, up to 5 lines, md text. Visually hidden label "Message ORAN"; placeholder "Type what you need…".
- **Buttons:** "Speak your message" (quiet icon) and "Send message", a 44px circle in `--color-accent` with a `--color-on-accent` arrow.
- **Disclaimer:** below the pill, centered, xs, secondary: "ORAN can make mistakes. Confirm details with the provider."
- **Keys:** Enter sends and Shift+Enter adds a line on a hardware keyboard. The phone return key adds a line.
- **States:** empty (Send is `aria-disabled`); streaming (Send becomes Stop in the same place); offline (disabled, with a reason); error (the text is kept).

### 5.3 Listings

**ResourceCard.** One summary of a listing, used in Seek, Chat, the Map list and Saved. Its facts come from the accepted listing, never from model text. Contents, in order:
1. The title (lg/700, links to the detail page) and the organization name (sm, secondary). On Seek, a "Save {name}" quiet bookmark button (44px; `aria-pressed` and a filled icon when saved).
2. A facts row (sm): the open status with a clock icon (`--color-status-open` at 600 when open, secondary otherwise); the distance with a pin icon, or "Call for location"; on chat cards, supported fit facts with a teal icon (for example, "Delivers to Elm Park").
3. A StatusNote, if any applies. While one shows, the open status renders in secondary color, never green.
4. The TrustLabel.
5. The AccuracyNote, short form.
6. "Why it fits:" (700, `--color-text-personal`) and its reasons joined by " · ". Show it only when the profile is used, and only with reasons the data supports.
7. Actions in a two-column grid: Call (primary) and Directions (secondary), 44px tall.

| Variant | Use |
|---|---|
| Seek | On `--color-bg`: white, `--radius-card`, `--shadow-1`, no border |
| Chat | On white: 1px `--color-border`, no shadow, padding 16, no Save |
| Sheet | See BottomSheet |
| Confidential location | No distance and no Directions; Call fills the row |
| Loading | A skeleton in the same shape |

Use the organization name alone, without the "by" prefix the chat mockups use. Name the Call and Directions links with the place, via `aria-describedby` pointing at the title.

| Component | Purpose and anatomy | Variants and states | Accessibility |
|---|---|---|---|
| **TrustLabel** | A pill: `--radius-badge`, padding 4/10/4/8, sm/600, 16px icon. **Verified:** primary tint, primary text, shield-check icon, "Verified · {N} days ago". **Not verified:** neutral surface, secondary text, info icon, "Not independently verified by ORAN community" (wraps with the icon top-aligned). **Lines below the pill** (sm, secondary, 14px icon): "Last verified {date}" when verification has expired; "Updated by the organization · {N} days ago" after owner edits | Exactly one pill per listing. No other labels exist | Plain text with an icon and words; nothing depends on a tooltip |
| **StatusNote** | A block above the TrustLabel: `--color-danger-tint`, danger text and alert icon, sm/700, `--radius-badge`. Copy: "Reported closed — call ahead", "May be closed — call ahead", "Some details may have changed — call ahead", "Temporarily closed" | One note at a time, in this priority: Temporarily closed, Reported closed, May be closed, Some details may have changed. It never hides the listing (C7) | The words carry the meaning. It comes before the actions in reading order |
| **AccuracyNote** | Shown on every listing, verified or not. Sm, secondary, info icon. **Full** form on Detail, below the trust lines: "Details can change. Confirm with the provider before relying on this information." **Short** form on cards and the sheet: "Confirm before you go." | Full or short only. Never removed | Plain text |
| **HoursTable** | A `<dl>` of day ranges and times in md text, rows at least 36px. Today's row: accent-tint background, bold day and time, and a "Today" tag (accent fill, xs/800, `--color-on-accent`). Closed days show "Closed" in secondary text. The explicit values "24/7" and "By appointment" replace the table. Times use the listing's time zone | Today is marked by the word "Today", the weight and the tint, never by color alone | Screen readers hear "Today" in the row |

**FlagForm** (not mocked; specified here):
- **Entry:** "Something wrong with this listing?" at the end of Detail (secondary, underlined, flag icon, 44px). It opens a dialog on desktop and a full-height sheet on phones, and also exists as a server-rendered page.
- **Fields:** a required radio group with one reason ("Closed", "Wrong phone", "Wrong hours", "Wrong address", "Not as described", "Other"); an optional note with a visible warning against personal details; the bot check (vendor under D6); a primary submit and a quiet cancel.
- **States:** idle; missing reason (an error summary takes focus, plus an inline message); submitting (busy button); success (a confirmation; a Closed flag shows "Reported closed — call ahead" on the listing immediately); limit reached (one flag per device per listing per day); bot check failed; offline or error (input kept).
- **Privacy:** no account needed. No reporter identifier or IP is stored. Never prefill from the profile.
- **Accessibility:** a fieldset with a legend, 44px radio rows, and the note linked to its warning with `aria-describedby`.

### 5.4 Controls

| Component | Purpose and anatomy | Variants and states | Accessibility |
|---|---|---|---|
| **Button** | 44px (48px large), `--radius-control`, md/700 label with an optional 18px icon. The compact size uses sm/700 (TopBar). **Primary:** teal fill, white text, primary-hover on hover. **Secondary:** primary tint, primary text, tint-strong on hover. **Quiet:** transparent, primary or secondary content; icon buttons and tertiary actions. **Destructive:** quiet with danger text ("Delete everything ORAN remembers"); a filled danger button with white text only to confirm a destructive dialog | Hover, pressed, focus-visible, disabled (`aria-disabled`, stays focusable), busy (spinner plus the kept label). At most one primary per card or region | Icon-only buttons need a name. Call (`tel:`), Directions and Website stay links |
| **Chip** | A 44px toggle for one filter value, `--radius-control`, sm/600. Off: primary tint with primary text, or white with `--shadow-2` over the map. On: teal fill, white, 800. Map category chips stack a 22px pin swatch over the label (52px tall) | `aria-pressed`. Rows wrap; the map's category row scrolls horizontally inside itself, with "All" first | Selection shows as fill, luminance and weight |
| **ContextChip** | An active context in Seek or Chat (area, need, "Using your profile"). From today: primary tint and primary text; tap to edit. From the profile: accent tint and `--color-text-personal`, plus a 44×44 remove button | Shows whether a constraint came from today or from saved preferences (BLUEPRINT §2.3) | The remove button has its own name ("Turn off Using your profile") |
| **SearchField** | 48px, white, `--radius-control`, a 1.5px inset `--color-border-input` outline, a 20px secondary search icon, a 16px input. Visually hidden label "Search for support"; placeholder "Search food, rent help, clinics…". **Compact** (44px, still 16px text): "Search chats" | Focus ring; a clear button when filled; works as a GET form without JavaScript | `role="search"` and `type="search"`. A placeholder never replaces the label |
| **FilterBar** | The results count (md/700, "24 places"), "Sort: Closest" and "Filters" with a count badge (xs/700, white on teal). Both are white, `--shadow-1`, 44px | Sorts: relevance, distance, freshness (BLUEPRINT §2.3); the button names the active one. The count is the real total | Name the Filters button with its count ("Filters, 2 active"). Announce changes politely |
| **Switch** | A 52×32 track in a 56×44 hit area. On: teal track, white 26px thumb with a check. Off: neutral track, 2px `--color-control-off` inset outline, 20px `--color-control-off` thumb | Position, thumb size and the check icon change along with color. It applies immediately | `role="switch"` with `aria-checked`, labelled by the row text and described by its helper text |
| **ListRow** | A row of at least 44px in a white grouped list (`--radius-card`, `--shadow-1`, `--color-border-subtle` dividers). A 32px leading tile (`--radius-badge`): accent tint for remembered items, primary tint for saved places and settings. Text "Label: **Value**". Trailing Edit and Delete icon buttons, or a chevron for navigation | Memory item, saved resource, setting | Buttons name the item ("Edit Area: Elm Park"). A navigation row is one link |
| **Form primitives** | TextField, Select, Checkbox, RadioGroup, Dialog, Disclosure, Skeleton and VisuallyHidden use the SearchField outline, 44px rows, md text, the focus ring and `--radius-control` | Error: danger text and icon with the message below the field | Errors linked with `aria-describedby`; an error summary on submit |

### 5.5 Map

| Component | Purpose and anatomy | Variants and states | Accessibility |
|---|---|---|---|
| **MapPin** | A 28px circle in its category color (§6), a 2.5px white ring, a 2px drop shadow at 14%, and a 14px glyph. **Selected:** a 40px teardrop with a 3px white edge and a marigold halo (accent at 30%). **You are here:** a 15px teal dot with a 3px white ring and a teal halo at 16%. **Cluster** (not mocked): a 36px white circle with a 2px teal ring and the count in sm/800 teal | Selection shows as shape and size. Pins never show status color. Confidential, remote and phone-only listings get no pin | Each pin is a button named "{place}, {category}". Keyboard order follows the list. Enter opens the sheet |
| **MapBanner** | A top overlay: a `--radius-full` pill, 48px, teal, `--shadow-2`, with a marigold pin icon and white md/600 text with a bold count: "{N} places offering help near you". Below it, a marigold callout (`--radius-control`, md/800, `--color-on-accent`), "You're not alone.", and the "List" toggle (white, primary, 44px) | N is the real number of results in view (C2). If there are none, show EmptyState, never "0 places" | Announce count changes after the person acts, not on every pan |
| **BottomSheet** | The selected-place summary: white, top corners `--radius-card`, `--shadow-2` upward, a 40×4 handle (`--color-border-input`), padding 12/16/16 plus the safe area. A 40px `--color-bg` tile holding the pin, the title (lg/700), a meta line ("Food · Open until 6 PM · 0.8 mi"), the StatusNote if any applies (the open status then renders in secondary color, as on ResourceCard), the TrustLabel, the short AccuracyNote, and Directions (primary) plus Details (secondary), both 48px | Peek or dismissed | A non-modal region named "Selected place". A close button and Esc offer a non-drag alternative (WCAG 2.5.7). Focus goes to the title on open and back to the pin on close |

**The map always has a list.** The "List" toggle is always visible. The list shows ResourceCards in the same order with the same filters. It also contains confidential listings ("Call for location") and remote and phone-only listings, which have no pin. If the map cannot load (vendor failure, no JavaScript, low memory), show the list automatically. The map is never the only way to reach a listing.

### 5.6 Safety (D24, ADR-0007)

ORAN is a resource guide, not crisis care. Crisis help is always available, but it is never a core focus of the interface.

**GetHelpNow.** "Get help now" with a life-buoy icon.
- **Where, menu only:**
  - a row in the ChatHistoryDrawer and on the Profile screen on phones;
  - a row in the SideNav footer on desktop.
  - It never appears in a TopBar.
- **Panel:** static crisis numbers (988, 911, the domestic violence hotline and the local 211). No classifier is involved.
- **Inline variant:** a `--color-primary-tint` card (`--radius-card`, life-buoy icon, a heading, the numbers as 44px secondary call buttons), with no pulsing or alarming motion. Use it only:
  - inside the assistant's reply when someone in a chat shows signs of immediate danger (never as a modal);
  - in OutageState and Offline, which C19 requires.
  - Never use it on category results or searches.

**QuickExit.** "Exit" with an exit icon.
- **Look:** `--color-surface-neutral`, `--color-text`, sm/700, 44px tall. The phone mockup's 36px is fixed to 44px.
- **Name:** "Quick exit to a neutral website".
- **Where:** the chat TopBar on phones and the chat header on desktop; the TopBar on Safety and Housing & shelter results and their listings. Domestic violence resources fall under Safety.
- **Shortcut:** pressing Esc twice within one second, at least wherever the button shows. A single Esc still closes drawers and dialogs.
- **Behavior:** it replaces the page and its history entry with `https://www.weather.gov` (`location.replace`) at once, with no confirmation (ADR-0007).
- **Page titles and URLs:** keep them neutral. Sensitive categories never appear in `<title>` or in shareable URLs by default.

### 5.7 States

| Component | Purpose and anatomy | Rules |
|---|---|---|
| **EmptyState** | A heading, one line and the next action, centered in the content column. **Before input:** Seek offers search and categories; Chat offers the composer. **Zero results:** recovery actions to widen the area, try other categories, or call the local 211 | Tell apart "no matching records", "unknown coverage" and "system failure". Widening a search is a visible change, never a hidden relaxation |
| **ErrorState** | An alert icon, an honest message and Retry | Keep filters and typed text. When the model fails, point to Seek and Map |
| **OutageState** | An honest message, the crisis numbers and a 211 link | Never "no resources exist". Never cached data presented as current |
| **Offline** | The cached shell, the crisis numbers, and actions that need the network disabled with a reason | Shown by the shell on every screen |
| **Skeleton** | `--color-bg` blocks in the content's shape | No shimmer with reduced motion. `aria-busy` on the region |

## 6. Category visuals

The **glyph is the primary differentiator**: ten colors cannot be told apart by color alone. Color only supports the glyph. Glyphs and icons are lucide-style strokes; the pin glyph is the icon simplified to 14px. The shield is reserved for Verified and the life buoy for Get help now, so no category uses them. Glyph contrast is measured against the pin fill and needs 3:1 (non-text).

| Category | Icon and pin glyph | Pin token and color | Glyph | Glyph contrast |
|---|---|---|---|---|
| Food | Fork and knife | `--color-pin-food` `#E9A23B` (mockup) | **Dark** `#1C2733` (white fails at 2.17) | 6.99 |
| Housing & shelter | House with a door | `--color-pin-housing` `#2C5F9E` (mockup) | White | 6.49 |
| Bills & money | Banknote: a rounded rectangle with a center circle | `--color-pin-money` `#2F7A47` (new) | White | 5.26 |
| Health | Medical plus, heavy stroke | `--color-pin-health` `#D35D74` (mockup) | White | 3.76 (passes 3:1; `#BE5468` would reach 4.5) |
| Mental health | Brain outline | `--color-pin-mental-health` `#7A4FA3` (new) | White | 6.04 |
| Work | Briefcase | `--color-pin-work` `#3A2E6E` (mockup) | White | 11.69 |
| Legal | Balance scale | `--color-pin-legal` `#6E4B33` (new) | White | 7.73 |
| Transportation | Bus front with wheels | `--color-pin-transport` `#B7471A` (new) | White | 5.34 |
| Childcare & family | Baby face | `--color-pin-family` `#A8327A` (new) | White | 6.17 |
| Safety | Hand holding a heart | `--color-pin-safety` `#4B5866` (new; discreet slate) | White | 7.27. **No pin** when the location is confidential |

Against the mockup basemap (`#E8ECE7`), every pin fill reaches 3:1 except Food (1.81). Food relies on its dark glyph and white ring. Re-check every pin against the chosen tile style (D6). Taxonomy terms are data; a new term needs a row here before it ships.

## 7. Trust vocabulary and exact copy

All seeker strings live in the EN and ES message catalogs (`src/ui/en.json`, `src/ui/es.json`); nothing is hard-coded (C18). Use plural and date formatting per locale. Spanish needs native-speaker review before release (D10, BLUEPRINT §12.6). Strings from an ADR change only by ADR; strings from the mockups change by a PR to this document.

| Where | Exact English | Source |
|---|---|---|
| TrustLabel | "Verified · {N} days ago"; after a check, "Verified · today" | ADR-0006 §2, §4 |
| TrustLabel | "Not independently verified by ORAN community" | ADR-0005, ADR-0006 |
| Trust lines | "Last verified {date}"; "Updated by the organization · {N} days ago" | ADR-0006 §2 |
| StatusNote | "Reported closed — call ahead"; "May be closed — call ahead"; "Some details may have changed — call ahead"; "Temporarily closed" | ADR-0005, ADR-0006 §3–§4 |
| Location | "Call for location" | ADR-0005, ADR-0006 §1 |
| AccuracyNote | Full: "Details can change. Confirm with the provider before relying on this information." Short: "Confirm before you go." | ADR-0006 §2 |
| FlagForm reasons | "Closed", "Wrong phone", "Wrong hours", "Wrong address", "Not as described", "Other" | ADR-0006 §4 |
| Follow-up | "Did it help?"; the answer "It was closed" creates a Closed flag | ADR-0005, ADR-0006 §4 |
| Features | "Helping someone else"; "Share this list"; "Get help now" | ADR-0005 |
| HoursTable | "24/7"; "By appointment"; "Today"; "Closed" | ADR-0006 §1; mockup |
| Composer | "ORAN can make mistakes. Confirm details with the provider."; placeholder "Type what you need…"; label "Message ORAN" | Mockup |
| MemoryNote | "Remembered: {items}" · "Undo" (name: "Undo remembering {items}") | Mockup |
| Seek | "Find support"; "Search food, rent help, clinics…"; "Using your profile"; "Why it fits:"; "Sort: Closest"; "Filters"; "{N} places"; "Open now"; "Open until {time}"; "Opens tomorrow {time}" | Mockup |
| Map | "{N} places offering help near you"; "You're not alone."; "List"; "Details"; "Selected place" | Mockup |
| Detail | "Back to results"; "Call {phone}"; "Directions"; "Website"; "Share"; "Who it's for"; "How to get help"; "What to bring"; "Hours"; "Address"; "Something wrong with this listing?" | Mockup |
| Chat | "See {N} more options" (singular: "See 1 more option"); "New chat"; "Search chats"; "Exit"; "Today"; "Previous 7 days"; "Older"; "Your chats are private to your account. Delete any chat from its menu."; "Profile and memory" | Mockup |
| Profile | "What ORAN remembers"; "Let ORAN remember things to personalize your help"; "Searches won't be saved to your memory"; "Saved"; "Delete everything ORAN remembers" | Mockup |
| Memory opt-in helper | "This can include details like your health or immigration status. You can review, edit or delete anything here." | ADR-0007 |
| Accessible names | "Quick exit to a neutral website"; "Open chat history"; "Close chat history"; "Copy answer"; "This helped"; "This did not help"; "Read answer aloud"; "Speak your message"; "Send message"; "Search for support"; "Save {name}"; "Turn off Using your profile"; "Options for {chat title}"; "Filters, {N} active"; "Edit {item}"; "Delete {item}"; "Collapse sidebar" | Mockup |

## 8. Required states (C19, BLUEPRINT §12.5)

Every screen designs all seven states: **loading**, **empty** (no input yet), **zero results** (widen the area, other categories, the local 211 number), **error**, **outage** (an honest message, crisis numbers, a 211 link), **offline** (the cached shell and crisis numbers) and **success**.

| Screen | Screen-specific requirements |
|---|---|
| Seek | Zero results separates no records, unknown coverage and failure. Keep explicit filters through errors |
| Chat | Streaming, stopped, partial (catalog first, "web unavailable"), model down (links to Seek and Map), anonymous (not saved), memory off, Helping someone else |
| Map | Map failed (switch to the list), nothing in view, location denied (ask for an area) |
| Resource detail | A permanently closed listing is removed from search and kept in history. A flag just sent shows its note. Confidential location |
| Profile | Memory off, anonymous, nothing remembered, delete in progress, delete done |
| Chat history | No chats yet, search with no match, deleting a chat |
| FlagForm | As in §5.3 |

## 9. Accessibility and performance budgets (BLUEPRINT §12.6)

| Budget | Target |
|---|---|
| Accessibility | WCAG 2.2 AA. Axe shows zero serious or critical issues on every layout in CI. A manual VoiceOver and TalkBack pass on seeker flows each release |
| Touch targets | At least 44×44px on every interactive element, beyond the WCAG 2.5.8 minimum of 24px |
| Contrast | §3.2. Status never relies on color alone (1.4.1). Non-text 3:1 (1.4.11) |
| WCAG 2.2 specifics | Reflow at 320 CSS px (1.4.10); text spacing overrides (1.4.12); focus not hidden by sticky bars (2.4.11); non-drag alternatives for the sheet and map (2.5.7); help in a consistent place (3.2.6: "Get help now" is always in the menu) |
| Seeker first-load JavaScript | At most 90 KB gzip per seeker route. Map code loads only on Map |
| Largest Contentful Paint | At most 2.5s on a mid-range Android over throttled 4G |
| Fonts | Figtree woff2, 4 weights, latin subset, `font-display: swap` |
| Language | Every seeker string comes from the catalogs; Spanish is reviewed by a native speaker before launch |

## 10. Implementation notes

- Tokens become CSS custom properties in `src/app/globals.css` in a later UI PR. The current development styles there (`--ink`, `--accent`, Arial) are bootstrap-only and will be replaced. This document changes no code.
- **Framework-agnostic.** Components are specified as semantic HTML plus tokens. The Tailwind and Radix choice is open under D6; whichever is chosen must consume these tokens, and lint must block raw colors, sizes and off-scale spacing.
- **Icons.** Inline SVG on a 24×24 viewBox, `fill="none"`, `stroke="currentColor"`, stroke 1.8 (default) to 2.1 (active or small), round caps and joins, `aria-hidden="true"`, with the name on the control. Lucide style; no icon fonts.
- **Fonts.** Self-host Figtree (SIL OFL 1.1). The mockups load Google Fonts; production must not, so seeker IP addresses are not sent to a third party.
- **Component catalog.** A development-only route renders every component in every state, with Playwright visual tests and axe (BLUEPRINT §12.3).
- Server-render seeker pages. Seek search and Detail work without client JavaScript. Chat streaming and the map are enhancements.
- Force `color-scheme: light` until a dark theme is designed.

## 11. Open items

**Not designed yet:**
- **Themes and layouts:** the dark theme; the tablet layout, collapsed SideNav and desktop Seek, Map, Profile and Detail; the Filters panel and expanded BottomSheet; staff workspace layouts.
- **Flows:** the chat welcome (BLUEPRINT proposes "What would help today?"); the "Did it help?" follow-up; the "Share this list" output; the "Helping someone else" indicator in Chat and Seek; delete confirmations; how a saved but permanently closed listing appears.
- **Copy:** the anonymous drawer and sidebar; the GetHelpNow panel; FlagForm buttons, warning and confirmation; remote, phone-only and service-area listings; holiday exceptions.
- **Policy:** whether chat may show unpublished web discoveries, and with what label (D21).

**Decisions:**
- **Spanish review:** all strings need native-speaker review. Test the longer labels at 360px.
- **Icon library:** decide whether to depend on lucide (ISC) or hand-draw the icons (D6, C13).
- **Map vendor:** tiles and geocoding are under D6. Recheck pin contrast and the cluster design once tiles are chosen.

**Changes from the mockups:**

| Mockup | This document | Why |
|---|---|---|
| Composer outline `#C9D1D8` | `--color-border-input` `#808C99` | 1.54:1 fails non-text contrast; 3.43:1 passes |
| Chat Exit 36px; chip remove button 32px wide | 44px | 44px target rule |
| History search filled grey, no outline, 15px | Outlined compact SearchField, 16px | Field boundary contrast; no iOS zoom |
| Body and button text 15px; trust labels 13px; titles 17px | 16, 14, 18px | At most 6 type steps; body at least 16px |
| Unverified text `#3D4753`; switch track `#E4E8EC`; hairline `#E8ECEF` | Merged into existing tokens | Fewer tokens; all still pass |
| Top bars 60px (chat 56px) | 56px everywhere | One bar height |
| Bubble radius 20/22px (brief said 14) | `--radius-bubble` 20px | Matches the approved files |
| Sheet tile in marigold tint | `--color-bg` tile | Marigold tint is reserved for personal content |
| "by {organization}" on chat cards | The organization name alone | Consistent with Seek and Detail |
| Mockups omit the AccuracyNote | Required on every card, sheet and detail | ADR-0006 §2 |
| Prose fills the 760px column | Prose at most 65ch inside it | BLUEPRINT §12.2 line length of 45–75 characters |
| Hours "Today" uses marigold | Kept | Today is "about you now"; the word "Today" carries the meaning |
| "Get help now" in every TopBar | Menu only: chat drawer, Profile, desktop sidebar | ADR-0007: resources, not crisis care |
| Profile note "ORAN asks before saving anything about…" | Opt-in helper "This can include details like your health or immigration status…" | ADR-0007: no ask-first saving |
