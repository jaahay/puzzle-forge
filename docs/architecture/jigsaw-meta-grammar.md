# Jigsaw Grammar Architecture

Issue #229 established the executable grammar machinery now used by ordinary Jigsaw generation.

## Layers

The production system separates:

1. **BaselineGrammar** — the canonical algebraic language for straight, deflecting, crossing, offset, repeated, opposed, and mirrored course structure.
2. **BaselineCourse** — the product course vocabulary. It delegates canonical courses to BaselineGrammar and owns shipped span-allocation and bounded-reversal courses whose semantics cannot be represented honestly by the canonical AST.
3. **ConnectorGrammar** — the interlocking-event vocabulary, including single-event, repeated, compound, opposed, and notched structures.
4. **SeamProgram** — composition of approach/course, connector profile, and departure/course, with an explicit connectorless seam form.
5. **Cut style** — product policy over the production vocabularies. Traditional is restrained; Unconventional can reach the full production set.

## Executable baseline IR

`JigsawBaselineProduction` still compiles into a modifier-preserving instruction trace. Sequence, repeat, oppose, and mirror remain structural operations rather than rendering presets.

The generic BaselineProduction realizer is now production infrastructure because span-based BaselineCourse families use it to realize their component gestures.

A deliberate quiet run is not represented by algebraic `identity`; it consumes longitudinal span at the BaselineCourse layer. Bounded longitudinal reversal is also a BaselineCourse concern so the canonical BaselineProduction validator can preserve its monotonic invariant.

Approach/departure placement is topology-preserving: the course is mapped affinely into its longitudinal span and receives one uniform depth scale chosen to fit the corner envelope. It is never pointwise clipped. A locally simple reversal therefore stays simple after seam embedding, while explicit quiet runways keep the fold away from both the piece corner and connector join.

## Connector structure

ConnectorGrammar remains family-specific at realization time. The connector vocabulary now includes the structures that survived the structural inventory directly in production: Compound lock, Opposed dual lock, and Notched head.

Connectorless wave is intentionally an EdgeProfile rather than a fake connector family.

## Determinism and safety

All product edge structure is derived from puzzle/seam seeds. Safety is enforced through broad tests over:

- connector and course seed variation;
- reciprocal tab/blank orientation;
- complete piece outlines;
- cut-style palette reachability;
- connectorless seams;
- span allocation;
- bounded reversal geometry;
- every BaselineCourse combined with every connected EdgeProfile across known regression seeds and both all-tab/all-blank whole-piece extremes.

There is no separate candidate lifecycle in the architecture. If a future edge structure is worth keeping, it should enter the production vocabulary in the same change that makes it safely exercisable by generated puzzles.
