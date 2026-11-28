# Language assets and word-puzzle content

## Goal and boundary

Puzzle Forge should offer generous, trustworthy English vocabulary without maintaining a word-by-word database. Licensed external lexical datasets are **source assets**, acquired and transformed offline in the same spirit as the artwork ingestion pipeline. The deployed browser application consumes small, same-origin derivatives, not upstream dictionary services.

This contract serves **Word Guess**, **Word Search**, and **Crossword (Mini first)**. It can support further word games later, but does not require a universal word-game engine. A valid spelling is not necessarily a fair answer, appropriate themed word, or useful crossword fill.

## Source acquisition and rights

Maintain a small manifest of authoritative *dataset* sources: stable source URL, publisher, selected release, expected digest, license, and the intended use. Do not manually register every word or fetch an unspecified "latest" archive at build time.

Initial sources to evaluate and pin:

- **English Speller Database (ESDB; formerly SCOWL)**, https://wordlist.aspell.net/ and https://github.com/en-wl/wordlist — spelling inventory, variants, dialect and commonness classifications. The published 2026.02.25 speller/wordlist artifacts are a starting candidate, not an irrevocable release policy. Retain Kevin Atkinson's required copyright and permission notices in redistributed products and supporting documentation.
- **Open English WordNet (OEWN)**, https://en-word.net/downloads — word senses, semantic relations and definitions where needed. The regular 2025 edition is pinned in `assets/lexicon/sources.json` and consumed offline for Crossword editorial evidence. It is CC BY 4.0, with underlying Princeton WordNet notices; both are credited in `public/lexicon/NOTICE.txt`. See [Crossword design](crossword-design.md#lexical-content-architecture).
- **Crossword expansion candidates**: OEWN 2025+ (curated names), Wikidata (structured facts, CC0), and English Wiktionary/Wiktextract (informal vocabulary and phrases, with applicable CC BY-SA/GFDL terms). Evaluate exact releases and source-specific obligations before admission; no new archive is pinned by this design change. See [Crossword design](crossword-design.md#lexical-content-architecture).
- **wordfreq** is not a default dependency. Its frequency data incorporates CC BY-SA material and additional source notices. Reconsider it only if a demonstrated gain outweighs the licensing and derived-data obligations.

Before shipping any imported dataset, inspect its exact release contents and license/NOTICE files, preserve required notices in the repository and an accessible product attribution surface, and record the acquisition URL and SHA-256 digest. A source URL is provenance, **not** a runtime dependency. Do not infer permission to publish copied crossword clues from permission to use a dictionary.

## Ingestion and distribution

Use a reproducible, repository-owned ingestion recipe; the normal artifact-generation path may run in a trusted, branch-scoped GitHub Actions job, as artwork ingestion does.

1. Resolve only manifest-declared, pinned source archives; reject unexpected archive contents, checksum mismatches, and structural changes rather than guessing.
2. Extract eligible spelling and lexical data, normalize deterministically, and report removals, additions, conflicts, surprising terms, and changed counts for review.
3. Apply narrow, documented editorial exceptions where a source's general rules fail the product's quality bar. Prefer source classifications and reproducible rules to maintaining a manually edited master dictionary.
4. Emit deterministic, compact, independently addressable **derived assets** for the puzzle families. Track their provenance and digests; verify the committed artifacts without network access in ordinary CI.
5. Include required license/attribution notices with the published application and source repository. The player must not need a connection to ESDB, OEWN, a dictionary API, or an LLM to play.

Avoid adding a database service, end-user dictionary administration UI, service-side generation dependency, runtime source-version registry, or generic lexical schema beyond the fields actually used. A source release is pinned **for reproducible build input**, not interpreted as a versioned game engine at runtime.

## Language and selection policy

Start with one coherent **US English** content profile, recording source dialect labels rather than silently discarding them. Familiar alternative spellings may be accepted as guesses even when not chosen as default answers; spelling variants and inflections should be distinguished where the source allows. ASCII A–Z is a game-specific presentation restriction for the first word-puzzle implementations, not a reason to corrupt or indiscriminately transliterate the underlying lexical source.

Separate the concerns:

- **Spelling eligibility**: a broad accepted-guess vocabulary. Ordinary correctly spelled words should not be rejected merely because an answer list is small.
- **Answer eligibility**: a much smaller, demonstrably familiar and fair set. Avoid surprising obscurities, accidental offensiveness and implausible forms; assess quality with samples and actual play, not word length alone.
- **Word-sense eligibility**: meaning-specific theme membership or clue applicability. For example, CRANE can be a bird or a lifting machine; theme selection must not blindly attach to the spelling.
- **Crossword content**: reviewed clue–answer pairs, with provenance for externally sourced clues. Lexical definitions can assist construction but do not automatically constitute good crossword clues.

The compiled asset format should be as simple as the consumer needs. A Word Guess length-specific accepted-word list does not need definitions, pronunciations, or the entire WordNet graph. Word Search can consume theme-specific sets. Mini Crossword can consume curated clue/grid material. Share normalizing utilities only when they genuinely reduce duplication.

### Word Guess

Preserve the distinction between accepted guesses and eligible answers. Expand accepted guesses substantially beyond the current small hand-written list, across supported lengths, without promoting all valid spellings to possible solutions. Use broad lexical coverage and a deliberately selective answer pool; do not treat the entire large spelling dictionary as a high-quality answer list. Preserve duplicate-aware scoring and the existing keyboard, share, daily, and session experience.

### Word Search

Select familiar, meaningfully themed words. Difficulty changes directional/spatial complexity, **not** word obscurity. Guarantee that each listed target appears on one intended valid path and has no accidental second occurrence on the finished board; do not prohibit every incidental English word. Preserve touch dragging, endpoint and keyboard alternatives, completion, and session ownership.

### Crossword

Pursue 100,000+ distinct clue-bearing, construction-eligible grid forms, with broad offline acquisition unconstrained by the current grid sizes. Preserve natural expressions and senses independently of their normalized grid representation; names, slang, colloquialisms and multiword expressions are welcome when fair. Candidate inventories, approved crossword content and other puzzle eligibility remain separate. The compiled Mini bank remains small until reviewed content is integrated. Use original, source-grounded AI-assisted editorial enrichment at scale, and reject forced obscure fill; cross-checked spellings alone are insufficient proof of quality. Do not scrape copyrighted published crossword clues or require live clue generation. See [Crossword design](crossword-design.md#lexical-content-architecture) for the editorial and construction model.

## Client loading and runtime identity

Only the application shell and minimal catalog metadata should be needed at home. Load substantial word lists and clue collections when their respective games need them; use same-origin static assets and ordinary browser HTTP caching. A five-letter spelling list is small enough that one request on entering Word Guess is preferable to an elaborate sharding/caching framework. Do not make full semantic sources part of the startup JS or the puzzle worker bundle.

The current generator worker and workspace modules are statically linked; introducing asynchronous lexical assets may require loading before generation or within an asynchronous generation boundary. Choose the smallest sound integration when implementing, without changing unrelated puzzle behavior. Keep broader JS/worker code-splitting as a deferred, measured decision in the app runtime plan.

The canonical puzzle URL **already includes its random seed**, together with the material settings for that game. Retain the existing product policy: URLs describe generation under current app semantics, not permanent backward-compatible historical releases. Do not introduce runtime corpus version selection or legacy generator forks. However, a generated baseline checksum and restoration comparison must cover meaningful generated content (including the Word Guess answer), not just empty input cells. If changed assets or generation semantics invalidate saved progress, discard incompatible progress cleanly and offer a new puzzle; never silently attach guesses to a different solution.

## Delivery sequence and evidence

1. Establish and test licensed source ingestion, attribution, deterministic derivatives, and source/asset provenance. Choose an actual archive only after verifying its contents.
2. Integrate a broad accepted-guess bank and familiar answer selection into Word Guess; ensure answer-aware baseline integrity. Verify representative everyday guesses across word lengths, editorial exceptions, deterministic generation, and failure/recovery.
3. Add Word Search with small curated themes over the same lexical foundation, and test placement quality plus pointer/touch/keyboard selection.
4. Add Mini Crossword using validated clue–answer content, deterministic construction/selection, and conventional Across/Down navigation.
5. Reassess transfer size and startup effects with built assets and a network waterfall. Optimize only where the measured cost matters.

The completion criterion is a playable, fair product: broad guess acceptance, coherent themes and clues, reproducible seeded puzzles, minimal initial download, and rights that can be explained and verified. No dictionary-release migration or runtime version-control feature is part of this work.
