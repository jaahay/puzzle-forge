# Word Search

The board is a spatial selection surface, not an editable text grid. Issue #200 describes the playable feature. The catalog exposes Word Search as a preview pending manual interaction and difficulty QA.

## Content and difficulty

Six small authored thematic collections and their deduplicated mixed collection use the existing spelling corpus as a build-time quality reference. Theme membership is an editorial sense decision, not the Word Guess answer pool; the latter omits many familiar names of animals, plants, and instruments. Named planets are deliberate theme-specific exceptions to Word Guess's lowercase-source restriction. No new external source or runtime dictionary download is needed for these compact lists. General is a separate, broad familiar vocabulary, compiled offline from the existing pinned answer inventory (4–10 letters), published at `public/lexicon/word-search/general.json` and fetched only by the generation worker when General is selected. Mixed retains its editorial meaning and remains the default. Regenerate with `python3 scripts/build_word_search_lexicon.py`; the test suite verifies the derived asset against its source. Shared lexical attribution is in `public/lexicon/NOTICE.txt`.

The difficulty profile independently controls search area, target count, maximum target length, placement directions, overlap preference, filler distribution and false leads. Prefer familiar words at all difficulties. Difficulty should reward scrutiny, not merely scanning a larger board. The initial compact profiles are:

| Profile | Board | Targets | Directions | Uniform filler share | Target-derived share | Planted near-matches |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Easy | 8×8 | 6 | 2 | 45% | 0% | 0 |
| Medium | 10×10 | 9 | 6 | 25% | 25% | 1 |
| Hard | 10×10 | 10 | 8 | 15% | 50% | 2 |
| Expert | 12×12 | 12 | 8 | 10% | 75% | 3 |

The remaining filler weight comes from letter frequencies across the mixed thematic vocabulary, not a purported general-English corpus. All letters retain a nonzero probability. These weights govern stochastic filler, not the final histogram after targets and near-matches are placed. Keeping Hard the same size as Medium lets spatial and linguistic interference carry the difficulty; the 12-cell Expert width is an initial mobile usability choice, subject to actual QA.

A deliberate near-match is a straight ray with the first three letters of a listed target and exactly one subsequent mismatch. Place the requested number against distinct targets without overwriting intended letters or earlier distractors; at least two cells in each ray must be available as filler. Reject layouts that cannot achieve the requested count or that accidentally create another exact occurrence. No distractor identity needs to be stored or exposed. Ordinary unlisted English words, including other themed words, may occur incidentally and are not objectives. Do not attempt to eliminate the entire dictionary. A separately considered, narrow content-safety policy may be useful for egregious incidental language, but is not a claim that this generator prevents every offensive substring.

Bent/wrapping paths, irregular boards, alternate alphabets and clue-driven target discovery change the rules rather than merely difficulty. Retain these as future variations instead of presenting a parameter wall or implementing a universal puzzle engine.

## Generation and selection

The generator accepts a seed, difficulty, and concrete theme. It selects compatible targets, favors quadrant coverage and soft directional balance, and varies overlap by difficulty. Natural right/down, reverse orthogonal, and diagonal shares are preferences (Easy 100/0/0; Medium 65/15/20; Hard 45/25/30; Expert 30/20/50), not quotas. The candidate comparison also favors those distributions without eliminating direction diversity. It compares up to three valid layouts within a bounded attempt budget. It checks every target in every direction, including incidental reverse occurrences, before accepting filler. Palindromic targets count once per physical path. Failure is explicit.

The generated baseline includes the complete letters and word paths. Its compact exact checksum protects progress against changed content. The domain stores only found target identities, not per-cell marking or a second mutable board. Found cells and completion are derived. Endpoint selection accepts either reading direction; drag snapping projects to a legal ray and uses the same endpoint submission.

## Workspace interaction

The controlled Word Search board renders a continuous, rounded path behind letters for each found word. A brighter path previews the exact candidate during a drag or keyboard endpoint selection. Pointer capture keeps a drag coherent outside the board; release commits the snapped ray, while a tap chooses an exact endpoint. A cancelled pointer does not submit a word. Tap and keyboard share the same endpoint model: an invalid endpoint becomes a new anchor, tapping the anchor again cancels, and Escape clears the selection. Arrow navigation uses one roving tab stop, with native button activation for Enter/Space and assistive technology. Found words are struck through in a compact, width-adaptive list and announced to screen readers; count and found state are conveyed without color alone. The shared completion dock and Reset occupy a stable stage immediately below the letter board, before the word list on narrow screens.

The component accepts authoritative progress rather than storing it locally. Reset and baseline changes clear gesture state. A New puzzle control reuses the existing Random/Today/seed command and exposes only Theme and Difficulty.

## Platform integration

Word Search uses its own generated puzzle and session kind, dispatched by the existing generation worker and catalog. Its resource identity encodes difficulty and a stable theme name; dimensions are derived from the profile rather than encoded independently. Daily generation derives its seed from date, difficulty and theme. The normal daily locator, canonical URL, recent puzzles, and next-puzzle draft persistence carry those settings.

The application owns the found-word set, updates its synchronous snapshot before autosave/navigation, validates restored progress against the regenerated baseline, and derives completion and abandonment state from the same progress. The canonical session payload stores only found word names and the existing outer checksum; the immutable board is regenerated. Reset uses shared confirmation, completion uses the shared terminal dock. A wrong selection has no persistent effect, and a correct find is monotonic until reset; individual Undo/Redo actions are intentionally not introduced for this initial ruleset.

Manual QA should cover the pointer/touch/keyboard experience at narrow widths, completion transitions, interrupted drags and restoration, as well as perceived difficulty. Do not introduce a universal word-puzzle engine or a historical content-version scheme.
