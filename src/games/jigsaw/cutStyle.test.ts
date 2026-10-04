import { describe, expect, it } from "vitest";
import { jigsawBaselineCourseIds } from "./baselineCourse";
import {
  defaultJigsawCutStyle,
  deriveJigsawBaselineCoursePalette,
  jigsawCutStyles,
  jigsawEdgeProfileIds,
  normalizeJigsawCutStyle,
  sampleJigsawBaselineCourseForCutStyle,
  selectJigsawEdgeProfileForCutStyle,
} from "./cutStyle";

describe("Jigsaw cut style", () => {
  it("is an intentional closed binary product axis", () => {
    expect(jigsawCutStyles).toEqual(["traditional", "unconventional"]);
    expect(defaultJigsawCutStyle).toBe("traditional");
    expect(normalizeJigsawCutStyle("traditional")).toBe("traditional");
    expect(normalizeJigsawCutStyle("unconventional")).toBe("unconventional");
  });

  it("defines Traditional positively with a familiar edge vocabulary", () => {
    const selected = new Set(
      Array.from({ length: 2_000 }, (_, index) =>
        selectJigsawEdgeProfileForCutStyle(
          "traditional",
          (index + 0.5) / 2_000,
        ),
      ),
    );

    expect(selected).toEqual(new Set(["classic-bulb", "necked-head"]));
  });

  it("lets Unconventional reach every production edge profile", () => {
    const selected = new Set(
      Array.from({ length: 8_000 }, (_, index) =>
        selectJigsawEdgeProfileForCutStyle(
          "unconventional",
          (index + 0.5) / 8_000,
        ),
      ),
    );

    expect(selected).toEqual(new Set(jigsawEdgeProfileIds));
  });

  it("derives a restrained, coherent Traditional baseline palette", () => {
    for (let index = 0; index < 128; index += 1) {
      const palette = deriveJigsawBaselineCoursePalette(
        "traditional",
        `traditional-${index}`,
      );

      expect(palette).toHaveLength(3);
      expect(new Set(palette).size).toBe(3);
      expect(palette).toContain("straight");
      expect(palette).toContain("bow");
      expect(
        palette.every((courseId) =>
          ["straight", "bow", "inflection", "angled-course"].includes(courseId),
        ),
      ).toBe(true);
    }
  });

  it("lets Unconventional palettes reach every production baseline course", () => {
    const observed = new Set<string>();

    for (let index = 0; index < 2_048; index += 1) {
      const palette = deriveJigsawBaselineCoursePalette(
        "unconventional",
        `unconventional-${index}`,
      );
      expect(palette).toHaveLength(4);
      expect(new Set(palette).size).toBe(4);
      expect(palette).toContain("bow");
      palette.forEach((courseId) => observed.add(courseId));
    }

    expect(observed).toEqual(new Set(jigsawBaselineCourseIds));
  });

  it("samples only within the puzzle's selected baseline sub-palette", () => {
    const palette = [
      "bow",
      "separated-bows",
      "opposed-hairpin",
      "primary-secondary",
    ] as const;

    const selected = new Set(
      Array.from({ length: 4_000 }, (_, index) =>
        sampleJigsawBaselineCourseForCutStyle(
          "unconventional",
          palette,
          (index + 0.5) / 4_000,
        ),
      ),
    );

    expect(selected).toEqual(new Set(palette));
  });

  it("is deterministic at the palette boundary", () => {
    expect(
      deriveJigsawBaselineCoursePalette("traditional", "same-seed"),
    ).toEqual(
      deriveJigsawBaselineCoursePalette("traditional", "same-seed"),
    );
    expect(
      deriveJigsawBaselineCoursePalette("unconventional", "same-seed"),
    ).toEqual(
      deriveJigsawBaselineCoursePalette("unconventional", "same-seed"),
    );
  });
});
