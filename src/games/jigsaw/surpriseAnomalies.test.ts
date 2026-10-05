import { describe, expect, it } from "vitest";
import {
  deriveJigsawSurpriseAnomalies,
  getJigsawSurpriseAnomalyBudget,
  jigsawSurpriseEdgeProfileIds,
} from "./surpriseAnomalies";

describe("Jigsaw surprise anomalies", () => {
  it("keeps anomaly count tiny and bounded as puzzles grow", () => {
    expect(getJigsawSurpriseAnomalyBudget(15)).toBe(0);
    expect(getJigsawSurpriseAnomalyBudget(16)).toBe(1);
    expect(getJigsawSurpriseAnomalyBudget(99)).toBe(1);
    expect(getJigsawSurpriseAnomalyBudget(100)).toBe(2);
    expect(getJigsawSurpriseAnomalyBudget(399)).toBe(2);
    expect(getJigsawSurpriseAnomalyBudget(400)).toBe(3);
    expect(getJigsawSurpriseAnomalyBudget(1024)).toBe(3);
  });

  it("derives deterministic, separated surprise seams", () => {
    const options = {
      width: 12,
      height: 12,
      edgeSeed: "surprise-test",
      dominantProfileId: "classic-bulb" as const,
    };
    const first = deriveJigsawSurpriseAnomalies(options);
    const second = deriveJigsawSurpriseAnomalies(options);

    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    expect(new Set(first.map((anomaly) => anomaly.seamKey)).size).toBe(first.length);

    const participatingPieces = first.flatMap((anomaly) => anomaly.pieceIds);
    expect(new Set(participatingPieces).size).toBe(participatingPieces.length);

    for (const anomaly of first) {
      expect(jigsawSurpriseEdgeProfileIds).toContain(anomaly.profileId);
      expect(anomaly.profileId).not.toBe(options.dominantProfileId);
    }
  });

  it("omits anomalies from tiny puzzles and never repeats the dominant profile", () => {
    expect(deriveJigsawSurpriseAnomalies({
      width: 3,
      height: 5,
      edgeSeed: "tiny",
      dominantProfileId: "classic-bulb",
    })).toEqual([]);

    const anomalies = deriveJigsawSurpriseAnomalies({
      width: 20,
      height: 20,
      edgeSeed: "large-serpentine",
      dominantProfileId: "serpentine",
    });

    expect(anomalies).toHaveLength(3);
    expect(anomalies.every((anomaly) => anomaly.profileId !== "serpentine")).toBe(true);
  });
});
