# Puzzle Forge Roadmap

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

Future puzzle modules should declare capabilities such as:

- validation;
- undo;
- variants;
- daily puzzle;
- sharing;
- solver;
- hints.

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

The long-term generator loop:

```text
Generate
Validate
Solve
Rate difficulty
Return playable puzzle
```

## Guiding principle

Adding puzzle number 50 should feel structurally similar to adding puzzle number 5.
