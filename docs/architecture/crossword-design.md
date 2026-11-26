# Crossword — design

## Introduction

A crossword is a puzzle in which the player discovers words by interpreting clues and reconciling their shared letters. Unlike a word search, the words are not supplied: the solver must infer them. Unlike Word Guess, the information comes from language and intersecting answers rather than feedback on successive guesses.

The pleasure lies in recognition, deduction and revision. A familiar clue supplies a foothold; its letters help reveal a harder answer; that answer opens another part of the grid. A satisfying puzzle alternates moments of immediate recognition with moments of insight.

**A technically valid fill is not automatically a good crossword.** Puzzle Forge aims for procedurally constructed puzzles with an editorial sensibility: fair, varied, approachable, occasionally witty, and enjoyable to solve. The player experience governs vocabulary selection, clue writing, layout and difficulty.

## The puzzle

### Anatomy

A rectangular grid consists of playable letter cells and blocked cells. A maximal contiguous horizontal run of playable cells is an **Across** entry; a vertical run is a **Down** entry. Each entry has a clue and a fixed answer length. A crossing is a shared cell belonging to an Across and a Down entry. Its letter must satisfy both answers.

Entries are numbered by scanning the grid from top left to bottom right, assigning the next number to each cell that begins an entry. A cell beginning both an Across and a Down entry receives a single number. Entries are distinguished by number and direction, not by number alone.

A simple illustration is a single crossing: CAT (Across: “Pet that purrs”) intersects TEA (Down: “Drink brewed from leaves”) at T. Knowing CAT establishes the first letter of TEA; knowing TEA can establish the last letter of CAT. Neither answer requires a separate correctness signal to supply the other with information.

### Rules and completion

The player is given the grid geometry, numbered clues and empty letter cells. The answer lengths follow from the geometry. They may enter, erase or replace letters in any order and move between entries freely. Every cell contains a single A–Z letter in the initial format. Blocked cells are not editable.

Letters belong to cells, not to entries: editing a crossing changes both answers immediately. An incorrect but syntactically valid letter is a legitimate tentative guess and must not be rejected solely because it disagrees with the solution. A fully occupied grid is not necessarily solved. Completion requires every playable cell to match the intended solution. Ordinary checking assistance, if exposed, must be deliberate rather than permanent correctness feedback. A fair clue may permit several initial guesses; crossings should resolve plausible alternatives. The generator's intended fill is not by itself proof that every alternative interpretation is impossible.

### Formats

Crossword is a single puzzle type. **Mini** is its initial format, using 5 × 5 grids and answers of three to five letters. It offers a short, approachable solving session, a readable phone-sized board, and a manageable construction problem. Larger formats extend the same clue, entry, crossing and cell-editing mechanics; they are not separate puzzle engines.

The initial construction policy requires connected playable cells, fully checked letters (every letter belongs to both directions), a minimum entry length of three, and distinct answer spellings. Geometry defines entry starts and lengths. Rotational symmetry is a useful aesthetic convention, not a universal requirement. Rebus cells, multiword answers without spaces, unchecked letters, cryptic clue systems and other conventions are possible extensions, not implied by this initial format.

## Solving experience

### The active entry

The selected cell and its active Across or Down entry are distinct concepts. Highlight the active entry softly and the current cell more prominently. The active clue and its number/direction stay easy to read. Selecting a cell preserves the current direction where possible; selecting the same crossing again toggles direction. Selecting a clue activates its entry and moves focus into it, preferably to an unfilled cell when one exists.

Typing a letter replaces the current cell and advances within the active entry. Backspace clears the current cell; when it is empty, it moves back and clears the preceding cell when one exists. Arrow keys navigate playable cells spatially and establish the corresponding direction when useful. Do not turn ordinary navigation into destructive editing or trap browser shortcuts. For the initial interaction, typing advances one cell (even if already filled) and stops at the entry end; arrows skip blocks within the same row or column without wrapping. Home and End select the first or last cell of the active entry, Delete clears the selected cell without moving, and Enter or Space changes direction. Tab retains ordinary browser focus navigation. These conventions preserve control over edits and avoid unexpectedly moving to another clue.

