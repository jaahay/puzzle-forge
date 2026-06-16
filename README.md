# puzzle-forge

Generate, solve, and experiment with procedural logic puzzles.

The app is structured as a catalog-first puzzle destination suitable for a `puzzles.*` subdomain. Sudoku, 52-card Solitaire, Peg Solitaire, Nonogram, Word Guess, and future engines share one catalog shell while keeping each puzzle generator isolated.

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

## Site shell

Document metadata lives in `index.html`. The static shell declares the app description, author and canonical links, social preview metadata, theme color, and the inline SVG favicon.

Site-level chrome outside the Preact app is styled by `src/siteChrome.css`. It currently owns the footer, copyright and errata note, author/source/changelog links, and the low-prominence version badge.

## Changelog

Reader-facing release notes live in `CHANGELOG.md`, with the current high-level notes mirrored into the page-level changelog section in `index.html`.

Changelog entries should explain product trajectory and user-visible behavior, not duplicate every commit.

## Catalog model

Puzzle metadata lives in `src/catalog/puzzleCatalog.ts`. Each catalog entry declares its id, title, status, tags, category, and supported dimensions. The UI renders the catalog first, then shows a generation workspace for the selected puzzle.

Initial catalog entries:

- Sudoku
- Nonogram
- Word Guess
- Logic Grid
- Solitaire
- Peg Solitaire
- KenKen
- Minesweeper
- Slitherlink

`playable` means the entry has an in-browser interaction surface, not only a generator. Planned entries are visible in the catalog but disabled for generation until their engine exists.

## Generator model

Puzzle engines live under `src/games/<puzzle>/generate.ts`. Shared generation helpers live in `src/games/shared.ts`, and `src/games/registry.ts` maps catalog ids to concrete generators.

Current playable generators:

- `src/games/sudoku/generate.ts`
- `src/games/nonogram/generate.ts`
- `src/games/wordle/generate.ts`
- `src/games/logicGrid/generate.ts`
- `src/games/solitaire/generate.ts`
- `src/games/pegSolitaire/generate.ts`

Grid generators return `GridGeneratedPuzzle` previews with cells and optional puzzle-level answer keys for checking. Card generators return `CardGeneratedPuzzle` previews with stock, waste, foundation, and tableau stacks. Both shapes flow through the shared worker contract so puzzle-specific renderers can evolve without blocking the catalog shell.

## Worker contract

The UI posts a `PuzzleGenerationRequest` to `src/workers/puzzleWorker.ts` with a request id, puzzle id, seed, width, and height. The worker calls the registry, returns a `PuzzleGenerationResponse`, and includes the same request id so the UI can ignore stale responses.

## Product direction

The branch now targets a catalog destination rather than a single puzzle workbench. Future work should add richer per-puzzle renderers, puzzle-specific settings, curated word dictionaries, Nonogram clue derivation, Sudoku uniqueness checks, Solitaire move validation, Peg Solitaire solver hints, and eventually deployment configuration for the chosen `puzzles.*` host.
