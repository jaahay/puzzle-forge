import { describe, expect, it } from "vitest";
import type { CardStack, PlayingCard } from "../catalog/types";
import type { SolitaireStats } from "./session";
import {
  applySolitaireHistoryAction,
  getSolitaireHistoryAvailability,
  makeSolitaireHistoryEntry,
  type SolitaireHistoryRuntime,
} from "./solitaireHistory";

const card = (code: string, faceUp = true): PlayingCard => ({
  suit: "clubs",
  rank: "ace",
  code,
  color: "black",
  label: code,
  faceUp,
});

const stacks = (stock: string[], waste: string[]): CardStack[] => [
  {
    id: "stock",
    title: "Stock",
    role: "stock",
    cards: stock.map((code) => card(code, false)),
    faceDownCount: stock.length,
  },
  {
    id: "waste",
    title: "Waste",
    role: "waste",
    cards: waste.map((code) => card(code)),
  },
];

const stats = (moveCount: number): SolitaireStats => ({
  moveCount,
  drawCount: moveCount,
  recycleCount: 0,
  autoMoveCount: 0,
});

describe("Solitaire history", () => {
  it("reports Undo and Redo availability from the authoritative stacks", () => {
    const entry = makeSolitaireHistoryEntry(stacks(["A♣"], []), null, stats(0), "Ready.");

    expect(getSolitaireHistoryAvailability([], [])).toEqual({
      canUndo: false,
      canRedo: false,
    });
    expect(getSolitaireHistoryAvailability([entry], [])).toEqual({
      canUndo: true,
      canRedo: false,
    });
    expect(getSolitaireHistoryAvailability([], [entry])).toEqual({
      canUndo: false,
      canRedo: true,
    });
  });

  it("round-trips stacks, selection, stats, and status through Undo and Redo", () => {
    const beforeStacks = stacks(["A♣"], []);
    const afterStacks = stacks([], ["A♣"]);
    const before = makeSolitaireHistoryEntry(
      beforeStacks,
      { stackId: "stock", cardIndex: 0 },
      stats(0),
      "Ready.",
    );
    const runtime: SolitaireHistoryRuntime = {
      cardStacks: afterStacks,
      selectedCard: null,
      solitaireStats: stats(1),
      undoStack: [before],
      redoStack: [],
      statusMessage: "Drew A♣.",
    };

    const undone = applySolitaireHistoryAction(runtime, "undo");
    expect(undone).not.toBeNull();
    expect(undone!.cardStacks).toEqual(beforeStacks);
    expect(undone!.selectedCard).toEqual({ stackId: "stock", cardIndex: 0 });
    expect(undone!.solitaireStats).toEqual(stats(0));
    expect(undone!.statusMessage).toBe("Ready.");
    expect(undone!.undoStack).toHaveLength(0);
    expect(undone!.redoStack).toHaveLength(1);

    const redone = applySolitaireHistoryAction(undone!, "redo");
    expect(redone).not.toBeNull();
    expect(redone!.cardStacks).toEqual(afterStacks);
    expect(redone!.selectedCard).toBeNull();
    expect(redone!.solitaireStats).toEqual(stats(1));
    expect(redone!.statusMessage).toBe("Drew A♣.");
    expect(redone!.undoStack).toHaveLength(1);
    expect(redone!.redoStack).toHaveLength(0);
  });

  it("does not mutate stored snapshots while restoring them", () => {
    const before = makeSolitaireHistoryEntry(stacks(["A♣"], []), null, stats(0), "Ready.");
    const runtime: SolitaireHistoryRuntime = {
      cardStacks: stacks([], ["A♣"]),
      selectedCard: null,
      solitaireStats: stats(1),
      undoStack: [before],
      redoStack: [],
      statusMessage: "Drew A♣.",
    };

    const undone = applySolitaireHistoryAction(runtime, "undo");
    expect(undone).not.toBeNull();
    undone!.cardStacks[0]!.cards.length = 0;

    expect(before.cardStacks[0]!.cards).toHaveLength(1);
  });
});
