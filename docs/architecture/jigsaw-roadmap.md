# Jigsaw Roadmap

This document records the staged architecture that brought Jigsaw from a square-tile prototype to picture-backed custom-edge play, and scopes the remaining directions. Phases 1–3 below are implemented in the current codebase; they are retained as design rationale and validation guidance rather than as pending work.

## Product requirements

Jigsaw has two must-have product requirements:

1. Support arbitrary picture-backed jigsaw puzzles, with an initial implementation for sourcing pictures.
2. Support custom edges, with an initial repository of edge-shape types.

A third direction is intentionally only a future-compatible design constraint:

- Keep the edge model open to non-four-edge tessellations later, but do not implement arbitrary tessellation in the first Jigsaw work.

## Non-goals for the first Jigsaw slices

- Do not require user accounts or cloud storage.
- Do not require arbitrary uploaded image persistence across browser sessions.
- Do not require drag-and-drop before click/tap swapping is product-acceptable.
- Do not require visually interlocking custom-edge masks in the same slice as image-backed square pieces.
- Do not implement hex, triangle, Voronoi, or freeform tessellation yet.

## Phase 1: Image-backed square-piece Jigsaw

Goal: turn Jigsaw from generated color-field tiles into real picture-backed puzzles while preserving the existing square grid, seeded shuffle, click/tap swap model, solved-state detection, and local progress.

### User-facing behavior

- User can choose a picture from a small bundled image repository.
- The full source picture is sliced into an `N x M` grid of pieces.
- Each piece displays the crop from its solved position, even while rendered at its current shuffled position.
- The preview control shows the full source picture, not a synthetic gradient.
- Reset returns the puzzle to its seeded shuffled order and predictably overwrites or clears saved local progress.
- The same seed, dimensions, and image id produce the same shuffled puzzle.

### Initial picture sourcing

Use a bundled in-repo image repository first. This keeps the first slice deterministic and avoids CORS, privacy, object URL, and storage-limit complexity.

Recommended first source shape:

```ts
type JigsawImageAsset = {
  kind: "image";
  id: string;
  title: string;
  src: string;
  alt: string;
  attribution?: string;
};
```

Recommended initial asset policy:

- store a small curated set under `public/jigsaw/` or an equivalent static asset path;
- keep image metadata in a typed module near `src/games/jigsaw/`;
- preserve the generated color-field asset as a fallback or debug source, but do not treat it as the primary product path.

### Data model impact

The current tile model can remain mostly intact for Phase 1:

```ts
type JigsawPiece = {
  id: string;
  currentIndex: number;
  solvedIndex: number;
  row: number;
  column: number;
};
```

The generated puzzle asset should expand from generated palette-only metadata into image-capable metadata. The important invariant is that the puzzle records the selected image source so persistence, sharing, and reproducibility are stable.

### Rendering approach

Render every piece using the same source image. The piece's solved row and column determine `background-position`; the board dimensions determine `background-size`; the piece's current index determines where the piece appears now.

For example, a `4 x 4` puzzle can use the full image at `400% 400%` background size and position each piece crop by solved coordinates.

### Validation

Add tests for:

- deterministic tile order for seed + dimensions + image id;
- generated puzzle includes the selected image asset identity;
- tile count and solved indexes match dimensions;
- reset semantics, if reset logic is extracted from the component;
- malformed or missing persisted tile order falls back safely.

Manual QA still needs mobile viewport checks because visual cropping and board sizing are layout-sensitive.

## Phase 2: Edge model and edge-shape repository

Goal: add durable custom-edge semantics before attempting complex visual masking.

### Edge model

Prefer a future-compatible edge array over a permanently four-property shape. Rectangular Jigsaw pieces will still receive four edges, but the type should not make non-four-edge tessellation impossible later.

```ts
type JigsawEdgeSide = "top" | "right" | "bottom" | "left";
type JigsawEdgePolarity = "flat" | "tab" | "blank";

type JigsawPieceEdge = {
  edgeId: string;
  side?: JigsawEdgeSide;
  neighborPieceId: string | null;
  neighborEdgeId: string | null;
  boundary: boolean;
  profileId: JigsawEdgeProfileId;
  polarity: JigsawEdgePolarity;
  seedOffset: number;
};

type JigsawPiece = {
  id: string;
  currentIndex: number;
  solvedIndex: number;
  row: number;
  column: number;
  edges: JigsawPieceEdge[];
};
```

