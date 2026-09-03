# Shared Puzzle Controls

Puzzle Forge should avoid each puzzle inventing its own controls or exposing generator mechanics directly.

Shared controls should encode product semantics first, then reusable rendering where that materially reduces duplication.

## Core control families

### Current-puzzle actions

These mutate or inspect the puzzle being played:

- Undo
- Redo
- Check / Submit
- Reset
- puzzle-specific actions such as Draw or Auto foundation

### New-puzzle actions

These create another puzzle from prospective settings:

- random New
- Today
- load entered seed
- puzzle-specific prospective difficulty, size, variation, artwork, or uniqueness settings

Do not mix Reset into New-puzzle actions. Reset acts on the current puzzle; Random/Today/Seed create a different puzzle identity.

## Candidate shared primitives

Prefer small semantic primitives over a single giant configuration component:

- `NewPuzzleCommand` / shared New-puzzle shell
- `CurrentSeedDisplay`
- `SeedEntryControl`
- `TodayDateButton`
- `IconActionButton`
- `DifficultyControl`
- `SizeControl`
- `GameplayToolbar`
- `ActionHistoryControls`
- `TransientFeedbackLane`
- `StatusStrip`
- `VariantControls`

Puzzle-specific composition remains appropriate where mechanics differ.

## New-puzzle command

The canonical grammar is:

1. closed primary action starts a random puzzle with remembered/prospective settings;
2. disclosure opens prospective settings;
3. settings changes do not mutate the current puzzle;
4. Random, Today, and entered Seed immediately create a puzzle using those settings;
5. current seed is read-only reference/share state;
6. a separate editable seed is the candidate to load;
7. contextual explanation is opt-in rather than permanent helper text.

The current Sudoku control is the first implementation of this grammar, not a Sudoku-only exception.

Do not extract a puzzle-agnostic mega-component before at least one materially different puzzle proves the abstraction. Nonogram is a good proving case because it adds difficulty, dimensions, and uniqueness.

## Seed

Seed is generation metadata, not top-level gameplay status.

Show the current puzzle seed read-only with a compact copy action. Keep the next/load seed separate and editable. A fresh random candidate may be populated when opening New options, but should not overwrite the player's edits while the panel remains open.

Copy confirmation is transient event feedback and must not resize the control.

## Today

Today is an immediate creation action using the prospective settings and the shared daily identity.

Prefer a live calendar-date button over a generic calendar glyph. The visual date and generated daily seed must derive from the same local-date source and roll over together at local midnight.

The control should remain compatible with a future calendar/archive modal, but Today itself stays a direct action.

## Action icons

Prefer icons for conventional actions when the meaning remains clear. Keep configuration choices/data textual.

Suggested shared vocabulary:

- die: new random puzzle
- chevron: options disclosure
- date tile: Today
- play/forward: load seed
- overlapping rectangles: copy
- curved left/right arrows: Undo / Redo
- verification mark: Check
- restart/circular arrow: Reset
- circled `i`: contextual explanation
- corners: fullscreen
- `x`: close/exit

Use consistent SVG artwork rather than emoji. Every icon-only action requires an accessible name; titles/tooltips are useful secondary disclosure, not a substitute for accessibility.

## Action history

Undo/Redo should become a platform capability where the mechanic has meaningful reversible player actions.

**Record completed player intentions, not low-level mutations.**

Examples:

- grid cell edit: one history action;
- Nonogram mark toggle: one action;
- tile swap: one action;
- sliding move: one action;
- Jigsaw drag-and-release: one action.

Selection, focus, hover, pointer-motion updates, and temporary validation state should not normally enter history.

Redo should accompany Undo. Divergent input after Undo clears redo. Puzzle identity changes clear the active history. Persisting history across refresh is desirable eventually but need not block the first shared implementation.

Word Guess may intentionally make submitted rows irreversible because submission reveals information; editing before Submit can still have local history semantics if useful.

## Feedback lane

Transient feedback should use a bounded stable lane rather than conditionally inserting content into the page.

Examples:

- Check confirmation/error summary;
- invalid move;
- no Undo/Redo available;
- copied confirmation.

The content may fade or clear; the lane does not collapse. Repeated events may restart the timer. A newer player action may replace stale feedback.

## Gameplay actions

Gameplay controls belong closest to the board and should keep their spatial positions stable as their enabled state changes.

Do not hide Undo/Redo merely because the stack is empty; disable them. Likewise, completion should transform the established gameplay region rather than causing a large page reflow.

## Variants

Variant controls describe the next puzzle identity unless they can safely apply to the current puzzle without regeneration.

Examples:

- Solitaire variation/draw rules;
- Sudoku Standard / Diagonal / Zero Killer;
- Jigsaw difficulty/dimensions;
- future puzzle-specific modes.

Keep identity-changing variants inside the prospective New-puzzle model. Image-backed puzzles that currently regenerate immediately on settings commits should migrate semantically before adopting the shared New shell.
