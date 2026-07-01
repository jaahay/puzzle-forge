# Puzzle Workspace Layout

Puzzle Forge treats each puzzle screen as a workspace. The board is the hero; surrounding UI should support playing, not compete with it.

This document is intentionally lightweight. It captures the product/layout direction so future puzzle work can stay consistent.

## Core structure

```text
Header
Status
Board
Gameplay
Generation
```

## Header

The header answers: "What am I playing?"

Use it for:

- puzzle title;
- a short description when useful;
- optional tags or category language.

Avoid putting primary controls here. The header should orient the player, not become a settings panel.

## Status

Status answers: "What is true about this current puzzle?"

Good status examples:

- difficulty;
- progress;
- moves;
- draw mode;
- redeal limit;
- current variant summary;
- solvability state, such as "not verified".

Seed is not status. It is reproducibility/configuration metadata and belongs with generation controls.

## Board

The board is the primary visual object on the screen.

Every puzzle should be laid out around the game surface first. Controls should not crowd the board, push it into an awkward shape, or cause avoidable layout shifts while generation is running.

## Gameplay controls

Gameplay controls belong closest to the board because they are used during play.

Examples:

- Check;
- Submit;
- Undo;
- Redo;
- Draw;
- Auto foundation;
- Hint, once supported.

These should feel like part of the play surface. They are higher priority than generation controls.

## Generation and configuration

Generation controls create or configure the next puzzle. They are useful, but less heroic than gameplay.

Examples:

- seed;
- copy seed;
- difficulty;
- size;
- variants;
- unique-solution mode;
- Today;
- Use seed;
- Random / Randomize.

The seed should be displayed here with a compact copy affordance. Prefer an icon-style copy button once the icon system is in place.

## Variants

Some puzzles have variant controls that are more important than ordinary generation settings but still define the next puzzle identity.

Examples:

- Solitaire draw mode;
- Solitaire redeal limit;
- Solitaire waste mode;
- future Sudoku variants.

Treat these as generation/configuration controls unless changing them can safely apply to the current active puzzle without changing identity. If changing a variant regenerates the puzzle, keep it with generation.

## Stability

The workspace should remain visually stable while work happens.

Prefer:

- keeping the current puzzle mounted while a replacement generates;
- disabling controls rather than changing their labels;
- preserving scroll position during regeneration;
- avoiding sidebar/header jumps;
- avoiding momentary empty states unless the puzzle truly changed type.

Motion should communicate state, not distract from play.

## Consistency

Different puzzles may expose different mechanics, but they should use the same hierarchy.

A player should learn the structure once:

1. read the header;
2. inspect current puzzle facts;
3. play the board;
4. use nearby gameplay controls;
5. configure or generate the next puzzle below that.

When in doubt: play first, configuration second.
