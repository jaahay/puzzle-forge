# puzzle-forge

Generate, solve, and experiment with procedural logic puzzles.

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

## App structure

The starter app renders a small puzzle workbench:

- `src/App.tsx` owns the Preact UI, puzzle controls, worker lifecycle, and grid rendering.
- `src/lib/puzzles.ts` defines the shared puzzle types and deterministic puzzle generation.
- `src/workers/puzzleWorker.ts` runs puzzle generation away from the main UI thread.
- `src/main.tsx` mounts the Preact app into `index.html`.
- `src/styles.css` contains the responsive app shell and puzzle grid styling.

## Worker contract

The UI posts a puzzle request to the worker with a request id, seed, width, and height. The worker generates a bounded puzzle model and posts a response with the same id plus the generated puzzle. The UI ignores stale responses so rapid seed or size changes do not render out-of-date work.

## Generation model

Puzzle generation is deterministic for a given seed and board size. Dimensions are clamped to a 4 by 4 minimum and a 12 by 12 maximum. Generated cells include a row, column, numeric value, and locked flag. The checksum gives a compact way to compare two generated puzzle layouts.
