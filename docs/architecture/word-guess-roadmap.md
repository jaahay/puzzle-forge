# Word Guess Roadmap

This document scopes the Word Guess enhancement track so a separate implementation session can improve the game without confusing it with Word Search or a new word-puzzle engine.

## Goal

Turn Word Guess from a correct Wordle-like implementation into a sharper daily and replayable word puzzle with better word quality, difficulty communication, post-game feedback, and share/history integration.

The current implementation already has duplicate-aware scoring, word bank validation, daily seed helpers, reducer behavior, share text, progress persistence, and hardening tests. This roadmap is a polish and product-direction plan, not a rescue plan.

## Source-of-truth areas

Likely files and modules:

- `src/games/wordGuess/generate.ts`
- `src/games/wordGuess/words.ts`
- `src/games/wordGuess/feedback.ts`
- `src/games/wordGuess/state.ts`
- `src/games/wordGuess/progress.ts`
- `src/games/wordGuess/share.ts`
- `src/games/wordGuess/daily.ts`
- `src/games/wordGuess/analysis.ts`
- `src/components/WordGuessGame.tsx`
- `src/site/word-guess.css`
- `src/games/wordGuess/wordGuess.test.ts`
- `src/games/wordGuess/wordGuess.hardening.test.ts`

## Non-goals

- Do not implement literal Word Search here.
- Do not replace the reducer model without a specific defect.
- Do not add accounts or cloud sync.
- Do not require a massive dictionary import before improving product UX.
- Do not make daily/history/share changes in a way that only Word Guess can use if a cross-puzzle model exists or is planned.

## Product decision

Word Guess should prioritize this identity:

> A daily/replayable deduction word game with lightweight analysis after completion.

That means it is not primarily a solver workbench. Analysis should support player understanding after guesses, not dominate the main play surface.

## Phase 1: Word quality and difficulty labels

### Requirements

- Make the answer bank feel curated enough for daily use.
- Keep valid guesses broader than answers if practical.
- Preserve deterministic answer selection by seed and word length.
- Show or record a clear difficulty label based on the generated answer or analysis metrics.
- Avoid surprising obscure answers in the default daily path.

### Implementation notes

- Treat `words.ts` as the first word-bank source unless a larger data file is introduced intentionally.
- If importing a larger word list, document source/license and keep answer-list curation separate from valid-guess breadth.
- If difficulty is analysis-derived, keep the function deterministic and tested.

### Acceptance criteria

- Same seed and dimensions produce the same answer.
- Default 5-letter play uses curated answers.
- Difficulty label is stable for a given generated puzzle.
- Tests cover deterministic generation and difficulty classification.

## Phase 2: Completion feedback and analysis summary

### Requirements

After a game ends, show a compact summary such as:

- solved/lost status;
- guess count;
- answer;
- difficulty label;
- candidate reduction summary or best-starter note;
- share action.

Keep this summary spoiler-safe until the game is complete.

### Implementation notes

- Reuse `analysis.ts` rather than adding duplicate candidate logic in the component.
- Keep the main board clean while playing.
- Post-game analysis should be concise and optional, not a wall of solver data.

### Acceptance criteria

- Winning shows a clear solved summary.
- Losing shows the answer and result summary.
- Share text remains spoiler-free unless the existing share contract deliberately exposes only result marks.
- Existing reducer and feedback tests remain valid.

## Phase 3: Daily, history, and share integration

Coordinate this phase with `docs/architecture/daily-history-share-roadmap.md`.

### Requirements

- Daily Word Guess completion creates or updates a local completion record.
- Share output uses the shared cross-puzzle share conventions where available.
- The daily seed label remains human-readable.
- Replayable random games do not accidentally overwrite daily completion history.

### Acceptance criteria

- Daily completion survives refresh.
- Share output does not reveal the answer.
- History can distinguish daily games from random/custom seeds.

## Phase 4: Mobile keyboard polish

### Requirements

- Physical keyboard entry remains supported.
- On-screen/mobile input is clear and forgiving.
- Invalid-word feedback is immediate enough to avoid confusion.
- Backspace/delete behavior is predictable.
- Focus does not cause avoidable viewport jumps.

### Acceptance criteria

- A phone user can complete a Word Guess without fighting native keyboard/focus behavior.
- Invalid guesses are rejected with clear feedback.
- Duplicate-letter feedback remains correct.

## Validation plan

Automated:

- Preserve duplicate-letter scoring tests.
- Preserve reducer win/loss and invalid-word tests.
- Add tests for any new difficulty labels or word-bank selection behavior.
- Add tests for any new post-game share/history formatter.

Manual QA:

1. Daily 5x6 game.
2. Random 5x6 game.
3. Non-default word length, if supported.
4. Invalid guess.
5. Duplicate-letter answer and guess.
6. Win path.
7. Loss path.
8. Refresh/resume.
9. Share output.
10. Mobile viewport input.

## Handoff prompt

Use this prompt for an implementation-focused ChatGPT instance:

```text
You are implementing the Word Guess roadmap in `jaahay/puzzle-forge`. Read `docs/architecture/word-guess-roadmap.md`, then inspect the `src/games/wordGuess/` modules, `src/components/WordGuessGame.tsx`, and `src/site/word-guess.css`. Keep the work scoped to Word Guess, not Word Search. Preserve duplicate-aware feedback and reducer semantics. Implement one coherent roadmap phase at a time, update or add tests for changed logic, and validate with `pnpm build`.
```
