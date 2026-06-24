import { describe, expect, it } from "vitest";
import type { CardStack, PlayingCard, SolitaireVariation } from "../catalog/types";
import { canSelectFromStack } from "../interactions/cardRules";
import { normalizeSolitaireVariation } from "../games/solitaire/variation";
import { buildFreshSessionForGeneratedPuzzle, buildRuntimeSession } from "./usePuzzleSessions";
import { drawFromStockStacks } from "./solitaireStock";
import { moveSelectedCardToStackInStacks } from "./solitaireMoves";

const makeCard = (code: string): PlayingCard => ({
  suit: "spades",
  rank: "ace",
  code,
  color: "black",
  label: code,
  faceUp: false,
});

const makeFaceUpCard = (code: string, rank: PlayingCard["rank"] = "ace", color: PlayingCard["color"] = "black"): PlayingCard => ({
  ...makeCard(code),
  rank,
  color,
  faceUp: true,
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

const variation = (overrides: Partial<SolitaireVariation>): SolitaireVariation =>
  normalizeSolitaireVariation({
    drawMode: "draw-1",
    redeals: "unlimited",
    wasteMode: "standard",
    knownSolvable: false,
    ...overrides,
  });

describe("drawFromStockStacks", () => {
  it("draws one card for draw-1", () => {
    const result = drawFromStockStacks(
      makeStacks([makeCard("A♠"), makeCard("2♠"), makeCard("3♠")]),
      { recycleCount: 0, variation: variation({ drawMode: "draw-1" }) },
    );

    expect(result.stacks[0].cards).toHaveLength(2);
    expect(result.stacks[1].cards.map((card) => card.code)).toEqual(["3♠"]);
    expect(result.stacks[1].cards[0].faceUp).toBe(true);
    expect(result.statsDelta).toEqual({ drawCount: 1, moveCount: 1 });
  });

  it("draws up to three cards for draw-3", () => {
    const result = drawFromStockStacks(
      makeStacks([makeCard("A♠"), makeCard("2♠"), makeCard("3♠"), makeCard("4♠")]),
      { recycleCount: 0, variation: variation({ drawMode: "draw-3" }) },
    );

    expect(result.stacks[0].cards.map((card) => card.code)).toEqual(["A♠"]);
    expect(result.stacks[1].cards.map((card) => card.code)).toEqual(["2♠", "3♠", "4♠"]);
    expect(result.stacks[1].cards.every((card) => card.faceUp)).toBe(true);
  });

  it("blocks redeal after the variation limit is reached", () => {
    const result = drawFromStockStacks(
      makeStacks([], [makeCard("A♠")]),
      { recycleCount: 1, variation: variation({ redeals: 1 }) },
    );

    expect(result.stacks[0].cards).toHaveLength(0);
    expect(result.stacks[1].cards).toHaveLength(1);
    expect(result.message).toBe("Redeal limit reached for this variation.");
    expect(result.statsDelta).toBeUndefined();
  });
});

describe("waste mode", () => {
  it("keeps standard waste restricted to the top card", () => {
    const waste = makeStacks([], [makeFaceUpCard("A♠"), makeFaceUpCard("2♠"), makeFaceUpCard("3♠")])[1];
    const rules = variation({ drawMode: "draw-3", wasteMode: "standard" });

    expect(canSelectFromStack(waste, 0, rules)).toBe(false);
    expect(canSelectFromStack(waste, 1, rules)).toBe(false);
    expect(canSelectFromStack(waste, 2, rules)).toBe(true);
  });

  it("allows relaxed waste to move any visible waste card without moving the cards above it", () => {
    const stacks: CardStack[] = [
      ...makeStacks([], [makeFaceUpCard("A♠"), makeFaceUpCard("2♠", "2"), makeFaceUpCard("3♠", "3")]),
      {
        id: "foundation-spades",
        title: "♠ Foundation",
        role: "foundation",
        cards: [],
      },
    ];
    const rules = variation({ drawMode: "draw-3", wasteMode: "relaxed" });

    const result = moveSelectedCardToStackInStacks(stacks, { stackId: "waste", cardIndex: 0 }, "foundation-spades", rules);

    expect(result.didMove).toBe(true);
    expect(result.stacks[1].cards.map((card) => card.code)).toEqual(["2♠", "3♠"]);
    expect(result.stacks[2].cards.map((card) => card.code)).toEqual(["A♠"]);
  });
});

describe("Solitaire variation session integration", () => {
  it("preserves variation metadata when building fresh and runtime sessions", () => {
    const solitaireVariation = variation({ drawMode: "draw-3", redeals: 1, wasteMode: "relaxed" });
    const puzzle = {
      kind: "cards" as const,
      id: "klondike-test",
      puzzleId: "klondike-solitaire" as const,
      title: "Klondike Solitaire",
      seed: "seed",
      width: 7,
      height: 7,
      checksum: "checksum",
      createdAt: "2026-06-24T00:00:00.000Z",
      notes: [],
      stacks: makeStacks([makeCard("A♠")]),
      solitaireVariation,
    };

    const freshSession = buildFreshSessionForGeneratedPuzzle(puzzle, "Ready.");
    const runtimeSession = buildRuntimeSession({
      puzzleId: "klondike-solitaire",
      seed: freshSession.seed,
      width: freshSession.width,
      height: freshSession.height,
      difficulty: freshSession.difficulty,
      requireUniqueSolution: freshSession.requireUniqueSolution,
      puzzle: freshSession.puzzle,
      cardStacks: freshSession.cardStacks,
      selectedCard: freshSession.selectedCard,
      solitaireStats: freshSession.solitaireStats,
      solitaireUndoStack: freshSession.solitaireUndoStack ?? [],
      solitaireRedoStack: freshSession.solitaireRedoStack ?? [],
      gridCells: freshSession.gridCells,
      selectedGridCell: freshSession.selectedGridCell,
      statusMessage: freshSession.statusMessage,
    });

    expect(freshSession.solitaireVariation).toEqual(solitaireVariation);
    expect(runtimeSession.solitaireVariation).toEqual(solitaireVariation);
  });
});
