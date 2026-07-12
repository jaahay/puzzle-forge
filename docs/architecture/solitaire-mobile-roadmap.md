# Solitaire UX Roadmap

This document scopes the Klondike Solitaire UI/UX slice so a separate implementation session can execute it without rediscovering product intent.

## Goal

Make Klondike Solitaire feel comfortable, legible, and game-like on both desktop and phone-sized screens without changing card rules, variation semantics, seeded deal generation, move legality, undo/redo behavior, or persistence semantics.

The current implementation already has meaningful game behavior. This roadmap is a UI layout, interaction, and affordance plan, not a rules rewrite.

## Source-of-truth areas

Likely files and modules:

- `src/components/CardPuzzlePreview.tsx`
- `src/components/PuzzleWorkspace.tsx`
- `src/site/solitaire.css`
- `src/site/workspace.css`
- `src/site/mobile-workspace.css`
- `src/app/useSolitaireController.ts`
- `src/app/solitaireMoves.ts`
- `src/app/solitaireStock.ts`
- `src/interactions/cardRules.ts`
- `src/app/solitaireStock.test.ts`

Avoid changing move rules unless an interaction defect proves the rules layer is causing the issue.

## Non-goals

- Do not redesign Solitaire variants.
- Do not replace click/tap selection with drag-and-drop in the first UX slice.
- Do not add new Solitaire games such as FreeCell or Spider.
- Do not change persistence schema unless required for a visible state bug.
- Do not optimize mobile by degrading desktop, or optimize desktop by making phone play impossible.

## Required product decisions

### Desktop board strategy

Before implementation, choose how PC Solitaire should feel:

1. **Table-first desktop:** the board uses available width, with large readable cards and a balanced top row.
2. **Compact arcade desktop:** the board stays compact and centered, prioritizing quick play over realism.
3. **Information-rich desktop:** the board adds more status, guidance, and move affordances around the cards.

Recommended first choice: table-first desktop. PC play should look intentional, not like a stretched mobile board or a debug preview.

### Mobile board strategy

Before implementation, choose the mobile board strategy:

1. **Managed horizontal scroll:** keep the seven-column tableau wider than the viewport, but make scroll behavior intentional and obvious.
2. **Compressed single-board layout:** shrink cards and spacing enough to fit most phone widths.
3. **Sectioned layout:** keep stock/waste/foundations fixed or easily reachable while tableau scrolls separately.

Recommended first choice: sectioned layout with controlled tableau overflow. It avoids tiny cards while making top-row controls reachable.

## Phase 1: Desktop UX pass

Do this before or alongside the mobile pass, because PC review has shown that desktop also needs iteration.

### Requirements

- Card scale, spacing, and board proportions feel deliberate on common laptop/desktop widths.
- Stock, waste, foundations, and tableau form a coherent Klondike table layout.
- The top row is visually balanced and not cramped, adrift, or overly separated.
- Move count, foundation count, hidden-card count, and action controls are readable without dominating the board.
- Selected-card state is obvious.
- Valid and invalid target states are discoverable.
- Empty tableau and foundation targets communicate that they are possible destinations.
- The Solitaire panel should not feel like a raw generated preview; it should feel like a playable game surface.

### Implementation notes

- Start in `src/site/solitaire.css` and `CardPuzzlePreview.tsx`.
- Preserve explicit stock, waste, foundation, and tableau sections.
- Prefer layout and affordance changes before changing controller logic.
- Consider improving the summary/action row hierarchy, not just the cards.
- Consider adding lightweight instruction/status copy only if it reduces interaction ambiguity.

### Acceptance criteria

- On desktop, the Solitaire board feels intentionally composed at typical widths around 1280px and 1440px.
- Cards are readable and clickable without excessive empty space or cramped overlap.
- The top row and tableau align in a way that resembles a coherent card table.
- The user can understand selected card, valid targets, empty targets, and progress at a glance.
- Existing rules and variation behavior remain unchanged.

## Phase 2: Mobile board ergonomics

### Requirements

