import type { CardStack, GeneratedPuzzle, PuzzleCell } from "../catalog/types";
import type { JigsawAssemblyProgress } from "../games/jigsaw/assembly";
import { isJigsawAssemblySolved } from "../games/jigsaw/assembly";
import { isSolitaireSolved } from "./solitaireTerminal";
import { isGridPuzzleSolved } from "../interactions/gridChecking";

export type WorkspaceProgressReport = { hasProgress: boolean; terminal: boolean };
export type IdentifiedWorkspaceProgress = WorkspaceProgressReport & { puzzleInstanceId: string };
export type DestructivePuzzleAction = "new" | "reset";
export type PendingAbandonmentAction = {
  action: DestructivePuzzleAction;
  puzzleInstanceId: string;
  proceed: () => void;
};
export type AbandonmentRuntime = {
  gridCells: PuzzleCell[] | null;
  cardStacks: CardStack[] | null;
  jigsawAssembly: JigsawAssemblyProgress | null;
  workspaceProgress: IdentifiedWorkspaceProgress | null;
};

const sameCardLayout = (current: readonly CardStack[], initial: readonly CardStack[]) =>
  current.length === initial.length && current.every((stack, index) => {
    const baseline = initial[index];
    return Boolean(baseline && stack.id === baseline.id &&
      stack.faceDownCount === baseline.faceDownCount &&
      stack.cards.length === baseline.cards.length &&
      stack.cards.every((card, cardIndex) => {
        const original = baseline.cards[cardIndex];
        return original?.code === card.code && original.faceUp === card.faceUp;
      }));
  });

export const needsAbandonmentConfirmation = (puzzle: GeneratedPuzzle | null, runtime: AbandonmentRuntime): boolean => {
  if (!puzzle) return false;
  const reported = runtime.workspaceProgress?.puzzleInstanceId === puzzle.id ? runtime.workspaceProgress : null;
  if (puzzle.kind === "grid") {
    const cells = runtime.gridCells;
    if (!cells || cells.length !== puzzle.cells.length) return false;
    const hasProgress = cells.some((cell, index) => {
      const original = puzzle.cells[index];
      return Boolean(original && cell.value !== (original.locked ? original.value : ""));
    });
    return hasProgress && (puzzle.puzzleId === "word-guess" ? !reported?.terminal : !isGridPuzzleSolved(puzzle, cells));
  }
  if (puzzle.kind === "cards") {
    const stacks = runtime.cardStacks;
    return Boolean(stacks && !sameCardLayout(stacks, puzzle.stacks) && !isSolitaireSolved(stacks));
  }
  if (puzzle.puzzleId === "jigsaw") {
    const assembly = runtime.jigsawAssembly;
    return (Boolean(assembly?.joinedComponents.length) || Boolean(reported?.hasProgress)) &&
      !(assembly && isJigsawAssemblySolved(assembly, puzzle.tiles.length)) && !reported?.terminal;
  }
  return Boolean(reported?.hasProgress && !reported.terminal);
};

// The transient request is discarded on cancellation and consumed at most once on confirmation.
export const planAbandonmentAction = (
  puzzle: GeneratedPuzzle | null,
  runtime: AbandonmentRuntime,
  action: DestructivePuzzleAction,
  proceed: () => void,
): PendingAbandonmentAction | null => {
  if (!puzzle || !needsAbandonmentConfirmation(puzzle, runtime)) {
    proceed();
    return null;
  }
  let consumed = false;
  return {
    action,
    puzzleInstanceId: puzzle.id,
    proceed: () => {
      if (consumed) return;
      consumed = true;
      proceed();
    },
  };
};
