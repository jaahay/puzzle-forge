# Jigsaw Edge-Space Inventory

This document records the current inventory of ordinary Jigsaw seam structure and the development-only probes that should be explored before claiming that the connector/non-connector design space is mature.

It does **not** add production connector families. Production generation remains curated through `ConnectorGrammar`, `BaselineGrammar`, `SeamProgram`, and the existing Traditional / Unconventional policy.

## Scope

The inventory distinguishes three layers:

1. **non-connector course** — the approach/departure path between a true piece corner and the interlocking event;
2. **connector structure** — the local mating event or events shared by two ordinary neighboring pieces;
3. **piece topology** — how many boundary segments/neighbors a piece has and whether it remains one rectangular-grid cell.

The first two belong to ordinary seam exploration. The third belongs primarily to #191 and should not be smuggled into ConnectorGrammar.

A fourth axis cuts across the first two: **connector cardinality**. The current `SeamProgram` always contains exactly one connector. That means two legitimate structural questions remain open before the ordinary seam space can be called mature:

- can an interior seam intentionally contain **no interlocking event**, relying on course shape/image rather than a knob-like lock?
- when one seam contains several lock events, are they still one composite ConnectorProduction or do they deserve independent seam-level ownership?

The default answer should remain one connector until play evidence justifies changing that invariant.

## External cut survey

A small external survey was used to challenge the current catalog rather than to copy named commercial styles.

- Bob Armstrong's historical cutting-style classification describes not only knob cuts but long/thin arms and long/angular, long/round, long/jagged, long/wavy, long/bumpy, long/foot, and scroll-like cutting patterns; it also describes some such cuts as less interlocking. This is evidence that whole-boundary course and connector cardinality matter independently of ordinary knobs.
- Jack-in-the-Box Puzzles distinguishes knobby, swirly, artistic, and grid cuts; its swirly description explicitly calls out hooks, curls, swirls, and mushroom-like forms.
- Modern ribbon-vs-random descriptions consistently distinguish regular grid-aligned interlocks from irregular/freeform cuts with varied piece shapes.
- Whimsy/figural pieces are a topology/whole-piece phenomenon rather than evidence that ordinary four-sided seams need more connector labels.

References:

- https://www.oldpuzzles.com/history-techniques-styles/jigsaw-puzzle-cutting-styles-new-method-classification
- https://www.jitbpuzzles.com/styles.html
- https://puzzlemerchant.com/blogs/piece-of-mind-puzzle-blog/jigsaw-puzzle-ribbon-cut-vs-random-cut
- https://nautiluspuzzles.com/

The useful conclusion is not that Puzzle Forge should imitate historical labels. It is that the broader physical design space contains structural ideas—hooks, curls, long arms, scrolls, irregular courses, and figural topology—that our current ordinary connector catalog only partially samples.

## Current ordinary-seam coverage

The production connector catalog already covers a strong set of structural neighborhoods:

| Neighborhood | Current coverage |
| --- | --- |
| one ordinary protrusion | Classic bulb |
| overhanging head with neck/undercut | Necked head |
| repeated lateral crowns | Multi-lobe |
| one-sided back-biting sweep | Scoop |
| meaningful occupancy on both sides of the nominal edge | Serpentine |
| repeated orthogonal course changes | Terrace |
| repeated diagonal course changes | Zigzag |
| repeated radial chamber/waist cycles | Stacked lock |

The non-connector BaselineGrammar covers straight travel, same-side deflection, crossing, offset course, repetition, opposition, and longitudinal mirroring.

That is enough to make the current production vocabulary strong. It is not an exhaustive basis for every ordinary seam structure.

## Underexplored seam cardinality

Before adding connector families, explicitly probe the seam-level cases that today's `approach -> connector -> departure` model excludes.

### Connectorless interior seam

A shared interior boundary may be distinctive without containing a conventional lock event at all.

This is not the same as a flat seam: BaselineGrammar or a future course grammar could still produce a strong matching silhouette. Digital play also does not require physical friction to keep assembled sections together.

**Priority:** high as a development-only probe. Do not change the production seam contract until its solving value is demonstrated.

### Multiple connector events

The connector probes below intentionally keep several local lock events inside one composite ConnectorProduction. That is the conservative model.

Only promote connector cardinality above one at the `SeamProgram` level if independent event ownership materially improves generation, solving semantics, or safety. Avoid turning every local bump into a first-class connector.

## Underexplored connector neighborhoods

The development-only structural evaluation in `connectorProductionEvaluation.ts` maps all eight production families into one candidate AST and then defines probes outside the current catalog.

### Paired lock

Two separately legible lock events share one seam.

This is different from Multi-lobe because the events need not be copies of one another. A useful survivor should read as two clues with a deliberate relationship, not as visual clutter.

**Priority:** high.

### Opposed dual lock

