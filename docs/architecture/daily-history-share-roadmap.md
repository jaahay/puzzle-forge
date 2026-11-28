# Daily, History, and Share Roadmap

This document scopes the cross-puzzle product loop for daily puzzles, local completion history, and spoiler-safe sharing.

## Goal

Make Puzzle Forge feel like a repeatable puzzle destination rather than a set of isolated generated workbenches.

The app already has seeded generation, some daily seed helpers, puzzle sessions, and puzzle-specific share/progress behavior. This roadmap defines a shared model so Sudoku, Word Guess, Solitaire, Jigsaw, Nonogram, and later puzzles do not each invent incompatible daily/history/share semantics.

## Source-of-truth areas

Likely files and modules:

- `src/games/shared/daily.ts`
- `src/app/session.ts`
- `src/app/usePuzzleSessions.ts`
- `src/components/PuzzleWorkspace.tsx`
- `src/catalog/types.ts`
- `src/games/wordGuess/daily.ts`
- `src/app/puzzleShare.ts`
- `src/components/PuzzleShare.tsx`
- `src/games/wordGuess/share.ts`
- `src/games/wordGuess/progress.ts`
- puzzle-specific generators under `src/games/*/generate.ts`

Future implementation may introduce new shared modules such as:

- `src/app/completions.ts`
- `src/app/daily.ts`

## Non-goals

- Do not add user accounts.
- Do not add cloud sync.
- Do not require analytics or telemetry.
- Do not require every catalog puzzle to support daily mode immediately.
- Do not expose spoiler data in share text.
- Do not block puzzle-specific work on a perfect global achievement system.

## Product decisions

### Daily meaning

A daily puzzle should be more than a seed shortcut. It should create a durable local completion record when completed.

### Storage scope

Use local browser storage first. The model should be versioned and resilient to malformed records.

### First participating puzzles

Recommended order:

1. Word Guess
2. Sudoku
3. Jigsaw after image-backed puzzle work lands
4. Nonogram
5. Solitaire if challenge semantics are clearly defined

Solitaire daily needs special care because a seeded deal may not be known-solvable unless the variation/generator guarantees it.

## Shared concepts

### Canonical puzzle resource identity

Daily, random, and custom puzzles should all converge on the same typed resource model described in `puzzle-resource-identity.md`:

```text
/<puzzle-type>/<generation-id>
```

The generation id canonically represents the complete generation request for that puzzle type, not only the raw random seed. The same generation id may therefore exist under different puzzle-type namespaces without collision.

A concrete puzzle URL describes the puzzle resource only. Mutable play state remains local session data keyed by the typed resource identity. This allows multiple resumable puzzles of the same type and makes daily/history/share features refer to the same puzzle identity instead of inventing parallel identifiers.

### Daily identity

```ts
type DailyPuzzleIdentity = {
  puzzleId: PuzzleId;
  date: string; // YYYY-MM-DD local date unless deliberately changed
  seed: string;
  variantKey?: string;
  difficulty?: PuzzleDifficulty;
};
```

A daily identity is generation input, not a separate URL identity system. Once resolved into the canonical generation request, it should produce the same typed generation id used by ordinary puzzle resources.

### Completion record

```ts
type PuzzleCompletionRecord = {
  schemaVersion: 1;
  puzzleId: PuzzleId;
  puzzleInstanceId: string;
  mode: "daily" | "random" | "custom";
  seed: string;
  completedAt: string;
  dateLabel?: string;
  difficulty?: PuzzleDifficulty;
  result: "solved" | "won" | "lost" | "completed";
  stats?: Record<string, number | string | boolean>;
  shareSummary?: string;
};
```

`puzzleInstanceId` should converge on the canonical generation id rather than an unrelated session identifier.

Keep `stats` generic, but prefer puzzle-specific formatter functions to avoid arbitrary UI coupling.

### Sharing a resource or progress

Sharing is independent of completion history and uses the committed canonical resource (see [Puzzle Resource Identity](puzzle-resource-identity.md)). The shared Share surface distinguishes two intents:

- **Puzzle invitation**: the default. A concise message identifies the puzzle and its settings, followed by the exact resource link. Recipients open the same generated resource. Their own saved progress, if any, remains authoritative.
- **Progress + link**: the same invitation augmented with a spoiler-safe, puzzle-appropriate report. Word Guess retains its feedback grid without letters; other puzzles describe meaningful progress or completion without exposing entries, card identities, or answer data. The report does not import mutable state.

