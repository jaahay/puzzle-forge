import { describe, expect, it } from "vitest";
import { getJigsawImageAsset } from "./imageAssets";
import {
  jigsawEditionLabels, jigsawPhysicalEditions, normalizeJigsawEditionChoice, resolveJigsawPhysicalEdition,
} from "./physicalEdition";

describe("artwork-informed Jigsaw physical editions", () => {
  it("resolves a stable seed-specific edition only from the artwork's eligible palette", () => {
    for (const id of ["wheat-field-cypresses", "great-wave", "gulf-stream"]) {
      const art = getJigsawImageAsset(id);
      const results = new Set<string>();
      for (let index = 0; index < 80; index++) {
        const seed = `edition-${index}`;
        const selected = resolveJigsawPhysicalEdition(art, seed);
        expect(art.editionRecommendations).toContain(selected);
        expect(resolveJigsawPhysicalEdition(art, seed)).toBe(selected);
        results.add(selected);
      }
      expect(results.size).toBeGreaterThan(1);
    }
  });

  it("labels styles by their recognizable material character, without changing stable identifiers", () => {
    expect(jigsawEditionLabels.heritage).toBe("Artisan");
    expect(jigsawEditionLabels.classic).toBe("Linen");
    expect(jigsawEditionLabels.vivid).toBe("Lustre");
  });

  it("preserves explicit player choices and falls back to Classic on uncurated artwork", () => {
    const art = getJigsawImageAsset("wheat-field-cypresses");
    for (const edition of jigsawPhysicalEditions) {
      expect(resolveJigsawPhysicalEdition(art, "same-seed", edition)).toBe(edition);
    }
    const uncurated = getJigsawImageAsset("merced-river-yosemite");
    expect(resolveJigsawPhysicalEdition(uncurated, "a")).toBe("classic");
    expect(normalizeJigsawEditionChoice("unknown")).toBe("auto");
  });
});
