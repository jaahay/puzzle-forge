# Jigsaw Special Pieces

Special pieces are bounded local topology replacements inside an otherwise grid-backed Jigsaw. They are deliberately separate from ConnectorGrammar and BaselineGrammar: ordinary seam grammar still owns the board's dominant cut vocabulary, while the **Special pieces · Off · Rare · Always** product axis decides whether one special topology participates.

## Shared invariants

Every shipped special-piece family must:

- be deterministic from canonical Jigsaw generation identity;
- preserve exact reciprocal geometry between the special piece and every socket neighbor;
- expose the true topology to snapping and persisted assembly state rather than relying on visual overlap;
- reuse the ordinary solved-coordinate translation model, history, reset/restage, completion, hit testing, and persistence machinery;
- keep ordinary seams outside the affected neighborhood unchanged;
- remain bounded to at most one special piece per puzzle under the current product policy;
- avoid family-specific player controls unless product evidence later justifies them.

When an ordinary grid seam is physically replaced by special topology, that seam is removed from the neighbor graph rather than merely hidden.

## Circular medallion

**Capability:** #191  
**Product policy:** #190 / PR #260

The Circular medallion is point-centered:

- one true circular piece centered on an interior grid intersection;
- four surrounding socket pieces;
- each socket contributes one reciprocal quarter-circle;
- the four radial grid seams terminate at the circular boundary;
- the special piece occupies one 1×1 visual span;
- explicit special adjacency connects the medallion to all four socket pieces.

The world-space radius is corrected for non-square grid cells so the rendered medallion remains circular.

## Capsule

**Capability:** #261

The Capsule is edge-segment-centered:

- one elongated rounded capsule piece centered on a qualifying interior grid-edge segment;
- horizontal and vertical orientations are variants of the same family;
- the special piece occupies a 2×1 or 1×2 visual span;
- six surrounding socket pieces collectively own the reciprocal capsule boundary;
- two end-cap neighborhoods use circular quarter arcs;
- two center socket pieces own the straight side rails;
- the ordinary grid seam buried under the capsule is removed from the topology graph;
- explicit special adjacency connects the capsule to all six socket pieces.

Circular end caps use the same world-space radius correction as the medallion, so the caps remain circular even when a grid cell is not square.

## Family selection

When both families are safe for the chosen grid/artwork:

1. the Special pieces mode decides whether any special piece participates;
2. deterministic family selection chooses Medallion or Capsule;
3. a family-specific deterministic placement stream chooses a legal location.

Family selection is independent of cut style and outer-boundary mode. Rare and Always share the same family/location plan for a given puzzle identity; Rare only adds a separate presence gate.

## Adding another family

A third family should be added only when it proves a materially new topology or play pattern. A cosmetic silhouette variant is not enough.

Add the concrete family here when it ships. Do not pre-document hypothetical families as production vocabulary.
