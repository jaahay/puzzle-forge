# Jigsaw Meta-Grammar and Geometry Compiler Contract

Issue #229 extends the existing grammar-first Jigsaw seam system without changing the product contract that ordinary generated puzzles use curated grammar families.

The current interior seam remains:

```text
approach: BaselineGrammar
> connector: ConnectorGrammar
> departure: BaselineGrammar
```

Approach and departure are roles over one BaselineGrammar language. ConnectorGrammar owns the interlocking event. SeamProgram owns composition. Cut style owns product policy. The meta-grammar work does not introduce an additional EdgeGrammar layer merely to rename that composition.

## Why a compiler layer exists

BaselineGrammar already has a structural AST:

- primitives: `identity / deflect / cross / course`;
- combinators: `sequence / repeat / oppose / mirror`.

The AST can describe productions outside the seven named baseline families. Historically, however, only those named families had tuned geometry realizers.

Two different operations are therefore needed:

```text
BaselineProduction AST
        |
        v
semantic compilation
        |
        v
modifier-preserving instruction trace
        |
        v
geometry compilation
        |
        v
normalized candidate path
```

The semantic compiler is intentionally independent of geometry. It preserves the meaning of `oppose` and `mirror` instead of reducing a production to primitive names alone.

## Executable semantic trace

`compileJigsawBaselineProduction()` emits ordered instructions containing:

- the structural primitive;
- `normalDirection`, changed by `oppose`;
- `traversalDirection`, changed by `mirror`.

A mirrored sequence reverses term order and flips local traversal direction. An opposed sequence preserves term order and flips only the normal side.

This gives the future geometry compiler enough information to distinguish, for example:

```text
oppose(deflect)
mirror(deflect)
```

even though both contain the same primitive event.

The compiler also preserves compositional equivalence. Distributed forms such as:

```text
mirror(a > b > c)
```

and:

```text
mirror(c) > mirror(b) > mirror(a)
```

compile to the same semantic trace.

## Structural primitives are not turtle commands

The four BaselineGrammar primitives are intentionally structural concepts, not fixed drawing commands.

For example:

- `deflect` means that the path changes normal displacement without crossing the nominal baseline;
- `cross` means that the path crosses the nominal baseline;
- `course` means that the path progresses while maintaining an offset course;
- `identity` is the zero-deformation case.

A generic geometry compiler must not naively interpret these as instructions such as "add one unit of Y" or "draw one line segment." Doing so would accidentally bake one realization into the grammar language and can fail to close otherwise valid canonical productions.

Instead, the compiler should treat the full instruction trace as a set of ordered structural constraints and solve a normalized path satisfying those constraints.

## Geometry compiler contract

A candidate baseline geometry compiler should consume:

- one compiled semantic instruction trace;
- deterministic seeded realization input;
- a normalized local span;
- a requested rendering character where necessary;
- bounded amplitude / complexity constraints.

It should produce either:

1. a normalized candidate path; or
2. an explicit rejection result.

It must not silently rewrite a rejected production into a different structural production.

### Required path invariants

Every accepted candidate must:

- start exactly at `(0, 0)`;
- end exactly at `(1, 0)`;
- preserve instruction order after semantic compilation;
- honor normal-side inversion from `oppose`;
- honor local longitudinal reflection from `mirror`;
- contain the baseline crossings demanded by `cross`;
- preserve offset-course behavior demanded by `course`;
- remain finite and bounded;
- avoid proper self-intersection;
- remain suitable for later corner-safety attenuation in SeamProgram.

The compiler may allocate different longitudinal spans to different primitives. The grammar does not require equal-width events.

### Closure is a whole-production property

Returning to the nominal baseline is not the responsibility of each primitive independently.

A production may temporarily accumulate displacement, cross sides, or hold an offset course. The compiler must solve the whole production so that the final path closes at the baseline while preserving the ordered structural events.

This is one reason the semantic trace is an intermediate representation rather than a direct polyline.

### Determinism

The same:

- structural production;
- semantic trace;
- seed;
- compiler policy;

must produce the same candidate geometry.

Randomness may choose bounded continuous parameters or bounded structural realization choices, but it must not make validation nondeterministic.

## Canonical families during migration

The seven named BaselineGrammar families remain the production renderer used by ordinary puzzles until a generic compiler is deliberately adopted.

The meta-grammar work should compare generic candidate realization against those families, but it does not need to reproduce every existing control point numerically.

A sensible migration sequence is:

1. compile arbitrary ASTs to semantic traces;
2. implement generic candidate realization behind development/test-only entry points;
3. verify structural fidelity and safety;
4. compare canonical families visually;
5. decide whether canonical named families should keep tuned realizers, adopt generic realization, or use a hybrid policy.

Do not switch production generation merely because the generic compiler exists.

## Candidate validation pipeline

A bounded explorer should treat generation and promotion as separate concerns:

```text
bounded AST derivation
      |
      v
AST normalization
      |
      v
semantic compilation
      |
      v
candidate geometry
      |
      v
structural checks
      |
      v
bounds + self-intersection checks
      |
      v
whole-seam / whole-piece checks
      |
      v
visual gallery
      |
      v
human promotion into curated vocabulary
```

Validation may reject many derivations. High rejection rates are acceptable if the generator remains bounded and deterministic.

## Degeneracy checks

Geometrically valid candidates may still be structurally useless.

The explorer should reject or flag candidates where, for example:

- a required crossing is numerically too shallow to read as a crossing;
- an offset course collapses effectively onto the baseline;
- repeated events become visually indistinguishable;
- the path uses excessive oscillation for its available span;
- multiple structurally different ASTs collapse to the same perceptual construction;
- the candidate leaves unusably small hit geometry;
- corner attenuation would erase the production's defining event.

These are separate from basic self-intersection and bounds checks.

## ConnectorGrammar evaluation

ConnectorGrammar is already grammar-first, but its families currently use family-specific program types and realizers.

That asymmetry with BaselineGrammar is acceptable.

Before introducing a connector AST, evaluate whether reusable connector events such as:

- lobe;
- saddle;
- neck;
- undercut;
- chamber;
- waist;
- baseline crossing;

have stable enough semantics to compose independently.

An analogous connector production language is justified only if it:

- reduces duplicated structural machinery;
- supports genuinely new irreducible compositions;
- preserves exact reciprocal seam geometry;
- improves exploration without collapsing distinct connector concepts into vague generic events.

Do not create a connector AST solely for symmetry with BaselineGrammar.

## Product boundaries

This compiler/explorer remains infrastructure until a product issue deliberately consumes it.

Adjacent work stays separate:

- #190 — rare surprise connector/piece anomalies;
- #191 — non-grid and special piece topology;
- #209 — coarse partitioned solving;
- #210 — non-flat true outer boundaries;
- #188 — renderer architecture evaluation.

Traditional / Unconventional remains product policy over curated grammar vocabularies. Meta-grammar output does not automatically enter either palette.

## Versioning and persistence

The project remains pre-versioning.

Do not add:

- generator-version discriminators;
- persisted per-seam compiler instructions;
- persisted control points;
- migration or compatibility machinery.

Structural and geometric programs remain deterministic derived state unless a future product decision explicitly changes that policy.

## Immediate implementation sequence

The bounded sequence for #229 is:

1. **Semantic compiler** — complete.
2. **Geometry compiler contract** — this document.
3. **Development-only generic baseline realization** — next implementation target.
4. **Validation and candidate rejection**.
5. **Bounded explorer/gallery**.
6. **Connector AST evaluation**.

The product grammar should remain curated throughout that work.