The player can choose any clue at any time. Across and Down lists are organized separately and sorted by clue number. Selection must remain synchronized between clue list, grid, keyboard focus and active clue. The puzzle should be equally operable with keyboard, pointer and touch, with letter entry available on phones without a physical keyboard.

### Workspace composition

The grid and current clue are the primary working surface. On wide screens, the full clue list can sit alongside the grid; on narrow screens, keep the grid and current clue together and expose the complete clue list through an accessible, compact presentation. Do not shrink the grid to fit a permanent wall of controls or instructions.

The visual states of a cell communicate selection, focus, editable versus blocked status and any explicitly requested checking feedback. Do not rely on color alone. Use concise accessible names identifying cell position, clue/entry context and current letter as appropriate. All actions must have keyboard and touch equivalents. Explanation belongs in a guide or deliberate disclosure rather than the active surface.

Reuse the application's conventions for New, Reset, Today where enabled, Share, completion and Next puzzle. Reset clears progress, not the generated puzzle. Shared actions retain their established meaning. A finished crossword should make continuing to another puzzle easy without exposing answers unexpectedly.

## Clues, vocabulary and fairness

### Clue design

A clue is an invitation to infer a particular meaning of an answer, not merely a definition attached to its spelling. Good clues are natural, grammatically appropriate, truthful, and sufficiently discriminating when considered alongside answer length and crossing information.

| Answer | Meaning | Illustrative clue |
| --- | --- | --- |
| CLOUD | Atmospheric phenomenon | A visible mass of droplets or ice crystals in the sky |
| CLOUD | Online computing | Where your photos might be stored online |
| SEED | Plant reproduction | What a garden can begin with |
| SEED | Tournament ranking | Ranked entrant in a tournament |
| SCALE | Measuring instrument | Device for weighing groceries |
| SCALE | Musical sequence | Notes arranged in ascending or descending order |

A clue need not be a dictionary definition. Direct definitions provide footholds; examples, familiar associations, fill-in-the-blank phrases, alternate senses and restrained wordplay provide variety and moments of delight. Uncommon words, abbreviations, inflections, proper nouns and specialist knowledge are not forbidden in principle, but should be admitted only when fair and useful. Avoid arbitrary trivia, crosswordese, unsupported factual claims and forced obscurity. Clues should not accidentally reveal their own answer through careless wording.

One clue can be ambiguous in isolation without being unfair. Difficulty should arise from interpretation and the interplay of crossings, not from the absence of a reasonable path to the answer. Review actual solved boards rather than judging isolated clues alone.

### Content composition and themes

General-interest puzzles are the natural initial experience: a smorgasbord of familiar language, everyday knowledge and unexpected associations. Breadth is valuable because different clues give different players footholds. **Subject domains are supporting information, not quotas or a content specification.** A coherent puzzle may happen to concentrate on a few topics.

Themes need not constrain every word. The following are distinct design opportunities:

- General: diverse subjects and clue styles, with no required common topic.
- Thematic anchors: a handful of connected answers give the puzzle a personality; ordinary answers support the crossings.
- Immersive themes: most answers relate to one subject or situation, where enough fair compatible fill exists.
- Hidden relationships: selected answers reveal a common pattern, linguistic trick or secondary discovery.

General is the initial design. The other experiences are optional extensions, not requirements for the first playable format. A theme must describe the meaning actually being clued rather than an unrelated sense of the same spelling.

### Difficulty

Difficulty is not synonymous with grid size. A compact crossword can be quite challenging, and a larger grid can be approachable. Useful dimensions include answer familiarity, clue directness, wordplay, ambiguity, entry length, crossing support, layout density and the distribution of easier footholds.

Treat these as interacting design dimensions, not an initial wall of configuration controls. Do not expose named difficulty tiers until corpus and playtesting evidence support a perceptible distinction. Prefer increasingly rewarding inference over increasingly obscure answers.

## Construction model

### Domain and invariants

