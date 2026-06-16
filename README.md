# puzzle-forge

Generate, solve, and experiment with procedural logic puzzles.

The app is structured as a catalog-first puzzle destination suitable for a `puzzles.*` subdomain. Sudoku, Nonogram, Wordle-like puzzles, and future engines share one catalog shell while keeping each puzzle generator isolated.

## Stack

- Vite
- TypeScript
- Preact
- Web Workers

## Development

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Run a production build with TypeScript checking:

```sh
npm run build
```

Run TypeScript checking without producing a bundle:

```sh
npm run typecheck
```

Preview the production bundle locally:

```sh
npm run preview
```

## Catalog model

Puzzle metadata lives in `src/catalog/puzzleCatalog.ts`. Each catalog entry declares its id, title, status, tags, category, and supported dimensions. The UI renders the catalog first, then shows a generation workspace for the selected puzzle.

Initial catalog entries:

- Sudoku
- Nonogram
- Wordle-like
- Logic Grid
- KenKen
- Minesweeper
- Slitherlink

Only playable and prototype entries have generators today. Planned entries are visible in the catalog but disabled for generation until their engine exists.

## Generator model

Puzzle engines live under `src/games/<puzzle>/generate.ts`. Shared generation helpers live in `src/games/shared.ts`, and `src/games/registry.ts` maps catalog ids to concrete generators.

Current generators:

- `src/games/sudoku/generate.ts`
- `src/games/nonogram/generate.ts`
- `src/games/wordle/generate.ts`
- `src/games/logicGrid/generate.ts`

Each generator returns a shared `GeneratedPuzzle` shape from `src/catalog/types.ts`, so the UI can render a common preview grid while puzzle-specific engines evolve independently.

## Worker contract

The UI posts a `PuzzleGenerationRequest` to `src/workers/puzzleWorker.ts` with a request id, puzzle id, seed, width, and height. The worker calls the registry, returns a `PuzzleGenerationResponse`, and includes the same request id so the UI can ignore stale responses.

## Product direction

The branch now targets a catalog destination rather than a single puzzle workbench. Future work should add richer per-puzzle renderers, puzzle-specific settings, curated Wordle dictionaries, Nonogram clue derivation, Sudoku uniqueness checks, and eventually deployment configuration for the chosen `puzzles.*` host.
