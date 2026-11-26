# Crossword

Issue [#201](https://github.com/jaahay/puzzle-forge/issues/201) defines Crossword as one product type, beginning with a Mini format. A technically valid fill is not automatically a good crossword. Begin small to establish clue quality, crossing constraints and a comfortable mobile solving loop; the compact grid is not the eventual limit of the engine.

## Initial domain slice (not yet playable)

The first construction experiments use two five-by-five, rotationally symmetric staircase geometries: one with 19 letter cells and six blocks, and one with 17 letter cells and eight blocks. Both have five Across and five Down entries, each three to five letters long. Every letter is crossed by both directions; all white cells are connected. Across and Down starts share a conventional row-major clue number. Geometry and entry cells are derived from the block layout, not separately authored. Symmetry is an incidental property of this viable initial template, not a mandatory rule for all future formats.

The bounded, seeded construction search chooses the most constrained unfilled entry from the eligible clue bank, backtracks on inconsistent crossings or exhausted domains, and prohibits duplicate answers on a board. Only records with an explicitly supplied clue can enter the search. It does not fall back to arbitrary spellings, reversed answers or invented filler. The search returns the first eligible complete fill in its seeded ordering; content eligibility is an editorial decision, not a claim that the search can evaluate literary clue quality. A fixed node budget per layout bounds failure cost; try the layouts in seeded order. Fill selection is independent of the number of clues or senses associated with a spelling.

The first corpus is a proof of construction and clue semantics, not a launch-sized content bank. A separate 1,024-seed reproduction of the fill algorithm found no failures, 34 distinct filled grids and 17 distinct answer sets across the two layouts. This is evidence of tractability, not adequate replayability; transposed grids can use exactly the same answers. Expand both the number of distinct answer sets and viable templates before exposing it as a Preview. Transposition alone does not constitute substantial replayability. Evaluate quality by reading and solving actual boards as well as verifying construction.

## Content and provenance

The initial `public/lexicon/crossword/mini-clues.json` contains 160 distinct answer spellings with original, sense-specific clues, written for this repository with AI assistance. Four- and five-letter candidate spellings were drawn from the existing pinned familiar-answer inventory in `assets/lexicon/word-guess-answers.json`; three-letter candidates were independently proposed as ordinary vocabulary. The existing lexical source provenance and attribution are in [language-assets.md](language-assets.md) and `public/lexicon/NOTICE.txt`. No published crossword clues or external definitions were copied. The clue bank itself is repository-authored material, not an imported crossword corpus. Independent human editorial QA is still required.

Eligibility is crossword-specific: recognizable answers, clear sense, grammatical agreement between clue and answer, no forced crosswordese or arbitrary proper names. Each answer is one fill candidate, regardless of its number of senses. A sense has an editorial meaning label, potentially overlapping topic associations and one or more clue formulations. These are local content descriptors, not a global ontology or runtime version registry. After constructing a fill, select a sense and then a clue deterministically using a separate random stream. Reordering records, topics, senses or clues does not affect seeded play. Clue-only edits do not change fill; the selected clue remains part of baseline integrity. Prefer a mixture of direct and approachable playful clues rather than artificial difficulty tiers. Avoid silently equating a familiar spelling with an approved answer.

Before importing external semantic data at scale, investigate suitable pinned, licensed sense/definition sources, including Open English WordNet, as editorial assistance rather than automatically treating definitions as publication-ready clues. See [Word Search design directions](word-search-roadmap.md#future-design-directions) for related thematic enrichment opportunities. Keep substantial lexical data as on-demand static assets; no runtime external dictionary or LLM dependency.

## Product composition

General-interest crosswords are the initial default: a smorgasbord of everyday language, science, nature, food, arts, sports, history and other topics. Breadth is valuable because crossings allow solvers with different knowledge to support one another's blind spots. Delight can arise from a well-phrased clue or an unexpected familiar sense, not just the rarity of an answer.

A themed crossword need not require all answers to share a topic. Thematic anchors can give a board an identity while ordinary fill preserves useful crossings and variety. Fully thematic boards and hidden relationships are interesting future experiences, not requirements for the initial Preview. Topic associations describe the sense being clued, not every possible meaning of its spelling. Do not assign themes by answer spelling alone. For now, retain broad vocabulary and editorially assess the distribution of subjects and clue styles; do not enforce arbitrary topic quotas. Future theme selection or candidate-board ranking should use actually selected senses and clue quality, not a word's unrelated meanings. No theme controls or global semantic infrastructure are needed yet.

## Playability-led content design

Crossword's core loop is interpreting a clue, proposing a word, and using its crossing letters to infer or revise other answers. The player should feel that progress supplies useful information. A valid grid full of uninteresting definitions, obscure spellings, or clues that depend on specialist knowledge without reasonable crossing support is not a satisfactory puzzle.

Keep Crossword as the puzzle type and Mini as the first format. General-interest puzzles should be the initial experience: approachable answers, a mix of direct and indirect clues, occasional moments of recognition or surprise, and mutually helpful crossings. Breadth across subjects is a desirable outcome, not a requirement to allocate entries by domain. Do not start by enumerating fields of knowledge, enforcing subject quotas, or treating a taxonomy as a content specification. A coherent and delightful puzzle may happen to concentrate on a few topics. Select content because it contributes to fair, satisfying play.

Useful clue styles include straightforward definitions, familiar examples, indirect descriptions, alternative senses, idioms, and restrained wordplay. For example, a clue for CLOUD might describe a weather phenomenon or allude to online photo storage. The latter sense is appropriate only when the clue, answer length, and crossings together give the player a fair route to it. Keep factual claims supportable; do not manufacture trivia or confuse a playful association with a definition. Do not expose difficulty levels until their actual experience can be distinguished. Future difficulty may vary clue directness, answer familiarity, crossing support and ambiguity, independently of board dimensions.

### Word-puzzle boundaries

The games differ in what the solver is given, what they must discover, and which information drives progress. Shared lexical sources are not evidence of shared solving mechanics.

| Puzzle | Reasoning loop | Semantic content |
| --- | --- | --- |
| Word Guess | Infer an unknown spelling from letter/position feedback | Existing spelling and familiarity criteria suffice; no new semantic dependency |
| Word Search | Recognize supplied words in a spatial field | Optional sense-aware thematic selection; no new content dependency in this slice |
| Crossword | Infer answers from clues and mutually constraining crossings | Primary consumer of sense-aware editorial enrichment |
| Word Connect (#202, planned) | Discover words from a reusable letter multiset | Familiarity and spelling first; no assumed semantic dependency |

Other potential word games, such as substitution cryptograms, word ladders, relationship/grouping puzzles and cryptic crosswords, would introduce distinct reasoning loops or clue conventions. They are examples of possible future consumers, not new roadmap commitments or reasons to generalize the current implementation. Cryptic Crossword may eventually be a format within Crossword where the interaction is shared, but its clue construction and fairness standards would need separate treatment.

## Sense-aware source acquisition and editorial pipeline

### Source choice and scope

Use the existing spelling and familiarity sources plus **regular Open English WordNet 2025** as the sole new external lexical source for this slice. The [publisher's downloads](https://en-word.net/downloads) and [2025 release](https://github.com/globalwordnet/english-wordnet/releases/tag/2025-edition) identify the core release separately from 2025+ and Namenet. The core release concentrates on ordinary lexical items; its reported 135,969 words, 107,519 synsets and 355,064 relations describe the upstream resource, not our eligible inventory or expected clue yield. The project publishes it under CC BY 4.0. Inspect its exact release notices and preserve the required attribution, including underlying WordNet notices where applicable, as described in [language-assets.md](language-assets.md#source-acquisition-and-rights).

Prefer the published [WN-LMF XML archive](https://en-word.net/static/english-wordnet-2025.xml.gz) as the first acquisition candidate because it explicitly represents lexical entries, senses and synsets and can be inspected with standard-library XML tooling. The publisher's [JSON archive](https://en-word.net/static/english-wordnet-2025-json.zip) is an alternative if inspection demonstrates a material advantage. Do not introduce both representations into the pipeline. The selection of actual input bytes remains provisional until archive contents, source identifiers, licence/notice material and SHA-256 are verified. No download or pin has been completed yet.

Defer Wikidata, ConceptNet, Wiktionary and other sources. Factual enrichment can be useful later when a playable clue requires it; bulk acquisition of a factual knowledge graph or domain-first classification is not justified by the current construction problem. The objective is playable clue coverage, not the largest possible graph.

### Acquisition and investigation

Use the existing offline asset approach. First retrieve the exact release, record its publisher, acquisition URL, release identifier, digest and licence notices, and inspect the actual format. Extract only information with a clear editorial purpose: lexical spelling and part of speech, sense/synset identifiers, definitions, usage indicators, and relevant lexical or semantic relationships. Keep source identifiers and relationships intact where they provide evidence; distinguish a specific word sense from its shared synset. Preserve original source text and spelling while deriving ASCII uppercase playable spellings separately. Source IDs are build-time provenance, not permanent runtime resource versions.

Measure candidate coverage against the existing familiarity and broad spelling inventories, especially three-, four- and five-letter words for Mini. Separately examine familiar short words and inflections missing from the WordNet intersection, including function words; do not automatically reject a useful answer because it lacks an upstream sense. Inspect examples of rare meanings attached to familiar spellings, ambiguity, regional variants, multiword expressions, and potentially unsuitable content. A source entry is a candidate, not approved fill. Report actual coverage, candidate senses by answer length, examples of omissions and surprising entries, and a representative sample of possible clues. Use those findings to decide how much of the source to retain for editing rather than adopting the whole source as a browser asset.

### Editorial enrichment

The main enrichment activity is authoring fair, engaging Crossword clues against specific meanings. Start with substantial ChatGPT-assisted editorial batches in development sessions, grounding each candidate in the actual source record where applicable. Preserve the connection between an authored clue and the supporting meaning or independent editorial rationale. Source definitions and relationships assist judgment, but are not automatically publication-ready clues. AI assistance is not evidence of independent human review. Review and solve representative boards and refine the content based on actual quality, not merely the number of records produced.

Allow independently authored common words, senses, inflections and clues where they improve fill and can be justified without a WordNet match. Useful relationships may later suggest Word Search theme memberships, but that is a separate editorial decision and consumer. Word Guess retains its present assets and eligibility. Do not build a single enrichment workflow to make the three games look symmetrical.

Keep authored content in the repository and make mechanical compilation deterministic. AI should not be invoked by normal builds, deployment or the browser. If the manual assisted process proves too costly, consider a deliberately invoked offline enrichment tool with inspectable input batches and retained output, rather than making a model service a runtime dependency. There is no need to provision it in advance. No arbitrary domain quotas, comprehensive ontology, exhaustive tagging requirements or per-clue bureaucratic review gates are needed. Invest in repeatable checks only for mechanical properties such as malformed records, duplicate spellings, references, answer lengths, and deterministic compilation.

### Construction and distribution

Keep the present distinction between answer spelling, sense and clue formulation. Construct using distinct eligible spellings, then select appropriate senses and clues deterministically. Adding a clue or a new sense must not independently increase a spelling's placement weight. If later composition preferences influence construction, evaluate the actual selected senses and clues rather than using unrelated senses as evidence. Preserve the hard crossing and topology guarantees. A broader bank should enable construction of genuinely distinct answer sets and more geometries without forced fill; more clue variants of the same answers do not solve the diversity problem.

Emit the smallest Crossword-specific runtime asset needed for construction and presentation, using the existing same-origin static asset and worker pattern. Full WordNet source archives, candidate evidence, source relations and editorial working material remain offline and must not enter the app's initial transfer or worker bundle. Include applicable attribution in published notices. Verify reproducible derivatives without a live upstream or LLM call. Keep the displayed clues, solution and topology within baseline integrity. No new service, database, generic word-game engine or historical corpus-version registry is required.

### Evidence-led delivery

1. Verify and inspect the selected source bytes and rights; measure lexical coverage and extract representative sense candidates.
2. Undertake a meaningful initial editorial batch, with original clues and independently justified exceptions. Determine whether source-grounded work measurably improves clue usefulness and composition compared with the small authored bank.
3. Compile the eligible corpus and measure distinct answer sets, construction success, latency, answer repetition and usable layout variety. Review actual solved grids and clue quality. Increase corpus breadth or improve the search only where the evidence identifies a bottleneck.
4. Implement and test the conventional solving interaction and existing platform integration. Keep the board and current clue primary on phones; make Across/Down navigation, letter entry, checking, Reset and Next puzzle predictable.
5. Expose Preview when there is meaningful replayability and a fair, usable solving experience, then refine through live play. Do not mistake source size or green structural tests for editorial or interaction quality.

The first acquisition step is outstanding. This design does not establish a fixed corpus-size target, approve a particular source archive digest, or claim that an external dataset has been ingested.


## Next slices

- Expand and review the clue bank and test a range of connected, fully checked layouts. Measure distinct answer sets, construction success, latency and actual solve quality rather than just grid count. Consider offline construction/compilation when larger search costs warrant it.
- Implement letter-entry and selection semantics: active cell and active Across/Down entry, crossing toggle, typing/advance, Backspace and arrows, clue selection, touch keyboard. The board and current clue dominate on mobile; the full clue list remains accessible.
- Integrate the dedicated Crossword generated/session model with the existing catalog, worker, resource identity, persistence, New/Reset and terminal presentation. Store player letters separately from the immutable solution; baseline integrity includes clue text, topology and answers. Do not expose misleading difficulty choices unsupported by the corpus.
- Assess larger formats after Mini is a fair, varied, responsive playable experience. Reuse topology and entry mechanics without creating a universal word-puzzle renderer.

The first domain slice deliberately does not register a route, catalog entry, workspace, runtime loader or session kind. It establishes a tested construction boundary for those subsequent changes.
