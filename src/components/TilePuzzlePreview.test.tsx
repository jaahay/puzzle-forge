import { describe, expect, it } from "vitest";
import type { JigsawPiece } from "../catalog/types";
import { createJigsawWorldLayout, getJigsawStagingMode, type JigsawPlacement } from "../games/jigsaw/placement";
import { getMeasuredJigsawViewport, resolveInitialJigsawPlacements } from "./TilePuzzlePreview";

const makePiece = (solvedIndex: number, width = 4): JigsawPiece => ({
  id: `tile-${solvedIndex}`,
  currentIndex: solvedIndex,
  solvedIndex,
  row: Math.floor(solvedIndex / width),
  column: solvedIndex % width,
  edges: [],
});

describe("Jigsaw placement initialization", () => {
  it("uses the measured play surface and rejects unavailable measurements", () => {
    expect(getMeasuredJigsawViewport(null)).toBeNull();
    expect(getMeasuredJigsawViewport({ clientWidth: 0, clientHeight: 700 })).toBeNull();
    expect(getMeasuredJigsawViewport({ clientWidth: 1180, clientHeight: 640 })).toEqual({
      width: 1180,
      height: 640,
    });
  });

  it("restores persisted placements without waiting for a play-surface measurement", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 1200,
      imageHeight: 900,
      puzzleWidth: 4,
      puzzleHeight: 4,
    });
    const pieces = [makePiece(0)];
    const persisted: JigsawPlacement[] = [{
      id: "tile-0",
      worldX: 24,
      worldY: 36,
      snapped: false,
    }];

    expect(resolveInitialJigsawPlacements(persisted, layout, pieces, null)).toBe(persisted);
  });

  it("waits for a real play-surface measurement before staging a fresh puzzle", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, 6));

    expect(resolveInitialJigsawPlacements(null, layout, pieces, null)).toBeNull();
    expect(resolveInitialJigsawPlacements(null, layout, pieces, { width: 0, height: 800 })).toBeNull();
  });

  it("stages a fresh puzzle from the supplied play-surface shape", () => {
    const layout = createJigsawWorldLayout({
      imageWidth: 721,
      imageHeight: 2048,
      puzzleWidth: 6,
      puzzleHeight: 17,
    });
    const pieces = Array.from({ length: 48 }, (_, index) => makePiece(index, 6));
    const wideStage = { width: 1180, height: 640 };
    const tallStage = { width: 640, height: 1180 };

    const widePlacements = resolveInitialJigsawPlacements(null, layout, pieces, wideStage);
    const tallPlacements = resolveInitialJigsawPlacements(null, layout, pieces, tallStage);

    expect(getJigsawStagingMode(layout, pieces.length, wideStage)).toBe("sides");
    expect(getJigsawStagingMode(layout, pieces.length, tallStage)).not.toBe("sides");
    expect(widePlacements).not.toBeNull();
    expect(tallPlacements).not.toBeNull();
    expect(widePlacements).not.toEqual(tallPlacements);
  });
});
