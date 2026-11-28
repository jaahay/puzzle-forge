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

The initial construction policy requires connected playable cells, fully checked letters (every letter belongs to both directions), a minimum entry length of three, and distinct answer spellings. Geometry defines entry starts and lengths. Rotational symmetry is a useful aesthetic convention, not a universal requirement. Multiword expressions and names are eligible expansion content when their natural form maps unambiguously to ordinary A–Z cells. Rebus cells, digits, unchecked letters, cryptic clue systems and other grid conventions remain separate extensions.

## Solving experience

### The active entry

The selected cell and its active Across or Down entry are distinct concepts. Keep the paper-like grid neutral; identify the current cell with a restrained outline and orientation marker. Emphasize only the active clue typographically, without boxed, filled or underlined clue states. Retain both clue associations in accessible descriptions. Selecting a cell preserves the current direction, including repeated selection of the same cell. Selecting the crossing clue changes direction at the same cell; selecting an unrelated clue moves focus to its first unfilled cell (or its first cell when full).

Typing a letter replaces the current cell and advances within the active entry. Backspace clears the current cell; when it is empty, it moves back and clears the preceding cell when one exists. Arrow keys navigate playable cells spatially and establish the corresponding direction when useful. Do not turn ordinary navigation into destructive editing or trap browser shortcuts. When entering a blank cell, advance to the next blank in the active entry, skipping all already entered letters regardless of correctness. If no later blank exists, remain at the just-entered cell. When replacing or re-entering an existing letter, advance exactly one cell within the entry, even if it is filled. This permits straightforward answer rewrites. Neither mode wraps to an earlier blank, changes direction, or jumps to another clue. Arrows skip blocks within the same row or column without wrapping. Home and End select the first or last cell of the active entry, Delete clears the selected cell without moving, and Enter or Space changes direction. Tab retains ordinary browser focus navigation. On an active Crossword page, ordinary letter typing begins at the selected cell without requiring a click or autofocus of a text field. When a committed catalog selection leaves its dropdown focused at board arrival, transfer focus to the non-editable board group, leaving other focused controls alone. This permits immediate typing without summoning the native mobile keyboard. The shared keyboard-ownership guard protects focused controls, dialogs, composition and browser shortcuts. Once a cell has focus, its native-input handler owns editing and navigation. No global navigation keys are claimed from an unfocused page. The clue lists are the sole visible clue presentation; direct clue selection replaces sequential Previous/Next controls. Selecting a clue from the list brings its target into view. An arrow that cannot move does not change direction. These conventions preserve control over edits and avoid unexpectedly moving to another clue. The [New York Times cursor settings](https://thenewyorktimeshelpcenter.helpjuice.com/360052406391-The-New-York-Times-Crossword-Puzzle), [Apple News movement settings](https://support.apple.com/en-gb/guide/iphone/iph9c11382ff/ios) and [Arkadium crossword settings](https://support.arkadium.com/en/support/solutions/articles/44001739824--crossword-tips-settings-scoring-useful-shortcuts) distinguish direction, filled-square skipping and end-of-entry progression; these are design precedents, not evidence of a single universally preferred default. The Mini uses one predictable policy rather than a settings panel. Following [W3C keyboard interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/), keep visible focus and ordinary Tab/Shift+Tab navigation between controls rather than appropriating Tab for clue traversal.

The player can choose any clue at any time. Across and Down lists are organized separately and sorted by clue number. Selection must remain synchronized between clue list, grid, keyboard focus and active clue. The puzzle should be equally operable with keyboard, pointer and touch, with native text inputs for letter entry on phones without a physical keyboard. No application-rendered QWERTY keyboard is needed.

### Workspace composition

The centered grid and the Across/Down clue lists form one working surface. Place the two clue columns directly below the board so the board keeps its usual centered position regardless of clue length. Keep Mini clues visible in normal page flow without nested scrolling; do not scroll the page as a side effect of typing. Avoid duplicate clue text and permanent navigation chrome. This composition is a Mini-specific design subject to browser playtesting, not a constraint on larger formats.

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

Each distinct grid form is one construction candidate, independent of how many written expressions, senses or clues map to it. In General puzzles, select a sense and clue after filling, using a separate deterministic random stream. Reordering source records, senses, topics or clues does not change seeded play. Wording-only edits do not change General fill. If thematic construction depends on eligible senses, changing their eligibility or associations can legitimately change fill. This preserves the distinction between actual grid diversity and different wordings of the same grid.

A broader corpus should enable varied layouts and answer sets. Candidate-board preference, when warranted, should favor playable, interesting fills and well-distributed footholds rather than raw topic counts. If semantic composition later influences construction, reason about the actual selected senses. The bounded fill algorithm rejects obvious repeated spelling variants (such as OWE and OWES) as well as duplicate answers, drawing only from editorially approved clue-bearing words. This is a narrow redundancy guard, not a general morphological or semantic equivalence test. Construction-guided enrichment adds familiar words that actually enable crossings, rather than indiscriminately increasing the bank. Further editorial quality and replayability work remains useful.

### Resource and session semantics

Use canonical seeded resources and the existing session model. Identity includes only materially consumed generation settings; it does not contain player progress or introduce a runtime corpus-version registry. Baseline integrity covers topology, solution and displayed clues. Regenerate the baseline and restore compatible player letters through ordinary session ownership; incompatible progress must not attach silently to a different solution. Persist only durable or useful session state, not redundant representations of derived entries. Undo and redo use the shared header controls and conventional keyboard shortcuts (including while a letter cell has focus). Each accepted letter insertion, replacement or deletion is one history action; selecting cells/clues and checking are not actions. Retain up to 120 letter-only snapshots, including the current undo/redo position across resumption. New edits discard the redo branch; Reset clears history. Completion locks edits and history, consistent with other editable puzzles. Undo and redo leave the transient cursor and direction unchanged and clear checking feedback.

## Lexical content architecture

### Spellings, senses and clues

A spelling can refer to several meanings, and a meaning can support multiple natural clue formulations. For example:

- SEED: plant reproduction (nature, garden), tournament ranking (sports), and procedural generation input (technology, games).
- The plant sense can have both a straightforward definition and a more evocative garden clue.

Topic associations describe a sense, not a word indiscriminately. Sense labels are editorial descriptors, not a proposed global ontology. Source lexical identifiers and relationships are useful evidence at build time; do not confuse a lexical sense with the shared synset it references.

Crossword is the primary consumer of substantial editorial enrichment. Word Search may later benefit from sense-aware theme associations; Word Guess primarily consumes spelling and familiarity, and Word Connect primarily consumes constructible familiar words. Shared lexical knowledge does not imply shared puzzle engines or equal enrichment needs. Word association/grouping, cryptograms, word ladders and cryptic crosswords illustrate further possible reasoning loops, not commitments to implement them.

### Sources and editorial enrichment

Retain the existing spelling and familiarity foundation. Regular Open English WordNet 2025 was the sole new semantic source for Mini. The broader programme pursues **100,000+ distinct, clue-bearing, construction-eligible grid forms**, without a length ceiling tied to current formats. This is an ambition, not a release quota or an assertion that all acquired entries qualify. Candidate acquisition and editorial approval are separate counts; additional meanings and clue variants do not inflate the grid-form count.

Evaluate Open English WordNet 2025+ (curated names from NameNet), Wikidata (structured cultural and factual knowledge), and English Wiktionary through Wiktextract (informal senses, idioms, abbreviations and phrases) alongside the pinned regular WordNet archive. Publisher references: [OEWN releases](https://en-word.net/downloads), [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access), [Wiktionary extracts and license](https://kaikki.org/dictionary/). These are candidates, not yet pinned or approved for redistribution. Verify exact archives, license terms, provenance and attribution under the shared acquisition contract before using new sources. In particular, Wiktionary-derived material carries share-alike obligations; do not assume AI paraphrasing removes them. Keep source-specific evidence and obligations distinguishable. Do not import commercial or noncommercial-only crossword lists without suitable redistribution rights, or copy published crossword clues.

Follow the acquisition and rights contract in [language-assets.md](language-assets.md). The [publisher's downloads](https://en-word.net/downloads) and [2025 release](https://github.com/globalwordnet/english-wordnet/releases/tag/2025-edition) distinguish the regular release from expanded proper-name content. The published [WN-LMF XML distribution](https://en-word.net/static/english-wordnet-2025.xml.gz) is the first acquisition candidate; the published [JSON distribution](https://en-word.net/static/english-wordnet-2025-json.zip) is an alternative, not a second required input. Verify the actual release bytes, SHA-256, format, source identifiers and licence/notice material (published CC BY 4.0, with applicable underlying notices) before pinning or distributing derivatives. The supplied regular XML archive is pinned by SHA-256 in `assets/lexicon/sources.json`; the XML identifies OEWN 2025 and CC BY 4.0. The publisher's independent checksum is not available in the inspected release information. Both upstream attribution notices are retained in `public/lexicon/NOTICE.txt`, accessible from About.

Inspect all lengths, including those beyond the currently playable formats. Investigate missing short crossing words, longer entries, function words, inflections, regional variants, colloquial expressions, names and ambiguous candidates. WordNet is evidence, not automatic eligibility; useful independently authored common answers may lack a suitable source sense.

Preserve the natural written expression (case, spaces, punctuation and source identity) separately from its grid form. For the initial A–Z acquisition projection, remove spaces, apostrophes and hyphens from otherwise ASCII-letter expressions, uppercase, and require at least three letters; do not silently strip arbitrary symbols, transliterate, or fold digits into letters. Unsupported expressions stay in offline source evidence with no candidate grid form. For example, `NO DICE` maps to `NODICE`, while `O'Neill` maps to `ONEILL`. `unionized` and `un-ionized` share `UNIONIZED` but retain different expressions and meanings. A spelling-bank match on a grid form is not proof that the natural expression or sense is familiar. Treat normalization as a construction projection, not lexical identity.

The existing WordNet inspector now exports all source senses and reports per-length candidate coverage and normalization collisions. The compiler validates the full editorial inventory without a format-specific length ceiling, then publishes only three-to-five-letter entries to the Mini asset. Acquisition does not change playable content.

Author clues offline in substantial AI-assisted editorial batches, grounded in source records where applicable. Preserve the supporting sense or independent rationale, review actual puzzles, and retain authored content in the repository. Do not equate AI authorship with independent human review. Prefer purposeful editorial judgment to comprehensive taxonomy or mandatory per-domain coverage. General-audience suitability is an editorial property of the chosen sense and clue, not an exhaustive denylist of spellings. Do not conflate broad guess acceptance, authored answers, and incidental letter sequences. Keep inappropriate senses out of the published clue bank; avoid runtime moderation infrastructure or claiming exhaustive substring filtering. At the intended scale, use a deliberately invoked, resumable offline enrichment process: stable source/sense references and expression identities identify candidate work; retain authored decisions and evidence; compile approved material deterministically. Process substantial batches with model-assisted authorship and critical editorial re-review, rather than requiring the product owner to vet each record. Distinguish mechanical validity from editorial judgment and factual verification. Measure actual token, cost and quality tradeoffs before selecting a batch-service implementation; no runtime model or permanent enrichment backend is required.

### Editorial craft

The aim is the experience of an edited crossword rather than a collection of dictionary tests. Admit familiar proper names, places, fictional characters, brands, abbreviations, slang, colloquial language, idioms, exclamations and phrases when the intended clue is fair for the audience. Frequency is useful evidence, not a veto; do not mistake a common written form for a common meaning. Prefer broadly recognizable references over arbitrary trivia, while letting occasional specialist knowledge add texture. Preserve register, dialect, temporal context and part of speech when they affect clue accuracy. A clue must agree with its answer in tense, number and grammatical role, signal abbreviations or informal language when needed, and not accidentally contain the answer.

Authored clues should span direct footholds, examples, contextual and cultural associations, fill-in-the-blank expressions, indirect definitions and playful reinterpretations. Use alternate formulations for the same sense as an aid; a different sense of the same letters is not an alternative clue for the original meaning. For example, `NO DICE` can be clued by “Not a chance!” or “Response to a rejected proposal”; `PIANO` by “Instrument with keys but no locks”; `REST` in the musical sense by “Written instruction to remain silent”. These are illustrative original clues, not additional published bank entries. Ground factual clues in dependable source evidence, favor stable facts over current officeholders or volatile rankings, and check uncertain facts rather than guessing. Do not invent entities, senses, quotations or word origins. Avoid copying long dictionary glosses or published puzzle clues.

Assess fairness at the board level. A clue may reasonably suggest several same-length answers before crossings; avoid unresolvable ambiguity or intersections that require multiple obscure answers. A difficult clue should reward inference, not an arbitrary unknown proper noun. Prefer varied answers and clue styles, useful longer entries and recognizable thematic anchors, without quotas or a compulsory taxonomy. The construction algorithm should consume only editorial properties that demonstrably influence fill or solving; keep richer source evidence offline. Review complete puzzles, repeated fills, sampled clues and held-out seeds. Mechanical checks can reject malformed data and contradictory letters, not certify wit or human solving experience. Record AI-assisted review honestly; production play observations inform refinement but are not a prerequisite for every editorial batch.

The committed editorial inputs are `assets/lexicon/crossword/authored.json`, additional `authored-*.json` shards using the same record format, and `wordnet-clues.tsv` plus `wordnet-clues-*.tsv` shards (exact source sense ID and optional natural expression) (individual source sense identifiers with original clues). Use `python3 scripts/build_crossword_lexicon.py --archive /path/to/english-wordnet-2025.xml.gz --candidates /path/to/candidates.jsonl` to verify the archive and extract source evidence for editorial investigation, and `--verify` to check the committed playable derivative offline. Compile deterministic, compact Crossword-specific static assets. Keep full upstream data, candidate evidence and editorial working material offline. Normal builds, deployment and play do not invoke an LLM or a live dictionary. The deployed worker loads substantial puzzle-specific content on demand from the same origin. Preserve attribution and reproducibility without a new backend, database service or universal word-game engine.



For source-guided editorial work, add `--drafts /path/to/drafts.jsonl` to an explicit `--archive` invocation. It writes one offline record per not-yet-admitted grid form with all source senses, natural expressions, part of speech, definitions and same-synset/same-part-of-speech synonym hints. Familiar expressions are prioritized without automatically rejecting unfamiliar ones. A hint is not an approved clue: frequency alone can choose a rare meaning of a common word, synonyms can differ in register, and crossings do not excuse imprecision. Edit and admit selected records in the existing authored or source-backed shards, then re-run the queue to omit admitted grid forms. Use `--candidates` when enriching additional senses of already-admitted forms. No raw evidence or draft output is published.

## Implementation context and delivery

This document describes the puzzle's intended experience and design, not a delivery checklist. [Issue #201](https://github.com/jaahay/puzzle-forge/issues/201) tracks implementation and acceptance; related issues and pull requests should link here when they change the design. Update this document when durable design decisions change, and track work status in GitHub rather than duplicating it here.

The Mini format now has seven viable 5 × 5 geometries with 17–21 playable cells and ten entries each. Several are deliberately asymmetric; full checking, connection and fair fill matter more than conventional rotational symmetry. Its original repository-authored, AI-assisted bank had 160 spellings, 197 senses and 229 clue formulations. The WordNet editorial batches supplement it with 263 individually selected source-backed senses and original clues (including 61 spellings selected through construction experiments). A subsequent construction-guided editorial batch adds 141 independently authored clues and spellings selected from the pinned familiar spelling inventory. The compiled bank has 555 distinct spellings, 601 senses and 633 clues. The compiled runtime bank contains no source definitions or semantic graph. Four- and five-letter candidates were drawn from the existing familiar inventory, and three-letter candidates were independently proposed. No published crossword clues or external definitions were copied. See the shared lexical notices for source attribution. Independent editorial QA remains outstanding.

A subsequent offline AI-authored editorial expansion added 858 distinct Mini-eligible grid forms, including 104 cultural, 72 geographical, 122 informal and 59 phrase entries, retaining natural source expressions in the authored bank and projecting only clue-bearing grid material into the deployed bank. The new inventory contains 1,413 grid forms, 1,459 senses and 1,602 clue formulations, including additional alternatives for existing selected meanings. These are independently authored clues, not copied definitions, and have not undergone independent human editorial review. The construction quality and named-entity balance require production observation. This is a partial editorial delivery, not completion of the 100,000+ objective.

The next independently authored batch adds 1021 distinct forms (478 Mini-eligible and 543 longer than Mini), with natural expressions retained. It emphasizes ordinary language, household objects, food, nature and idiomatic expressions. The total editorial inventory is 2434 grid forms; the Mini projection has 1891. Longer forms are available to future format work but are not downloaded or consumed by Mini. The clues are AI-authored and editorially selected, not independently human-vetted; no new external source is redistributed in this batch.

The source-guided batch adds 922 distinct forms (47 Mini-length and 875 longer), emphasizing music, visual art, literature, science, astronomy, geography, transportation, food and everyday language. Each new record retains an exact OEWN source sense reference, natural expression and original AI-authored clue. Total editorial coverage is 3356 grid forms; Mini projection is 1938. Source reference validation is distinct from independent human editorial review. The ranked queue is an acquisition and authoring aid, not a publication gate.

The familiar-language expansion adds 1193 distinct forms (1015 Mini-length and 178 longer), chiefly previously missing entries from the pinned familiarity bands. Separate original clues and source senses for BALL, FIRE and PLOT illustrate why the same grid form can support multiple meanings. The corpus now contains 4549 forms; Mini publishes 2953. The batch is AI-authored and not independently human-vetted. No new external source is introduced.

Independent construction experiments on the expanded bank found 192 distinct answer sets across the seven geometries; a 1,024-seed reproduction produced 147 distinct answer sets and 218 filled grids without failure. These are construction experiments, not launch-level diversity or independent editorial validation. The interaction slice provides a controlled board with shared letter-entry transitions for hardware and native keyboards, baseline-bound progress, selection and clue navigation. Crossword is registered as a Mini Preview using ordinary seeded resources, on-demand clue loading, session persistence and shared commands. Corpus expansion and browser QA remain tracked work. The Preview should offer meaningful replayability, fair clues and a comfortable solving experience, not merely passing construction tests.

See also [Word Search design directions](word-search-roadmap.md#future-design-directions) for related semantic opportunities and [language assets](language-assets.md) for shared acquisition and distribution policy.

Explicit Check inspects only entered letters and marks mismatches without revealing answers or changing progress. Feedback is transient and clears on the next edit or reset. Correctness is not exposed continuously, and blank cells are not marked wrong.
