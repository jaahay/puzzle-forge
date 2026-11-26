# Crossword

Issue [#201](https://github.com/jaahay/puzzle-forge/issues/201) defines Crossword as one product type, beginning with a Mini format. A technically valid fill is not automatically a good crossword. Begin small to establish clue quality, crossing constraints and a comfortable mobile solving loop; the compact grid is not the eventual limit of the engine.

## Initial domain slice (not yet playable)

The first construction experiments use two five-by-five, rotationally symmetric staircase geometries: one with 19 letter cells and six blocks, and one with 17 letter cells and eight blocks. Both have five Across and five Down entries, each three to five letters long. Every letter is crossed by both directions; all white cells are connected. Across and Down starts share a conventional row-major clue number. Geometry and entry cells are derived from the block layout, not separately authored. Symmetry is an incidental property of this viable initial template, not a mandatory rule for all future formats.

The bounded, seeded construction search chooses the most constrained unfilled entry from the eligible clue bank, backtracks on inconsistent crossings or exhausted domains, and prohibits duplicate answers on a board. Only records with an explicitly supplied clue can enter the search. It does not fall back to arbitrary spellings, reversed answers or invented filler. The search returns the first eligible complete fill in its seeded ordering; content eligibility is an editorial decision, not a claim that the search can evaluate literary clue quality. A fixed node budget per layout bounds failure cost; try the layouts in seeded order. Fill selection is independent of the number of clues or senses associated with a spelling.

The first corpus is a proof of construction and clue semantics, not a launch-sized content bank. Expand both the number of distinct answer sets and viable templates before exposing it as a Preview. Transposition alone does not constitute substantial replayability. Evaluate quality by reading and solving actual boards as well as verifying construction.

## Content and provenance

The initial `public/lexicon/crossword/mini-clues.json` contains 160 distinct answer spellings with original, sense-specific clues, written for this repository with AI assistance. Four- and five-letter candidate spellings were drawn from the existing pinned familiar-answer inventory in `assets/lexicon/word-guess-answers.json`; three-letter candidates were independently proposed as ordinary vocabulary. The existing lexical source provenance and attribution are in [language-assets.md](language-assets.md) and `public/lexicon/NOTICE.txt`. No published crossword clues or external definitions were copied. The clue bank itself is repository-authored material, not an imported crossword corpus. Independent human editorial QA is still required.

Eligibility is crossword-specific: recognizable answers, clear sense, grammatical agreement between clue and answer, no forced crosswordese or arbitrary proper names. Each answer is one fill candidate, regardless of its number of senses. A sense has an editorial meaning label, potentially overlapping topic associations and one or more clue formulations. These are local content descriptors, not a global ontology or runtime version registry. After constructing a fill, select a sense and then a clue deterministically using a separate random stream. Reordering records, topics, senses or clues does not affect seeded play. Clue-only edits do not change fill; the selected clue remains part of baseline integrity. Prefer a mixture of direct and approachable playful clues rather than artificial difficulty tiers. Avoid silently equating a familiar spelling with an approved answer.

Before expanding the corpus, investigate suitable pinned, licensed sense/definition sources, including Open English WordNet, as editorial assistance rather than automatically treating definitions as publication-ready clues. See [Word Search design directions](word-search-roadmap.md#future-design-directions) for related thematic enrichment opportunities. Keep substantial lexical data as on-demand static assets; no runtime external dictionary or LLM dependency.

## Product composition

General-interest crosswords are the initial default: a smorgasbord of everyday language, science, nature, food, arts, sports, history and other topics. Breadth is valuable because crossings allow solvers with different knowledge to support one another's blind spots. Delight can arise from a well-phrased clue or an unexpected familiar sense, not just the rarity of an answer.

A themed crossword need not require all answers to share a topic. Thematic anchors can give a board an identity while ordinary fill preserves useful crossings and variety. Fully thematic boards and hidden relationships are interesting future experiences, not requirements for the initial Preview. Topic associations describe the sense being clued, not every possible meaning of its spelling. Do not assign themes by answer spelling alone. For now, retain broad vocabulary and editorially assess the distribution of subjects and clue styles; do not enforce arbitrary topic quotas. Future theme selection or candidate-board ranking should use actually selected senses and clue quality, not a word's unrelated meanings. No theme controls or global semantic infrastructure are needed yet.

## Next slices

- Expand and review the clue bank and test a range of connected, fully checked layouts. Measure distinct answer sets, construction success, latency and actual solve quality rather than just grid count. Consider offline construction/compilation when larger search costs warrant it.
- Implement letter-entry and selection semantics: active cell and active Across/Down entry, crossing toggle, typing/advance, Backspace and arrows, clue selection, touch keyboard. The board and current clue dominate on mobile; the full clue list remains accessible.
- Integrate the dedicated Crossword generated/session model with the existing catalog, worker, resource identity, persistence, New/Reset and terminal presentation. Store player letters separately from the immutable solution; baseline integrity includes clue text, topology and answers. Do not expose misleading difficulty choices unsupported by the corpus.
- Assess larger formats after Mini is a fair, varied, responsive playable experience. Reuse topology and entry mechanics without creating a universal word-puzzle renderer.

The first domain slice deliberately does not register a route, catalog entry, workspace, runtime loader or session kind. It establishes a tested construction boundary for those subsequent changes.
