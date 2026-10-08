import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle, PuzzleCell, CardStack } from "../catalog/types";
import { needsAbandonmentConfirmation, type AbandonmentRuntime } from "./abandonmentPolicy";

const grid = { id: "a", kind: "grid", puzzleId: "sudoku",
  cells: [{ row: 0, column: 0, value: "1", locked: false }],
  answerKey: ["1"] } as unknown as GeneratedPuzzle;
const runtime = (overrides: Partial<AbandonmentRuntime> = {}): AbandonmentRuntime => ({
  gridCells: null, cardStacks: null, jigsawAssembly: null, workspaceProgress: null, ...overrides,
});

describe("meaningful unfinished progress", () => {
  it("guards edited grids but not fresh or solved boards", () => {
    const blank = [{ row: 0, column: 0, value: "", locked: false }] as PuzzleCell[];
    expect(needsAbandonmentConfirmation(grid, runtime({ gridCells: blank }))).toBe(false);
    expect(needsAbandonmentConfirmation(grid, runtime({ gridCells: [{ ...blank[0], value: "2" }] }))).toBe(true);
    expect(needsAbandonmentConfirmation(grid, runtime({ gridCells: [{ ...blank[0], value: "1" }] }))).toBe(false);
  });
  it("recognizes Word Guess completion or failure even when entries remain", () => {
    const word = { ...grid, puzzleId: "word-guess" } as GeneratedPuzzle;
    const cells = [{ row: 0, column: 0, value: "A", locked: false }] as PuzzleCell[];
    expect(needsAbandonmentConfirmation(word, runtime({ gridCells: cells }))).toBe(true);
    expect(needsAbandonmentConfirmation(word, runtime({ gridCells: cells, workspaceProgress: { puzzleInstanceId: word.id, hasProgress: true, terminal: true } }))).toBe(false);
  });
  it("guards moved Solitaire cards but not the original or solved layout", () => {
    const stock: CardStack = { id: "stock", title: "Stock", role: "stock", cards: [
      { code: "AC", suit: "clubs", rank: "ace", color: "black", label: "Ace", faceUp: false },
    ] };
    const card = { ...grid, kind: "cards", puzzleId: "klondike-solitaire", stacks: [stock] } as unknown as GeneratedPuzzle;
    expect(needsAbandonmentConfirmation(card, runtime({ cardStacks: [stock] }))).toBe(false);
    expect(needsAbandonmentConfirmation(card, runtime({ cardStacks: [{ ...stock, cards: [{ ...stock.cards[0], faceUp: true }] }] }))).toBe(true);
    expect(needsAbandonmentConfirmation(card, runtime({ cardStacks: [{ ...stock, role: "foundation", cards: Array.from({ length: 52 }, () => ({ ...stock.cards[0], faceUp: true })) }] }))).toBe(false);
  });
  it("guards joined or moved Jigsaw pieces, but not solved assemblies", () => {
    const jigsaw = { ...grid, kind: "tiles", puzzleId: "jigsaw", tiles: [{ id: "a" }, { id: "b" }, { id: "c" }] } as unknown as GeneratedPuzzle;
    expect(needsAbandonmentConfirmation(jigsaw, runtime({ workspaceProgress: { puzzleInstanceId: jigsaw.id, hasProgress: true, terminal: false } }))).toBe(true);
    expect(needsAbandonmentConfirmation(jigsaw, runtime({ jigsawAssembly: { joinedComponents: [["a", "b"]] } }))).toBe(true);
    expect(needsAbandonmentConfirmation(jigsaw, runtime({ jigsawAssembly: { joinedComponents: [["a", "b", "c"]] } }))).toBe(false);
  });
  it("uses image tile status for the current instance only", () => {
    const tiles = { ...grid, kind: "tiles", puzzleId: "tile-swap" } as GeneratedPuzzle;
    expect(needsAbandonmentConfirmation(tiles, runtime())).toBe(false);
    expect(needsAbandonmentConfirmation(tiles, runtime({ workspaceProgress: { puzzleInstanceId: "stale", hasProgress: true, terminal: false } }))).toBe(false);
    expect(needsAbandonmentConfirmation(tiles, runtime({ workspaceProgress: { puzzleInstanceId: tiles.id, hasProgress: true, terminal: false } }))).toBe(true);
    expect(needsAbandonmentConfirmation(tiles, runtime({ workspaceProgress: { puzzleInstanceId: tiles.id, hasProgress: true, terminal: true } }))).toBe(false);
  });
});