### Edge-shape repository

See [Jigsaw Connector Grammar Design](./jigsaw-connector-families.md) for the visual identification guide, grammar-by-grammar design intent, tuning snapshot, generated atlas, and rejected/collapsed productions.

The edge repository is now **grammar-first**. Ordinary connector entries are distinct structural productions rather than cosmetic names backed by one shared formula. Curated cut-style product policy owns connector selection weights in `cutStyle.ts`; connector metadata stays with the grammar definitions themselves. The generator chooses one connector grammar once per puzzle, so cut-style weights shape variety across games rather than within one board. Individual seams then vary deterministically within that grammar.

```ts
type JigsawConnectorGrammarId =
  | "classic-bulb"
  | "necked-head"
  | "multi-lobe"
  | "scoop"
  | "serpentine"
  | "terrace"
  | "zigzag"
  | "stacked-lock";
```

The current ordinary productions are:

- **Classic bulb** — `lobe`
- **Necked head** — `neck > undercut > head > undercut > neck`
- **Multi-lobe** — `repeat(lobe > saddle){2..4}`
- **Scoop** — `outer-sweep > scoop > return`
- **Serpentine** — `lobe > cross-baseline > opposed-lobe`
- **Terrace** — `repeat(step > plateau){2..4}`
- **Zigzag** — `repeat(zig > zag){2..4}`
- **Stacked lock** — `chamber > waist > chamber`

This catalog intentionally collapses earlier labels that differed only by continuous tuning. Mushroom, Keyhole, and Bottle all reduced to the same necked-head production. Dovetail, T-lock, and Arrowhead likewise did not justify separate structural identities merely through head shape or angular treatment. The experimental Curl/Hook production was removed when a convincing inward curl repeatedly violated self-intersection safety; it was not diluted into a cosmetic variant of Scoop.

Each interior edge still stores only `profileId + seedOffset`. Those values deterministically derive a grammar program, realize that program into normalized two-dimensional geometry, and then apply seeded width, depth, placement, lean, optional handedness, polarity, and side orientation. Renderer-derived control points are not persisted.

The shared geometry engine deliberately remains separate from grammar identity:

1. grammar derivation determines structural events;
2. grammar realization produces canonical normalized anchors;
3. common placement expands those anchors into the edge coordinate system;
4. common polarity/orientation logic produces reciprocal neighboring seams;
5. common rendering converts organic grammars to cubic Bézier segments and angular grammars to line segments;
6. common validation checks bounds and self-intersection.

This allows bounded-repeat grammars such as Multi-lobe, Terrace, and Zigzag to make discrete structural RNG decisions in addition to continuous dimension changes, without requiring one universal connector formula.

Connector placement should use a substantial portion of the available edge rather than concentrating every silhouette near the midpoint. Grammar-specific span ranges occupy much of an ordinary edge. The generated connector may bias left or right when its width leaves room; its legal center interval is derived from the actual seeded horizontal envelope plus a grammar-specific corner buffer.

Vertical proportion is a catalog-wide aesthetic constraint. Broad seams should not become visually stumpy: sampled connector height remains meaningfully substantial relative to horizontal span across every grammar. The geometry safety envelope allows up to 32% of a piece side where needed, while individual grammar ranges stay topology-specific to avoid adjacent-edge collisions.

No generator/resource versioning or compatibility machinery is introduced here. Puzzle Forge remains explicitly pre-versioning; changes to grammar or geometry may intentionally change seeded Jigsaw output until that policy is changed.

### Edge invariants

- Every border edge is flat and has no neighbor.
- Every interior edge has a neighbor edge.
- All interior edges in one generated puzzle share the puzzle's selected connector grammar during the initial rollout.
- Neighboring interior edges share the same profile id and seed offset.
- Neighboring interior edges have inverse polarity: `tab` against `blank`.
- Connector geometry may be non-monotonic along the owning edge; generated seams are instead required to remain non-self-intersecting.
- Generated connector points stay inside the declared visual/hit-test depth bound.
- Every ordinary connector grammar maintains a substantial vertical-to-horizontal seam proportion rather than becoming broad and visually stumpy.
- Connector placement preserves explicit corner room while allowing safe left/right bias when the seeded width leaves available edge space.
- Distinct grammars should remain visually distinguishable at ordinary play scale rather than differing only through small width/depth perturbations.
- Within the current generator implementation, the same seed, dimensions, image id, and cut style produce the same edge graph.

