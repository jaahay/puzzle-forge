import { useRef, useState } from "preact/hooks";
import type { CardStack, SolitaireVariation } from "../catalog/types";
import { canSelectFromStack, cloneStack, type CardSelection } from "../interactions/cardRules";
import {
  initialSolitaireStats,
  solitaireHistoryLimit,
  type SolitaireHistoryEntry,
  type SolitaireStats,
} from "./session";
import {
  applySolitaireHistoryAction,
  cloneSolitaireHistoryEntry,
  getSolitaireHistoryAvailability,
  makeSolitaireHistoryEntry,
} from "./solitaireHistory";
import {
  autoMoveToFoundationsInStacks,
  moveSelectedCardToStackInStacks,
  moveSingleCardToFoundationInStacks,
  type SolitaireMoveResult,
} from "./solitaireMoves";
import { drawFromStockStacks, type SolitaireStockStatsDelta, type SolitaireStackUpdate } from "./solitaireStock";
import { getSolitaireFoundationCardCount, isSolitaireSolved } from "./solitaireTerminal";

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
  if (!delta) return stats;

  return {
    ...stats,
    drawCount: stats.drawCount + (delta.drawCount ?? 0),
    recycleCount: stats.recycleCount + (delta.recycleCount ?? 0),
    autoMoveCount: stats.autoMoveCount + (delta.autoMoveCount ?? 0),
    moveCount: stats.moveCount + (delta.moveCount ?? 0),
  };
};

const moveResultStatsDelta = (result: SolitaireMoveResult): SolitaireStatsDelta | undefined => {
  if (!result.moveCountDelta && !result.autoMoveCountDelta) return undefined;

  return {
    moveCount: result.moveCountDelta ?? 0,
    autoMoveCount: result.autoMoveCountDelta ?? 0,
  };
};

