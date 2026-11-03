# 0007. Founder refinements: memory saves without asking, crisis help in the menu, quick exit details

- Status: Accepted
- Date: 2026-11-03
- Decider: Founder
- Related: D8, D24; C8, C19; ADR-0005; BLUEPRINT §7.5, §12.5; DESIGN_SYSTEM §5.6

## Context

While reviewing the design system, the founder rejected two ADR-0005 safeguards:

- On memory: "we save user details / they can go into chats / memory and review / edit / delete them. we dont need to ask before saving."
- On crisis help: "i dont need crisis help everywhere all the time … i want to have it but not be a core focus of my app. its resources, not crisis care."

The founder also accepted the proposed quick-exit details.

## Options considered

1. **Keep ask-first saving and prominent crisis help.** This contradicts explicit founder direction.
2. **Save everything automatically and remove crisis help.** This drops a useful safety option that the founder wants kept.
3. **Save automatically under an informed one-time opt-in, and keep crisis help available but quiet.** Selected.

## Decision

### 1. Memory saves without asking

- The guide saves what it learns automatically, including health, immigration, abuse and criminal-record details.
- The consent is the account holder's one-time memory opt-in. Its helper text says: "This can include details like your health or immigration status. You can review, edit or delete anything here."
- Unchanged from ADR-0005:
  - the "Remembered" note with Undo;
  - the memory view for review, edit and delete;
  - deletable saved chats;
  - no memory for anonymous use or "Helping someone else".

### 2. Crisis help is available, not a core focus

ORAN is a resource guide, not crisis care.

- "Get help now" lives only in the menu:
  - on phones, the chat history drawer and the Profile screen;
  - on desktop, the sidebar.
- There is no top-bar button and no automatic crisis card on category results or searches.
- Still kept:
  - when someone in a chat shows signs of immediate danger, the guide gives the crisis numbers in its reply;
  - outage and offline screens still list the crisis numbers and 211, as C19 and BLUEPRINT §12.5 require.

### 3. Quick exit

- **Placement:** unchanged from ADR-0005 — chat, plus the Safety and Housing & shelter categories.
- **Shortcut:** pressing Esc twice within one second.
- **Destination:** `https://www.weather.gov`, replacing the current page and its history entry.

## Consequences

- **Constitution:** C8 drops its ask-first clause. CONSTITUTION and BLUEPRINT §15 stay synchronized.
- **Decision log:** D8 and D24 are updated.
- **Superseded text:** these parts of ADR-0005 are superseded:
  - the ask-first bullet;
  - "Get help now" as a menu control plus prominent placements.
- **Blueprint:** BLUEPRINT §7.5 "crisis access on every page" is also superseded.
- **Design system:** DESIGN_SYSTEM records the new placement and copy.
- **Still open:** privacy counsel must review automatic saving of sensitive details before public release, because state consumer-health laws such as Washington's My Health My Data Act regulate it.
