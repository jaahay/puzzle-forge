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
pnpm install
```

Start the development server:

```sh
pnpm dev
```

Run tests, TypeScript checking, and a production build:

```sh
pnpm build
```

Run TypeScript checking without producing a bundle:

```sh
pnpm typecheck
```

Run tests only:

```sh
pnpm test
```

Preview the production bundle locally:

```sh
pnpm preview
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
- `src/games/wordGuess/generate.ts`
- `src/games/logicGrid/generate.ts`
- `src/games/solitaire/generate.ts`
- `src/games/pegSolitaire/generate.ts`

Grid generators return `GridGeneratedPuzzle` previews with cells and optional puzzle-level answer keys for checking. Card generators return `CardGeneratedPuzzle` previews with stock, waste, foundation, and tableau stacks. Both shapes flow through the shared worker contract so puzzle-specific renderers can evolve without blocking the catalog shell.

## Worker contract

The UI posts a `PuzzleGenerationRequest` to `src/workers/puzzleWorker.ts` with a request id, puzzle id, seed, width, and height. The worker calls the registry, returns a `PuzzleGenerationResponse`, and includes the same request id so the UI can ignore stale responses.

## Jigsaw artwork ingestion

Bundled artwork is source-controlled and served same-origin with explicit provenance. `scripts/ingest_jigsaw_images.py` is the canonical ingestion recipe for supported providers; it may be run locally or by trusted branch-scoped automation.

Rules:

- Acquisition identifiers live in `assets/jigsaw/sources.json`; executable Python must not contain the durable artwork catalog.
- Ingestion must start from an explicit feature branch and resolve only manifest-declared source records, never arbitrary user-supplied URLs.
- The canonical script must verify the source provider's public-domain/open-access contract and downloadable primary image before acquiring bytes.
- Connector/API or GitHub Actions ingestion is allowed when it executes the same canonical recipe and the resulting provenance and binary blobs are verified before catalog wiring or merge.
- Never grant write-capable ingestion to untrusted pull-request code. Write-capable automation must be deliberately branch-scoped or manually dispatched from trusted repository code.
- Generated derivatives normalize EXIF orientation, convert embedded ICC color profiles to sRGB when present, preserve aspect ratio without cropping, and write WebP puzzle/preview/thumbnail files plus `provenance.json` hashes and source metadata.
- Treat an existing `imageId` as a stable logical artwork. Conservative re-encoding/resizing may keep the same ID; changing the artwork or materially changing its composition/crop requires a new ID.
- Ingestion is create-only by default, not an upsert. Existing asset directories cause the script to stop unless `--overwrite` is explicitly supplied.

The current script supports The Met Open Access and Art Institute of Chicago providers. Provider-specific record, rights, and image resolution stay at the ingestion boundary while the derivative/provenance contract remains shared. Art Institute ingestion requires `is_public_domain=true`, resolves the IIIF base from API `config.iiif_url`, uses the public-domain `1686`-wide image variant for puzzle fidelity, and downloads sequentially with a one-second delay. Add another provider only when shipping real assets from it.

To add a bundled image, first add its stable `assetId`, provider, and official source identifier to `assets/jigsaw/sources.json`. Then run the canonical script for that explicit asset id:

```sh
python -m pip install "Pillow==12.3.0"

# Metadata/public-domain preflight only; no image bytes are downloaded.
python scripts/ingest_jigsaw_images.py new-asset-id --verify-only

# Download and generate only that asset.
python scripts/ingest_jigsaw_images.py new-asset-id

# Review generated provenance/assets before committing or wiring the catalog.
git status
git diff -- assets/jigsaw

# After catalog wiring/tests are updated, run the full project validation.
pnpm build
```

Trusted automation should invoke those same script commands rather than reproducing image-processing logic in workflow YAML. Use `python scripts/ingest_jigsaw_images.py --all --verify-only` to revalidate every configured source record without touching image bytes. Use `--overwrite` only for intentional regeneration after reviewing stable-identity implications; the script replaces generated directories rather than merging individual files.

## Product direction

The branch now targets a catalog destination rather than a single puzzle workbench. Future work should add richer per-puzzle renderers, puzzle-specific settings, curated word dictionaries, Nonogram clue derivation, Sudoku uniqueness checks, Solitaire move validation, Peg Solitaire solver hints, and eventually deployment configuration for the chosen `puzzles.*` host.