### Validation

Generator and geometry tests cover:

- border edges are flat;
- right/left adjacent edges are compatible;
- bottom/top adjacent edges are compatible;
- generated edges are deterministic;
- each generated puzzle uses exactly one connector grammar while different puzzle seeds can select across the catalog;
- each grammar has a distinct structural production;
- bounded-repeat grammars can derive different event counts from different seeds;
- organic connector segments render with curves and intentionally angular connector segments remain angular, while baseline rendering is independently smooth or angular;
- generated seam geometry remains finite, bounded, and non-self-intersecting across a broad deterministic seed sweep;
- complete four-edge piece outlines remain non-self-intersecting across broad seed and polarity coverage;
- every interior edge has exactly one neighbor edge.

### Baseline grammar seam composition

Ordinary interior seams no longer assume that geometry outside the connector event is permanently straight.

The canonical seam model is:

```text
approach: BaselineGrammar
> connector: ConnectorGrammar
> departure: BaselineGrammar
```

BaselineGrammar is itself compositional. The current implementation separates:

```text
primitive vocabulary
    ↓
sequence / repeat / oppose / mirror
    ↓
canonical named productions
    ↓
seeded family parameters
    ↓
realization
```

The primitive vocabulary is `identity / deflect / cross / course`. Smooth, diagonal, and orthogonal motion remain realization choices rather than grammar primitives. Current canonical productions are Straight, Bow, Inflection, Angled course, Dogleg, Wave, and Stepped course. Straight is the non-connector identity case; it does not replace or flatten the ConnectorGrammar event.

Named baseline families are therefore canonical sentences, not primitive atoms. Every non-identity primitive participates in multiple canonical families, and the production API can compose structures outside the named catalog. This leaves a direct path to a later meta-grammar without requiring current generation to become unconstrained.

Connector identity remains separate from baseline identity. A connector grammar determines the interlocking event; baseline productions determine the structural course of the non-connector spans. Common polarity, reciprocal orientation, rendering, sampling, bounds, and whole-piece safety remain downstream concerns.

The grammar layer deliberately does not encode cut-style admission or weighting. Product-level policy in `cutStyle.ts` now operates over both BaselineGrammar and ConnectorGrammar through the same seam-generation pipeline.

For each puzzle, that policy:

- selects one connector grammar for the whole puzzle;
- derives a small deterministic baseline sub-palette for the whole puzzle;
- represents the selected cut style and baseline sub-palette in the generated puzzle's runtime `edgeModel`;
- lets each seam independently derive its approach/departure baseline family and seeded parameters from the shared interior-edge seed within that sub-palette.

The composed seam, not each part in isolation, remains the safety boundary. Broad deterministic sweeps cover every cut style, all connector grammars where policy admits them, reciprocal neighbor geometry, seam bounds/self-intersection, and whole-piece safety.

The generated puzzle carries the puzzle-level cut-style policy result in its runtime `edgeModel`, but persisted sessions continue to store canonical generation identity plus progress and regenerate the baseline puzzle on restore. Individual seam baseline choices, baseline parameters, and renderer control points are not persisted separately; they remain deterministic derived state. No generator-version migration/compatibility machinery is introduced.

### Curated cut-style policy

Cut style is intentionally a small, closed user-facing taxonomy over the shared production vocabularies. It expresses the overall visual character of the cut; it is not a connector-family picker and does not create a second renderer, seam model, or safety system.

All five styles share the same grammar definitions, seam composition, reciprocal-edge transforms, rendering, polarity, complementarity, and validation machinery.

