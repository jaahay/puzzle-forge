import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDifficulty, PuzzleId, SolitaireVariation } from "../catalog/types";
import { normalizeSolitaireVariation } from "../games/solitaire/variation";
import { cloneStack, type CardSelection } from "../interactions/cardRules";
import { cloneGridCell, type GridCellSelection } from "../interactions/gridRules";
import type { PuzzleSession, SolitaireHistoryEntry, SolitaireStats } from "./session";

export type RuntimeSessionInput = {
  seed: string;
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  puzzle: GeneratedPuzzle | null;
  cardStacks: CardStack[] | null;
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  solitaireUndoStack: SolitaireHistoryEntry[];
  solitaireRedoStack: SolitaireHistoryEntry[];
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
  statusMessage: string;
  solitaireVariation?: SolitaireVariation;
};

export const cloneSolitaireHistoryEntry = (entry: SolitaireHistoryEntry): SolitaireHistoryEntry => ({
  cardStacks: entry.cardStacks.map(cloneStack),
  selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
  solitaireStats: { ...entry.solitaireStats },
  statusMessage: entry.statusMessage,
});

export const resolveSessionSolitaireVariation = ({ puzzle, solitaireVariation }: Pick<RuntimeSessionInput, "puzzle" | "solitaireVariation">) => {
  if (puzzle?.kind === "cards") {
    return normalizeSolitaireVariation(solitaireVariation ?? puzzle.solitaireVariation);
  }

  return solitaireVariation ? normalizeSolitaireVariation(solitaireVariation) : undefined;
};

export const buildRuntimePuzzleSession = ({
  seed,
  width,
  height,
  difficulty,
  requireUniqueSolution,
  puzzle,
  cardStacks,
  selectedCard,
  solitaireStats,
  solitaireUndoStack,
  solitaireRedoStack,
  gridCells,
  selectedGridCell,
  statusMessage,
  solitaireVariation,
}: RuntimeSessionInput): PuzzleSession => ({
  seed,
  width,
  height,
  difficulty,
  requireUniqueSolution,
  solitaireVariation: resolveSessionSolitaireVariation({ puzzle, solitaireVariation }),
  puzzle,
  cardStacks: cardStacks?.map(cloneStack) ?? null,
  selectedCard: selectedCard ? { ...selectedCard } : null,
  solitaireStats: { ...solitaireStats },
  solitaireUndoStack: solitaireUndoStack.map(cloneSolitaireHistoryEntry),
  solitaireRedoStack: solitaireRedoStack.map(cloneSolitaireHistoryEntry),
  gridCells: gridCells?.map(cloneGridCell) ?? null,
  selectedGridCell: selectedGridCell ? { ...selectedGridCell } : null,
  statusMessage,
});

export const getPuzzleSessionVariation = (puzzleId: PuzzleId, session: PuzzleSession) =>
  puzzleId === "klondike-solitaire" ? normalizeSolitaireVariation(session.solitaireVariation ?? (session.puzzle?.kind === "cards" ? session.puzzle.solitaireVariation : null)) : undefined;
