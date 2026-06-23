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

export const useSolitaireController = ({ statusMessage, onStatusMessage, solitaireVariation }: SolitaireControllerOptions) => {
  const [cardStacks, setCardStacks] = useState<CardStack[] | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSelection | null>(null);
  const [solitaireStats, setSolitaireStats] = useState<SolitaireStats>(initialSolitaireStats);
  const [solitaireUndoStack, setSolitaireUndoStack] = useState<SolitaireHistoryEntry[]>([]);
  const [solitaireRedoStack, setSolitaireRedoStack] = useState<SolitaireHistoryEntry[]>([]);
  const setStatusMessage = onStatusMessage;

  const clearCardInteraction = () => {
    setSelectedCard(null);
  };

  const resetSolitaireStats = () => {
    setSolitaireStats(initialSolitaireStats);
  };

  const clearSolitaireHistory = () => {
    setSolitaireUndoStack([]);
    setSolitaireRedoStack([]);
  };

  const resetSolitaire = () => {
    setCardStacks(null);
    clearCardInteraction();
    resetSolitaireStats();
    clearSolitaireHistory();
  };

  const restoreSolitaireSnapshot = ({
    cardStacks: nextCardStacks,
    selectedCard: nextSelectedCard,
    solitaireStats: nextStats,
    solitaireUndoStack: nextUndoStack,
    solitaireRedoStack: nextRedoStack,
    statusMessage: nextStatusMessage,
  }: SolitaireControllerSnapshot) => {
    setCardStacks(nextCardStacks?.map(cloneStack) ?? null);
    setSelectedCard(nextSelectedCard ? { ...nextSelectedCard } : null);
    setSolitaireStats({ ...nextStats });
    setSolitaireUndoStack(nextUndoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit));
    setSolitaireRedoStack(nextRedoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit));
    setStatusMessage(nextStatusMessage);
  };

  const restoreSolitaireHistoryEntry = (entry: SolitaireHistoryEntry) => {
    setCardStacks(entry.cardStacks.map(cloneStack));
    setSelectedCard(entry.selectedCard ? { ...entry.selectedCard } : null);
    setSolitaireStats({ ...entry.solitaireStats });
    setStatusMessage(entry.statusMessage);
  };

  const updateSolitaireStats = (delta: SolitaireStockStatsDelta & { autoMoveCount?: number }) => {
    setSolitaireStats((current) => ({
      ...current,
      drawCount: current.drawCount + (delta.drawCount ?? 0),
      recycleCount: current.recycleCount + (delta.recycleCount ?? 0),
      autoMoveCount: current.autoMoveCount + (delta.autoMoveCount ?? 0),
      moveCount: current.moveCount + (delta.moveCount ?? 0),
    }));
  };

  const undoSolitaireMove = () => {
    if (!cardStacks || solitaireUndoStack.length === 0) {
      setStatusMessage("No Solitaire moves to undo.");
      return;
    }

    const previous = solitaireUndoStack[solitaireUndoStack.length - 1];
    const current = makeSolitaireHistoryEntry(cardStacks, selectedCard, solitaireStats, statusMessage);
    setSolitaireUndoStack((entries) => entries.slice(0, -1));
    setSolitaireRedoStack((entries) => [...entries, current].slice(-solitaireHistoryLimit));
    restoreSolitaireHistoryEntry(previous);
  };

  const redoSolitaireMove = () => {
    if (!cardStacks || solitaireRedoStack.length === 0) {
      setStatusMessage("No Solitaire moves to redo.");
      return;
    }

    const next = solitaireRedoStack[solitaireRedoStack.length - 1];
    const current = makeSolitaireHistoryEntry(cardStacks, selectedCard, solitaireStats, statusMessage);
    setSolitaireRedoStack((entries) => entries.slice(0, -1));
    setSolitaireUndoStack((entries) => [...entries, current].slice(-solitaireHistoryLimit));
    restoreSolitaireHistoryEntry(next);
  };

  const updateCardStacks = (updater: (stacks: CardStack[]) => SolitaireStackUpdate) => {
    setCardStacks((currentStacks) => {
      if (!currentStacks) {
        return currentStacks;
      }

      const workingStacks = currentStacks.map(cloneStack);
      const historyEntry = makeSolitaireHistoryEntry(currentStacks, selectedCard, solitaireStats, statusMessage);
      const { stacks, message } = updater(workingStacks);
      const didChange = stacks !== workingStacks;
      const foundationCardCount = stacks
        .filter((stack) => stack.role === "foundation")
        .reduce((total, stack) => total + stack.cards.length, 0);
      const isSolved = foundationCardCount === 52;
      const nextMessage = isSolved ? "Solved. All cards are on foundations." : message;

      if (didChange) {
        if (isSolved) {
          setSolitaireUndoStack([]);
          setSolitaireRedoStack([]);
          setSelectedCard(null);
        } else {
          setSolitaireUndoStack((entries) => [...entries, historyEntry].slice(-solitaireHistoryLimit));
          setSolitaireRedoStack([]);
        }
      }

      setStatusMessage(nextMessage);

      return stacks;
    });
  };

  const drawFromStock = () => {
    clearCardInteraction();
    updateCardStacks((stacks) => {
      const result = drawFromStockStacks(stacks, {
        recycleCount: solitaireStats.recycleCount,
        variation: solitaireVariation,
      });

      if (result.statsDelta) {
        updateSolitaireStats(result.statsDelta);
      }

      return result;
    });
  };

  const moveSelectedCardToStack = (targetStackId: string) => {
    if (!selectedCard) {
      return false;
    }

    let didMove = false;

    updateCardStacks((stacks) => {
      const result = moveSelectedCardToStackInStacks(stacks, selectedCard, targetStackId);
      didMove = Boolean(result.didMove);

      if (result.moveCountDelta) {
        updateSolitaireStats({ moveCount: result.moveCountDelta });
      }

      return result;
    });

    clearCardInteraction();

    return didMove;
  };

  const moveSingleCardToFoundation = (stack: CardStack, cardIndex: number) => {
    clearCardInteraction();

    updateCardStacks((stacks) => {
      const result = moveSingleCardToFoundationInStacks(stacks, stack, cardIndex);

      if (result.moveCountDelta) {
        updateSolitaireStats({ moveCount: result.moveCountDelta });
      }

      return result;
    });
  };

  const autoMoveToFoundations = () => {
    clearCardInteraction();
    updateCardStacks((stacks) => {
      const result = autoMoveToFoundationsInStacks(stacks);

      if (result.moveCountDelta || result.autoMoveCountDelta) {
        updateSolitaireStats({
          autoMoveCount: result.autoMoveCountDelta ?? 0,
          moveCount: result.moveCountDelta ?? 0,
        });
      }

      return result;
    });
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