| Style | Connector admission | Baseline policy | Palette size |
| --- | --- | --- | ---: |
| **Classic** | Classic bulb, Necked head | Straight + Bow anchors; third course from Inflection / Angled course | 3 |
| **Flowing** | Classic bulb, Multi-lobe, Scoop, Serpentine, Connectorless wave | Bow + Wave anchors; third course from Straight / Inflection | 3 |
| **Geometric** | Terrace, Zigzag, Stacked lock | Angled course + Stepped course anchors; third course from Straight / Dogleg | 3 |
| **Intricate** | Necked head, Multi-lobe, Stacked lock, Compound lock, Opposed dual lock, Notched head | Primary-secondary anchor plus three weighted expressive courses | 4 |
| **Eclectic** | Complete production EdgeProfile catalog | Bow anchor plus three weighted courses from the complete production BaselineCourse catalog | 4 |

The styles are not difficulty levels and are not ordered from "safe" to "wild." Each is a curated distribution with a recognizable visual thesis. A generated puzzle still chooses one connector profile for the whole board and one small deterministic baseline sub-palette, so seams vary within a coherent puzzle-level vocabulary rather than independently sampling the entire style on every edge.

Classic remains deliberately familiar. Flowing emphasizes rounded and baseline-crossing motion. Geometric emphasizes angular and architectural structure. Intricate emphasizes compound and multi-event interlocks. Eclectic permits the full production vocabulary while preserving the same puzzle-level coherence rule.

Cut style is part of canonical generation identity. The same seed, artwork, and grid under different styles are intentionally different generated puzzles. The style also round-trips through compact resource identity and Daily Jigsaw locators. There is no compatibility path for superseded compact Jigsaw resource IDs; old shapes are simply invalid under the current decoder.

### Follow-on geometry directions

Two separate future directions are intentionally outside the ordinary connector-grammar work:

- #190 explores rare surprise/anomaly geometry whose value depends on being exceptional rather than part of the everyday distribution.
- #191 explores non-grid piece topology such as circular medallion pieces, arbitrary neighbor counts, and piece boundaries that are not four rectangular sides.

The ordinary seam representation should not prevent those directions, but it should not prematurely implement their topology either.

## Phase 3: Visual custom-edge rendering

Goal: render image-backed pieces with jigsaw silhouettes using the Phase 2 edge data.

This phase is intentionally separate because the difficult part is not image slicing. The difficult part is applying an irregular piece outline while preserving image crop alignment, borders, shadows, hit targets, selected state, and mobile performance.

Candidate rendering approaches:

1. SVG `<clipPath>` or `<mask>` per piece.
2. SVG board renderer with each piece as a grouped image clipped by a generated path.
3. CSS `clip-path: path(...)` if browser support and ergonomics are acceptable.

Phase 3 should preserve click/tap swapping unless drag-and-drop becomes a separate explicit interaction slice.

### Validation

- Edge path generation is deterministic.
- Piece masks align with the image crop.
- Selection and placed states remain visible.
- Mobile board remains usable at supported dimensions.
- Rendering remains acceptable for the largest supported grid.

## Later source types

After bundled image-backed puzzles work, consider source expansion in this order:

1. External image URL with explicit broken-image and CORS fallback handling.
2. User upload via object URL for current-session play.
3. Durable local image persistence only if storage and privacy constraints are deliberately accepted.

Do not make remote URL or upload support block the first bundled-image implementation.

## Playable readiness criteria

Jigsaw can move from `prototype` to `playable` when:

- users can play from at least one real bundled picture;
- pieces render correct image crops;
- seeded generation is deterministic for image id + dimensions + seed;
- progress persistence and reset behavior are predictable;
- solved state is explicit and user-visible;
- mobile layout is usable for supported dimensions;
- generator tests cover the deterministic square-piece path;
- edge-model work is either complete enough to expose as metadata or deliberately deferred without blocking image-backed play.

## Recommended PR sequence

1. `jigsaw-image-assets`: bundled image repository, image asset model, square-piece image slicing, preview update, generation tests.
2. `jigsaw-edge-model`: edge profile repository, generated edge graph, compatibility tests, metadata display.
3. `jigsaw-edge-rendering`: SVG or mask-based custom-edge visual rendering, mobile/performance tuning.

This sequence delivers a real picture Jigsaw quickly while preserving a path to custom interlocking pieces and later non-four-edge tessellations.
