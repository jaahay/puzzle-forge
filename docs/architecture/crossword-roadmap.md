# Crossword

Issue [#201](https://github.com/jaahay/puzzle-forge/issues/201) defines Crossword as one product type, beginning with a Mini format. A technically valid fill is not automatically a good crossword. Begin small to establish clue quality, crossing constraints and a comfortable mobile solving loop; the compact grid is not the eventual limit of the engine.

## Initial domain slice (not yet playable)

The first construction experiment uses a five-by-five, rotationally symmetric staircase template: 19 letter cells, six blocks, five Across and five Down entries, each three to five letters long. Every letter is crossed by both directions; all white cells are connected. Across and Down starts share a conventional row-major clue number. Geometry and entry cells are derived from the block layout, not separately authored. Symmetry is an incidental property of this viable initial template, not a mandatory rule for all future formats.

The bounded, seeded construction search chooses the most constrained unfilled entry from the eligible clue bank, backtracks on inconsistent crossings or exhausted domains, and prohibits duplicate answers on a board. Only records with an explicitly supplied clue can enter the search. It does not fall back to arbitrary spellings, reversed answers or invented filler. The search returns the first eligible complete fill in its seeded ordering; content eligibility is an editorial decision, not a claim that the search can evaluate literary clue quality. A fixed node budget bounds failure cost.

The first corpus is a proof of construction and clue semantics, not a launch-sized content bank. Expand both the number of distinct answer sets and viable templates before exposing it as a Preview. Transposition alone does not constitute substantial replayability. Evaluate quality by reading and solving actual boards as well as verifying construction.

## Content and provenance

The initial `public/lexicon/crossword/mini-clues.json` contains 110 original clue/answer pairs, written for this repository with AI assistance. Four- and five-letter candidate spellings were drawn from the existing pinned familiar-answer inventory in `assets/lexicon/word-guess-answers.json`; three-letter candidates were independently proposed as ordinary vocabulary. The existing lexical source provenance and attribution are in [language-assets.md](language-assets.md) and `public/lexicon/NOTICE.txt`. No published crossword clues or external definitions were copied. The clue bank itself is repository-authored material, not an imported crossword corpus. Independent human editorial QA is still required.

Eligibility is crossword-specific: recognizable answers, clear sense, grammatical agreement between clue and answer, no forced crosswordese or arbitrary proper names. One clue per answer suffices for this slice; the answer is its identity in the bank. Future sense-specific alternative clues should earn separate identity only when used. Prefer direct clues initially rather than artificial difficulty tiers. Avoid silently equating a familiar spelling with an approved answer.

Before expanding the corpus, investigate suitable pinned, licensed sense/definition sources, including Open English WordNet, as editorial assistance rather than automatically treating definitions as publication-ready clues. See [Word Search design directions](word-search-roadmap.md#future-design-directions) for related thematic enrichment opportunities. Keep substantial lexical data as on-demand static assets; no runtime external dictionary or LLM dependency.

## Next slices

- Expand and review the clue bank and test a range of connected, fully checked layouts. Measure distinct answer sets, construction success, latency and actual solve quality rather than just grid count. Consider offline construction/compilation when larger search costs warrant it.
- Implement letter-entry and selection semantics: active cell and active Across/Down entry, crossing toggle, typing/advance, Backspace and arrows, clue selection, touch keyboard. The board and current clue dominate on mobile; the full clue list remains accessible.
- Integrate the dedicated Crossword generated/session model with the existing catalog, worker, resource identity, persistence, New/Reset and terminal presentation. Store player letters separately from the immutable solution; baseline integrity includes clue text, topology and answers. Do not expose misleading difficulty choices unsupported by the corpus.
- Assess larger formats after Mini is a fair, varied, responsive playable experience. Reuse topology and entry mechanics without creating a universal word-puzzle renderer.

The first domain slice deliberately does not register a route, catalog entry, workspace, runtime loader or session kind. It establishes a tested construction boundary for those subsequent changes.
