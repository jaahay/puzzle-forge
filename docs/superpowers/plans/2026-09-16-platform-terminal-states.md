# Platform Terminal States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish issue #113 by giving every currently generatable puzzle coherent terminal-state semantics, automatic completion where correctness is authoritative, transient grid validation, and a consistent New-puzzle continuation.

**Architecture:** Keep terminal truth puzzle-local and derivable. Add one tiny shared semantic model and one reusable terminal dock; adapt each existing workspace without introducing a central puzzle-state controller. Continue using `usePuzzleCompletionPresentation` only for successful transient presentation, never as persisted gameplay truth.

**Tech Stack:** TypeScript 5.8, Preact 10, Vitest 3, Vite 7, CSS.

**Spec:** `docs/superpowers/specs/2026-09-16-platform-terminal-states-design.md`

## Global Constraints

- Terminal gameplay meaning is `playing | solved | failed`; presentation animation is separate.
- Do not persist a second terminal flag where authoritative puzzle state can derive it.
- Word Guess `won` maps to solved and `lost` maps to failed; failure never uses affirmative celebration.
- Crown and board geometry remain stable; the existing gameplay region transforms in place.
- New puzzle is the primary terminal continuation; Reset/Retry and Share remain puzzle-specific secondary actions.
- Nonogram and Futoshiki Check feedback must be transient.
- Do not absorb action-history rollout (#140), guaranteed-solvable Solitaire (#60), fullscreen work, planned puzzle families, or unrelated workspace redesign.

---

### Task 1: Shared terminal semantics and terminal dock

**Files:**
- Create: `src/app/puzzleTerminalState.ts`
- Create: `src/app/puzzleTerminalState.test.ts`
- Create: `src/components/PuzzleTerminalDock.tsx`
- Test: `src/app/puzzleTerminalState.test.ts`

**Interfaces:**
- Produces `PuzzleTerminalState = { kind: "playing" } | { kind: "solved" } | { kind: "failed"; message?: string }`.
- Produces `PuzzleTerminalDock` with `state`, `label`, `onNewPuzzle`, optional `onReset`, `resetLabel`, `children`, `disabled`, and accessible-label props.

- [ ] **Step 1: Write the failing semantic test**

```ts
import { describe, expect, it } from "vitest";
import { failedTerminalState, playingTerminalState, solvedTerminalState } from "./puzzleTerminalState";

describe("puzzle terminal state", () => {
  it("keeps playing, solved, and failed outcomes semantically distinct", () => {
    expect(playingTerminalState).toEqual({ kind: "playing" });
    expect(solvedTerminalState).toEqual({ kind: "solved" });
    expect(failedTerminalState("No match")).toEqual({ kind: "failed", message: "No match" });
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `pnpm test -- src/app/puzzleTerminalState.test.ts`
Expected: FAIL because `puzzleTerminalState` does not exist yet.

- [ ] **Step 3: Add the minimal semantic module**

```ts
export type PuzzleTerminalState =
  | { kind: "playing" }
  | { kind: "solved" }
  | { kind: "failed"; message?: string };

export const playingTerminalState: PuzzleTerminalState = { kind: "playing" };
export const solvedTerminalState: PuzzleTerminalState = { kind: "solved" };
export const failedTerminalState = (message?: string): PuzzleTerminalState => ({ kind: "failed", ...(message ? { message } : {}) });
```

- [ ] **Step 4: Add `PuzzleTerminalDock` as presentation only**

Render existing `.completion-dock` structure. Use ✓ for solved and a neutral end-state mark for failed, render supplied copy, optional secondary Reset/Retry and puzzle-specific children, and always render `New puzzle` as `.new-puzzle-primary`. Do not derive terminal state inside this component.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `pnpm test -- src/app/puzzleTerminalState.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add shared puzzle terminal semantics`

---

### Task 2: Grid-family automatic completion and transient validation

**Files:**
- Modify: `src/interactions/gridChecking.ts`
- Modify: `src/interactions/gridChecking.test.ts`
- Modify: `src/app/useGridController.ts`
- Modify: `src/app/useGridController.test.ts`
- Modify: `src/components/GridPuzzleWorkspace.tsx`
- Modify: `src/components/FutoshikiBoard.tsx` only if an explicit disabled/read-only prop is needed; otherwise suppress mutation through wrapped workspace callbacks.
- Test: `src/interactions/gridChecking.test.ts`
- Test: `src/app/useGridController.test.ts`

**Interfaces:**
- Produces a pure `isGridPuzzleSolved(puzzle, cells)` helper that uses Nonogram clue semantics for Nonogram and answer-key assessment for Sudoku/Futoshiki.
- `GridPuzzleWorkspace` derives solved state from current puzzle/cells, never status copy.

- [ ] **Step 1: Extend `gridChecking.test.ts` with failing Nonogram/Futoshiki solved-state tests**

Add fixtures showing:
- Futoshiki returns solved only for the complete correct answer.
- Nonogram returns solved when current filled cells produce all target row/column clues, even without pressing Check.
- Incomplete/wrong boards return false.

- [ ] **Step 2: Run focused grid checking test and verify RED**

Run: `pnpm test -- src/interactions/gridChecking.test.ts`
Expected: FAIL because the shared grid solved helper is absent.

- [ ] **Step 3: Implement the pure solved helper**

Refactor the existing Nonogram clue comparison into a reusable pure predicate and expose one solved predicate used by workspaces/controllers. Keep Sudoku semantics unchanged.

- [ ] **Step 4: Add failing controller-helper tests for transient Futoshiki/Nonogram validation reset semantics**

Extend `useGridController.test.ts` so `clearGridValidationTone` is explicitly verified to return ordinary persistent tones for Futoshiki and Nonogram after Check feedback expires/after editing.

- [ ] **Step 5: Generalize the Sudoku-only transient feedback timer**

In `useGridController.ts`:
- generalize the validation timer to applicable grid puzzles;
- clear stale validation on a new edit;
- schedule automatic tone/message reset after Check for Sudoku, Nonogram, and Futoshiki;
- after Futoshiki entry or Nonogram toggle, detect authoritative solve and emit semantic success message/clear selection where appropriate;
- block further Futoshiki/Nonogram mutation when the current board is already solved;
- preserve existing Sudoku timings and behavior.

- [ ] **Step 6: Convert `GridPuzzleWorkspace` to terminal-aware presentation**

For Nonogram/Futoshiki:
- derive `isSolved` from puzzle/cells;
- use `usePuzzleCompletionPresentation` for successful transition;
- record causative input through wrapped cell callbacks;
- disable/suppress active board mutation once solved;
- replace Check/Reset active controls with `PuzzleTerminalDock` after completion settles;
- keep Reset secondary and New puzzle primary;
- keep Check and its reserved transient validation lane during active play.

Do not route Word Guess through these grid-completion rules.

- [ ] **Step 7: Run grid tests and typecheck**

Run: `pnpm test -- src/interactions/gridChecking.test.ts src/app/useGridController.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

Commit message: `feat: complete grid terminal-state rollout`

---

### Task 3: Word Guess solved/failed terminal presentation

**Files:**
- Modify: `src/components/WordGuessGame.tsx`
- Modify: `src/components/GridPuzzleWorkspace.tsx`
- Create or modify focused Word Guess terminal tests under `src/games/wordGuess/` or `src/components/` depending on the extracted pure mapper.

**Interfaces:**
- Produces a pure mapper `getWordGuessTerminalState(status, message?)` returning the shared semantic type.
- `WordGuessGame` consumes `onNewPuzzle` and renders the shared terminal dock locally because its authoritative `playing | won | lost` state is local and persisted there.

- [ ] **Step 1: Write failing mapping tests**

```ts
expect(getWordGuessTerminalState("playing").kind).toBe("playing");
expect(getWordGuessTerminalState("won").kind).toBe("solved");
expect(getWordGuessTerminalState("lost", "No match")).toEqual({ kind: "failed", message: "No match" });
```

Also verify restored `won`/`lost` statuses map identically.

- [ ] **Step 2: Run focused test and verify RED**

Expected: FAIL because the mapper does not exist.

- [ ] **Step 3: Implement the mapper and terminal action swap**

Keep Word Guess status authoritative. During `playing`, preserve Submit/Reset/Share behavior. During `won` or `lost`, render `PuzzleTerminalDock` instead of Submit, with:
- outcome message retained above the board;
- Reset labeled Retry as secondary;
- Share retained as puzzle-specific terminal action when at least one row was submitted;
- New puzzle primary;
- no success animation for `lost`.

- [ ] **Step 4: Pass `onNewPuzzle` from `GridPuzzleWorkspace`**

Do not lift Word Guess persisted status into app-global state.

- [ ] **Step 5: Run Word Guess tests and typecheck**

Run: `pnpm test -- src/games/wordGuess src/components && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: model Word Guess terminal outcomes`

---

### Task 4: Solitaire authoritative solved state

**Files:**
- Create: `src/app/solitaireTerminal.ts`
- Create: `src/app/solitaireTerminal.test.ts`
- Modify: `src/components/SolitaireWorkspace.tsx`
- Modify: `src/components/CardPuzzlePreview.tsx`

**Interfaces:**
- Produces `isSolitaireSolved(stacks: CardStack[] | null): boolean`, true only when foundation stacks contain 52 cards.
- `CardPuzzlePreview` gains `disabled?: boolean` so terminal Solitaire cannot mutate through board controls.

- [ ] **Step 1: Write failing authoritative solved-state tests**

Test zero/partial foundation counts as false and exactly 52 foundation cards as true; ignore status-message text entirely.

- [ ] **Step 2: Run focused test and verify RED**

Expected: FAIL because `solitaireTerminal.ts` does not exist.

- [ ] **Step 3: Implement `isSolitaireSolved`**

Use only stack roles/card counts.

- [ ] **Step 4: Add terminal disable behavior to `CardPuzzlePreview`**

When disabled, all card/placeholder buttons are disabled and no click/double-click/stack action can fire. Preserve ordinary behavior while active.

- [ ] **Step 5: Adapt `SolitaireWorkspace`**

Derive solved state from `cardStacks`; hide the active Undo/Redo/Auto-foundation/Reset toolbar when solved; pass `disabled={isSolved}` to the card board; add `PuzzleTerminalDock` in the workspace gameplay region with Reset secondary and New puzzle primary. Do not inspect `statusMessage` to decide terminal state.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `pnpm test -- src/app/solitaireTerminal.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: surface Solitaire solved state`

---

### Task 5: Jigsaw completion channel and shared solved dock

**Files:**
- Modify: `src/components/TilePuzzlePreview.tsx`
- Modify: `src/components/TilePuzzlePreview.test.ts`
- Modify: `src/components/JigsawWorkspace.tsx`
- Modify: `src/components/JigsawWorkspace.test.ts`
- Modify: `src/components/TilePuzzlePreview.css` or `src/site/jigsaw.css` only for a restrained completion-phase treatment if existing styles do not already provide one.

**Interfaces:**
- `TilePuzzlePreview` gains optional `completionPhase`, `onCausativeInput`, `onCompletionAnimationEnd`, and `onSolvedChange` props mirroring the existing image-tile preview boundary.
- Jigsaw workspace owns only the callback-observed solved boolean for the current puzzle instance; placement state remains authoritative inside `TilePuzzlePreview`.

- [ ] **Step 1: Write failing completion-channel tests**

Add a pure/exported helper if needed so tests verify that all placements snapped means solved and partial placement does not. Add a Jigsaw workspace contract test that the preview exposes an `onSolvedChange` channel rather than duplicating placement rules in the workspace.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm test -- src/components/TilePuzzlePreview.test.ts src/components/JigsawWorkspace.test.ts`
Expected: FAIL on missing completion interface/helper.

- [ ] **Step 3: Surface solved changes and causative input**

Inside `TilePuzzlePreview`, continue deriving `isSolved` from placements. Notify `onSolvedChange` when semantic completion changes. Record causative input on the completed drag/drop action that can produce the final snap. Keep the existing `isSolved` drag guard so completed pieces cannot move.

- [ ] **Step 4: Adapt `JigsawWorkspace`**

Track solved state scoped by current puzzle id, feed it to `usePuzzleCompletionPresentation`, pass completion callbacks to the preview, and replace the ordinary Reset gameplay row with `PuzzleTerminalDock` after successful completion. Reset must clear observed solved state and scatter the same puzzle; New puzzle is primary.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `pnpm test -- src/components/TilePuzzlePreview.test.ts src/components/JigsawWorkspace.test.ts && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: surface Jigsaw completion`

---

### Task 6: Converge Tile Swap / Sliding and Sudoku on the shared dock

**Files:**
- Modify: `src/components/ImageTilePuzzleWorkspace.tsx`
- Modify: `src/components/SudokuWorkspace.tsx`
- Modify: focused component contract test(s), preferably `src/components/NewPuzzleRollout.test.ts` or a new `PuzzleTerminalRollout.test.ts`.

**Interfaces:**
- No new gameplay semantics. Existing solved detection and completion animation stay authoritative.
- Replace duplicated `.completion-dock` markup with `PuzzleTerminalDock` without changing animation timing, Sliding final-gap reveal, Sudoku focus staging, or Reset availability.

- [ ] **Step 1: Write a failing rollout contract test**

Assert that Sudoku and image-tile workspaces consume the shared terminal dock and no longer own duplicate terminal-dock markup, while Jigsaw/Grid/Solitaire/Word Guess use the same shared component where terminal UI exists.

- [ ] **Step 2: Run focused rollout test and verify RED**

Expected: FAIL while duplicated markup remains.

- [ ] **Step 3: Replace duplicated dock markup**

Preserve all existing phase/focus wrappers and callbacks; only consolidate the terminal dock structure.

- [ ] **Step 4: Run component tests and typecheck**

Run: `pnpm test -- src/components && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `refactor: converge puzzle terminal presentation`

---

### Task 7: Full validation, docs alignment, and PR

**Files:**
- Modify: `docs/ui/puzzle-workspace-layout.md` only if implementation introduces terminology not already captured there.
- Modify: issue/PR metadata only through GitHub metadata actions.

**Interfaces:** None.

- [ ] **Step 1: Run complete test suite**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 2: Run typecheck and production build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS with no TypeScript or Vite build failures.

- [ ] **Step 3: Review the complete diff against the spec**

Confirm every generatable family is covered, no terminal truth is derived from status copy, and #140/#60/planned-puzzle scope did not leak into the branch.

- [ ] **Step 4: Open PR against `main`**

Title: `Roll out platform terminal-state semantics`

Body must summarize the shared model and family-specific rollout, list validation performed, and include `Fixes #113` only after all #113 acceptance criteria are satisfied.

- [ ] **Step 5: Verify exact PR head and CI**

Wait for the PR-triggered `CI / Test, typecheck, and build` workflow on the exact head SHA. Inspect the run/jobs and require success before declaring the PR merge-ready.

- [ ] **Step 6: Do not merge without explicit user instruction**

Report the PR, exact head SHA, test/build evidence, and any known residual risks. Leave the PR open for review.
