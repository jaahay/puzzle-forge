# Platform Terminal States Design

## Context

Issue #113 establishes a platform distinction between transient validation feedback and durable puzzle completion. Sudoku already implements the intended interaction semantics and serves as the reference. This design completes the platform follow-up across every currently generatable puzzle whose terminal state is objectively knowable: Sudoku, Nonogram, Futoshiki, Word Guess, Klondike Solitaire, Jigsaw, Tile Swap, and Sliding Puzzle.

Logic Grid and Peg Solitaire are excluded because the product catalog still marks them planned even though generator code exists.

## Goals

- Give current puzzle families one lightweight terminal-state vocabulary without introducing a universal puzzle-state framework.
- Automatically recognize success when authoritative puzzle state makes completion unambiguous.
- Represent unsuccessful terminal outcomes distinctly from solved outcomes.
- Preserve each puzzle's completed or failed result until Reset or New puzzle.
- Transform the existing gameplay region in place instead of navigating away or changing crown geometry.
- Reuse shared terminal presentation structure while preserving puzzle-specific mechanics, copy, animation, and persistent gameplay feedback.
- Finish the validation half of #113 for Nonogram and Futoshiki so explicit Check feedback is transient rather than a persistent board mode.

## Non-goals

- Action-history rollout (#140).
- Guaranteed-solvable Solitaire deals (#60).
- Fullscreen or immersive-mode redesign.
- New puzzle types.
- General workspace redesign unrelated to terminal-state semantics.
- Completion semantics for catalog entries that remain planned.
- Identical animations or wording across puzzle families.

## Semantic model

Introduce a small shared durable semantic type:

```ts
type PuzzleTerminalState =
  | { kind: "playing" }
  | { kind: "solved" }
  | { kind: "failed"; message?: string };
```

This type represents gameplay meaning, not animation phase. Each puzzle remains authoritative for deriving its own terminal state. Do not serialize this state when it can be derived from authoritative puzzle progress.

The existing completion-presentation lifecycle remains transient presentation state. Successful transitions may pass through the existing `playing -> settling -> celebrating -> completed` sequence. Failed outcomes do not use the affirmative completion animation; they settle directly into their calm terminal presentation.

## Shared terminal presentation

Extract the repeated terminal workspace UI into a small shared component such as `PuzzleTerminalDock`.

It owns only common structure:

- solved or failed semantic tone;
- outcome copy;
- primary **New puzzle** action;
- optional secondary **Reset / Retry** action;
- optional puzzle-specific actions such as Word Guess **Share**.

It does not decide whether a puzzle is solved or failed and does not own puzzle mechanics.

The crown remains stable. The board remains mounted. The existing gameplay-control region transforms in place into the terminal presentation. Transient effects must not change workspace geometry.

## Puzzle behavior

### Sudoku

Sudoku remains the reference implementation. Preserve its existing derived solved state, automatic completion, completion animation, input suppression, focus handling, and calm solved presentation. Migrate only the repeated dock markup into the shared terminal component where that reduces duplication without changing behavior.

### Nonogram

Derive solved state continuously from the current grid and authoritative clue semantics. Completing the correct picture immediately enters `solved`; a final Check is not required.

During active play, Check remains explicit validation. Incorrect validation styling is transient and must clear back to normal persistent board tones. Once solved, editing/toggling is suppressed, Check is no longer an active gameplay action, the solved board is preserved, and the gameplay region presents the shared solved dock. Reset may replay the same puzzle as a secondary action; New puzzle is primary.

### Futoshiki

Derive solved state continuously from current cells and the authoritative answer key. The final correct entry immediately enters `solved`.

During active play, Check remains explicit validation. Incorrect validation styling is transient and must clear rather than becoming durable puzzle state. Once solved, numeric entry is suppressed, selection is cleared, Check is no longer active, and the shared solved dock replaces the active gameplay controls. Reset remains secondary; New puzzle is primary.

### Word Guess

Word Guess keeps its existing internal progress status as authoritative game state and maps it to the shared semantic model:

- `playing -> playing`
- `won -> solved`
- `lost -> failed`

Both terminal outcomes lock ordinary letter entry and Submit. A solved outcome preserves `Solved in N/M` semantics. A failed outcome preserves answer reveal and does not use a success animation. Share remains available in terminal state where meaningful. New puzzle is primary. Reset is a secondary retry of the same answer.

Word Guess letter marks produced by submitted guesses remain persistent because they are intrinsic gameplay information, not transient validation decoration.

### Klondike Solitaire

Derive solved state from authoritative card stacks: all 52 cards on foundations. The workspace must consume this semantic fact rather than infer completion from status-message copy.

When solved, preserve the final layout and suppress further move actions. Undo, Redo, and Auto-foundation must not remain presented as active gameplay controls. The gameplay region becomes the shared solved dock. Reset may replay the same deal as a secondary action; New puzzle is primary.

No work in this issue may claim or expose guaranteed solvability; #60 remains authoritative for that concern.

### Jigsaw

`TilePuzzlePreview` already derives completion when every placement is snapped. Surface that semantic fact to `JigsawWorkspace` through a narrow callback or equivalent local interface rather than duplicating placement logic outside the board.

Use the shared successful completion-presentation lifecycle. Once solved, preserve the assembled image, keep pieces immovable, and transform the gameplay region into the shared solved dock. Reset scatters the same puzzle again; New puzzle is primary.

### Tile Swap and Sliding Puzzle

Keep their existing solved detection, completion animation, and solved-board behavior. Adapt their workspace state to the shared terminal-state vocabulary and replace bespoke terminal dock markup with the shared component where possible. Preserve Sliding Puzzle's final-gap reveal behavior.

## Validation semantics

Sudoku already satisfies the target behavior.

For Nonogram and Futoshiki:

- Check remains an explicit active-play validation action.
- Validation feedback must target the smallest useful affected area supported by the puzzle.
- Validation tones are transient and must clear automatically.
- Repeated Check actions may retrigger current feedback.
- Editing after validation clears stale transient feedback.
- A correct terminal board enters solved state through authoritative puzzle state, not through status-message text.

Do not add Check to Jigsaw, Tile Swap, Sliding Puzzle, Solitaire, or other mechanics that do not need it.

## State ownership and persistence

Do not persist a second terminal-state flag where completion can be recomputed:

- Sudoku, Futoshiki, Nonogram: derive from cells/clues/answer data.
- Jigsaw: derive from placements.
- Tile Swap / Sliding: derive from tile arrangement.
- Solitaire: derive from card stacks.

Word Guess may persist `won` / `lost` because submission history and attempt exhaustion are intrinsic game state and already belong in its progress record.

Transient validation and completion-presentation phases are never persisted.

## Focus, geometry, and accessibility

- Crown geometry remains stable through terminal transitions.
- Board remains mounted and visually authoritative.
- Gameplay controls and terminal dock occupy the same established gameplay region.
- Controls that cease to exist or become inactive must not strand keyboard focus.
- Reduced-motion preferences remain respected.
- New-puzzle generation should preserve the terminal board until the replacement puzzle is ready when existing workspace behavior supports that pattern.
- Terminal copy is announced accessibly without using copy as the source of truth for gameplay state.

## Testing

### Semantic tests

- Shared terminal state distinguishes `playing`, `solved`, and `failed`.
- Word Guess maps won and lost distinctly.
- Nonogram and Futoshiki derive solved state from authoritative board state.
- Solitaire derives solved state from foundation contents rather than status text.
- Jigsaw surfaces internal completion without duplicating placement rules.

### Workspace/component tests

- Solved state suppresses active gameplay controls that can mutate the finished puzzle.
- Failed Word Guess uses failed presentation and never the success animation.
- New puzzle is the primary terminal continuation.
- Reset / Retry and Share appear only where puzzle semantics require them.
- Existing Sudoku and image-tile completion geometry remains stable.

### Regression tests

- Final correct Nonogram/Futoshiki action automatically completes.
- Explicit Check still works during incomplete play.
- Transient validation clears automatically and does not persist into saved state.
- Solved puzzles cannot be accidentally edited afterward.
- Tile Swap and Sliding retain current completion effects.
- Jigsaw reset returns to active play after a solved state.
- Word Guess restored won/lost progress restores the correct terminal presentation.

## Acceptance criteria

- Every currently generatable puzzle has coherent `playing`, `solved`, and where applicable `failed` semantics.
- Every objectively knowable successful completion is recognized without a redundant final Check.
- Completed results remain visible and non-mutable until Reset or New puzzle.
- Word Guess loss is a first-class failed terminal state, not mislabeled as solved.
- New puzzle is the recognizable primary continuation from terminal state.
- Nonogram and Futoshiki validation feedback is transient rather than a persistent board-decoration mode.
- Terminal presentation never depends on matching status-message text.
- Shared code remains lightweight: semantic type + reusable terminal presentation + narrow puzzle adapters, not a central puzzle-state framework.