Two full lock events occupy opposite sides of the nominal edge.

This goes beyond Serpentine's one crossing gesture because each side owns a complete mating event. It directly tests whether whole-seam tab/blank polarity remains the right abstraction.

**Priority:** high, but semantically disruptive.

### Asymmetric catch

A unilateral sweep, undercut, and head form a catch rather than a centered bulb/head or Scoop.

This revisits the useful part of the historical hook/curl neighborhood without assuming that a literal curl is geometrically safe.

**Priority:** high.

### Nested lock

One locking structure is contained inside another rather than appearing before or after it.

The existing connector programs are fundamentally serial. If nested geometry is compelling, ConnectorGrammar needs a hierarchical construct; pretending nesting is just another sequence would be dishonest.

**Priority:** medium-high.

### Notched head

A single cleft/notch changes the matching clue inside an otherwise coherent head.

This tests whether a cusp/notch can be an irreducible structural event instead of merely an angular rendering choice.

**Priority:** medium.

### Hook catch / longitudinal reversal

The seam deliberately moves forward, doubles back along the edge axis, forms a catch, and resumes.

The earlier Curl/Hook family failed because convincing curl geometry self-intersected. The broader longitudinal-reversal category has not been disproved; it needs a dedicated safety model rather than another hand-drawn curl attempt.

**Priority:** medium-high, geometry risk high.

### Mixed lock

Different lock motifs share one seam—for example, a lobe followed by a chamber/waist cycle.

This is the cleanest probe of structural hierarchy without adding a scale operator prematurely.

**Priority:** high.

## Representative sketch pass

The first hand-authored representative sketch pass is source-controlled in:

![Jigsaw edge-space exploration atlas](./assets/jigsaw-edge-exploration-atlas.svg)

These sketches are **not** generated by a ConnectorProduction geometry compiler. They are deliberately simple visual hypotheses used to decide which structural directions deserve the cost of common realization. Their safety checks prove only that the sketched open paths are finite, anchored, bounded, and free of proper self-intersection.

Accordingly, this pass can prioritize or deprioritize hypotheses, but it cannot prove that two structural productions are geometrically equivalent or that a direction should be permanently rejected.

### Advance to common realization

- **Compound lock** — the paired-lock and mixed-lock sketches suggest one useful broader question: can multiple different lock events remain legible when composed serially? Use one exploration category initially; the realizer may later prove multiple irreducible subfamilies.
- **Opposed dual lock** — the sketch is plainly two-sided and therefore worth realizing. It is the strongest challenge to whole-seam tab/blank polarity.
- **Notched head** — a singular cleft remains visually legible enough to justify a common-realizer trial.
- **Connectorless wave** — advance as a seam-level probe, not a connector family. It is the cleanest test of zero connector cardinality.

### Deprioritize or route toward topology

- **Asymmetric catch** and **Hook catch** both sketch into the Scoop-adjacent neighborhood. Deprioritize them for now, but do not claim equivalence until common realization exists.
- **Nested lock** looks notch-like when drawn as one simple open path. That suggests true containment may require enclosed/branching geometry and therefore may belong closer to topology work; the sketch alone does not prove this.
- **Paired lock** versus **Mixed lock** should begin under one Compound-lock exploration heading rather than receiving separate production names before geometry earns that distinction.

This narrows the next realization pass to four high-value hypotheses without pretending the hand-authored sketches are generated survivors.

## Common-realizer seam trial

The next development-only layer uses production geometry semantics as building blocks rather than trusting the representative sketches.

`edgeProbeRealizer.ts` realizes the four advanced hypotheses as complete seams:

- **Compound lock** composes one seeded Classic bulb and one seeded Necked head as two local lock events inside one composite connector.
- **Opposed dual lock** composes two independently seeded Necked heads on opposite sides of the nominal edge while still treating the result as one composite connector.
- **Notched head** starts from the seeded production Necked-head realization and applies one explicit crown cleft.
- **Connectorless wave** realizes a full-width seeded Wave baseline with connector cardinality zero.

The realizer tracks **seam connector cardinality** separately from the number of local lock events. Compound lock and Opposed dual lock therefore remain one connector each with two internal lock events; only Connectorless wave changes seam cardinality to zero. This preserves the conservative SeamProgram model while testing richer connector structure.

For connector probes, the same existing BaselineGrammar realizers supply approach and departure roles. The experiment retains the current corner-depth attenuation rather than giving development candidates a more permissive safety envelope.

The trial is deliberately not wired into `SeamProgram`, `edgePaths.ts`, generation identity, or cut-style policy.

Executable sweeps require every advanced hypothesis to remain:

- deterministic;
- anchored to the complete seam endpoints;
- inside the ordinary 32% edge-depth envelope;
- free of proper self-intersection;
- safe as one complete piece outline with the other three sides straight;
- reciprocal under the same reverse/mirror/polarity relationship used by neighboring production edges;
- compatible with every current BaselineGrammar family in both approach and departure roles.

