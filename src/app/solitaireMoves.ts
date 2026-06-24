import type { CardStack } from "../catalog/types";
import {
  canMoveToFoundation,
  canMoveToTableau,
  canSelectWasteCard,
  findFoundationIndexForCard,
  getTopCard,
  isTableauRun,
  revealTopTableauCard,
  type CardSelection,
  type CardSelectionRules,
} from "../interactions/cardRules";
import type { SolitaireStackUpdate } from "./solitaireStock";

export type SolitaireMoveResult = SolitaireStackUpdate & {
  didMove?: boolean;
  moveCountDelta?: number;
  autoMoveCountDelta?: number;
};

const getMovingCards = (source: CardStack, cardIndex: number, rules: CardSelectionRules) => {
  if (source.role === "waste" && rules.wasteMode === "relaxed") {
    return source.cards.slice(cardIndex, cardIndex + 1);
  }

  return source.cards.slice(cardIndex);
};

const removeMovingCards = (source: CardStack, cardIndex: number, rules: CardSelectionRules) => {
  if (source.role === "waste" && rules.wasteMode === "relaxed") {
    return source.cards.filter((_, index) => index !== cardIndex);
  }

  return source.cards.slice(0, cardIndex);
};

const canMoveFromWasteOrFoundation = (source: CardStack, cardIndex: number, rules: CardSelectionRules) => {
  if (source.role === "waste") {
    return canSelectWasteCard(source, cardIndex, rules);
  }

  if (source.role === "foundation") {
    return cardIndex === source.cards.length - 1;
  }

  return true;
};

export const moveSelectedCardToStackInStacks = (
  stacks: CardStack[],
  selectedCard: CardSelection,
  targetStackId: string,
  rules: CardSelectionRules = {},
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

  const movingCards = getMovingCards(source, selectedCard.cardIndex, rules);
  const movingCard = movingCards[0];

  if (!movingCard?.faceUp) {
    return { stacks, message: "Only face-up cards can be moved." };
  }

  if ((source.role === "waste" || source.role === "foundation") && !canMoveFromWasteOrFoundation(source, selectedCard.cardIndex, rules)) {
    return { stacks, message: source.role === "waste" ? "Only visible waste cards can move." : "Only a top foundation card can move." };
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
  const nextSourceCards = removeMovingCards(source, selectedCard.cardIndex, rules);
  const nextSource = revealTopTableauCard({ ...source, cards: nextSourceCards });
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
  rules: CardSelectionRules = {},
): SolitaireMoveResult => {
  const sourceIndex = stacks.findIndex((candidate) => candidate.id === stack.id);
  const source = stacks[sourceIndex];

  if (!source) {
    return { stacks, message: "Selected source stack no longer exists." };
  }

  if ((source.role === "waste" || source.role === "foundation") && !canMoveFromWasteOrFoundation(source, cardIndex, rules)) {
    return { stacks, message: source.role === "waste" ? "Only visible waste cards can move to foundations." : "Only a top card can move to a foundation." };
  }

  if (source.role === "tableau" && cardIndex !== source.cards.length - 1) {
    return { stacks, message: "Only a top tableau card can move to a foundation." };
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
  const sourceCards = removeMovingCards(source, cardIndex, rules);

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
