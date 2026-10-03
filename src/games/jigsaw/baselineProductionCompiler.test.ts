import { describe, expect, it } from "vitest";
import {
  jigsawBaselineCanonicalProductions,
  jigsawBaselineGrammarIds,
} from "./baselineGrammar";
import {
  baselineMirror,
  baselineOppose,
  baselinePrimitive,
  baselineRepeat,
  baselineSequence,
  getJigsawBaselineProductionStructure,
} from "./baselineProduction";
import { compileJigsawBaselineProduction } from "./baselineProductionCompiler";

describe("Jigsaw baseline production compiler", () => {
  it("keeps the identity production explicit as the zero-deformation instruction", () => {
    expect(
      compileJigsawBaselineProduction(baselinePrimitive("identity")),
    ).toEqual([{
      primitive: "identity",
      normalDirection: 1,
      traversalDirection: 1,
    }]);
  });

  it("preserves oppose and mirror as different executable semantics", () => {
    const deflect = baselinePrimitive("deflect");

    expect(compileJigsawBaselineProduction(baselineOppose(deflect))).toEqual([{
      primitive: "deflect",
      normalDirection: -1,
      traversalDirection: 1,
    }]);
    expect(compileJigsawBaselineProduction(baselineMirror(deflect))).toEqual([{
      primitive: "deflect",
      normalDirection: 1,
      traversalDirection: -1,
    }]);
  });

  it("reflects mirrored sequences by reversing term order and local traversal", () => {
    const production = baselineMirror(
      baselineSequence(
        baselinePrimitive("deflect"),
        baselinePrimitive("cross"),
        baselinePrimitive("course"),
      ),
    );

    expect(compileJigsawBaselineProduction(production)).toEqual([
      {
        primitive: "course",
        normalDirection: 1,
        traversalDirection: -1,
      },
      {
        primitive: "cross",
        normalDirection: 1,
        traversalDirection: -1,
      },
      {
        primitive: "deflect",
        normalDirection: 1,
        traversalDirection: -1,
      },
    ]);
  });

  it("preserves sequence order under oppose while flipping the normal side", () => {
    const production = baselineOppose(
      baselineSequence(
        baselinePrimitive("deflect"),
        baselinePrimitive("course"),
      ),
    );

    expect(compileJigsawBaselineProduction(production)).toEqual([
      {
        primitive: "deflect",
        normalDirection: -1,
        traversalDirection: 1,
      },
      {
        primitive: "course",
        normalDirection: -1,
        traversalDirection: 1,
      },
    ]);
  });

  it("expands bounded repetition deterministically", () => {
    const production = baselineRepeat(
      baselineSequence(
        baselinePrimitive("deflect"),
        baselinePrimitive("course"),
      ),
      2,
    );

    expect(compileJigsawBaselineProduction(production)).toEqual([
      {
        primitive: "deflect",
        normalDirection: 1,
        traversalDirection: 1,
      },
      {
        primitive: "course",
        normalDirection: 1,
        traversalDirection: 1,
      },
      {
        primitive: "deflect",
        normalDirection: 1,
        traversalDirection: 1,
      },
      {
        primitive: "course",
        normalDirection: 1,
        traversalDirection: 1,
      },
    ]);
  });

  it("compiles normalized algebraic equivalents identically", () => {
    const identity = baselinePrimitive("identity");
    const deflect = baselinePrimitive("deflect");

    expect(
      compileJigsawBaselineProduction(
        baselineSequence(identity, deflect),
      ),
    ).toEqual(compileJigsawBaselineProduction(deflect));

    expect(
      compileJigsawBaselineProduction(
        baselineMirror(baselineMirror(deflect)),
      ),
    ).toEqual(compileJigsawBaselineProduction(deflect));

    expect(
      compileJigsawBaselineProduction(
        baselineOppose(baselineOppose(deflect)),
      ),
    ).toEqual(compileJigsawBaselineProduction(deflect));

    expect(
      compileJigsawBaselineProduction(
        baselineRepeat(baselineRepeat(deflect, 2), 3),
      ),
    ).toEqual(
      compileJigsawBaselineProduction(baselineRepeat(deflect, 6)),
    );
  });

  it("compiles distributed mirror and oppose forms to the same semantic trace", () => {
    const deflect = baselinePrimitive("deflect");
    const cross = baselinePrimitive("cross");
    const course = baselinePrimitive("course");
    const sequence = baselineSequence(deflect, cross, course);

    expect(
      compileJigsawBaselineProduction(baselineMirror(sequence)),
    ).toEqual(
      compileJigsawBaselineProduction(
        baselineSequence(
          baselineMirror(course),
          baselineMirror(cross),
          baselineMirror(deflect),
        ),
      ),
    );

    expect(
      compileJigsawBaselineProduction(baselineOppose(sequence)),
    ).toEqual(
      compileJigsawBaselineProduction(
        baselineSequence(
          baselineOppose(deflect),
          baselineOppose(cross),
          baselineOppose(course),
        ),
      ),
    );

    expect(
      compileJigsawBaselineProduction(
        baselineMirror(baselineOppose(sequence)),
      ),
    ).toEqual(
      compileJigsawBaselineProduction(
        baselineOppose(baselineMirror(sequence)),
      ),
    );
  });

  it("keeps every canonical BaselineGrammar family distinct after compilation", () => {
    const traces = jigsawBaselineGrammarIds.map((grammarId) =>
      JSON.stringify(
        compileJigsawBaselineProduction(
          jigsawBaselineCanonicalProductions[grammarId],
        ),
      ),
    );

    expect(new Set(traces).size).toBe(jigsawBaselineGrammarIds.length);
  });

  it("compiles a production outside the named BaselineGrammar catalog", () => {
    const novel = baselineSequence(
      baselinePrimitive("deflect"),
      baselinePrimitive("course"),
      baselineOppose(baselinePrimitive("deflect")),
      baselinePrimitive("cross"),
      baselineMirror(baselinePrimitive("course")),
    );
    const canonicalStructures = new Set(
      jigsawBaselineGrammarIds.map((grammarId) =>
        getJigsawBaselineProductionStructure(
          jigsawBaselineCanonicalProductions[grammarId],
        ),
      ),
    );

    expect(
      canonicalStructures.has(getJigsawBaselineProductionStructure(novel)),
    ).toBe(false);
    expect(compileJigsawBaselineProduction(novel)).toEqual([
      {
        primitive: "deflect",
        normalDirection: 1,
        traversalDirection: 1,
      },
      {
        primitive: "course",
        normalDirection: 1,
        traversalDirection: 1,
      },
      {
        primitive: "deflect",
        normalDirection: -1,
        traversalDirection: 1,
      },
      {
        primitive: "cross",
        normalDirection: 1,
        traversalDirection: 1,
      },
      {
        primitive: "course",
        normalDirection: 1,
        traversalDirection: -1,
      },
    ]);
  });
});
