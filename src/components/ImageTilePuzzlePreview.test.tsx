import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canSlideTile, slideTileIntoGap } from "../games/imageTiles/state";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import {
  getImageTileBoardStyle,
  getImageTileInstruction,
  restoreImageTileProgress,
  shouldRevealSlidingCompletionGap,
} from "./ImageTilePuzzlePreview";

const imageTilePreviewSource = readFileSync(new URL("./ImageTilePuzzlePreview.tsx", import.meta.url), "utf8");
const imageTileCss = readFileSync(new URL("../site/image-tiles.css", import.meta.url), "utf8");

describe("ImageTilePuzzlePreview layout", () => {
  it("defines both grid axes and caps tall boards by viewport height", () => {
    expect(getImageTileBoardStyle(2, 8)).toMatchObject({
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gridTemplateRows: "repeat(8, minmax(0, 1fr))",
      aspectRatio: "2 / 8",
      width: "min(100%, 42rem, 18vh)",
    });
  });

  it("replaces active move instructions with stable completion copy after solve", () => {
    expect(getImageTileInstruction(true, false, null)).toBe("Puzzle complete.");
    expect(getImageTileInstruction(true, true, null)).toBe("Puzzle complete.");
    expect(getImageTileInstruction(false, true, null)).toBe(
      "Choose any tile in the empty space's row or column. The tiles between it and the gap slide together.",
    );
    expect(getImageTileInstruction(false, false, null)).toBe(
      "Choose one tile, then another, to exchange their positions.",
    );
    expect(getImageTileInstruction(false, false, "tile-1")).toBe(
      "Choose a second tile to exchange with the selected tile.",
    );
  });

  it("reserves instruction geometry across active and solved copy", () => {
    expect(imageTilePreviewSource.match(/class="image-tile-instruction-sizer" aria-hidden="true"/g)?.length).toBe(2);
    expect(imageTileCss).toMatch(/\.image-tile-instruction\s*\{[^}]*display: grid;/);
    expect(imageTileCss).toMatch(/\.image-tile-instruction > span\s*\{[^}]*grid-area: 1 \/ 1;/);
    expect(imageTileCss).toMatch(/\.image-tile-instruction-sizer\s*\{[^}]*visibility: hidden;/);
    expect(imageTileCss).toMatch(/\.image-tile-instruction-copy\s*\{[^}]*align-self: center;/);
  });

  it("keeps the Sliding Puzzle gap empty until completion presentation begins", () => {
    expect(shouldRevealSlidingCompletionGap(true, "playing")).toBe(false);
    expect(shouldRevealSlidingCompletionGap(true, "settling")).toBe(false);
    expect(shouldRevealSlidingCompletionGap(true, "celebrating")).toBe(true);
    expect(shouldRevealSlidingCompletionGap(true, "completed")).toBe(true);
    expect(shouldRevealSlidingCompletionGap(true)).toBe(true);
    expect(shouldRevealSlidingCompletionGap(false, "completed")).toBe(false);
  });
});

describe("ImageTilePuzzlePreview progress restoration", () => {
  it("restores a matching Tile Swap position using canonical tile metadata", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "restore-swap", width: 3, height: 3 });
    const swappedIndexes = puzzle.tiles.map((tile) => ({ id: tile.id, currentIndex: (tile.currentIndex + 1) % 9 }));
    const restored = restoreImageTileProgress(puzzle, {
      schemaVersion: 1,
      puzzleId: "tile-swap",
      puzzleInstanceId: puzzle.id,
      assetId: puzzle.asset.id,
      width: 3,
      height: 3,
      tileOrder: swappedIndexes,
      moveCount: 4,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(restored?.moveCount).toBe(4);
    expect(restored?.tiles.map((tile) => tile.currentIndex)).toEqual(swappedIndexes.map((tile) => tile.currentIndex));
    expect(restored?.tiles.map((tile) => tile.solvedIndex)).toEqual(puzzle.tiles.map((tile) => tile.solvedIndex));
  });

  it("rejects progress from a different concrete puzzle instance", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "restore-swap", width: 3, height: 3 });
    expect(restoreImageTileProgress(puzzle, {
      schemaVersion: 1,
      puzzleId: "tile-swap",
      puzzleInstanceId: "other-instance",
      assetId: puzzle.asset.id,
      width: 3,
      height: 3,
      tileOrder: puzzle.tiles.map(({ id, currentIndex }) => ({ id, currentIndex })),
      moveCount: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    })).toBeNull();
  });

  it("restores a progressed Sliding Puzzle position with its moved gap", () => {
    const puzzle = generateSlidingPuzzle({ puzzleId: "sliding-puzzle", seed: "restore-moved-slide", width: 4, height: 4 });
    const movableTile = puzzle.tiles.find((tile) => canSlideTile(tile, puzzle.emptyIndex, puzzle.width, puzzle.height));
    expect(movableTile).toBeDefined();
    if (!movableTile) return;

    const moved = slideTileIntoGap(puzzle.tiles, movableTile.id, puzzle.emptyIndex, puzzle.width, puzzle.height);
    expect(moved.moved).toBe(true);
    const restored = restoreImageTileProgress(puzzle, {
      schemaVersion: 1,
      puzzleId: "sliding-puzzle",
      puzzleInstanceId: puzzle.id,
      assetId: puzzle.asset.id,
      width: puzzle.width,
      height: puzzle.height,
      tileOrder: moved.tiles.map(({ id, currentIndex }) => ({ id, currentIndex })),
      emptyIndex: moved.emptyIndex,
      moveCount: 1,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(restored?.moveCount).toBe(1);
    expect(restored?.emptyIndex).toBe(moved.emptyIndex);
    expect(restored?.tiles.map((tile) => tile.currentIndex)).toEqual(moved.tiles.map((tile) => tile.currentIndex));
  });

  it("requires a valid unoccupied gap for Sliding Puzzle progress", () => {
    const puzzle = generateSlidingPuzzle({ puzzleId: "sliding-puzzle", seed: "restore-slide", width: 4, height: 4 });
    const base = {
      schemaVersion: 1,
      puzzleId: "sliding-puzzle",
      puzzleInstanceId: puzzle.id,
      assetId: puzzle.asset.id,
      width: 4,
      height: 4,
      tileOrder: puzzle.tiles.map(({ id, currentIndex }) => ({ id, currentIndex })),
      moveCount: 3,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    expect(restoreImageTileProgress(puzzle, { ...base, emptyIndex: puzzle.emptyIndex })).not.toBeNull();
    expect(restoreImageTileProgress(puzzle, { ...base, emptyIndex: puzzle.tiles[0].currentIndex })).toBeNull();
  });
});
