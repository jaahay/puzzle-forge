import type { CardStack } from "../catalog/types";
import { cloneStack, type CardSelection } from "../interactions/cardRules";
import {
  solitaireHistoryLimit,
  type SolitaireHistoryEntry,
  type SolitaireStats,
} from "./session";

export type SolitaireHistoryAction = "undo" | "redo";

export type SolitaireHistoryRuntime = {
  cardStacks: CardStack[];
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  undoStack: SolitaireHistoryEntry[];
  redoStack: SolitaireHistoryEntry[];
  statusMessage: string;
};

export const cloneSolitaireHistoryEntry = (entry: SolitaireHistoryEntry): SolitaireHistoryEntry => ({
  cardStacks: entry.cardStacks.map(cloneStack),
  selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
  solitaireStats: { ...entry.solitaireStats },
  statusMessage: entry.statusMessage,
});

export const makeSolitaireHistoryEntry = (
  stacks: CardStack[],
  selected: CardSelection | null,
  stats: SolitaireStats,
  message: string,
): SolitaireHistoryEntry => ({
  cardStacks: stacks.map(cloneStack),
  selectedCard: selected ? { ...selected } : null,
  solitaireStats: { ...stats },
  statusMessage: message,
});

export const getSolitaireHistoryAvailability = (
  undoStack: readonly SolitaireHistoryEntry[],
  redoStack: readonly SolitaireHistoryEntry[],
) => ({
  canUndo: undoStack.length > 0,
  canRedo: redoStack.length > 0,
});

export const applySolitaireHistoryAction = (
  runtime: SolitaireHistoryRuntime,
  action: SolitaireHistoryAction,
): SolitaireHistoryRuntime | null => {
  const sourceStack = action === "undo" ? runtime.undoStack : runtime.redoStack;
  const target = sourceStack.at(-1);
  if (!target) return null;

  const current = makeSolitaireHistoryEntry(
    runtime.cardStacks,
    runtime.selectedCard,
    runtime.solitaireStats,
    runtime.statusMessage,
  );

  if (action === "undo") {
    return {
      cardStacks: target.cardStacks.map(cloneStack),
      selectedCard: target.selectedCard ? { ...target.selectedCard } : null,
      solitaireStats: { ...target.solitaireStats },
      undoStack: runtime.undoStack.slice(0, -1).map(cloneSolitaireHistoryEntry),
      redoStack: [...runtime.redoStack.map(cloneSolitaireHistoryEntry), current].slice(-solitaireHistoryLimit),
      statusMessage: target.statusMessage,
    };
  }

  return {
    cardStacks: target.cardStacks.map(cloneStack),
    selectedCard: target.selectedCard ? { ...target.selectedCard } : null,
    solitaireStats: { ...target.solitaireStats },
    undoStack: [...runtime.undoStack.map(cloneSolitaireHistoryEntry), current].slice(-solitaireHistoryLimit),
    redoStack: runtime.redoStack.slice(0, -1).map(cloneSolitaireHistoryEntry),
    statusMessage: target.statusMessage,
  };
};
