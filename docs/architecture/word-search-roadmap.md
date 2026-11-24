# Word Search

The board is a spatial selection surface, not an editable text grid. Issue #200 describes the full playable feature. This first implementation establishes the domain model before introducing a catalog entry or new runtime state ownership.

## Content and difficulty

Six small authored thematic collections and their deduplicated mixed collection use the existing spelling corpus as a build-time quality reference. Theme membership is an editorial sense decision, not the Word Guess answer pool; the latter omits many familiar names of animals, plants, and instruments. Named planets are deliberate theme-specific exceptions to Word Guess's lowercase-source restriction. No new external source or runtime dictionary download is needed for these compact lists.

The difficulty profile determines size, count, maximum target length, placement directions and overlap preference. Initial boards range from 8×8 with six targets to 14×14 with fifteen. Prefer familiar words at all difficulties; longer words are possible on larger boards, but vocabulary obscurity is not a difficulty mechanism.

## Generation and selection

The generator accepts a seed, difficulty, and concrete theme. It selects compatible targets, favors direction and quadrant coverage, and varies overlap by difficulty. It compares up to three valid layouts within a bounded attempt budget. It checks every target in every direction, including incidental reverse occurrences, before accepting filler. Palindromic targets count once per physical path. Failure is explicit.

The generated baseline includes the complete letters and word paths. Its compact exact checksum protects progress against changed content. The domain stores only found target identities, not per-cell marking or a second mutable board. Found cells and completion are derived. Endpoint selection accepts either reading direction; drag snapping projects to a legal ray and uses the same endpoint submission.

## Remaining platform integration

Add the Word Search-specific generated-puzzle kind and canonical theme/difficulty identity to the existing resource model; feed the worker the relevant profile. Integrate found-word progress with the normal session retention, history, reset, and terminal-state ownership rather than introducing separate localStorage. Use the shared New/Daily controls with only theme and difficulty, and render a responsive board with drag, tap and keyboard endpoint selection. Keep the word list below the board on narrow screens.

Do not expose this domain-only slice as a playable catalog item until resource, persistence, and accessible workspace behavior are integrated and validated. Do not introduce a universal word-puzzle engine or a new historical content-version scheme.
