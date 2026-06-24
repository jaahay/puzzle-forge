import { useState } from "preact/hooks";
import type { CardStack, SolitaireVariation } from "../catalog/types";
import { canSelectFromStack, cloneStack, type CardSelection } from "../interactions/cardRules";
import { cloneSolitaireHistoryEntry, makeSolitaireHistoryEntry } from "./puzzleSessionRuntime";
import {
  initialSolitaireStats,
  solitaireHistoryLimit,
  type SolitaireHistoryEntry,
  type SolitaireStats,
} from "./session";
import {
  autoMoveToFoundationsInStacks,
  moveSelectedCardToStackInStacks,
  moveSingleCardToFoundationInStacks,
  type SolitaireMoveResult,
} from "./solitaireMoves";
import { drawFromStockStacks, type SolitaireStockStatsDelta, type SolitaireStackUpdate } from "./solitaireStock";

export type SolitaireControllerState = {
  cardStacks: CardStack[] | null;
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  solitaireUndoStack: SolitaireHistoryEntry[];
  solitaireRedoStack: SolitaireHistoryEntry[];
};

export type SolitaireControllerSnapshot = SolitaireControllerState & {
  statusMessage: string;
};

export type SolitaireControllerOptions = {
  statusMessage: string;
  onStatusMessage: (message: string) => void;
  solitaireVariation?: SolitaireVariation;
};

type SolitaireStatsDelta = SolitaireStockStatsDelta & { autoMoveCount?: number };
type SolitaireControllerStackUpdate = SolitaireStackUpdate & { statsDelta?: SolitaireStatsDelta };

const initialSolitaireControllerState: SolitaireControllerState = {
  cardStacks: null,
  selectedCard: null,
  solitaireStats: initialSolitaireStats,
  solitaireUndoStack: [],
  solitaireRedoStack: [],
};

const applySolitaireStatsDelta = (stats: SolitaireStats, delta?: SolitaireStatsDelta): SolitaireStats => {
  if (!delta) {
    return stats;
  }

  return {
    ...stats,
    drawCount: stats.drawCount + (delta.drawCount ?? 0),
    recycleCount: stats.recycleCount + (delta.recycleCount ?? 0),
    autoMoveCount: stats.autoMoveCount + (delta.autoMoveCount ?? 0),
    moveCount: stats.moveCount + (delta.moveCount ?? 0),
  };
};

const moveResultStatsDelta = (result: SolitaireMoveResult): SolitaireStatsDelta | undefined => {
  if (!result.moveCountDelta && !result.autoMoveCountDelta) {
    return undefined;
  }

  return {
    moveCount: result.moveCountDelta ?? 0,
    autoMoveCount: result.autoMoveCountDelta ?? 0,
  };
};

