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
  expandJigsawBaselineProduction,
  getJigsawBaselineProductionPrimitives,
  getJigsawBaselineProductionStructure,
  jigsawBaselinePrimitives,
} from "./baselineProduction";

describe("Jigsaw baseline production language", () => {
  it("gives every canonical family a unique structural production", () => {
    const structures = jigsawBaselineGrammarIds.map((grammarId) =>
      getJigsawBaselineProductionStructure(
        jigsawBaselineCanonicalProductions[grammarId],
      ),
    );

    expect(new Set(structures).size).toBe(jigsawBaselineGrammarIds.length);
  });

  it("keeps identity isolated as the zero-deformation production", () => {
    expect(
      getJigsawBaselineProductionStructure(
        jigsawBaselineCanonicalProductions.straight,
      ),
    ).toBe("identity");

    for (const grammarId of jigsawBaselineGrammarIds.filter(
      (candidate) => candidate !== "straight",
    )) {
      expect(
        getJigsawBaselineProductionPrimitives(
          jigsawBaselineCanonicalProductions[grammarId],
        ).has("identity"),
      ).toBe(false);
    }
  });

  it("reuses every non-identity primitive across multiple canonical families", () => {
    for (const primitive of jigsawBaselinePrimitives.filter(
      (candidate) => candidate !== "identity",
    )) {
      const users = jigsawBaselineGrammarIds.filter((grammarId) =>
        getJigsawBaselineProductionPrimitives(
          jigsawBaselineCanonicalProductions[grammarId],
        ).has(primitive),
      );

      expect(users.length, `${primitive} should be composition-worthy`).toBeGreaterThanOrEqual(2);
    }
  });

  it("preserves semantic modifiers in structure without inventing new primitives", () => {
    const deflect = baselinePrimitive("deflect");
    const opposed = baselineOppose(deflect);
    const mirrored = baselineMirror(deflect);

    expect(expandJigsawBaselineProduction(opposed)).toEqual(["deflect"]);
    expect(expandJigsawBaselineProduction(mirrored)).toEqual(["deflect"]);
    expect(getJigsawBaselineProductionStructure(opposed)).toBe(
      "oppose(deflect)",
    );
    expect(getJigsawBaselineProductionStructure(mirrored)).toBe(
      "mirror(deflect)",
    );
  });

  it("can compose a structurally new production from the shared vocabulary", () => {
    const novel = baselineSequence(
      baselinePrimitive("deflect"),
      baselinePrimitive("course"),
      baselineOppose(baselinePrimitive("deflect")),
      baselinePrimitive("cross"),
      baselineMirror(baselinePrimitive("deflect")),
    );
    const novelStructure = getJigsawBaselineProductionStructure(novel);
    const canonicalStructures = new Set(
      jigsawBaselineGrammarIds.map((grammarId) =>
        getJigsawBaselineProductionStructure(
          jigsawBaselineCanonicalProductions[grammarId],
        ),
      ),
    );

    expect(canonicalStructures.has(novelStructure)).toBe(false);
    expect(expandJigsawBaselineProduction(novel)).toEqual([
      "deflect",
      "course",
      "deflect",
      "cross",
      "deflect",
    ]);
  });

  it("expands repeated sub-productions compositionally", () => {
    const repeated = baselineRepeat(
      baselineSequence(
        baselinePrimitive("deflect"),
        baselinePrimitive("course"),
      ),
      3,
    );

    expect(expandJigsawBaselineProduction(repeated)).toEqual([
      "deflect",
      "course",
      "deflect",
      "course",
      "deflect",
      "course",
    ]);
    expect(getJigsawBaselineProductionStructure(repeated)).toBe(
      "repeat(deflect > course){3}",
    );
  });

  it("normalizes algebraically reducible production forms", () => {
    const identity = baselinePrimitive("identity");
    const deflect = baselinePrimitive("deflect");

    expect(
      getJigsawBaselineProductionStructure(
        baselineSequence(identity, deflect),
      ),
    ).toBe("deflect");
    expect(
      getJigsawBaselineProductionStructure(
        baselineSequence(),
      ),
    ).toBe("identity");
    expect(
      getJigsawBaselineProductionStructure(
        baselineRepeat(deflect, 1),
      ),
    ).toBe("deflect");
    expect(
      getJigsawBaselineProductionStructure(
        baselineRepeat(baselineRepeat(deflect, 2), 3),
      ),
    ).toBe("repeat(deflect){6}");
    expect(
      getJigsawBaselineProductionStructure(
        baselineOppose(baselineOppose(deflect)),
      ),
    ).toBe("deflect");
    expect(
      getJigsawBaselineProductionStructure(
        baselineMirror(baselineMirror(deflect)),
      ),
    ).toBe("deflect");
  });

  it("rejects non-positive or fractional repetition counts", () => {
    expect(() => baselineRepeat(baselinePrimitive("deflect"), 0)).toThrow();
    expect(() => baselineRepeat(baselinePrimitive("deflect"), -1)).toThrow();
    expect(() => baselineRepeat(baselinePrimitive("deflect"), 1.5)).toThrow();
  });
});
