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

## Future design directions

The implemented profiles are a starting point, not a ceiling on the design space. The goal is an enjoyable spatial search with familiar, recognizable targets and meaningful variation between boards. The following are exploratory directions, not committed requirements or a backlog of features to implement together.

### Vocabulary and thematic experience

General is the broad, unthemed experience; Mixed draws from the authored thematic collections. General may ultimately be the more attractive default because it maximizes variety, but that is a product hypothesis, not an observed preference across players. Keep the curated themes available as intentional, coherent alternatives. Reconsider the default after playtesting rather than silently changing the meaning of Mixed.

Theme membership should be many-to-many and sense-aware. A word's spelling alone does not determine all its associations: SALMON can belong to Animals, Ocean and Food; PIANO to Music, Instruments and Arts; MERCURY to Space, Chemistry or Mythology, depending on the intended sense. A familiar spelling may be suitable in one theme even when a different sense would be obscure. Not all thematic words need to be eligible Word Guess answers.

Themes need not be restricted to taxonomic categories:

| Kind | Example theme | Illustrative words |
| --- | --- | --- |
| Conventional | Space | PLANET, ORBIT, GALAXY, COMET |
| Situational | A rainy afternoon | WINDOW, BLANKET, COCOA, THUNDER |
| Conceptual | Things that move | RIVER, PENDULUM, CLOUD, TRAIN |
| Historical or cultural | The Renaissance | FRESCO, PATRON, MARBLE, SONNET |
| Linguistic | Silent letters | KNIGHT, GNOME, PSALM, DOUBT |

These examples illustrate selection intent, not approved inventories. Situational and conceptual collections can be particularly evocative. A future Surprise theme could choose a coherent concrete collection for each puzzle, rather than mix arbitrary categories on one board. Resolve that choice deterministically and retain the concrete theme in resource identity so a shared or resumed puzzle is unambiguous.

### Semantic enrichment and shared lexical knowledge

A hybrid approach is worth investigating: derive candidate memberships automatically from broad lexical resources, then refine the collections editorially. Different methods offer complementary evidence:

| Method | Useful contribution | Caveat |
| --- | --- | --- |
| Editorial curation | Deliberate theme coherence and familiar vocabulary | Effort grows with collection size |
| [Open English WordNet](https://en-word.net/) | Sense definitions, synonyms and lexical relationships | Taxonomy is not the same as everyday thematic association |
| [Wikidata](https://www.wikidata.org/) | Named entities and conceptual relationships | Uneven coverage of ordinary vocabulary |
| Semantic embeddings | Candidate associations and related-word discovery | Similarity does not establish theme suitability |
| LLM-assisted classification | Contextual associations and proposed themes | Outputs require evidence and editorial review |

These are candidate sources or techniques, not selected dependencies. Evaluate coverage, sense quality, licensing, attribution and reproducibility before ingestion. Avoid treating all automatically inferred associations as equally relevant. A theme should have enough familiar and length-appropriate targets for varied boards; a technically valid but weak association can still make a theme feel incoherent.

The natural opportunity across Word Guess, Word Search and Mini Crossword is shared **build-time lexical knowledge**, rather than a shared runtime dictionary or universal word-puzzle engine. Spellings, familiarity, senses, definitions, relationships, candidate theme memberships and provenance may be useful common inputs. Each game has its own selection contract:

- Word Guess distinguishes valid guesses from eligible answers and may compile starter statistics.
- Word Search selects spatially compatible, familiar targets from broad or themed collections; sense information informs editorial membership, not the mechanics of finding a word.
- Crossword needs defensible clue-answer pairs, including sense-specific clues, suitable answer lengths and grid compatibility. A word list by itself is insufficient.

Compile small, puzzle-specific runtime assets from pinned inputs and deliberate editorial decisions; load assets on demand using the existing static hosting and worker model. Reuse genuinely common content and provenance without forcing games to share runtime types, eligibility rules or release schedules. Explore Crossword's lexical needs before investing in a general semantic enrichment pipeline, so any common machinery is justified by actual use.

### Spatial and linguistic difficulty

Treat difficulty as a composition of independent dimensions. The current profiles combine them into a small set of coherent experiences; individual controls are not required for every tunable quantity.

| Dimension | Directions to explore |
| --- | --- |
| Geometry | Board size and aspect ratio, target count and length, spatial distribution, overlap and density |
| Orientation | Natural reading bias, reversed words, diagonals, and balance among allowed directions |
| Letter distribution | Uniform noise versus broad-language, theme-specific or target-conditioned frequencies |
| False leads | Shared prefixes, single-letter substitutions, near-anagrams and deliberately similar letter sequences |
| Semantic interference | Related or competing words, provided the player's objective stays clear |
| Ruleset variation | Bent or wrapping paths, irregular geometry, alternate alphabets, wildcard cells and clue-driven discovery |

Keep natural rightward and downward reading strongly represented at easier difficulties. Increase interference, overlap and direction diversity progressively; calibrate actual distributions and solve experience rather than requiring every board to hit exact ratios. More difficult need not mean more obscure vocabulary or a larger board. Consider exposing configuration only when a dimension supports a recognizable and desirable experience; avoid a parameter wall.

Distinguish nonword filler from deliberately placed decoys and incidental real words. A prefix-preserving near-match can reward careful observation, whereas an unintended second exact occurrence of a listed target violates the current uniqueness guarantee. Unlisted real words are normally harmless discoveries rather than selectable objectives. More aggressive lexical or semantic interference should preserve the fairness of the listed objectives. Content screening, if introduced, should distinguish authored targets from incidental strings, and should not promise to eliminate all possible offensive substrings.

### Presentation and evaluation

The workspace should remain board-first. Keep the word list compact, stable, readable and adjacent to the puzzle; prefer available-width adaptation over a viewport-only breakpoint. Keep completion and Next puzzle close to the board, including on mobile and in the expanded workspace. Found-state marks must remain understandable without color alone, and touch, pointer and keyboard interaction should remain equivalent. Additional explanations and advanced configuration should not displace the puzzle surface.

Judge improvements by actual play: perceived difficulty, naturalness of the word directions, theme coherence, vocabulary variety, mobile readability, and ease of continuing after completion. Broader deterministic seed sweeps can measure direction mix, generation failures and latency, and verify that every listed target remains uniquely discoverable; they supplement rather than replace manual QA.

General and the current compact profiles provide a substantial playable foundation. Retain these directions as design context, and prioritize individual refinements only when their expected value warrants the change.
