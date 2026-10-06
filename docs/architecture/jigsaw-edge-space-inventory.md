# Jigsaw Edge Generation

Puzzle Forge ships one edge-generation system. There is no staging layer between a "candidate" vocabulary and a production vocabulary: every profile/course listed here is reachable by ordinary product generation according to cut-style policy.

## Product model

A connected interior seam is:

```text
approach: BaselineCourse
> connector: ConnectorGrammar
> departure: BaselineCourse
```

A connectorless interior seam is:

```text
full-width BaselineCourse
```

Neighboring pieces still derive from one shared seam identity and receive exact reciprocal geometry.

## Connector vocabulary

Production ConnectorGrammar currently includes:

- Classic bulb
- Necked head
- Multi-lobe
- Scoop
- Serpentine
- Terrace
- Zigzag
- Stacked lock
- Compound lock
- Opposed dual lock
- Notched head

Compound lock contains two different local lock events inside one connector. Opposed dual lock places complete lock events on opposite sides of the nominal edge. Notched head adds a singular cleft to the neck/head structure.

`connectorless-wave` is an EdgeProfile rather than a ConnectorGrammar family because it intentionally contains no connector event.

## Baseline course vocabulary

The canonical BaselineGrammar remains the algebraic core:

- Straight
- Bow
- Inflection
- Angled course
- Dogleg
- Wave
- Stepped course

Production BaselineCourse adds course structures that require semantics outside that canonical AST:

- Separated bows
- Opposed pair
- Primary / secondary
- Inflection / rest / bow
- Same-side hairpin
- Opposed hairpin
- Counter hook

The span courses preserve deliberate quiet longitudinal runs and scale hierarchy. The reversal courses preserve one bounded forward -> backward -> forward excursion with explicit quiet runway before and after the fold.

## Cut-style policy

The player-facing styles are curated policies over the same production-safe vocabulary:

- **Classic** stays intentionally restrained: Classic bulb / Necked head connectors and a small familiar baseline palette.
- **Flowing** emphasizes rounded connectors and smooth bow / inflection / wave courses.
- **Geometric** emphasizes terrace / zigzag / stacked-lock connectors and angular course grammar.
- **Intricate** emphasizes compound, opposed, notched, and other multi-event structures with richer baseline courses.
- **Eclectic** can select every production EdgeProfile and every production BaselineCourse.

A generated game still chooses one coherent EdgeProfile for the board while sampling approach/departure courses from a deterministic puzzle-level sub-palette.

No extra player-facing control is required for individual grammar families.

## Safety invariants

Production geometry remains deterministic and must preserve:

- exact seam endpoints;
- reciprocal neighbor geometry;
- corner depth restraints;
- bounded edge depth;
- no self-crossing piece outlines;
- safe whole-piece composition across polarity extremes;
- topology-preserving baseline placement: local course geometry is scaled uniformly into the corner envelope instead of being pointwise clipped;
- reversal runway, backtrack, and rail-clearance bounds.

Contoured outer boundaries remain a separate independent product axis and use the subset of canonical BaselineGrammar families proven safe inside the artwork bounds.

## Deliberately excluded directions

Asymmetric catch and hook-catch did not justify separate connector identities beyond Scoop-adjacent geometry. True nested/enclosed locks cross toward piece topology rather than ordinary open-edge grammar and therefore do not belong in the connector catalog.

That topology boundary is now concrete: #191 ships **Circular medallion** as the first special-piece family, and #190 / PR #260 owns its **Off · Rare · Always** product policy. Special pieces may reuse shared rendering, solved-space, interaction, and validation machinery, but they do not become ConnectorGrammar or BaselineCourse entries merely because they introduce unusual boundaries.

The shipped edge vocabulary is therefore the current ordinary edge-generation contract. Future connector work should add or remove production vocabulary directly, with the same safety and product tests, rather than maintaining a parallel research catalog. Future special-piece families should be documented separately once more than one family exists; #261 tracks the proposed Capsule family.
