import { describe, expect, it } from "vitest";
import type { JigsawCutStyle } from "../../catalog/types";
import { jigsawBaselineCourseIds } from "./baselineCourse";
import {
  defaultJigsawCutStyle,
  deriveJigsawBaselineCoursePalette,
  isJigsawCutStyle,
  jigsawCutStyles,
  jigsawEdgeProfileIds,
  normalizeJigsawCutStyle,
  sampleJigsawBaselineCourseForCutStyle,
  selectJigsawEdgeProfileForCutStyle,
} from "./cutStyle";

const selectedProfiles = (cutStyle: JigsawCutStyle) =>
  new Set(
    Array.from({ length: 12_000 }, (_, index) =>
      selectJigsawEdgeProfileForCutStyle(
        cutStyle,
        (index + 0.5) / 12_000,
      ),
    ),
  );

describe("Jigsaw cut style", () => {
  it("exposes a small curated visual-style taxonomy", () => {
    expect(jigsawCutStyles).toEqual([
      "classic",
      "flowing",
      "geometric",
      "intricate",
      "eclectic",
    ]);
    expect(defaultJigsawCutStyle).toBe("classic");
    jigsawCutStyles.forEach((style) => {
      expect(isJigsawCutStyle(style)).toBe(true);
      expect(normalizeJigsawCutStyle(style)).toBe(style);
    });
  });

  it("gives each named style a distinct connector vocabulary", () => {
    expect(selectedProfiles("classic")).toEqual(new Set(["classic-bulb", "necked-head"]));
    expect(selectedProfiles("flowing")).toEqual(new Set([
      "classic-bulb",
      "multi-lobe",
      "scoop",
      "serpentine",
      "connectorless-wave",
    ]));
    expect(selectedProfiles("geometric")).toEqual(new Set(["terrace", "zigzag", "stacked-lock"]));
    expect(selectedProfiles("intricate")).toEqual(new Set([
      "necked-head",
      "multi-lobe",
      "stacked-lock",
      "compound-lock",
      "opposed-dual-lock",
      "notched-head",
    ]));
    expect(selectedProfiles("eclectic")).toEqual(new Set(jigsawEdgeProfileIds));
  });

  it("derives small coherent baseline palettes for the focused styles", () => {
    const policies = {
      classic: {
        length: 3,
        required: ["straight", "bow"],
        allowed: ["straight", "bow", "inflection", "angled-course"],
      },
      flowing: {
        length: 3,
        required: ["bow", "wave"],
        allowed: ["straight", "bow", "inflection", "wave"],
      },
      geometric: {
        length: 3,
        required: ["angled-course", "stepped-course"],
        allowed: ["straight", "angled-course", "dogleg", "stepped-course"],
      },
      intricate: {
        length: 4,
        required: ["primary-secondary"],
        allowed: [
          "bow",
          "inflection",
          "wave",
          "separated-bows",
          "opposed-pair",
          "primary-secondary",
          "inflection-rest-bow",
          "same-side-hairpin",
          "opposed-hairpin",
          "counter-hook",
        ],
      },
    } as const;

    for (const cutStyle of ["classic", "flowing", "geometric", "intricate"] as const) {
      const policy = policies[cutStyle];
      for (let index = 0; index < 128; index += 1) {
        const palette = deriveJigsawBaselineCoursePalette(cutStyle, `${cutStyle}-${index}`);
        expect(palette).toHaveLength(policy.length);
        expect(new Set(palette).size).toBe(policy.length);
        policy.required.forEach((courseId) => expect(palette).toContain(courseId));
        expect(
          palette.every((courseId) => (policy.allowed as readonly string[]).includes(courseId)),
        ).toBe(true);
      }
    }
  });

  it("lets Eclectic palettes reach every production baseline course", () => {
    const observed = new Set<string>();
    for (let index = 0; index < 2_048; index += 1) {
      const palette = deriveJigsawBaselineCoursePalette("eclectic", `eclectic-${index}`);
      expect(palette).toHaveLength(4);
      expect(new Set(palette).size).toBe(4);
      expect(palette).toContain("bow");
      palette.forEach((courseId) => observed.add(courseId));
    }
    expect(observed).toEqual(new Set(jigsawBaselineCourseIds));
  });

  it("samples only within the puzzle's selected baseline sub-palette", () => {
    const palette = ["bow", "separated-bows", "opposed-hairpin", "primary-secondary"] as const;
    const selected = new Set(
      Array.from({ length: 4_000 }, (_, index) =>
        sampleJigsawBaselineCourseForCutStyle(
          "intricate",
          palette,
          (index + 0.5) / 4_000,
        ),
      ),
    );
    expect(selected).toEqual(new Set(palette));
  });

  it("is deterministic at the palette boundary for every style", () => {
    for (const cutStyle of jigsawCutStyles) {
      expect(deriveJigsawBaselineCoursePalette(cutStyle, "same-seed")).toEqual(
        deriveJigsawBaselineCoursePalette(cutStyle, "same-seed"),
      );
    }
  });
});