export const useSolitaireController = ({ statusMessage, onStatusMessage, solitaireVariation }: SolitaireControllerOptions) => {
  const [solitaireState, setSolitaireState] = useState<SolitaireControllerState>(initialSolitaireControllerState);
  const { cardStacks, selectedCard, solitaireStats, solitaireUndoStack, solitaireRedoStack } = solitaireState;
  const setStatusMessage = onStatusMessage;

  const commitStackUpdate = (
    baseStacks: CardStack[],
    { stacks, message, statsDelta }: SolitaireControllerStackUpdate,
    { clearSelection = false }: { clearSelection?: boolean } = {},
  ) => {
    const didChange = stacks !== baseStacks;
    const foundationCardCount = stacks
      .filter((stack) => stack.role === "foundation")
      .reduce((total, stack) => total + stack.cards.length, 0);
    const isSolved = foundationCardCount === 52;
    const nextMessage = isSolved ? "Solved. All cards are on foundations." : message;

    setSolitaireState((current) => {
      const historyEntry = current.cardStacks
        ? makeSolitaireHistoryEntry(current.cardStacks, current.selectedCard, current.solitaireStats, statusMessage)
        : null;
      const nextState: SolitaireControllerState = {
        ...current,
        cardStacks: stacks,
        selectedCard: clearSelection ? null : current.selectedCard,
        solitaireStats: didChange ? applySolitaireStatsDelta(current.solitaireStats, statsDelta) : current.solitaireStats,
      };

      if (!didChange) {
        return nextState;
      }

      if (isSolved) {
        return {
          ...nextState,
          selectedCard: null,
          solitaireUndoStack: [],
          solitaireRedoStack: [],
        };
      }

      return {
        ...nextState,
        solitaireUndoStack: historyEntry ? [...current.solitaireUndoStack, historyEntry].slice(-solitaireHistoryLimit) : current.solitaireUndoStack,
        solitaireRedoStack: [],
      };
    });

    setStatusMessage(nextMessage);
  };

  const setCardStacks = (nextCardStacks: CardStack[] | null) => {
    setSolitaireState((current) => ({ ...current, cardStacks: nextCardStacks }));
  };

  const setSelectedCard = (nextSelectedCard: CardSelection | null) => {
    setSolitaireState((current) => ({ ...current, selectedCard: nextSelectedCard }));
  };

  const clearCardInteraction = () => {
    setSelectedCard(null);
  };

  const resetSolitaireStats = () => {
    setSolitaireState((current) => ({ ...current, solitaireStats: initialSolitaireStats }));
  };

  const clearSolitaireHistory = () => {
    setSolitaireState((current) => ({ ...current, solitaireUndoStack: [], solitaireRedoStack: [] }));
  };

  const resetSolitaire = () => {
    setSolitaireState(initialSolitaireControllerState);
  };

  const restoreSolitaireSnapshot = ({
    cardStacks: nextCardStacks,
    selectedCard: nextSelectedCard,
    solitaireStats: nextStats,
    solitaireUndoStack: nextUndoStack,
    solitaireRedoStack: nextRedoStack,
    statusMessage: nextStatusMessage,
  }: SolitaireControllerSnapshot) => {
    setSolitaireState({
      cardStacks: nextCardStacks?.map(cloneStack) ?? null,
      selectedCard: nextSelectedCard ? { ...nextSelectedCard } : null,
      solitaireStats: { ...nextStats },
      solitaireUndoStack: nextUndoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit),
      solitaireRedoStack: nextRedoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit),
    });
    setStatusMessage(nextStatusMessage);
  };

  const restoreSolitaireHistoryEntry = (entry: SolitaireHistoryEntry) => {
    setSolitaireState((current) => ({
      ...current,
      cardStacks: entry.cardStacks.map(cloneStack),
      selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
      solitaireStats: { ...entry.solitaireStats },
    }));
    setStatusMessage(entry.statusMessage);
  };

  const undoSolitaireMove = () => {
    if (!cardStacks || solitaireUndoStack.length === 0) {
      setStatusMessage("No Solitaire moves to undo.");
      return;
    }

    const previous = solitaireUndoStack[solitaireUndoStack.length - 1];
    const current = makeSolitaireHistoryEntry(cardStacks, selectedCard, solitaireStats, statusMessage);
    setSolitaireState((state) => ({
      ...state,
      solitaireUndoStack: state.solitaireUndoStack.slice(0, -1),
      solitaireRedoStack: [...state.solitaireRedoStack, current].slice(-solitaireHistoryLimit),
    }));
    restoreSolitaireHistoryEntry(previous);
  };

  const redoSolitaireMove = () => {
    if (!cardStacks || solitaireRedoStack.length === 0) {
      setStatusMessage("No Solitaire moves to redo.");
      return;
    }

    const next = solitaireRedoStack[solitaireRedoStack.length - 1];
    const current = makeSolitaireHistoryEntry(cardStacks, selectedCard, solitaireStats, statusMessage);
    setSolitaireState((state) => ({
      ...state,
      solitaireRedoStack: state.solitaireRedoStack.slice(0, -1),
      solitaireUndoStack: [...state.solitaireUndoStack, current].slice(-solitaireHistoryLimit),
    }));
    restoreSolitaireHistoryEntry(next);
  };

  const drawFromStock = () => {
    if (!cardStacks) {
      return;
    }

    const workingStacks = cardStacks.map(cloneStack);
    const result = drawFromStockStacks(workingStacks, {
      recycleCount: solitaireStats.recycleCount,
      variation: solitaireVariation,
    });

    commitStackUpdate(workingStacks, result, { clearSelection: true });
  };

  const moveSelectedCardToStack = (targetStackId: string) => {
    if (!cardStacks || !selectedCard) {
      return false;
    }

    const workingStacks = cardStacks.map(cloneStack);
    const result = moveSelectedCardToStackInStacks(workingStacks, selectedCard, targetStackId);

    commitStackUpdate(workingStacks, { ...result, statsDelta: moveResultStatsDelta(result) }, { clearSelection: true });

    return Boolean(result.didMove);
  };

  const moveSingleCardToFoundation = (stack: CardStack, cardIndex: number) => {
    if (!cardStacks) {
      return;
    }

    const workingStacks = cardStacks.map(cloneStack);
    const result = moveSingleCardToFoundationInStacks(workingStacks, stack, cardIndex);

    commitStackUpdate(workingStacks, { ...result, statsDelta: moveResultStatsDelta(result) }, { clearSelection: true });
  };

  const autoMoveToFoundations = () => {
    if (!cardStacks) {
      return;
    }

    const workingStacks = cardStacks.map(cloneStack);
    const result = autoMoveToFoundationsInStacks(workingStacks);

    commitStackUpdate(workingStacks, { ...result, statsDelta: moveResultStatsDelta(result) }, { clearSelection: true });
  };

  const handleStackClick = (stack: CardStack) => {
    if (stack.role === "stock") {
      drawFromStock();
      return;
    }

    if (selectedCard) {
      moveSelectedCardToStack(stack.id);
      return;
    }

    setStatusMessage(`${stack.title} is empty.`);
  };

  const handleCardClick = (stack: CardStack, cardIndex: number) => {
    if (stack.role === "stock") {
      drawFromStock();
      return;
    }

    if (selectedCard && moveSelectedCardToStack(stack.id)) {
      return;
    }

    if (selectedCard?.stackId === stack.id && selectedCard.cardIndex === cardIndex) {
      clearCardInteraction();
      setStatusMessage("Card selection cleared.");
      return;
    }

    if (!canSelectFromStack(stack, cardIndex)) {
      setStatusMessage("Select a face-up waste/foundation top card or a descending alternating tableau run.");
      return;
    }

    const card = stack.cards[cardIndex];
    setSelectedCard({ stackId: stack.id, cardIndex });
    setStatusMessage(
      stack.role === "tableau"
        ? `Selected ${card.code} and ${stack.cards.length - cardIndex - 1} card(s) below it.`
        : `Selected ${card.code}.`,
    );
  };

  const checkSolitaire = () => {
    const foundationCardCount = cardStacks
      ?.filter((stack) => stack.role === "foundation")
      .reduce((total, stack) => total + stack.cards.length, 0) ?? 0;
    setStatusMessage(
      foundationCardCount === 52
        ? `Solved in ${solitaireStats.moveCount} move(s). All cards are on foundations.`
        : `Not solved: ${foundationCardCount}/52 cards are on foundations after ${solitaireStats.moveCount} move(s).`,
    );
  };

  return {
    cardStacks,
    selectedCard,
    solitaireStats,
    solitaireUndoStack,
    solitaireRedoStack,
    setCardStacks,
    setSelectedCard,
    resetSolitaireStats,
    clearCardInteraction,
    clearSolitaireHistory,
    resetSolitaire,
    restoreSolitaireSnapshot,
    cloneSolitaireHistoryEntry,
    undoSolitaireMove,
    redoSolitaireMove,
    drawFromStock,
    moveSingleCardToFoundation,
    autoMoveToFoundations,
    handleStackClick,
    handleCardClick,
    checkSolitaire,
  };
};
