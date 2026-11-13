import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canSlideTile, slideTileIntoGap } from "../games/imageTiles/state";
import {
  applyImageTileHistoryAction,
  makeEmptyImageTileHistoryState,
  slideImageTileAction,
  swapImageTileAction,
  type ImageTileActionRuntime,
} from "../games/imageTiles/history";
import { generateSlidingPuzzle } from "../games/slidingPuzzle/generate";
import { generateTileSwap } from "../games/tileSwap/generate";
import {
  buildPersistedImageTileProgress,
  getImageTileBoardStyle,
  getImageTileHelpCopy,
  restoreImageTileProgress,
  restoreImageTileRuntime,
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
    expect(imageTileCss).toMatch(/\.image-tile-tools\s*\{[^}]*position: relative;/);
    expect(imageTileCss).toMatch(/\.image-tile-help\s*\{[^}]*position: static;/);
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

describe("ImageTilePuzzlePreview history persistence", () => {
  it("round-trips Tile Swap undo and redo in the existing progress record", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "history-swap", width: 3, height: 3 });
    const initial: ImageTileActionRuntime = {
      state: { tiles: puzzle.tiles.map((tile) => ({ ...tile })), moveCount: 0 },
      history: makeEmptyImageTileHistoryState(),
    };
    const first = swapImageTileAction(initial, puzzle.tiles[0].id, puzzle.tiles[1].id);
    expect(first).not.toBeNull();
    if (!first) return;
    const second = swapImageTileAction(first, puzzle.tiles[1].id, puzzle.tiles[2].id);
    expect(second).not.toBeNull();
    if (!second) return;
    const undone = applyImageTileHistoryAction(second, "undo");
    expect(undone).not.toBeNull();
    if (!undone) return;

    const persisted = buildPersistedImageTileProgress(puzzle, {
      progress: { puzzleInstanceId: puzzle.id, ...undone.state },
      history: undone.history,
    });
    const restored = restoreImageTileRuntime(puzzle, JSON.parse(JSON.stringify(persisted)));
    expect(restored?.history.undoStack).toHaveLength(1);
    expect(restored?.history.redoStack).toHaveLength(1);
    expect(restored?.progress.moveCount).toBe(1);
    expect(restored?.history.undoStack[0]?.tiles.map((tile) => tile.currentIndex)).toEqual(initial.state.tiles.map((tile) => tile.currentIndex));
    const restarted = restored && applyImageTileHistoryAction({ state: restored.progress, history: restored.history }, "redo");
    expect(restarted?.state.tiles.map((tile) => tile.currentIndex)).toEqual(second.state.tiles.map((tile) => tile.currentIndex));
    expect(restarted?.state.moveCount).toBe(2);
  });

  it("round-trips Sliding Puzzle history with each unoccupied gap", () => {
    const puzzle = generateSlidingPuzzle({ puzzleId: "sliding-puzzle", seed: "history-slide", width: 4, height: 4 });
    const movable = puzzle.tiles.find((tile) => canSlideTile(tile, puzzle.emptyIndex, puzzle.width, puzzle.height));
    expect(movable).toBeDefined();
    if (!movable) return;
    const initial: ImageTileActionRuntime = {
      state: { tiles: puzzle.tiles.map((tile) => ({ ...tile })), emptyIndex: puzzle.emptyIndex, moveCount: 0 },
      history: makeEmptyImageTileHistoryState(),
    };
    const moved = slideImageTileAction(initial, movable.id, puzzle.width, puzzle.height);
    expect(moved).not.toBeNull();
    if (!moved) return;
    const persisted = buildPersistedImageTileProgress(puzzle, {
      progress: { puzzleInstanceId: puzzle.id, ...moved.state },
      history: moved.history,
    });
    const restored = restoreImageTileRuntime(puzzle, JSON.parse(JSON.stringify(persisted)));
    const undo = restored && applyImageTileHistoryAction({ state: restored.progress, history: restored.history }, "undo");
    expect(undo?.state.emptyIndex).toBe(initial.state.emptyIndex);
    expect(undo?.state.tiles.map((tile) => tile.currentIndex)).toEqual(initial.state.tiles.map((tile) => tile.currentIndex));
    expect(undo?.state.moveCount).toBe(0);
  });

  it("retains valid progress but drops tampered or oversized history", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "history-invalid", width: 3, height: 3 });
    const first = swapImageTileAction({
      state: { tiles: puzzle.tiles.map((tile) => ({ ...tile })), moveCount: 0 },
      history: makeEmptyImageTileHistoryState(),
    }, puzzle.tiles[0].id, puzzle.tiles[1].id);
    expect(first).not.toBeNull();
    if (!first) return;
    const envelope = buildPersistedImageTileProgress(puzzle, {
      progress: { puzzleInstanceId: puzzle.id, ...first.state },
      history: first.history,
    });
    const invalid = { ...envelope, history: {
      undo: [{ positions: Array(puzzle.tiles.length).fill(0), moveCount: 0 }],
      redo: [],
    } };
    const recovered = restoreImageTileRuntime(puzzle, invalid);
    expect(recovered?.progress.moveCount).toBe(1);
    expect(recovered?.history.undoStack).toHaveLength(0);
    expect(restoreImageTileRuntime(puzzle, { ...envelope, history: { undo: Array(101).fill(envelope.history?.undo[0]), redo: [] } })?.history.undoStack).toHaveLength(0);
    expect(restoreImageTileRuntime(puzzle, { ...envelope, puzzleInstanceId: "another-puzzle" })).toBeNull();
  });

  it("restores old position-only records with empty history", () => {
    const puzzle = generateTileSwap({ puzzleId: "tile-swap", seed: "history-empty", width: 3, height: 3 });
    const envelope = buildPersistedImageTileProgress(puzzle, {
      progress: { puzzleInstanceId: puzzle.id, tiles: puzzle.tiles, moveCount: 0 },
      history: makeEmptyImageTileHistoryState(),
    });
    const { history: _history, ...positionOnly } = envelope;
    const restored = restoreImageTileRuntime(puzzle, positionOnly);
    expect(restored?.progress.tiles).toEqual(puzzle.tiles);
    expect(restored?.history).toEqual({ undoStack: [], redoStack: [] });
  });
});
