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
    const sweep = baselinePrimitive("sweep");
    const opposed = baselineOppose(sweep);
    const mirrored = baselineMirror(sweep);

    expect(expandJigsawBaselineProduction(opposed)).toEqual(["sweep"]);
    expect(expandJigsawBaselineProduction(mirrored)).toEqual(["sweep"]);
    expect(getJigsawBaselineProductionStructure(opposed)).toBe(
      "oppose(sweep)",
    );
    expect(getJigsawBaselineProductionStructure(mirrored)).toBe(
      "mirror(sweep)",
    );
  });

  it("can compose a structurally new production from the shared vocabulary", () => {
    const novel = baselineSequence(
      baselinePrimitive("sweep"),
      baselinePrimitive("course"),
      baselineOppose(baselinePrimitive("sweep")),
      baselinePrimitive("cross"),
      baselineMirror(baselinePrimitive("turn")),
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
      "sweep",
      "course",
      "sweep",
      "cross",
      "turn",
    ]);
  });

  it("expands repeated sub-productions compositionally", () => {
    const repeated = baselineRepeat(
      baselineSequence(
        baselinePrimitive("turn"),
        baselinePrimitive("course"),
      ),
      3,
    );

    expect(expandJigsawBaselineProduction(repeated)).toEqual([
      "turn",
      "course",
      "turn",
      "course",
      "turn",
      "course",
    ]);
    expect(getJigsawBaselineProductionStructure(repeated)).toBe(
      "repeat(turn > course){3}",
    );
  });

  it("normalizes algebraically reducible production forms", () => {
    const identity = baselinePrimitive("identity");
    const sweep = baselinePrimitive("sweep");
    const turn = baselinePrimitive("turn");

    expect(
      getJigsawBaselineProductionStructure(
        baselineSequence(identity, sweep),
      ),
    ).toBe("sweep");
    expect(
      getJigsawBaselineProductionStructure(
        baselineSequence(),
      ),
    ).toBe("identity");
    expect(
      getJigsawBaselineProductionStructure(
        baselineRepeat(sweep, 1),
      ),
    ).toBe("sweep");
    expect(
      getJigsawBaselineProductionStructure(
        baselineRepeat(baselineRepeat(turn, 2), 3),
      ),
    ).toBe("repeat(turn){6}");
    expect(
      getJigsawBaselineProductionStructure(
        baselineOppose(baselineOppose(sweep)),
      ),
    ).toBe("sweep");
    expect(
      getJigsawBaselineProductionStructure(
        baselineMirror(baselineMirror(sweep)),
      ),
    ).toBe("sweep");
  });

  it("rejects non-positive or fractional repetition counts", () => {
    expect(() => baselineRepeat(baselinePrimitive("turn"), 0)).toThrow();
    expect(() => baselineRepeat(baselinePrimitive("turn"), -1)).toThrow();
    expect(() => baselineRepeat(baselinePrimitive("turn"), 1.5)).toThrow();
  });
});