The primary share preview preserves recognizable puzzle identity, the runtime destination domain, existing artwork for image-based puzzles, and an optional spoiler-safe progress report. Daily puzzles show their stable date. Share is a current-puzzle utility; the optional report is selected with a checkbox, initially unchecked for invitations and checked for the contextual Share result action. Completion uses the existing shared dock, except Jigsaw retains its result action in its crown to keep the workbench unobstructed. The preview does this rather than requiring players to read an opaque URL or seed. The complete message is the default copy action and remains selectable behind deliberate disclosure; a separate link-only copy action is available there. Clipboard failure reveals the text for manual copying. Native sharing supplies the message body and the canonical URL separately; receiving apps may render them differently. The link is built from the current browser origin and canonical resource path, not a hardcoded deployment hostname. Seeds remain generation parameters, available in New puzzle options rather than ordinary sharing content. The shared transport prefers the device's native share mechanism when available and offers explicit clipboard copy. A native handoff is not proof of delivery. Neither sharing intent mutates the puzzle or depends on a completion database, cloud sync, or a backend.

Transferring a playable save-state is a separate capability, not a hidden interpretation of sharing progress. Evaluate size, baseline integrity, spoiler implications, and explicit non-destructive import semantics before introducing it. Ordinary shared links do not carry session state.

See [#363](https://github.com/jaahay/puzzle-forge/issues/363) for the current Share implementation scope and [Control Communication](../principles/control-communication.md) for non-prescriptive presentation rationale.

## Phase 1: Shared daily identity and completion storage

### Requirements

- Define a shared daily identity convention.
- Define a versioned local completion record format.
- Add safe read/write helpers.
- Reject malformed records without crashing.
- Preserve existing puzzle session behavior.

### Acceptance criteria

- Completion records round-trip through localStorage.
- Bad records are ignored safely.
- Daily and random/custom records are distinguishable.
- Completion record helpers are tested.

## Phase 2: Word Guess and Sudoku integration

### Requirements

- Word Guess writes completion records for daily games.
- Sudoku writes completion records when solved.
- Completion does not reset or corrupt resumable session state.
- Share text can be generated from completion data.

### Acceptance criteria

- Completing daily Word Guess creates one daily record for that date.
- Completing daily Sudoku creates one daily record for that date.
- Reopening the app can show completed daily state.
- Share text remains spoiler-safe.

## Phase 3: History UI

### Requirements

- Add a minimal local history surface or section.
- Show recent completions.
- Distinguish daily from random/custom games.
- Show puzzle type, date, result, and concise stats.

### Acceptance criteria

- User can see recent completions without accounts.
- History remains readable on mobile.
- Missing or malformed old records do not break the page.

## Phase 4: Cross-puzzle share conventions

### Requirements

- Provide a stable shared Share affordance for every generated puzzle, independent of whether it has been played.
- Always include the concrete resource URL; include the puzzle identity and settings in the invitation, with spoiler-safe reports by explicit selection and a link-only copy option.
- Let each puzzle supply meaningful result-specific information; exclude raw answer keys, entered values, hidden card identities, found-word names and session data. Distinguish activity from objective progress: cell-entry counts and move counts do not represent completion percentages; report the largest Jigsaw group rather than a sum of disconnected pieces. Word Search uses its validated found-word count.
- Use native sharing, explicit copy, and selectable fallback text with clear outcome feedback.

### Acceptance criteria

- All currently generatable puzzle families share a concrete resource URL, including non-default settings and dated Daily identities.
- Word Guess retains the spoiler-safe colored grid with a resource link; generic summaries describe observed progress without promising correctness percentages.
- A failed or cancelled native share does not mutate the puzzle or silently overwrite the clipboard; copy failure leaves manual selection available.
- Confirm mobile, desktop, installed-app, and fullscreen behavior against real share destinations.

## Phase 5: Streaks and archive

Optional after completion history exists.

### Requirements

- Streaks should count daily completions only.
- Streak semantics should define whether any daily puzzle counts or only a specific puzzle counts.
- Archive should not require server data; local-only archive can show played days, not all possible days.

Recommended initial choice: no streaks until completion history is stable.

## Validation plan

Automated:

- localStorage read/write tests;
- malformed storage rejection tests;
- daily identity formatting tests;
- share formatter tests;
- completion record tests per integrated puzzle.

Manual QA:

1. Complete a daily Word Guess.
2. Refresh and confirm completed state/history.
3. Complete a random Word Guess and confirm it does not overwrite the daily record.
4. Complete a Sudoku and confirm record creation.
5. Share a completed puzzle and inspect spoiler behavior.
6. Corrupt localStorage manually and confirm app still loads.

## Handoff prompt

Use this prompt for an implementation-focused ChatGPT instance:

```text
You are implementing the daily/history/share roadmap in `jaahay/puzzle-forge`. Read `docs/architecture/daily-history-share-roadmap.md` and `docs/architecture/puzzle-resource-identity.md`, then inspect `src/games/shared/daily.ts`, `src/app/session.ts`, `src/app/usePuzzleSessions.ts`, `src/components/PuzzleWorkspace.tsx`, `src/catalog/types.ts`, and Word Guess share/progress modules. Implement one coherent phase only. Prefer shared, versioned localStorage helpers for completion/history records. Do not add accounts, cloud sync, or telemetry. Keep share output spoiler-safe. Add tests for storage, malformed records, daily identity, and any formatter changes. Validate with `pnpm build`.
```