- Stock, waste, and foundations remain reachable without awkward panning.
- Tableau remains readable at narrow viewport widths.
- Selected card state remains obvious on touch devices.
- Valid and invalid target feedback remains visible.
- Undo, redo, and auto-foundation controls remain reachable.
- Move count, foundation count, and hidden-card count remain visible or intentionally collapsible.
- Horizontal overflow, if retained, is constrained to the board area rather than causing whole-page drift.

### Implementation notes

- Keep rules in `cardRules.ts` authoritative.
- Prefer CSS/layout changes before component rewrites.
- If `CardPuzzlePreview` changes, keep rendering roles explicit: stock, waste, foundation, tableau.
- Consider wrapping the tableau in its own scroll container.
- Consider making the top row sticky inside the Solitaire panel only if it does not interfere with global app header behavior.

### Acceptance criteria

- At phone widths around 360px, the user can draw stock, select waste, move to tableau/foundation, undo, redo, and auto-foundation without whole-page horizontal scrolling.
- Tableau cards are still tappable and visually distinguishable.
- Selection state is not hidden offscreen or clipped.
- Foundation progress and move count remain available.
- Desktop layout remains acceptable after mobile changes.

## Phase 3: Interaction polish across desktop and touch

### Requirements

- Click/tap selection remains predictable.
- Repeated tap / double-click auto-foundation behavior remains usable.
- Empty tableau and foundation targets are easy to activate.
- Disabled and face-down cards do not present misleading affordances.
- Waste behavior remains clear for draw-1 and draw-3.
- Keyboard/focus-visible behavior remains accessible enough for desktop users.

### Acceptance criteria

- Selecting a card and selecting a valid target moves it.
- Selecting an invalid target provides visible feedback or no destructive action.
- Double-click/repeated-tap auto-foundation remains reliable enough for both mouse and touch users.
- Focus rings and selected-card styling do not fight each other.

## Phase 4: Optional affordances

Only implement these after the core desktop and mobile board are acceptable:

- compact help text explaining click/tap-to-select, target-to-move;
- explicit selected-card tray if selection state is hard to follow;
- mobile-only jump controls for stock/waste/foundations;
- drag-and-drop as a separate future interaction slice;
- richer desktop table theme or card art pass.

## Validation plan

Automated:

- Preserve existing Solitaire stock, waste mode, and variation tests.
- Add component-level tests only if the repo has or introduces a stable rendering-test setup.
- Do not replace rule tests with CSS-only assertions.

Manual QA:

- Desktop viewport around 1280px wide.
- Desktop viewport around 1440px wide.
- Laptop-ish viewport around 1024px wide.
- Tablet-ish viewport around 700px wide.
- 430px wide phone viewport.
- 390px wide phone viewport.
- 360px wide phone viewport.

Manual scenarios:

1. Start a seeded Solitaire game.
2. Draw from stock.
3. Move from waste to tableau.
4. Move from tableau to foundation.
5. Move a sequence between tableau columns.
6. Select an invalid target and confirm feedback/no destructive action.
7. Undo and redo.
8. Auto-move to foundations.
9. Reset and confirm layout remains stable.
10. Switch variation settings and confirm the board remains usable.

## Handoff prompt

Use this prompt for an implementation-focused ChatGPT instance:

```text
You are implementing the Solitaire UX roadmap in `jaahay/puzzle-forge`. Read `docs/architecture/solitaire-mobile-roadmap.md`, then inspect `src/components/CardPuzzlePreview.tsx`, `src/components/PuzzleWorkspace.tsx`, `src/site/solitaire.css`, `src/site/workspace.css`, `src/site/mobile-workspace.css`, and the Solitaire rule/controller modules. Treat this as a desktop-and-mobile UI/UX pass, not only a mobile fix. Keep the work scoped to layout, visual hierarchy, and interaction affordances. Do not change Solitaire rules or variants unless a defect requires it. Preserve existing behavior, implement one coherent phase at a time, update tests only where logic changes, and validate with `pnpm build`.
```