This is stronger evidence than the hand-authored atlas, but still not a promotion decision. Perceptual quality at normal play scale remains a separate curation step.

## Underexplored non-connector neighborhoods

Three limitations are now explicit rather than hidden inside the generic baseline explorer.

### Separated gestures

The current production AST treats `identity` as algebraic identity and removes it from sequences. That is correct normalization, but it means the language cannot say:

> gesture -> deliberate quiet baseline span -> second gesture

An explicit span-consuming baseline run is semantically different from algebraic identity. If visual exploration proves this useful, add a dedicated run/span concept rather than weakening identity normalization.

## Explicit span-allocation experiment

The development-only `baselineSpanExplorer.ts` tests two non-connector language gaps without weakening the production BaselineProduction algebra.

It introduces an exploration-only composition layer with two term kinds:

- **gesture** — an ordinary BaselineProduction realized through the existing generic production realizer, assigned a bounded longitudinal span and amplitude;
- **run** — an explicit span-consuming quiet baseline interval.

That distinction matters because production `identity` is correctly algebraic: it disappears inside `baselineSequence()`. A deliberate quiet interval has spatial extent and therefore cannot honestly be represented by identity.

Four bounded probes exercise the idea:

- **Separated bows** — two same-side gestures with a substantial quiet interval.
- **Opposed pair** — separated gestures on opposite sides of the baseline.
- **Primary / secondary** — one dominant gesture followed by a smaller subordinate gesture, testing scale hierarchy.
- **Inflection / rest / bow** — a more complex crossing gesture, deliberate rest, then a simpler secondary gesture.

Broad deterministic sweeps keep each candidate anchored, longitudinally monotonic, bounded, and free of proper self-intersection.

The experiment supports two architectural conclusions:

1. **Separated gestures are a real expressive gap.** If promoted later, they deserve an explicit span/run concept rather than weakening identity normalization.
2. **Scale hierarchy can be expressed through local span/amplitude allocation without minting another named BaselineGrammar family.** Whether that deserves a production combinator remains a perceptual/product question.

The experiment does not alter `JigsawBaselineProduction`, the named BaselineGrammar catalog, SeamProgram, or production generation.

### Longitudinal reversal

The generic candidate validator requires monotonic travel along the edge. This intentionally excludes non-connector hooks/backtracks.

Do not remove that guard merely to generate more shapes. A reversal experiment needs its own bounded path and self-intersection rules first.

### Scale hierarchy

The generic realizer allocates longitudinal space uniformly across instructions. It can generate complicated structures, but it cannot structurally state that one gesture is dominant and another subordinate.

If this proves perceptually useful, the likely abstraction is local span allocation or hierarchical sub-production—not arbitrary extra named families.

## What is not an ordinary connector problem

The following remain topology rather than seam-vocabulary work:

- branching boundaries;
- enclosed holes or disconnected boundary components;
- circular/medallion pieces;
- pieces with arbitrary neighbor counts;
- multi-cell/L-shaped pieces;
- whole-piece figural/whimsy shapes;
- globally random/non-grid tessellation.

Those may reuse rendering and validation machinery, but they should stay conceptually under #191 unless a concrete implementation proves otherwise.

## Connector AST evaluation

The structural prototype supports:

- primitive events;
- ordered sequence;
- bounded repeat;
- opposition across the nominal edge;
- longitudinal mirroring;
- explicit nesting.

The structural skeleton of all eight current production families maps cleanly into that language. Their tuned runtime parameter/program types still remain necessary for current production realization.

That is enough evidence that a ConnectorProduction AST is useful as a **design/exploration language**.

It is not yet evidence that production ConnectorGrammar should be rewritten around it. The existing tuned realizers remain the production source of truth until a generic connector realizer can match their safety and visual quality.

## Promotion standard

An exploratory structure should be promoted only when all of these hold:

1. it can be realized deterministically and safely;
2. it remains legible when embedded in a complete approach -> connector -> departure seam;
3. it remains distinguishable at ordinary play scale, not merely when enlarged in an atlas;
4. it is not continuously reducible to an existing family through ordinary parameter changes;
5. reciprocal neighbor geometry and whole-piece safety remain exact;
6. it adds a useful solving clue or visual character rather than merely more event count;
7. it survives broad seeded sweeps without requiring hand-picked exceptions.

Zero promotions is an acceptable result.

## Next exploration sequence

1. Compare the safe complete connector/seam probes and the span-allocation candidates against the existing atlases at normal play scale.
2. Probe non-connector longitudinal reversal under a dedicated stricter safety model rather than relaxing the current monotonic validator.
3. Promote only recurring, clearly irreducible survivors.
4. Keep nested/enclosed geometry behind topology work unless a simple-boundary realizer proves otherwise.
