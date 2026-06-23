# App decomposition plan

`src/App.tsx` has become the orchestration point for too many runtime concerns. Before adding more Solitaire variation behavior, split these concerns into narrower modules.

## Current problem

`App.tsx` owns all of the following:

- view and catalog state;
- puzzle generation request lifecycle;
- persisted session cache and restoration;
- grid cell mutation and checking;
- Solitaire stack mutation;
- Solitaire stock/waste draw behavior;
- Solitaire undo/redo history;
- Solitaire completion state;
- rendering glue for `PuzzleWorkspace`.

That makes feature work, especially Solitaire variation selection, too expensive and too risky.

## Target shape

Prefer decomposing by runtime concern instead of by arbitrary helper size.

```text
src/app/usePuzzleGeneration.ts
src/app/usePuzzleSessions.ts
src/app/useGridController.ts
src/app/useSolitaireController.ts
src/components/SolitaireSettings.tsx
```

### `usePuzzleGeneration`

Owns:

- worker setup;
- active request ID;
- generation request construction;
- worker response handling;
- `isGenerating` and generation status messages.

### `usePuzzleSessions`

Owns:

- runtime session cache;
- persisted session loading;
- session restore;
- save-current-session behavior;
- persistence schema calls.

### `useGridController`

Owns:

- selected grid cell;
- cell input normalization;
- Sudoku cell selection;
- Nonogram cell toggling;
- Peg Solitaire jump handling;
- grid answer checking.

### `useSolitaireController`

Owns:

- card stacks;
- selected card;
- Solitaire stats;
- undo/redo stacks;
- stock draw behavior;
- waste redeal behavior;
- stack/card click handling;
- auto-foundation behavior;
- completion detection.

### `SolitaireSettings`

Owns UI for:

- draw mode: Draw 1 / Draw 3;
- redeals: Unlimited / 3 / 1 / None;
- `knownSolvable` display/copy.

## Sequencing

1. Extract Solitaire controller from `App.tsx` without changing gameplay.
2. Extract grid controller from `App.tsx` without changing gameplay.
3. Extract generation/session orchestration.
4. Add #60 Solitaire variation selection into the extracted Solitaire boundary.

## Non-goals for the decomposition PR

- No solver-backed Solitaire generation.
- No gameplay rule changes.
- No persistence schema migration unless strictly required by the extracted code.
- No UI redesign beyond moving code to clearer boundaries.
