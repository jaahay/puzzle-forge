# Puzzle Forge Evolution Plan

This is a working guide, not a promise.

## Phase 1: Stabilize current puzzles

- Home refresh stays on Home.
- Generation keeps the current puzzle mounted when possible.
- Buttons keep stable labels while generating.
- Scroll does not jump during Check or Generate.
- Solitaire foundation behavior is correct.
- Sudoku controls have enough room.

## Phase 2: Adopt the workspace layout

Move existing puzzles toward the shared hierarchy:

```text
Header
Status
Board
Gameplay
Generation
```

Use `PuzzleWorkspaceLayout` as the migration target.

## Phase 3: Extract shared controls

Create shared controls for repeated concepts:

- seed;
- copy seed;
- difficulty;
- size;
- generation actions;
- gameplay toolbar;
- validation message;
- variant controls.

## Phase 4: Generalize puzzle capabilities

Future puzzle modules should declare capabilities such as validation, undo, variants, daily puzzle, sharing, solver, and hints.

Implementation-ready planning docs:

- [Jigsaw Roadmap](./jigsaw-roadmap.md) tracks image sourcing, image slicing, edge-profile, and custom-edge rendering work.
- [Solitaire Mobile Roadmap](./solitaire-mobile-roadmap.md) tracks phone-sized Klondike layout and touch ergonomics.
- [Word Guess Roadmap](./word-guess-roadmap.md) tracks Word Guess product polish, difficulty, completion feedback, and share/history integration.
- [Daily, History, and Share Roadmap](./daily-history-share-roadmap.md) tracks the cross-puzzle daily puzzle loop, completion history, and spoiler-safe sharing.
- [Puzzle Capability Model](./puzzle-capabilities.md) tracks shared capability declarations and the meaning of `playable`, `prototype`, and `planned`.

## Phase 5: Expand the catalog

Good early additions:

1. Sudoku variants
2. Futoshiki
3. Takuzu
4. Hitori
5. Akari
6. Tents
7. FreeCell

## Phase 6: Solver and generator quality

The long-term generator loop is generate, validate, solve, rate difficulty, and return a playable puzzle.

## Guiding principle

Adding puzzle number 50 should feel structurally similar to adding puzzle number 5.
