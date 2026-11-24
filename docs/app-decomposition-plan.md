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
- image-backed puzzles: core + prospective generation.

This avoids a universal workspace prop bag becoming an implicit dependency surface.

## Invariants

- Current puzzle identity comes from the generated puzzle.
- Prospective settings never masquerade as current-puzzle metadata.
- Editing prospective settings never mutates or regenerates the current puzzle.
- New-puzzle creation is explicit: primary `New` creates a random puzzle, while Today and entered Seed are alternate creation identities over the same prospective settings.
- Presentation strings are not machine-readable state.
- Late or cancelled worker responses cannot replace the active puzzle.
- Persisted data is validated at the storage boundary before restore code consumes it.
- New puzzle types should extend explicit capability boundaries rather than adding puzzle-specific conditionals throughout `App.tsx`.

## Generation boundary

All generated puzzle workspaces, including image-backed puzzles, use prospective generation capabilities. Identity-changing settings are edited as next-puzzle drafts and take effect only when a creation action is invoked. The current puzzle remains authoritative until its replacement is explicitly created.


## Deferred loading and rendering decisions

Prefer a fast, quiet application shell whose initial transfer does not grow in proportion to every optional puzzle engine or content library. Keep substantial puzzle-specific datasets as independently fetchable same-origin assets and load them on demand; see [Language assets and word-puzzle content](architecture/language-assets.md).

The current workspace dispatcher statically imports the concrete workspaces; the generation worker is constructed on app mount and imports the full generator registry. This is a candidate for dynamic imports or on-demand worker creation, **not an immediate refactor mandate**. Reassess when new word assets or graphics dependencies are integrated, or when real network/bundle/interaction measurements indicate unnecessary startup cost. Preserve direct-route loading, progress restoration, and prompt transitions between puzzles.

A first-class client graphics/animation engine is likewise a **deferred architecture choice**, not a preselected dependency. Revisit only if existing Jigsaw/image-tile rendering constraints, gesture/animation complexity, or measured mobile frame-time problems make the current approach materially less effective. Evaluate full-app implications and conditional puzzle-specific loading, not just Jigsaw aesthetics. Avoid imposing rendering/physics dependencies on unrelated games such as Sudoku. Do not maintain parallel rendering frameworks merely to claim one has been adopted.

## Client performance budgets

Optimize time to a playable puzzle and responsiveness on ordinary mobile devices, not bundle size in isolation. Treat the following numbers as initial engineering targets and investigation thresholds, not platform limits, release blockers, or automatic CI gates. Revisit them when measured user experience or the supported device range warrants it.

| Metric | Preferred | Investigate above |
| --- | ---: | ---: |
| Initial client JavaScript, compressed | 100 KB | 150 KB |
| Initial client JavaScript, uncompressed | 350 KB | 500 KB |
| Initial critical-path transfer, compressed | 170 KB | 300 KB |
| Additional text-puzzle assets needed for play, compressed | 100 KB | 250 KB |
| Additional text-puzzle assets needed for play, uncompressed | 500 KB | 1 MB |
| Retained JavaScript heap for an ordinary text-puzzle session | 30 MB | 50 MB |
| Total tab memory for an ordinary text-puzzle session, where measurable | 100 MB | 200 MB |

Use decimal KB and MB for these indicative budgets. Count the resources actually loaded for the initial route, including eagerly started worker code and its dependencies, when assessing total critical-path transfer. Report client JavaScript and worker JavaScript separately as useful diagnostics; measure their combined cost rather than hiding work in another execution context. Record the compression encoding when comparing sizes. Build output gzip size is a useful proxy, not proof of network transfer size; inspect cold-cache and repeat-navigation waterfalls in a production-like build.

Uncompressed resource bytes are not a heap measurement. Parsed strings, objects, lookup indexes, worker heaps, decoded images, rendering surfaces and GPU allocations can have very different memory costs. Measure retained memory after representative play, navigation, and return to a puzzle, distinguish transient allocation peaks from sustained growth, and document the measurement method. Treat image-intensive puzzles such as Jigsaw separately according to artwork dimensions, rendering strategy, and representative device measurements; do not impose text-puzzle memory targets on them without evidence.

Use [Core Web Vitals](https://web.dev/articles/vitals) as external experience benchmarks: LCP at most 2.5 seconds, INP at most 200 milliseconds, and CLS at most 0.1 at the 75th percentile of page visits, considering mobile and desktop separately. These describe page experience, not the complete puzzle interaction contract. Aim for smooth continuous pointer and touch interactions at the display refresh rate (60 FPS as an ordinary baseline), and avoid main-thread tasks exceeding 50 milliseconds, especially during input, generation transitions, and initial readiness.

Do expensive work outside the critical path when the result is not required for play. Precompute deterministic content-derived results offline when practical; defer optional assistance until requested; choose a worker or incremental computation only when actual runtime work needs it. Cache bounded reusable data when useful, and introduce eviction or more complex storage only in response to measured retention or growth.

The 170 KB starting point is informed by [web.dev's performance-budget guidance](https://web.dev/articles/codelab-setting-performance-budgets-with-webpack). The other byte and memory budgets above are Puzzle Forge's own provisional targets, not universal web standards. Prefer measured improvements in player experience to optimizing a number for its own sake.