A generated crossword has an immutable topology (dimensions and blocks), a solution letter per playable cell, and clue-bearing entries. Numbering and entry cell paths derive from geometry. Mutable progress consists of the player's letters, together with selection state only where useful. Correctness and completion can be derived from player letters against the baseline. Keep this model distinct from Word Search paths, Word Guess histories and numeric-grid solving semantics.

An eligible construction must satisfy the chosen format's topology policy; every entry has the appropriate length, every crossing agrees, and every entry has a usable clue. The initial policy disallows repeated answer spellings even if their senses differ. Reject disconnected, malformed or unfillable layouts rather than weakening clue quality to force a result.

### Generation and quality

The initial generator selects a layout and candidate ordering deterministically from the seed, fills the most constrained remaining entry first, and backtracks when crossings or candidate domains become inconsistent. A bounded search prevents pathological latency and fails explicitly if no eligible fill is available.

Each distinct spelling is one construction candidate, independent of how many senses or clues it has. Select a sense and clue after filling, using a separate deterministic random stream. Reordering source records, senses, topics or clues does not change seeded play. Clue-only edits do not change fill. This preserves the distinction between actual grid diversity and different wordings of the same grid.

A broader corpus should enable varied layouts and answer sets. Candidate-board preference, when warranted, should favor playable, interesting fills and well-distributed footholds rather than raw topic counts. If semantic composition later influences construction, reason about the actual selected senses. The bounded fill algorithm rejects obvious repeated spelling variants (such as OWE and OWES) as well as duplicate answers, drawing only from editorially approved clue-bearing words. This is a narrow redundancy guard, not a general morphological or semantic equivalence test. Construction-guided enrichment adds familiar words that actually enable crossings, rather than indiscriminately increasing the bank. Further editorial quality and replayability work remains useful.

### Resource and session semantics

Use canonical seeded resources and the existing session model. Identity includes only materially consumed generation settings; it does not contain player progress or introduce a runtime corpus-version registry. Baseline integrity covers topology, solution and displayed clues. Regenerate the baseline and restore compatible player letters through ordinary session ownership; incompatible progress must not attach silently to a different solution. Persist only durable or useful session state, not redundant representations of derived entries.

## Lexical content architecture

### Spellings, senses and clues

A spelling can refer to several meanings, and a meaning can support multiple natural clue formulations. For example:

- SEED: plant reproduction (nature, garden), tournament ranking (sports), and procedural generation input (technology, games).
- The plant sense can have both a straightforward definition and a more evocative garden clue.

Topic associations describe a sense, not a word indiscriminately. Sense labels are editorial descriptors, not a proposed global ontology. Source lexical identifiers and relationships are useful evidence at build time; do not confuse a lexical sense with the shared synset it references.

Crossword is the primary consumer of substantial editorial enrichment. Word Search may later benefit from sense-aware theme associations; Word Guess primarily consumes spelling and familiarity, and Word Connect primarily consumes constructible familiar words. Shared lexical knowledge does not imply shared puzzle engines or equal enrichment needs. Word association/grouping, cryptograms, word ladders and cryptic crosswords illustrate further possible reasoning loops, not commitments to implement them.

### Sources and editorial enrichment

Retain the existing spelling and familiarity foundation, and use regular Open English WordNet 2025 as the sole new external semantic source for the initial acquisition investigation. Its meanings, definitions and relationships offer evidence for clue authorship and candidate selection. Defer Wikidata and other semantic or factual databanks until actual playability needs justify them. Source size is not an objective.

