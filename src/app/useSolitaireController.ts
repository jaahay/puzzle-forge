import { useState } from "preact/hooks";
import type { CardStack, SolitaireVariation } from "../catalog/types";
import { normalizeSolitaireVariation } from "../games/solitaire/variation";
import {
  canMoveToFoundation,
  canMoveToTableau,
  canSelectFromStack,
  cloneStack,
  findFoundationIndexForCard,
  getTopCard,
  isTableauRun,
  revealTopTableauCard,
  type CardSelection,
} from "../interactions/cardRules";
import { cloneSolitaireHistoryEntry, makeSolitaireHistoryEntry } from "./puzzleSessionRuntime";
import {
  initialSolitaireStats,
  solitaireHistoryLimit,
  type SolitaireHistoryEntry,
  type SolitaireStats,
} from "./session";

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
  variation: SolitaireVariation;
  onStatusMessage: (message: string) => void;
};

export const useSolitaireController = ({ statusMessage, variation, onStatusMessage }: SolitaireControllerOptions) => {
  const [cardStacks, setCardStacks] = useState<CardStack[] | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSelection | null>(null);
  const [solitaireStats, setSolitaireStats] = useState<SolitaireStats>(initialSolitaireStats);
  const [solitaireUndoStack, setSolitaireUndoStack] = useState<SolitaireHistoryEntry[]>([]);
  const [solitaireRedoStack, setSolitaireRedoStack] = useState<SolitaireHistoryEntry[]>([]);
  const setStatusMessage = onStatusMessage;
  const solitaireVariation = normalizeSolitaireVariation(variation);

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

  const updateCardStacks = (updater: (stacks: CardStack[]) => { stacks: CardStack[]; message: string }) => {
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
      const stockIndex = stacks.findIndex((stack) => stack.role === "stock");
      const wasteIndex = stacks.findIndex((stack) => stack.role === "waste");
      const stock = stacks[stockIndex];
      const waste = stacks[wasteIndex];

      if (!stock || !waste) {
        return { stacks, message: "Solitaire stock or waste stack is missing." };
      }

      if (stock.cards.length > 0) {
        const drawSize = solitaireVariation.drawMode === "draw-3" ? Math.min(3, stock.cards.length) : 1;
        const drawnCards = stock.cards.slice(-drawSize).map((card) => ({ ...card, faceUp: true }));
        const nextStacks = [...stacks];
        nextStacks[stockIndex] = { ...stock, cards: stock.cards.slice(0, -drawSize), faceDownCount: stock.cards.length - drawSize };
        nextStacks[wasteIndex] = { ...waste, cards: [...waste.cards, ...drawnCards] };
        setSolitaireStats((current) => ({ ...current, drawCount: current.drawCount + 1, moveCount: current.moveCount + 1 }));

        return {
          stacks: nextStacks,
          message:
            drawnCards.length === 1
              ? `Drew ${drawnCards[0].label} to waste.`
              : `Drew ${drawnCards.length} cards to waste.`,
        };
      }

      if (waste.cards.length === 0) {
        return { stacks, message: "Stock and waste are both empty." };
      }

      if (solitaireVariation.redeals !== "unlimited" && solitaireStats.recycleCount >= solitaireVariation.redeals) {
        return { stacks, message: "Redeal limit reached for this variation." };
      }

      const recycledCards = waste.cards.map((card) => ({ ...card, faceUp: false })).reverse();
      const nextStacks = [...stacks];
      nextStacks[stockIndex] = { ...stock, cards: recycledCards, faceDownCount: recycledCards.length };
      nextStacks[wasteIndex] = { ...waste, cards: [] };
      setSolitaireStats((current) => ({ ...current, recycleCount: current.recycleCount + 1, moveCount: current.moveCount + 1 }));

      return { stacks: nextStacks, message: "Recycled waste back into the stock." };
    });
  };

  const moveSelectedCardToStack = (targetStackId: string) => {
    if (!selectedCard) {
      return false;
    }

    let didMove = false;

    updateCardStacks((stacks) => {
      const sourceIndex = stacks.findIndex((stack) => stack.id === selectedCard.stackId);
      const targetIndex = stacks.findIndex((stack) => stack.id === targetStackId);
      const source = stacks[sourceIndex];
      const targetStack = stacks[targetIndex];

      if (!source || !targetStack) {
        return { stacks, message: "Selected source or destination stack no longer exists." };
      }

      if (source.id === targetStack.id) {
        return { stacks, message: "Card selection cleared." };
      }

      const movingCards = source.cards.slice(selectedCard.cardIndex);
      const movingCard = movingCards[0];

      if (!movingCard?.faceUp) {
        return { stacks, message: "Only face-up cards can be moved." };
      }

      if ((source.role === "waste" || source.role === "foundation") && selectedCard.cardIndex !== source.cards.length - 1) {
        return { stacks, message: "Only the top waste or foundation card can move." };
      }

      if (source.role === "tableau" && !isTableauRun(source, selectedCard.cardIndex)) {
        return { stacks, message: "Tableau moves must be descending, alternating-color runs." };
      }

      if (targetStack.role === "foundation" && (movingCards.length !== 1 || !canMoveToFoundation(movingCard, targetStack))) {
        return { stacks, message: `${movingCard.code} cannot move to ${targetStack.title}.` };
      }

      if (targetStack.role === "tableau" && !canMoveToTableau(movingCard, targetStack)) {
        return { stacks, message: `${movingCard.code} cannot move to ${targetStack.title}.` };
      }

      if (targetStack.role !== "foundation" && targetStack.role !== "tableau") {
        return { stacks, message: "Cards can move only to foundations or tableau columns." };
      }

      const nextStacks = [...stacks];
      const nextSource = revealTopTableauCard({ ...source, cards: source.cards.slice(0, selectedCard.cardIndex) });
      const nextTarget = { ...targetStack, cards: [...targetStack.cards, ...movingCards] };

      nextStacks[sourceIndex] = nextSource;
      nextStacks[targetIndex] = nextTarget;
      didMove = true;
      setSolitaireStats((current) => ({ ...current, moveCount: current.moveCount + 1 }));

      return { stacks: nextStacks, message: `Moved ${movingCard.code} to ${targetStack.title}.` };
    });

    clearCardInteraction();

    return didMove;
  };

  const moveSingleCardToFoundation = (stack: CardStack, cardIndex: number) => {
    clearCardInteraction();

    updateCardStacks((stacks) => {
      const sourceIndex = stacks.findIndex((candidate) => candidate.id === stack.id);
      const source = stacks[sourceIndex];

      if (!source) {
        return { stacks, message: "Selected source stack no longer exists." };
      }

      if (cardIndex !== source.cards.length - 1) {
        return { stacks, message: "Only a top card can move to a foundation." };
      }

      const movingCard = source.cards[cardIndex];

      if (!movingCard?.faceUp) {
        return { stacks, message: "Only face-up cards can move to foundations." };
      }

      const foundationIndex = findFoundationIndexForCard(movingCard, stacks);
      const foundation = stacks[foundationIndex];

      if (!foundation || !canMoveToFoundation(movingCard, foundation)) {
        return { stacks, message: `${movingCard.code} cannot move to a foundation.` };
      }

      const nextStacks = [...stacks];
      const sourceCards = source.cards.slice(0, -1);
      nextStacks[sourceIndex] = source.role === "tableau" ? revealTopTableauCard({ ...source, cards: sourceCards }) : { ...source, cards: sourceCards };
      nextStacks[foundationIndex] = { ...foundation, cards: [...foundation.cards, movingCard] };
      setSolitaireStats((current) => ({ ...current, moveCount: current.moveCount + 1 }));

      return { stacks: nextStacks, message: `Moved ${movingCard.code} to ${foundation.title}.` };
    });
  };

  const autoMoveToFoundations = () => {
    clearCardInteraction();
    updateCardStacks((stacks) => {
      let nextStacks = stacks;
      let movedCardCount = 0;
      let lastMovedLabel = "";

      while (true) {
        const sourceIndex = nextStacks.findIndex((stack) => {
          const topCard = getTopCard(stack);
          return (
            (stack.role === "waste" || stack.role === "tableau") &&
            Boolean(topCard?.faceUp) &&
            topCard !== undefined &&
            findFoundationIndexForCard(topCard, nextStacks) >= 0
          );
        });

        if (sourceIndex < 0) {
          break;
        }

        const source = nextStacks[sourceIndex];
        const movingCard = getTopCard(source);

        if (!movingCard) {
          break;
        }

        const foundationIndex = findFoundationIndexForCard(movingCard, nextStacks);
        const foundation = nextStacks[foundationIndex];

        if (!foundation) {
          break;
        }

        const sourceCards = source.cards.slice(0, -1);
        const nextSource = source.role === "tableau" ? revealTopTableauCard({ ...source, cards: sourceCards }) : { ...source, cards: sourceCards };
        const nextFoundation = { ...foundation, cards: [...foundation.cards, movingCard] };

        nextStacks = [...nextStacks];
        nextStacks[sourceIndex] = nextSource;
        nextStacks[foundationIndex] = nextFoundation;
        movedCardCount += 1;
        lastMovedLabel = movingCard.code;
      }

      if (movedCardCount === 0) {
        return { stacks, message: "No legal foundation moves are available." };
      }

      setSolitaireStats((current) => ({
        ...current,
        autoMoveCount: current.autoMoveCount + movedCardCount,
        moveCount: current.moveCount + movedCardCount,
      }));

      return {
        stacks: nextStacks,
        message:
          movedCardCount === 1
            ? `Auto-moved ${lastMovedLabel} to a foundation.`
            : `Auto-moved ${movedCardCount} cards to foundations.`,
      };
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
