# App runtime boundaries

`src/App.tsx` is the composition root for puzzle navigation and runtime coordination. Gameplay mutation, generation lifecycle, persistence, and puzzle-specific workspace behavior belong behind narrower boundaries.

## Current shape

```text
src/app/usePuzzleGeneration.ts
src/app/usePuzzleSessions.ts
src/app/useNextPuzzleDrafts.ts
src/app/useGridController.ts
src/app/useSolitaireController.ts
src/components/PuzzleWorkspace.tsx
src/components/SudokuWorkspace.tsx
src/components/GridPuzzleWorkspace.tsx
src/components/SolitaireWorkspace.tsx
```

### `App.tsx`

Owns coordination rather than puzzle mechanics:

- route and puzzle selection;
- current generated puzzle identity;
- orchestration between generation, sessions, and controllers;
- prospective-generation actions such as New puzzle, Today, and Load seed;
- capability groups passed to the workspace dispatcher.

It should not own grid mutation rules, card-move rules, persistence representation, or puzzle-specific workspace presentation.

### `usePuzzleGeneration`

Owns:

- worker lifetime;
- active request identity;
- request construction;
- cancellation and rejection of stale worker responses;
- generation-in-progress state.

A worker response is valid only while its request remains the active request.

### `usePuzzleSessions`

Owns:

- runtime session cache;
- pending persisted-session restoration;
- cloning at the session boundary;
- persistence schema calls.

The generated puzzle is authoritative for current puzzle identity. Runtime sessions store progress and controller state rather than duplicate seed, dimensions, difficulty, or variation.

### `useNextPuzzleDrafts`

Owns prospective settings separately from the current puzzle. Editing a draft does not mutate or replace the puzzle being played.

### `useGridController`

Owns grid interaction state and mutation, including numeric selection/input, Nonogram toggling, Peg Solitaire moves, and answer checking. Its public API exposes operations rather than raw state setters.

### `useSolitaireController`

Owns card stacks, selection, stats, history, stock/waste behavior, moves, and completion checks. Its public API exposes gameplay/session operations rather than internal mutation helpers.

### Workspace dispatcher

`PuzzleWorkspace` dispatches by puzzle type and forwards explicit capability groups. Concrete workspaces receive only the capabilities they consume:

- Sudoku: core + prospective generation + grid interaction;
- grid puzzles: core + prospective generation + grid interaction;
- Klondike: core + prospective generation + Solitaire interaction;
- image-backed immediate workspaces: core + immediate generation.

This avoids a universal workspace prop bag becoming an implicit dependency surface.

## Invariants

- Current puzzle identity comes from the generated puzzle.
- Prospective settings never masquerade as current-puzzle metadata.
- Presentation strings are not machine-readable state.
- Late or cancelled worker responses cannot replace the active puzzle.
- Persisted data is validated at the storage boundary before restore code consumes it.
- New puzzle types should extend explicit capability boundaries rather than adding puzzle-specific conditionals throughout `App.tsx`.

## Remaining restraint

Some image-backed workspaces still use immediate-generation semantics. Do not collapse that distinction merely to make types or components look uniform; change it only as an intentional product decision.