Follow the acquisition and rights contract in [language-assets.md](language-assets.md). The [publisher's downloads](https://en-word.net/downloads) and [2025 release](https://github.com/globalwordnet/english-wordnet/releases/tag/2025-edition) distinguish the regular release from expanded proper-name content. The published [WN-LMF XML distribution](https://en-word.net/static/english-wordnet-2025.xml.gz) is the first acquisition candidate; the published [JSON distribution](https://en-word.net/static/english-wordnet-2025-json.zip) is an alternative, not a second required input. Verify the actual release bytes, SHA-256, format, source identifiers and licence/notice material (published CC BY 4.0, with applicable underlying notices) before pinning or distributing derivatives. The supplied regular XML archive is pinned by SHA-256 in `assets/lexicon/sources.json`; the XML identifies OEWN 2025 and CC BY 4.0. The publisher's independent checksum is not available in the inspected release information. Both upstream attribution notices are retained in `public/lexicon/NOTICE.txt`, accessible from About.

Inspect the intersection with the familiarity and broad spelling inventories, especially three- to five-letter words, and examine omitted function words, inflections, regional variants, rare senses and ambiguous candidates. Keep original source spelling separate from playable normalization. WordNet is evidence, not automatic eligibility; useful independently authored common answers may lack a suitable source sense.

Author clues offline in substantial AI-assisted editorial batches, grounded in source records where applicable. Preserve the supporting sense or independent rationale, review actual puzzles, and retain authored content in the repository. Do not equate AI authorship with independent human review. Prefer purposeful editorial judgment to comprehensive taxonomy or mandatory per-domain coverage. General-audience suitability is an editorial property of the chosen sense and clue, not an exhaustive denylist of spellings. Do not conflate broad guess acceptance, authored answers, and incidental letter sequences. Keep inappropriate senses out of the published clue bank; avoid runtime moderation infrastructure or claiming exhaustive substring filtering. Consider a deliberately invoked offline enrichment tool only if the manual assisted process warrants it.

The committed editorial inputs are `assets/lexicon/crossword/authored.json` and `wordnet-clues.tsv` (individual source sense identifiers with original clues). Use `python3 scripts/build_crossword_lexicon.py --archive /path/to/english-wordnet-2025.xml.gz --candidates /path/to/candidates.jsonl` to verify the archive and extract source evidence for editorial investigation, and `--verify` to check the committed playable derivative offline. Compile deterministic, compact Crossword-specific static assets. Keep full upstream data, candidate evidence and editorial working material offline. Normal builds, deployment and play do not invoke an LLM or a live dictionary. The deployed worker loads substantial puzzle-specific content on demand from the same origin. Preserve attribution and reproducibility without a new backend, database service or universal word-game engine.

## Implementation context and delivery

This document describes the puzzle's intended experience and design, not a delivery checklist. [Issue #201](https://github.com/jaahay/puzzle-forge/issues/201) tracks implementation and acceptance; related issues and pull requests should link here when they change the design. Update this document when durable design decisions change, and track work status in GitHub rather than duplicating it here.

The Mini format now has seven viable 5 × 5 geometries with 17–21 playable cells and ten entries each. Several are deliberately asymmetric; full checking, connection and fair fill matter more than conventional rotational symmetry. Its original repository-authored, AI-assisted bank had 160 spellings, 197 senses and 229 clue formulations. The WordNet editorial batches supplement it with 263 individually selected source-backed senses and original clues (including 61 spellings selected through construction experiments). A subsequent construction-guided editorial batch adds 141 independently authored clues and spellings selected from the pinned familiar spelling inventory. The compiled bank has 555 distinct spellings, 601 senses and 633 clues. The compiled runtime bank contains no source definitions or semantic graph. Four- and five-letter candidates were drawn from the existing familiar inventory, and three-letter candidates were independently proposed. No published crossword clues or external definitions were copied. See the shared lexical notices for source attribution. Independent editorial QA remains outstanding.

An independent 1,024-seed reproduction of the initial search produced 34 distinct grids and 17 distinct answer sets without failure. This is construction evidence, not launch-level diversity. The interaction slice provides a controlled board with shared letter-entry transitions for hardware and on-screen keyboards, baseline-bound progress, selection and clue navigation. Crossword is registered as a Mini Preview using ordinary seeded resources, on-demand clue loading, session persistence and shared commands. Corpus expansion and browser QA remain tracked work. The Preview should offer meaningful replayability, fair clues and a comfortable solving experience, not merely passing construction tests.

See also [Word Search design directions](word-search-roadmap.md#future-design-directions) for related semantic opportunities and [language assets](language-assets.md) for shared acquisition and distribution policy.
