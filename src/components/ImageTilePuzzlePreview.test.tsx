import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canSlideTile, slideTileIntoGap } from "../games/imageTiles/state";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import {
  getImageTileBoardStyle,
  getImageTileHelpCopy,
  restoreImageTileProgress,
  shouldRevealSlidingCompletionGap,
} from "./ImageTilePuzzlePreview";

const imageTilePreviewSource = readFileSync(new URL("./ImageTilePuzzlePreview.tsx", import.meta.url), "utf8");
const imageTileCss = readFileSync(new URL("../site/image-tiles.css", import.meta.url), "utf8");

describe("ImageTilePuzzlePreview layout", () => {
  it("defines both grid axes and uses measured play height for tall boards", () => {
    expect(getImageTileBoardStyle(2, 8, 640, 360)).toMatchObject({
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gridTemplateRows: "repeat(8, minmax(0, 1fr))",
      aspectRatio: "2 / 8",
      width: "90px",
    });
  });

  it("uses measured width for wide boards without exceeding the desktop cap", () => {
    expect(getImageTileBoardStyle(8, 2, 500, 600).width).toBe("500px");
    expect(getImageTileBoardStyle(8, 2, 900, 600).width).toBe("672px");
  });

  it("falls back to the responsive width cap until the play surface is measured", () => {
    expect(getImageTileBoardStyle(4, 4).width).toBe("min(100%, 42rem)");
    expect(imageTilePreviewSource).toContain('class="image-tile-board-viewport"');
    expect(imageTileCss).toMatch(/\.image-tile-board-viewport\s*\{[^}]*width:\s*100%;/);
  });

  it("keeps image-tile rules behind deliberate help disclosure", () => {
    expect(getImageTileHelpCopy(true)).toBe(
      "Choose any tile in the empty space's row or column. The tiles between it and the gap slide together.",
    );
    expect(getImageTileHelpCopy(false)).toBe(
      "Choose one tile, then another, to exchange their positions.",
    );
    expect(imageTilePreviewSource).toContain('class="image-tile-help"');
    expect(imageTilePreviewSource).toContain('aria-label={`How to play ${puzzle.title}`}');
    expect(imageTilePreviewSource).toContain("<InfoIcon />");
    expect(imageTilePreviewSource).not.toContain('class="image-tile-instruction"');
    expect(imageTilePreviewSource).not.toContain("image-tile-instruction-sizer");
    expect(imageTilePreviewSource).not.toContain("Puzzle complete.");
    expect(imageTileCss).toMatch(/\.image-tile-help > summary\s*\{[^}]*list-style: none;/);
    expect(imageTileCss).toMatch(/\.image-tile-help > p\s*\{[^}]*position: absolute;/);
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
