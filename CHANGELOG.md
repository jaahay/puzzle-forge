# Changelog

All notable Puzzle Forge changes should be documented here in a concise, reader-facing form. Dates use Pacific time.

## 2026-06-16

### Added

- Added richer browser metadata for the app shell, including social preview text, author linkage, canonical URL, and search-friendly description.
- Added a whimsical inline SVG favicon that keeps the project recognizable without introducing binary assets.
- Added a lightweight site changelog section beneath the application workspace for human-readable release notes.
- Added a persistent footer with copyright, source, author, changelog, and inconspicuous version links.

### Notes

- The footer intentionally describes errata as corrections and puzzle mischief, matching the project’s experimental catalog tone while keeping the route professional.
- The visible version currently mirrors `package.json` at `0.1.0`; keep it low-prominence unless releases become more formal.

## 2026-06-14

### Changed

- Shifted the frontend toward a catalog-first puzzle destination instead of a single puzzle workbench.
- Refined playable puzzle interactions with typed grid input, checker feedback, card moves, peg jumps, and seeded worker-backed generation.
- Updated catalog copy around Sudoku, Nonogram, Word Guess, Logic Grid, Solitaire, Peg Solitaire, and planned puzzle families.

## Changelog quality rules

- Write for a reader trying to understand the project’s trajectory, not for a commit log parser.
- Prefer coherent sections over exhaustive file-level bullets.
- Preserve important product intent, user-visible behavior, and release caveats.
- Avoid noise from routine refactors unless they change user-facing behavior or future maintainability.
