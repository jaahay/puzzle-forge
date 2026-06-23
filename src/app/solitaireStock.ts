import type { CardStack, SolitaireVariation } from "../catalog/types";
import { defaultSolitaireVariation, normalizeSolitaireVariation } from "../games/solitaire/variation";
import type { SolitaireStats } from "./session";

export type SolitaireStackUpdate = {
  stacks: CardStack[];
  message: string;
};

export type SolitaireStockStatsDelta = {
  drawCount?: number;
  recycleCount?: number;
  moveCount?: number;
};

export type DrawFromStockResult = SolitaireStackUpdate & {
  statsDelta?: SolitaireStockStatsDelta;
};

const pluralizeCards = (count: number) => (count === 1 ? "card" : "cards");

export const drawFromStockStacks = (
  stacks: CardStack[],
  stats: SolitaireStats,
  variation: SolitaireVariation = defaultSolitaireVariation,
): DrawFromStockResult => {
  const normalizedVariation = normalizeSolitaireVariation(variation);
  const stockIndex = stacks.findIndex((stack) => stack.role === "stock");
  const wasteIndex = stacks.findIndex((stack) => stack.role === "waste");
  const stock = stacks[stockIndex];
  const waste = stacks[wasteIndex];

  if (!stock || !waste) {
    return { stacks, message: "Solitaire stock or waste stack is missing." };
  }

  if (stock.cards.length > 0) {
    const drawCount = normalizedVariation.drawMode === "draw-3" ? Math.min(3, stock.cards.length) : 1;
    const drawnCards = stock.cards.slice(-drawCount).map((card) => ({ ...card, faceUp: true }));
    const nextStacks = [...stacks];

    nextStacks[stockIndex] = {
      ...stock,
      cards: stock.cards.slice(0, -drawCount),
      faceDownCount: stock.cards.length - drawCount,
    };
    nextStacks[wasteIndex] = { ...waste, cards: [...waste.cards, ...drawnCards] };

    return {
      stacks: nextStacks,
      message:
        drawCount === 1
          ? `Drew ${drawnCards[0].label} to waste.`
          : `Drew ${drawCount} ${pluralizeCards(drawCount)} to waste.`,
      statsDelta: { drawCount: 1, moveCount: 1 },
    };
  }

  if (waste.cards.length === 0) {
    return { stacks, message: "Stock and waste are both empty." };
  }

  const redeals = normalizedVariation.redeals;

  if (redeals !== "unlimited" && stats.recycleCount >= redeals) {
    return { stacks, message: "Redeal limit reached for this variation." };
  }

  const recycledCards = waste.cards.map((card) => ({ ...card, faceUp: false })).reverse();
  const nextStacks = [...stacks];

  nextStacks[stockIndex] = { ...stock, cards: recycledCards, faceDownCount: recycledCards.length };
  nextStacks[wasteIndex] = { ...waste, cards: [] };

  return {
    stacks: nextStacks,
    message: "Recycled waste back into the stock.",
    statsDelta: { recycleCount: 1, moveCount: 1 },
  };
};
