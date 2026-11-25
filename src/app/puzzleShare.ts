import type { CardStack, GeneratedPuzzle, PuzzleCell } from "../catalog/types";
import type { ImageTileActionRuntime } from "../games/imageTiles/history";
import { isImageTileSolved } from "../games/imageTiles/state";
import { isJigsawAssemblySolved } from "../games/jigsaw/assembly";
import type { JigsawActionRuntime } from "../games/jigsaw/history";
import { isGridPuzzleSolved } from "../interactions/gridChecking";
import { generatedPuzzleMatchesIdentity } from "./generationIdentity";
import { resolvePuzzleResourceSegment } from "./puzzleResourceIdentity";
import { appRoutePath, type AppRoute } from "./routes";
import type { SolitaireStats } from "./session";
import { getSolitaireFoundationCardCount, isSolitaireSolved } from "./solitaireTerminal";

export type PuzzleShareResource = {
  puzzleInstanceId: string;
  title: string;
  url: string;
};

export type PuzzleShareIntent = "puzzle" | "progress";

export const getPuzzleShareResource = (
  route: AppRoute,
  puzzle: GeneratedPuzzle | null,
  origin: string,
): PuzzleShareResource | null => {
  if (!puzzle || route.kind !== "resource") return null;
  const resolved = resolvePuzzleResourceSegment(route.puzzleId, route.generationId);
  if (!resolved.ok || !generatedPuzzleMatchesIdentity(puzzle, resolved.identity)) return null;

  // Share the committed canonical resource, never the browser's mutable selector,
  // query, fragment, prospective settings, or an unrelated mounted puzzle.
  return {
    puzzleInstanceId: puzzle.id,
    title: puzzle.title,
    url: new URL(appRoutePath({ kind: "resource", ...resolved.canonicalResource }), origin).href,
  };
};

export type PuzzleShareProgress = {
  gridCells: PuzzleCell[] | null;
  cardStacks: CardStack[] | null;
  solitaireStats: SolitaireStats;
  imageTileRuntime: ImageTileActionRuntime | null;
  jigsawRuntime: JigsawActionRuntime | null;
};

// Summaries describe completed player intentions, never the values of cells,
// guesses, cards, positions, answer keys, or undo/redo snapshots.
export const formatPuzzleShareProgress = (
  puzzle: GeneratedPuzzle,
  progress: PuzzleShareProgress,
): string | null => {
  if (puzzle.kind === "grid") {
    // Word Guess owns submitted guesses and terminal outcome in its workspace.
    if (puzzle.puzzleId === "word-guess") return null;
    const cells = progress.gridCells;
    if (!cells || cells.length !== puzzle.cells.length) return null;
    const editable = puzzle.cells.filter((cell) => !cell.locked).length;
    const entered = cells.filter((cell, index) => !puzzle.cells[index]?.locked && cell.value !== "").length;
    const solved = isGridPuzzleSolved(puzzle, cells);
    if (!solved && entered === 0) return null;
    const label = puzzle.puzzleId === "nonogram" ? "cells marked" : "editable cells filled";
    return `${puzzle.title} · ${puzzle.width}×${puzzle.height}\n${solved ? "Solved" : `In progress · ${entered}/${editable} ${label}`}`;
  }

  if (puzzle.kind === "cards") {
    if (!progress.cardStacks) return null;
    const foundationCount = getSolitaireFoundationCardCount(progress.cardStacks);
    const moves = progress.solitaireStats.moveCount;
    const solved = isSolitaireSolved(progress.cardStacks);
    if (!solved && foundationCount === 0 && moves === 0 && progress.solitaireStats.drawCount === 0 &&
        progress.solitaireStats.recycleCount === 0) return null;
    return `${puzzle.title}\n${solved ? "Solved" : `In progress · ${foundationCount}/52 cards in foundations`} · ${moves} ${moves === 1 ? "move" : "moves"}`;
  }

  // New puzzle families can publish their own progress via the shared workspace hook.
  if (puzzle.kind !== "tiles") return null;

  if (puzzle.puzzleId === "jigsaw") {
    const runtime = progress.jigsawRuntime;
    if (!runtime) return null;
    const { assembly } = runtime.snapshot;
    const joinedOrAnchored = new Set([
      ...assembly.joinedComponents.flat(),
      ...(assembly.anchoredPieceIds ?? []),
    ]).size;
    const solved = isJigsawAssemblySolved(assembly, puzzle.tiles.length);
    if (!solved && joinedOrAnchored === 0 && runtime.history.undoStack.length === 0) return null;
    return `${puzzle.title} · ${puzzle.asset.title} · ${puzzle.tiles.length} pieces\n${solved ? "Solved" : `In progress · ${joinedOrAnchored}/${puzzle.tiles.length} pieces joined or anchored`}`;
  }

  const state = progress.imageTileRuntime?.state;
  if (!state) return null;
  const solved = isImageTileSolved(state.tiles, state.emptyIndex, puzzle.width * puzzle.height);
  if (!solved && state.moveCount === 0) return null;
  return `${puzzle.title} · ${puzzle.asset.title} · ${puzzle.width}×${puzzle.height}\n${solved ? "Solved" : "In progress"} · ${state.moveCount} ${state.moveCount === 1 ? "move" : "moves"}`;
};

export type PuzzleSharePayload = { native: ShareData; copyText: string };

export const makePuzzleSharePayload = (
  resource: PuzzleShareResource,
  intent: PuzzleShareIntent,
  progress: string | null,
): PuzzleSharePayload => {
  const title = `Puzzle Forge · ${resource.title}`;
  const report = intent === "progress" && progress ? `Puzzle Forge · ${progress}` : null;
  return {
    native: { title, url: resource.url, ...(report ? { text: report } : {}) },
    copyText: report ? `${report}\n\nPlay this puzzle: ${resource.url}` : resource.url,
  };
};

type ShareTransport = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText: (text: string) => Promise<void> };
};

export const canUseNativePuzzleShare = (transport: ShareTransport, data: ShareData) => {
  try {
    return typeof transport.share === "function" && (transport.canShare?.(data) ?? true);
  } catch {
    return false;
  }
};

export const sharePuzzleNatively = async (transport: ShareTransport, data: ShareData) => {
  if (!canUseNativePuzzleShare(transport, data) || !transport.share) return "unavailable" as const;
  try {
    // Called directly from the user's activation. Resolution is a handoff, not
    // proof that a particular recipient received the message.
    await transport.share(data);
    return "handed-off" as const;
  } catch (error) {
    return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError"
      ? "cancelled" as const
      : "unavailable" as const;
  }
};

export const copyPuzzleShare = async (transport: ShareTransport, text: string) => {
  try {
    if (!transport.clipboard) return false;
    await transport.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
