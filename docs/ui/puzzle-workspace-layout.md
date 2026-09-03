# Puzzle Workspace Layout

Puzzle Forge treats each puzzle screen as a workspace. The board is the hero; surrounding UI should support playing, not compete with it.

This document captures the product/layout direction so future puzzle work can stay consistent.

## Core structure

```text
Header
Status
Board
Gameplay
New puzzle
```

The exact visual arrangement may differ by puzzle and viewport, but the semantic hierarchy should remain stable.

## Core product rule: transient state does not own geometry

**Transiency has no authority to rewrite page or screen geometry.**

Temporary feedback should replace, overlay, tint, animate, or fade within already-established regions rather than inserting/removing layout that pushes the board or controls around.

Examples:

- Check feedback occupies a reserved status lane and fades away; the lane remains.
- Completion can transform the existing gameplay-control region into a solved presentation without collapsing the workspace.
- Disabled Undo/Redo controls remain in place rather than appearing and disappearing as history changes.
- Loading, copy confirmation, invalid-move feedback, and other short-lived events should not cause avoidable vertical or horizontal reflow.

Empty reserved space is acceptable. Do not fill it merely because it exists; breathing room is preferable to decorative or textual noise.

## Header

The header answers: "What am I playing?"

Use it for:

- puzzle title;
- a short description when useful;
- optional tags or category language.

Avoid putting primary controls here. The header should orient the player, not become a settings panel.

## Status semantics

Do not treat every message as the same kind of status. Distinguish three classes:

### Persistent game state

Facts that remain true until play changes them belong in stable dedicated geometry.

Examples:

- difficulty;
- progress;
- moves;
- attempts remaining;
- draw/redeal mode;
- current variant summary;
- solved/won/lost state.

### Transient event feedback

Short-lived acknowledgments should occupy established geometry, then fade or clear without changing layout.

Examples:

- "Looks good so far";
- invalid move;
- no moves to undo;
- seed copied;
- localized validation errors.

Repeated events may restart their presentation timer. Editing or a newer event may replace stale feedback.

### Instructions and help

Rules, explanations, and behavioral descriptions are neither game state nor event feedback. Prefer opt-in help (`i`, details, tooltips, accessible descriptions) instead of permanently occupying play-space geometry.

Seed is not gameplay status. It is reproducibility/generation metadata and belongs with the New-puzzle model.

## Board

The board is the primary visual object on the screen.

Every puzzle should be laid out around the game surface first. Controls should not crowd the board, push it into an awkward shape, or cause avoidable layout shifts while work happens.

Completion should normally read as a state transformation of the existing workspace, not navigation to a miniature results screen.

## Gameplay controls: current puzzle

Gameplay controls act on the puzzle being played and belong closest to the board.

Examples:

- Check / Submit;
- Undo;
- Redo;
- Reset;
- Draw;
- Auto foundation;
- Hint, once supported.

### Action history

Where the mechanic admits a meaningful reversible action, prefer both Undo and Redo.

**Undo reverses a completed player intention, not every internal state mutation.**

Examples:

- one Sudoku/Futoshiki cell edit = one action;
- one Nonogram mark change = one action;
- one Tile Swap exchange = one action;
- one Sliding Puzzle slide = one action;
- one Jigsaw drag-and-release = one action, regardless of pointer-motion events.

Selection/focus changes should not normally create history entries. Puzzle identity changes clear action history. Submitted Word Guess rows may deliberately form an irreversible boundary because submission reveals game information.

## New puzzle: prospective identity

The New-puzzle surface configures or creates another puzzle. It should not silently mutate the active puzzle.

The platform grammar is:

- the closed primary New action starts a random puzzle using the remembered/prospective settings;
- an adjacent disclosure opens prospective configuration;
- changing prospective difficulty, size, variant, artwork, or other identity settings does not alter the current puzzle;
- Random, Today, and entered Seed are alternate creation actions using the prospective settings;
- the current puzzle seed is read-only/shareable reference state;
- a separate editable seed represents the puzzle to load;
- Reset remains outside New because it acts on the current puzzle.

Puzzle-specific configuration is expected, but the interaction grammar should remain recognizable across puzzle types.

Image-backed puzzles may need a deliberate migration from immediate configuration to prospective configuration before adopting this model; do not disguise immediate regeneration with New-puzzle styling.

## Today and future calendar behavior

Today is a creation action, not a mode toggle. Prefer a compact calendar-date control whose visible date is derived from the same local-date basis as the daily puzzle identity.

The day number should dominate; a compact month label may help distinguish the control from an arbitrary numbered button. The accessible label should name the full date.

If the app remains open across local midnight, the displayed date and the daily seed must roll over together. A future calendar/archive modal may grow from this control without changing Today's immediate-action semantics.

## Visual language

Prefer graphical controls for conventional actions while keeping choices and data textual.

**Actions are graphical. Choices and data remain legible.**

Good icon candidates include:

- die: new random puzzle;
- chevron: New-puzzle options;
- live calendar-date tile: Today;
- play/forward: load entered seed;
- overlapping rectangles: copy;
- curved arrows: Undo / Redo;
- verification mark: Check;
- restart/circular arrow: Reset;
- circled `i`: contextual explanation;
- corners: fullscreen;
- `x`: close/exit.

Do not replace meaningful values such as Easy/Medium/Hard, Standard/Diagonal/Zero Killer, dimensions, seed values, or puzzle variants with obscure pictograms.

Icon controls require accessible names and, where useful, titles/tooltips. Use a consistent SVG language rather than emoji as production controls.

## Completion

When correctness is unambiguous, recognize completion automatically rather than requiring a redundant Check.

Completion may use a brief puzzle-wide acknowledgment because the whole puzzle is relevant to the event. Afterward, settle into a calm solved state in the same workspace geometry.

The solved state should preserve the completed result, suppress editing where appropriate, and offer a clear next action. It should not depend on presentation copy as its source of truth.

## Stability checklist

Prefer:

- keeping the current puzzle mounted while a replacement generates;
- disabling controls rather than inserting/removing them;
- preserving scroll position during regeneration;
- reserving bounded space for transient feedback;
- keeping current-puzzle control geometry stable through validation and completion;
- avoiding sidebar/header jumps;
- avoiding momentary empty states unless the puzzle truly changed type.

Motion should communicate state, not distract from play.

## Consistency

Different puzzles may expose different mechanics, but they should use the same hierarchy.

A player should learn the structure once:

1. orient to the puzzle;
2. inspect persistent game state;
3. play the board;
4. use stable current-puzzle actions;
5. configure or create the next puzzle through the New command.

When in doubt: play first, current-puzzle actions second, next-puzzle configuration third.
