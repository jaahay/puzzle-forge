import type { CardStack } from "../catalog/types";
import {
  canMoveToFoundation,
  canMoveToTableau,
  findFoundationIndexForCard,
  getTopCard,
  isTableauRun,
  revealTopTableauCard,
  type CardSelection,
} from "../interactions/cardRules";
import type { SolitaireStackUpdate } from "./solitaireStock";

export type SolitaireMoveResult = SolitaireStackUpdate & {
  didMove?: boolean;
  moveCountDelta?: number;
  autoMoveCountDelta?: number;
};

export const moveSelectedCardToStackInStacks = (
  stacks: CardStack[],
  selectedCard: CardSelection,
  targetStackId: string,
): SolitaireMoveResult => {
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

  return {
    stacks: nextStacks,
    message: `Moved ${movingCard.code} to ${targetStack.title}.`,
    didMove: true,
    moveCountDelta: 1,
  };
};

export const moveSingleCardToFoundationInStacks = (
  stacks: CardStack[],
  stack: CardStack,
  cardIndex: number,
): SolitaireMoveResult => {
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

  return {
    stacks: nextStacks,
    message: `Moved ${movingCard.code} to ${foundation.title}.`,
    didMove: true,
    moveCountDelta: 1,
  };
};

export const autoMoveToFoundationsInStacks = (stacks: CardStack[]): SolitaireMoveResult => {
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

  return {
    stacks: nextStacks,
    message:
      movedCardCount === 1
        ? `Auto-moved ${lastMovedLabel} to a foundation.`
        : `Auto-moved ${movedCardCount} cards to foundations.`,
    didMove: true,
    moveCountDelta: movedCardCount,
    autoMoveCountDelta: movedCardCount,
  };
};
