import type { CardStack, PlayingCard } from "../catalog/types";

export type CardSelection = {
  stackId: string;
  cardIndex: number;
};

const rankValues: Record<PlayingCard["rank"], number> = {
  ace: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  jack: 11,
  queen: 12,
  king: 13,
};

const cloneCard = (card: PlayingCard): PlayingCard => ({ ...card });

export const cloneStack = (stack: CardStack): CardStack => ({
  ...stack,
  cards: stack.cards.map(cloneCard),
});

export const getTopCard = (stack: CardStack) => stack.cards[stack.cards.length - 1];

export const revealTopTableauCard = (stack: CardStack) => {
  if (stack.role !== "tableau" || stack.cards.length === 0) {
    return stack;
  }

  const topIndex = stack.cards.length - 1;
  const topCard = stack.cards[topIndex];

  if (topCard.faceUp) {
    return stack;
  }

  return {
    ...stack,
    cards: stack.cards.map((card, index) => (index === topIndex ? { ...card, faceUp: true } : card)),
  };
};

export const canMoveToFoundation = (card: PlayingCard, targetStack: CardStack) => {
  const topCard = getTopCard(targetStack);

  if (!topCard) {
    return rankValues[card.rank] === 1;
  }

  return card.suit === topCard.suit && rankValues[card.rank] === rankValues[topCard.rank] + 1;
};

export const canMoveToTableau = (card: PlayingCard, targetStack: CardStack) => {
  const topCard = getTopCard(targetStack);

  if (!topCard) {
    return rankValues[card.rank] === 13;
  }

  return topCard.faceUp && card.color !== topCard.color && rankValues[card.rank] === rankValues[topCard.rank] - 1;
};

export const canSelectFromStack = (stack: CardStack, cardIndex: number) => {
  const card = stack.cards[cardIndex];

  if (!card?.faceUp) {
    return false;
  }

  if (stack.role === "waste" || stack.role === "foundation") {
    return cardIndex === stack.cards.length - 1;
  }

  return stack.role === "tableau";
};

export const isSelectedCard = (selection: CardSelection | null, stack: CardStack, index: number) =>
  selection?.stackId === stack.id && index >= selection.cardIndex;
