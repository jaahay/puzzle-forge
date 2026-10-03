# Puzzle Capability Model

This document scopes a shared capability contract for Puzzle Forge puzzle modules.

## Goal

Make catalog status and puzzle behavior explicit so future feature work does not depend on ambiguous labels such as `playable`, `prototype`, or `planned` alone.

The capability model should answer:

- What can this puzzle do?
- Which controls should the workspace show?
- Which product loops does this puzzle participate in?
- What qualifies this puzzle to be marked `playable`?

## Source-of-truth areas

Likely files and modules:

- `src/catalog/types.ts`
- `src/catalog/puzzleCatalog.ts`
- `src/catalog/puzzleAvailability.ts`
- `src/games/registry.ts`
- `src/components/PuzzleCatalog.tsx`
- `src/components/PuzzleWorkspace.tsx`
- `src/components/PuzzleConfiguration.tsx`
- `src/app/usePuzzleGeneration.ts`
- `docs/architecture/evolution-plan.md`
- `docs/architecture/board-primitives.md`
- `docs/architecture/workspace-framework.md`

## Non-goals

- Do not migrate every puzzle to a perfect plugin architecture in the first slice.
- Do not remove `status` until a compatibility path exists.
- Do not make capability declarations so abstract that simple puzzles become hard to add.
- Do not block near-term Jigsaw, Solitaire, or Word Guess work on full capability generalization.

## Current problem

Catalog status currently communicates broad readiness:

```ts
type PuzzleStatus = "playable" | "prototype" | "planned";
```

That status is useful, but too coarse. A puzzle can be playable while lacking share, daily, undo, variants, hints, solver metadata, or completion history. A prototype can be generatable and interactive but not ready for daily/history/share.

## Proposed capability shape

Add a capability declaration either directly to `PuzzleDefinition` or through a parallel registry keyed by `PuzzleId`.

```ts
type PuzzleCapability =
  | "generatable"
  | "interactive"
  | "checkable"
  | "completion"
  | "resumable"
  | "resettable"
  | "daily"
  | "share"
  | "history"
  | "hints"
  | "undo"
  | "redo"
  | "variants"
  | "difficulty"
  | "solverMetadata";

type PuzzleCapabilityDefinition = {
  puzzleId: PuzzleId;
  capabilities: PuzzleCapability[];
};
```

If richer metadata is needed later:

```ts
type PuzzleCapabilityDetails = {
  generatable?: true;
  interactive?: true;
  checkable?: true;
  completion?: { resultKinds: Array<"solved" | "won" | "lost" | "completed"> };
  resumable?: { storage: "session" | "local" | "none" };
  daily?: { seedStrategy: "date" | "date-and-variant" };
  share?: { spoilerFree: true };
  variants?: { names: string[] };
};
```

Start simple unless the implementation needs richer details immediately.

## Status definitions

### Planned

A catalog entry with no usable in-browser interaction surface.

Minimum expectations:

- visible in catalog;
- disabled or clearly marked unavailable;
- no generation attempt unless a placeholder generator intentionally exists.

### Prototype

A puzzle that has enough implementation to preview or experiment with, but is not yet a complete product surface.

Minimum expectations:

- can generate or render something meaningful;
- may have partial interaction;
- may lack complete persistence, completion, mobile, validation, or tests;
- should not be presented as a finished daily/playable game.

### Playable

A puzzle that a normal user can start, interact with, finish or meaningfully complete, reset, and understand.

Minimum expectations:

- `generatable` or a clear non-generated start path;
- `interactive`;
- `resettable`;
- explicit completion or win/check state where the puzzle type has a finish condition;
- safe refresh/resume behavior or a deliberate no-resume product decision;
- mobile usability at supported dimensions;
- tests for generator and core game rules where practical.

## Workspace control mapping

Capabilities should drive workspace controls over time.

| Capability | Workspace implication |
| --- | --- |
| `generatable` | show seed/use/random controls |
| `difficulty` | show difficulty control or badge |
| `variants` | show variant selector/summary |
| `checkable` | show Check action |
| `completion` | show completion status/result |
| `resumable` | save/restore session or progress |
| `daily` | show Today action |
| `share` | show share action after eligible result |
| `hints` | show hint affordance |
| `undo` / `redo` | show undo/redo controls |

Do not force all mappings in the first implementation. The table defines the direction.

## Phase 1: Declare capabilities

### Requirements

- Add a capability model in catalog types or a nearby module.
- Add declarations for current catalog puzzles.
- Keep existing `status` behavior working.
- Add helpers for querying capabilities.

### Suggested initial declarations

Approximate starting point:

- Sudoku: generatable, interactive, checkable, completion, resumable, resettable, daily, difficulty, variants.
- Nonogram: generatable, interactive, checkable, completion, resumable, resettable, daily, difficulty.
- Word Guess: generatable, interactive, checkable, completion, resumable, resettable, daily, share, difficulty, solverMetadata.
- Klondike Solitaire: generatable, interactive, completion, resumable, resettable, undo, redo, variants.
- Jigsaw current prototype: generatable, interactive, completion, resettable, resumable.
- Planned puzzles: no capabilities or only metadata-only capabilities if needed.

Adjust after inspecting actual behavior.

### Acceptance criteria

- Capability declarations compile.
- Existing catalog and workspace behavior remains unchanged unless intentionally improved.
- Tests cover helper behavior.

## Phase 2: Use capabilities in workspace branching

### Requirements

- Replace scattered puzzle-id checks where capability checks are clearer.
- Keep puzzle-specific renderers where needed.
- Avoid hiding required puzzle-specific controls behind overly generic abstractions.

### Acceptance criteria

- Workspace controls remain correct for Sudoku, Nonogram, Word Guess, Solitaire, and Jigsaw.
- Planned puzzles remain unavailable or clearly marked.
- No regression in generation, reset, check, or mobile control layout.

## Phase 3: Capability-driven product loops

Coordinate with `docs/architecture/daily-history-share-roadmap.md`.

### Requirements

- Daily UI only appears for puzzles with `daily`.
- Share UI only appears for puzzles with `share` and eligible result state.
- History records are created only for puzzles with `completion` and/or `history`.

### Acceptance criteria

- Puzzle capabilities explain why controls appear.
- No puzzle receives a misleading daily/share/history affordance.

## Validation plan

Automated:

- capability helper tests;
- catalog capability declaration tests;
- workspace behavior tests if the repo has or introduces component-test support;
- existing generator/game tests remain passing.

Manual QA:

1. Open each playable puzzle.
2. Confirm controls match expected capabilities.
3. Confirm planned puzzles do not expose invalid generation controls.
4. Confirm Jigsaw remains prototype until promotion criteria are met.

## Handoff prompt

Use this prompt for an implementation-focused ChatGPT instance:

```text
You are implementing the puzzle capability model in `jaahay/puzzle-forge`. Read `docs/architecture/puzzle-capabilities.md`, then inspect `src/catalog/types.ts`, `src/catalog/puzzleCatalog.ts`, `src/catalog/puzzleAvailability.ts`, `src/games/registry.ts`, `src/components/PuzzleWorkspace.tsx`, and `src/components/PuzzleConfiguration.tsx`. Implement Phase 1 only unless explicitly asked otherwise: add capability declarations and query helpers while preserving current UI behavior. Do not remove `status` yet. Add tests for helper behavior and validate with `pnpm build`.
```
