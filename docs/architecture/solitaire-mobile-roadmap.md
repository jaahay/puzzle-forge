# Solitaire Mobile Roadmap

This document scopes the Klondike Solitaire mobile-quality slice so a separate implementation session can execute it without rediscovering product intent.

## Goal

Make Klondike Solitaire comfortable on phone-sized screens without changing card rules, variation semantics, seeded deal generation, move legality, undo/redo behavior, or persistence semantics.

The current implementation already has meaningful game behavior. This roadmap is a layout and touch ergonomics plan, not a rules rewrite.

## Source-of-truth areas

Likely files and modules:

- `src/components/CardPuzzlePreview.tsx`
- `src/site/solitaire.css`
- `src/site/mobile-workspace.css`
- `src/app/useSolitaireController.ts`
- `src/app/solitaireMoves.ts`
- `src/app/solitaireStock.ts`
- `src/interactions/cardRules.ts`
- `src/app/solitaireStock.test.ts`

Avoid changing move rules unless a mobile interaction defect proves the rules layer is causing the issue.

## Non-goals

- Do not redesign Solitaire variants.
- Do not replace click/tap selection with drag-and-drop in this slice.
- Do not add new Solitaire games such as FreeCell or Spider.
- Do not change persistence schema unless required for a mobile-visible state bug.
- Do not make desktop layout worse to improve phone layout.

## Required product decisions

Before implementation, choose the mobile board strategy:

1. **Managed horizontal scroll:** keep the seven-column tableau wider than the viewport, but make scroll behavior intentional and obvious.
2. **Compressed single-board layout:** shrink cards and spacing enough to fit most phone widths.
3. **Sectioned layout:** keep stock/waste/foundations fixed or easily reachable while tableau scrolls separately.

Recommended first choice: sectioned layout with controlled tableau overflow. It avoids tiny cards while making top-row controls reachable.

## Phase 1: Mobile board ergonomics

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
- Desktop layout remains substantially unchanged.

## Phase 2: Touch interaction polish

### Requirements

- Repeated tap / double-click auto-foundation behavior remains usable on touch.
- Empty tableau and foundation targets are easy to tap.
- Disabled and face-down cards do not present misleading affordances.
- Waste behavior remains clear for draw-1 and draw-3.

### Acceptance criteria

- Tapping a selectable card selects it.
- Tapping a valid target moves it.
- Tapping an invalid target provides visible target feedback or no destructive action.
- Double-tap/repeated-tap auto-foundation remains reliable enough for touch users.

## Phase 3: Optional mobile affordances

Only implement these after Phase 1 is acceptable:

- compact help text explaining tap-to-select, tap-target-to-move;
- optional mobile-only jump controls for stock/waste/foundations;
- explicit selected-card tray if selection state is hard to follow;
- drag-and-drop as a separate future interaction slice.

## Validation plan

Automated:

- Preserve existing Solitaire stock, waste mode, and variation tests.
- Add component-level tests only if the repo has or introduces a stable rendering-test setup.
- Do not replace rule tests with CSS-only assertions.

Manual QA:

- 360px wide phone viewport.
- 390px wide phone viewport.
- 430px wide phone viewport.
- Tablet-ish viewport around 700px.
- Desktop viewport.

Manual scenarios:

1. Start a seeded Solitaire game.
2. Draw from stock.
3. Move from waste to tableau.
4. Move from tableau to foundation.
5. Move a sequence between tableau columns.
6. Undo and redo.
7. Auto-move to foundations.
8. Reset and confirm layout remains stable.

## Handoff prompt

Use this prompt for an implementation-focused ChatGPT instance:

```text
You are implementing the Solitaire mobile roadmap in `jaahay/puzzle-forge`. Read `docs/architecture/solitaire-mobile-roadmap.md`, then inspect `src/components/CardPuzzlePreview.tsx`, `src/site/solitaire.css`, `src/site/mobile-workspace.css`, and the Solitaire rule/controller modules. Keep the change scoped to mobile layout and touch ergonomics. Do not change Solitaire rules or variants unless a defect requires it. Preserve desktop layout. Implement the smallest coherent Phase 1 slice, update tests only where logic changes, and validate with `pnpm build`.
```
