# Board Primitives

Most future Puzzle Forge puzzles can be represented by a small set of board primitives.

The goal is not to build every primitive immediately. The goal is to keep current UI work compatible with them.

## Core primitive families

## Grid board

For cell-based puzzles.

Examples:

- Sudoku
- Nonogram
- Kakuro
- Futoshiki
- Takuzu
- Hitori
- Akari
- Tents

Likely needs:

- cells;
- coordinates;
- locked/given state;
- notes or marks;
- row/column clues;
- region overlays;
- keyboard entry;
- touch controls.

## Card board

For stack-based card puzzles.

Examples:

- Klondike
- FreeCell
- Spider
- Pyramid
- Golf

Likely needs:

- stacks;
- cards;
- drag or click selection;
- legal drop targets;
- undo/redo;
- move counters;
- variant summaries.

## Tile board

For position-based tile puzzles.

Examples:

- sliding puzzle;
- jigsaw-like generated puzzle;
- tangram;
- polyomino packing.

Likely needs:

- pieces;
- target positions;
- current positions;
- drag or click movement;
- solved-state validation.

## Graph or path board

For line, edge, path, or connection puzzles.

Examples:

- Slitherlink
- Numberlink
- Hashi
- Masyu
- Flow-style paths
- mazes

Likely needs:

- nodes;
- edges;
- selectable line segments;
- path validation;
- crossing rules;
- connected-component checks.

## Region board

For puzzles defined by irregular areas.

Examples:

- Jigsaw Sudoku
- Killer Sudoku
- Star Battle
- Shikaku
- Fillomino
- Suguru

Likely needs:

- region definitions;
- region styling;
- clue labels;
- overlays;
- region-level validation.

## Direction

Start by making current grid, card, and tile rendering cleaner.

Do not overbuild graph or region primitives until a specific puzzle requires them.
