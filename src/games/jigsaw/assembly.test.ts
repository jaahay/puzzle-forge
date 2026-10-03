import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../../catalog/types";
import {
  getJigsawAssemblyComponents,
  getJigsawConnectedPieceCount,
  isJigsawAssemblySolved,
  mergeJigsawAssemblyComponents,
  normalizeJigsawAssemblyProgress,
  parseJigsawAssemblyProgress,
} from "./assembly";

const makePiece = (id: string, neighbors: string[]): JigsawPiece => ({
  id,
  currentIndex: Number(id.replace("tile-", "")),
  solvedIndex: Number(id.replace("tile-", "")),
  row: 0,
  column: Number(id.replace("tile-", "")),
  edges: [
    ...neighbors.map((neighborPieceId, index) => ({
      edgeId: `${id}-edge-${index}`,
      side: "right" as const,
      boundary: false as const,
      neighborPieceId,
      neighborEdgeId: `${neighborPieceId}-edge`,
      profileId: "classic-bulb" as const,
      polarity: "tab" as const,
      seedOffset: index + 1,
    })),
    {
      edgeId: `${id}-boundary`,
      side: "left" as const,
      boundary: true as const,
      neighborPieceId: null,
      neighborEdgeId: null,
      profileId: null,
      polarity: "flat" as const,
      seedOffset: 0,
    },
  ],
});

const pieces = [
  makePiece("tile-0", ["tile-1"]),
  makePiece("tile-1", ["tile-0", "tile-2"]),
  makePiece("tile-2", ["tile-1", "tile-3"]),
  makePiece("tile-3", ["tile-2"]),
];

describe("Jigsaw assembly progress", () => {
  it("canonicalizes equivalent component partitions independently of assembly order", () => {
    expect(normalizeJigsawAssemblyProgress({
      joinedComponents: [["tile-3", "tile-2"], ["tile-1", "tile-0"]],
    })).toEqual({
      joinedComponents: [["tile-0", "tile-1"], ["tile-2", "tile-3"]],
    });
  });

  it("merges components transitively without persisting component ids", () => {
    const first = mergeJigsawAssemblyComponents({ joinedComponents: [] }, "tile-0", "tile-1");
    const second = mergeJigsawAssemblyComponents(first, "tile-1", "tile-2");
    expect(second).toEqual({ joinedComponents: [["tile-0", "tile-1", "tile-2"]] });
    expect(getJigsawConnectedPieceCount(second)).toBe(3);
  });

  it("derives singleton components without persisting them", () => {
    expect(getJigsawAssemblyComponents({
      joinedComponents: [["tile-0", "tile-1"]],
    }, pieces)).toEqual([
      ["tile-0", "tile-1"],
      ["tile-2"],
      ["tile-3"],
    ]);
  });

  it("recognizes completion from one full component", () => {
    expect(isJigsawAssemblySolved({
      joinedComponents: [["tile-0", "tile-1", "tile-2", "tile-3"]],
    }, 4)).toBe(true);
    expect(isJigsawAssemblySolved({
      joinedComponents: [["tile-0", "tile-1"], ["tile-2", "tile-3"]],
    }, 4)).toBe(false);
  });

  it("rejects foreign, overlapping, duplicate, and disconnected persisted membership", () => {
    expect(parseJigsawAssemblyProgress({
      joinedComponents: [["tile-0", "foreign"]],
    }, pieces)).toBeNull();
    expect(parseJigsawAssemblyProgress({
      joinedComponents: [["tile-0", "tile-1"], ["tile-1", "tile-2"]],
    }, pieces)).toBeNull();
    expect(parseJigsawAssemblyProgress({
      joinedComponents: [["tile-0", "tile-0"]],
    }, pieces)).toBeNull();
    expect(parseJigsawAssemblyProgress({
      joinedComponents: [["tile-0", "tile-3"]],
    }, pieces)).toBeNull();
  });

  it("accepts and canonicalizes a valid persisted partition", () => {
    expect(parseJigsawAssemblyProgress({
      joinedComponents: [["tile-2", "tile-1"], ["tile-3", "tile-2"]],
    }, pieces)).toBeNull();

    expect(parseJigsawAssemblyProgress({
      joinedComponents: [["tile-2", "tile-1", "tile-0"]],
    }, pieces)).toEqual({
      joinedComponents: [["tile-0", "tile-1", "tile-2"]],
    });
  });
});
