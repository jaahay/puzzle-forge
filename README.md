# puzzle-forge

Generate, solve, and experiment with procedural logic puzzles.

This repository now starts as a Vite, TypeScript, and Preact app with puzzle generation handled in a Web Worker.

## Development

- Install dependencies with npm.
- Start the Vite development server with the dev script.
- Build with the build script to run TypeScript checking and produce a production bundle.

## Structure

- `src/App.tsx` renders the puzzle workbench UI.
- `src/lib/puzzles.ts` contains shared puzzle types and deterministic generation.
- `src/workers/puzzleWorker.ts` runs puzzle generation away from the UI thread.
