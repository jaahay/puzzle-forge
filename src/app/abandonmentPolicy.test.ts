import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { GeneratedPuzzle, PuzzleCell, CardStack } from "../catalog/types";
import type { SolitaireStats } from "./session";
import { needsAbandonmentConfirmation, planAbandonmentAction, type AbandonmentRuntime } from "./abandonmentPolicy";

const grid = { id: "a", kind: "grid", puzzleId: "sudoku",
  cells: [{ row: 0, column: 0, value: "1", locked: false }],
  answerKey: ["1"] } as unknown as GeneratedPuzzle;
const runtime = (overrides: Partial<AbandonmentRuntime> = {}): AbandonmentRuntime => ({
  gridCells: null, cardStacks: null, solitaireStats: null, jigsawAssembly: null, workspaceProgress: null, ...overrides,
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
    const card = { ...grid, kind: "cards", puzzleId: "klondike-solitaire", solitaireVariation: { redeals: "unlimited" }, stacks: [stock] } as unknown as GeneratedPuzzle;
    expect(needsAbandonmentConfirmation(card, runtime({ cardStacks: [stock] }))).toBe(false);
    expect(needsAbandonmentConfirmation(card, runtime({ cardStacks: [{ ...stock, cards: [{ ...stock.cards[0], faceUp: true }] }] }))).toBe(true);
    expect(needsAbandonmentConfirmation(card, runtime({ cardStacks: [{ ...stock, role: "foundation", cards: Array.from({ length: 52 }, () => ({ ...stock.cards[0], faceUp: true })) }] }))).toBe(false);
  });
  it("protects spent limited redeals, not harmless statistics or unlimited redeals", () => {
    const cards = [{ id: "stock", title: "Stock", role: "stock", cards: [
      { code: "AS", suit: "spades", rank: "ace", color: "black", label: "Ace", faceUp: false },
    ] }] as CardStack[];
    const stats: SolitaireStats = { moveCount: 20, drawCount: 10, recycleCount: 1, autoMoveCount: 0 };
    const limited = { ...grid, kind: "cards", puzzleId: "klondike-solitaire",
      solitaireVariation: { redeals: 1 }, stacks: cards } as unknown as GeneratedPuzzle;
    const unlimited = { ...limited, solitaireVariation: { redeals: "unlimited" } } as GeneratedPuzzle;
    expect(needsAbandonmentConfirmation(limited, runtime({ cardStacks: cards, solitaireStats: stats }))).toBe(true);
    expect(needsAbandonmentConfirmation(unlimited, runtime({ cardStacks: cards, solitaireStats: stats }))).toBe(false);
    expect(needsAbandonmentConfirmation(limited, runtime({ cardStacks: cards, solitaireStats: { ...stats, recycleCount: 0 } }))).toBe(false);
    expect(needsAbandonmentConfirmation(limited, runtime({ cardStacks: cards, solitaireStats: { ...stats, moveCount: 0, recycleCount: 0 } }))).toBe(false);
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

// Exercise the shared action boundary without relying on browser event timing.
describe("abandonment action lifecycle", () => {
  const changed = [{ row: 0, column: 0, value: "2", locked: false }] as PuzzleCell[];
  it("runs New immediately when untouched", () => {
    let starts = 0;
    const pending = planAbandonmentAction(grid, runtime({ gridCells: [{ ...changed[0], value: "" }] }), "new", () => { starts += 1; });
    expect(pending).toBeNull();
    expect(starts).toBe(1);
  });
  it("cancelled New or Reset does not execute its pending action", () => {
    for (const action of ["new", "reset"] as const) {
      let starts = 0;
      const pending = planAbandonmentAction(grid, runtime({ gridCells: changed }), action, () => { starts += 1; });
      expect(pending?.action).toBe(action);
      expect(pending?.puzzleInstanceId).toBe(grid.id);
      expect(starts).toBe(0);
      // Cancel drops the transient pending action without invoking proceed.
      expect(starts).toBe(0);
    }
  });
  it("confirmed New and Reset execute at most once", () => {
    for (const action of ["new", "reset"] as const) {
      let starts = 0;
      const pending = planAbandonmentAction(grid, runtime({ gridCells: changed }), action, () => { starts += 1; });
      pending?.proceed();
      pending?.proceed();
      expect(starts).toBe(1);
    }
  });
  it("runs Reset immediately for an untouched or solved grid", () => {
    let starts = 0;
    expect(planAbandonmentAction(grid, runtime({ gridCells: [{ ...changed[0], value: "" }] }), "reset", () => { starts += 1; })).toBeNull();
    expect(planAbandonmentAction(grid, runtime({ gridCells: [{ ...changed[0], value: "1" }] }), "reset", () => { starts += 1; })).toBeNull();
    expect(starts).toBe(2);
  });
});

describe("target identity and navigation lifecycle", () => {
  const samePuzzle = { ...grid, puzzleId: "logic-grid", seed: "same", width: 1, height: 1 } as GeneratedPuzzle;
  const currentCells = [{ row: 0, column: 0, value: "X", locked: false }] as PuzzleCell[];
  const sameIdentity = { puzzleId: "logic-grid", seed: "same", width: 1, height: 1 } as Parameters<typeof planAbandonmentAction>[4];
  it("does not request confirmation when a seeded or daily target is already active", () => {
    let calls = 0;
    const pending = planAbandonmentAction(samePuzzle, runtime({ gridCells: currentCells }), "new", () => { calls++; }, sameIdentity);
    expect(pending).toBeNull();
    expect(calls).toBe(1);
  });
  it("retains confirmation for a genuinely different target", () => {
    let calls = 0;
    const target = { ...sameIdentity!, seed: "different" };
    const pending = planAbandonmentAction(samePuzzle, runtime({ gridCells: currentCells }), "new", () => { calls++; }, target);
    expect(pending?.action).toBe("new");
    expect(calls).toBe(0);
  });
  it("invalidates the pending dialog on route commits and browser navigation", () => {
    const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    for (const start of [
      "const setAppRoute = (",
      "const replaceCurrentRoute = (",
      "routeNavigationHandlerRef.current = (",
    ]) {
      const location = app.indexOf(start);
      expect(location).toBeGreaterThanOrEqual(0);
      expect(app.slice(location, location + 210)).toContain("setPendingAbandonment(null)");
    }
    expect(app).toContain("const requestNewSettings = (");
    expect(app).toContain('}, identity);');
  });
});
