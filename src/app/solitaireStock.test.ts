import { describe, expect, it } from "vitest";
import type { CardStack, PlayingCard, SolitaireVariation } from "../catalog/types";
import { initialSolitaireStats } from "./session";
import { drawFromStockStacks } from "./solitaireStock";

const makeCard = (code: string): PlayingCard => ({
  suit: "spades",
  rank: "ace",
  code,
  color: "black",
  label: code,
  faceUp: false,
});

const makeStacks = (stockCards: PlayingCard[], wasteCards: PlayingCard[] = []): CardStack[] => [
  {
    id: "stock",
    title: "Stock",
    role: "stock",
    cards: stockCards,
    faceDownCount: stockCards.length,
  },
  {
    id: "waste",
    title: "Waste",
    role: "waste",
    cards: wasteCards,
  },
];

const variation = (overrides: Partial<SolitaireVariation>): SolitaireVariation => ({
  drawMode: "draw-1",
  redeals: "unlimited",
  knownSolvable: false,
  ...overrides,
});

describe("drawFromStockStacks", () => {
  it("draws one card for draw-1", () => {
    const result = drawFromStockStacks(
      makeStacks([makeCard("A♠"), makeCard("2♠"), makeCard("3♠")]),
      initialSolitaireStats,
      variation({ drawMode: "draw-1" }),
    );

    expect(result.stacks[0].cards).toHaveLength(2);
    expect(result.stacks[1].cards.map((card) => card.code)).toEqual(["3♠"]);
    expect(result.stacks[1].cards[0].faceUp).toBe(true);
    expect(result.statsDelta).toEqual({ drawCount: 1, moveCount: 1 });
  });

  it("draws up to three cards for draw-3", () => {
    const result = drawFromStockStacks(
      makeStacks([makeCard("A♠"), makeCard("2♠"), makeCard("3♠"), makeCard("4♠")]),
      initialSolitaireStats,
      variation({ drawMode: "draw-3" }),
    );

    expect(result.stacks[0].cards.map((card) => card.code)).toEqual(["A♠"]);
    expect(result.stacks[1].cards.map((card) => card.code)).toEqual(["2♠", "3♠", "4♠"]);
    expect(result.stacks[1].cards.every((card) => card.faceUp)).toBe(true);
  });

  it("blocks redeal after the variation limit is reached", () => {
    const result = drawFromStockStacks(
      makeStacks([], [makeCard("A♠")]),
      { ...initialSolitaireStats, recycleCount: 1 },
      variation({ redeals: 1 }),
    );

    expect(result.stacks[0].cards).toHaveLength(0);
    expect(result.stacks[1].cards).toHaveLength(1);
    expect(result.message).toBe("Redeal limit reached for this variation.");
    expect(result.statsDelta).toBeUndefined();
  });
});
