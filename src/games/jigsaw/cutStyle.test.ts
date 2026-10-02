import { describe, expect, it } from "vitest";
import { jigsawBaselineGrammarIds } from "./baselineGrammar";
import {
  defaultJigsawCutStyle,
  deriveJigsawBaselinePalette,
  jigsawCutStyles,
  normalizeJigsawCutStyle,
  sampleJigsawBaselineGrammarForCutStyle,
  selectJigsawConnectorGrammarForCutStyle,
} from "./cutStyle";
import { jigsawEdgeProfileIds } from "./edgeProfiles";

describe("Jigsaw cut style", () => {
  it("is an intentional closed binary product axis", () => {
    expect(jigsawCutStyles).toEqual(["traditional", "unconventional"]);
    expect(defaultJigsawCutStyle).toBe("traditional");
    expect(normalizeJigsawCutStyle("traditional")).toBe("traditional");
    expect(normalizeJigsawCutStyle("unconventional")).toBe("unconventional");
    expect(normalizeJigsawCutStyle("future-style")).toBe("traditional");
  });

  it("defines Traditional positively with a familiar connector vocabulary", () => {
    const selected = new Set(
      Array.from({ length: 2_000 }, (_, index) =>
        selectJigsawConnectorGrammarForCutStyle(
          "traditional",
          (index + 0.5) / 2_000,
        ),
      ),
    );

    expect(selected).toEqual(
      new Set(["classic-bulb", "necked-head"]),
    );
  });

  it("lets Unconventional reach the complete connector vocabulary", () => {
    const selected = new Set(
      Array.from({ length: 4_000 }, (_, index) =>
        selectJigsawConnectorGrammarForCutStyle(
          "unconventional",
          (index + 0.5) / 4_000,
        ),
      ),
    );

    expect(selected).toEqual(new Set(jigsawEdgeProfileIds));
  });

  it("derives a restrained, coherent Traditional baseline palette", () => {
    for (let index = 0; index < 128; index += 1) {
      const palette = deriveJigsawBaselinePalette(
        "traditional",
        `traditional-${index}`,
      );

      expect(palette).toHaveLength(3);
      expect(new Set(palette).size).toBe(3);
      expect(palette).toContain("straight");
      expect(palette).toContain("bow");
      expect(
        palette.every((grammarId) =>
          [
            "straight",
            "bow",
            "inflection",
            "angled-course",
          ].includes(grammarId),
        ),
      ).toBe(true);
    }
  });

  it("keeps a familiar anchor while varying the Unconventional baseline sub-palette", () => {
    const observed = new Set<string>();

    for (let index = 0; index < 512; index += 1) {
      const palette = deriveJigsawBaselinePalette(
        "unconventional",
        `unconventional-${index}`,
      );

      expect(palette).toHaveLength(4);
      expect(new Set(palette).size).toBe(4);
      expect(palette).toContain("bow");
      palette.forEach((grammarId) => observed.add(grammarId));
    }

    expect(observed).toEqual(new Set(jigsawBaselineGrammarIds));
  });

  it("samples only within the puzzle's selected baseline sub-palette", () => {
    const palette = [
      "bow",
      "dogleg",
      "wave",
      "stepped-course",
    ] as const;

    const selected = new Set(
      Array.from({ length: 2_000 }, (_, index) =>
        sampleJigsawBaselineGrammarForCutStyle(
          "unconventional",
          palette,
          (index + 0.5) / 2_000,
        ),
      ),
    );

    expect(selected).toEqual(new Set(palette));
  });

  it("is deterministic at the palette boundary", () => {
    expect(deriveJigsawBaselinePalette("traditional", "same-seed")).toEqual(
      deriveJigsawBaselinePalette("traditional", "same-seed"),
    );
    expect(deriveJigsawBaselinePalette("unconventional", "same-seed")).toEqual(
      deriveJigsawBaselinePalette("unconventional", "same-seed"),
    );
  });
});