export const useSolitaireController = ({ statusMessage, onStatusMessage, solitaireVariation }: SolitaireControllerOptions) => {
  const [solitaireState, setRenderedSolitaireState] = useState<SolitaireControllerState>(initialSolitaireControllerState);
  const solitaireStateRef = useRef(solitaireState);
  const statusMessageRef = useRef(statusMessage);
  solitaireStateRef.current = solitaireState;
  statusMessageRef.current = statusMessage;
  const { cardStacks, selectedCard, solitaireStats, solitaireUndoStack, solitaireRedoStack } = solitaireState;

  const updateSolitaireState = (
    updater: (current: SolitaireControllerState) => SolitaireControllerState,
  ) => {
    const next = updater(solitaireStateRef.current);
    solitaireStateRef.current = next;
    setRenderedSolitaireState(next);
    return next;
  };

  const setStatusMessage = (message: string) => {
    statusMessageRef.current = message;
    onStatusMessage(message);
  };

  const commitStackUpdate = (
    baseStacks: CardStack[],
    { stacks, message, statsDelta }: SolitaireControllerStackUpdate,
    { clearSelection = false }: { clearSelection?: boolean } = {},
  ) => {
    const didChange = stacks !== baseStacks;
    const isSolved = isSolitaireSolved(stacks);
    const nextMessage = isSolved ? "Solved. All cards are on foundations." : message;

    updateSolitaireState((current) => {
      const historyEntry = current.cardStacks
        ? makeSolitaireHistoryEntry(
            current.cardStacks,
            current.selectedCard,
            current.solitaireStats,
            statusMessageRef.current,
          )
        : null;
      const nextState: SolitaireControllerState = {
        ...current,
        cardStacks: stacks,
        selectedCard: clearSelection ? null : current.selectedCard,
        solitaireStats: didChange ? applySolitaireStatsDelta(current.solitaireStats, statsDelta) : current.solitaireStats,
      };

      if (!didChange) return nextState;

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
        solitaireUndoStack: historyEntry
          ? [...current.solitaireUndoStack, historyEntry].slice(-solitaireHistoryLimit)
          : current.solitaireUndoStack,
        solitaireRedoStack: [],
      };
    });

    setStatusMessage(nextMessage);
  };

  const setSelectedCard = (nextSelectedCard: CardSelection | null) => {
    updateSolitaireState((current) => ({ ...current, selectedCard: nextSelectedCard }));
  };

  const clearCardInteraction = () => setSelectedCard(null);
  const resetSolitaire = () => updateSolitaireState(() => initialSolitaireControllerState);

  const restoreSolitaireSnapshot = ({
    cardStacks: nextCardStacks,
    selectedCard: nextSelectedCard,
    solitaireStats: nextStats,
    solitaireUndoStack: nextUndoStack,
    solitaireRedoStack: nextRedoStack,
    statusMessage: nextStatusMessage,
  }: SolitaireControllerSnapshot) => {
    updateSolitaireState(() => ({
      cardStacks: nextCardStacks?.map(cloneStack) ?? null,
      selectedCard: nextSelectedCard ? { ...nextSelectedCard } : null,
      solitaireStats: { ...nextStats },
      solitaireUndoStack: nextUndoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit),
      solitaireRedoStack: nextRedoStack.map(cloneSolitaireHistoryEntry).slice(-solitaireHistoryLimit),
    }));
    setStatusMessage(nextStatusMessage);
  };

  const canUndoSolitaireNow = () =>
    getSolitaireHistoryAvailability(
      solitaireStateRef.current.solitaireUndoStack,
      solitaireStateRef.current.solitaireRedoStack,
    ).canUndo;

  const canRedoSolitaireNow = () =>
    getSolitaireHistoryAvailability(
      solitaireStateRef.current.solitaireUndoStack,
      solitaireStateRef.current.solitaireRedoStack,
    ).canRedo;

  const applyHistoryAction = (action: "undo" | "redo") => {
    const current = solitaireStateRef.current;
    if (!current.cardStacks) {
      setStatusMessage(action === "undo" ? "No Solitaire moves to undo." : "No Solitaire moves to redo.");
      return false;
    }

    const transition = applySolitaireHistoryAction({
      cardStacks: current.cardStacks,
      selectedCard: current.selectedCard,
      solitaireStats: current.solitaireStats,
      undoStack: current.solitaireUndoStack,
      redoStack: current.solitaireRedoStack,
      statusMessage: statusMessageRef.current,
    }, action);

    if (!transition) {
      setStatusMessage(action === "undo" ? "No Solitaire moves to undo." : "No Solitaire moves to redo.");
      return false;
    }

    updateSolitaireState(() => ({
      cardStacks: transition.cardStacks,
      selectedCard: transition.selectedCard,
      solitaireStats: transition.solitaireStats,
      solitaireUndoStack: transition.undoStack,
      solitaireRedoStack: transition.redoStack,
    }));
    setStatusMessage(transition.statusMessage);
    return true;
  };

  const undoSolitaireMove = () => {
    applyHistoryAction("undo");
  };

  const redoSolitaireMove = () => {
    applyHistoryAction("redo");
  };

  const drawFromStock = () => {
    if (!cardStacks) return;

    const workingStacks = cardStacks.map(cloneStack);
    const result = drawFromStockStacks(workingStacks, {
      recycleCount: solitaireStats.recycleCount,
      variation: solitaireVariation,
    });
    commitStackUpdate(workingStacks, result, { clearSelection: true });
  };

  const moveSelectedCardToStack = (targetStackId: string) => {
    if (!cardStacks || !selectedCard) return false;

    const workingStacks = cardStacks.map(cloneStack);
    const result = moveSelectedCardToStackInStacks(workingStacks, selectedCard, targetStackId, solitaireVariation);
    commitStackUpdate(workingStacks, { ...result, statsDelta: moveResultStatsDelta(result) }, { clearSelection: true });
    return Boolean(result.didMove);
  };

  const moveSingleCardToFoundation = (stack: CardStack, cardIndex: number) => {
    if (!cardStacks) return;

    const workingStacks = cardStacks.map(cloneStack);
    const result = moveSingleCardToFoundationInStacks(workingStacks, stack, cardIndex, solitaireVariation);
    commitStackUpdate(workingStacks, { ...result, statsDelta: moveResultStatsDelta(result) }, { clearSelection: true });
  };

  const autoMoveToFoundations = () => {
    if (!cardStacks) return;

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

    if (selectedCard && moveSelectedCardToStack(stack.id)) return;

    if (selectedCard?.stackId === stack.id && selectedCard.cardIndex === cardIndex) {
      clearCardInteraction();
      setStatusMessage("Card selection cleared.");
      return;
    }

    if (!canSelectFromStack(stack, cardIndex, solitaireVariation)) {
      setStatusMessage("Select a face-up waste/foundation top card, visible relaxed waste card, or descending alternating tableau run.");
      return;
    }

    const card = stack.cards[cardIndex];
    setSelectedCard({ stackId: stack.id, cardIndex });
    setStatusMessage(
      stack.role === "tableau"
        ? `Selected ${card.code} and ${stack.cards.length - cardIndex - 1} ${stack.cards.length - cardIndex - 1 === 1 ? "card" : "cards"} below it.`
        : `Selected ${card.code}.`,
    );
  };

  const checkSolitaire = () => {
    const foundationCardCount = getSolitaireFoundationCardCount(cardStacks);
    setStatusMessage(
      isSolitaireSolved(cardStacks)
        ? `Solved in ${solitaireStats.moveCount} ${solitaireStats.moveCount === 1 ? "move" : "moves"}. All cards are on foundations.`
        : `Not solved: ${foundationCardCount}/52 cards are on foundations after ${solitaireStats.moveCount} ${solitaireStats.moveCount === 1 ? "move" : "moves"}.`,
    );
  };

  return {
    cardStacks,
    selectedCard,
    solitaireStats,
    solitaireUndoStack,
    solitaireRedoStack,
    canUndoSolitaireNow,
    canRedoSolitaireNow,
    resetSolitaire,
    restoreSolitaireSnapshot,
    undoSolitaireMove,
    redoSolitaireMove,
    moveSingleCardToFoundation,
    autoMoveToFoundations,
    handleStackClick,
    handleCardClick,
    checkSolitaire,
  };
};
