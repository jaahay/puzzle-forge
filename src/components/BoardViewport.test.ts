import { describe, expect, it } from "vitest";
import { makeBoardViewportMetrics } from "./BoardViewport";

describe("board viewport sizing", () => {
  it("sizes Sudoku from available inline width", () => {
    const metrics = makeBoardViewportMetrics({
      kind: "square-grid",
      availableInlineSize: 328,
      columns: 9,
      rows: 9,
    });

    expect(metrics.boardWidth).toBeLessThanOrEqual(328);
    expect(metrics.boardHeight).toBe(metrics.boardWidth);
    expect(metrics.cellSize).toBeCloseTo(36.44, 2);
  });

  it("fits a default 8 by 8 Nonogram within a mobile board viewport", () => {
    const metrics = makeBoardViewportMetrics({
      kind: "nonogram",
      availableInlineSize: 328,
      columns: 8,
      rows: 8,
      rowClueSlots: 3,
      columnClueSlots: 3,
    });

    expect(metrics.boardWidth).toBeLessThanOrEqual(328);
    expect(metrics.rowClueWidth).toBe(66);
    expect(metrics.columnClueHeight).toBe(66);
    expect(metrics.cellSize).toBeGreaterThan(24);
  });

  it("fits a maximum-size 12 by 12 Nonogram when the phone viewport can preserve useful cell density", () => {
    const metrics = makeBoardViewportMetrics({
      kind: "nonogram",
      availableInlineSize: 360,
      columns: 12,
      rows: 12,
      rowClueSlots: 5,
      columnClueSlots: 5,
    });

    expect(metrics.boardWidth).toBeLessThanOrEqual(360);
    expect(metrics.cellSize).toBeGreaterThanOrEqual(20);
  });

  it("uses contained horizontal scrolling instead of shrinking a large Nonogram below the interaction floor", () => {
    const metrics = makeBoardViewportMetrics({
      kind: "nonogram",
      availableInlineSize: 312,
      columns: 12,
      rows: 12,
      rowClueSlots: 5,
      columnClueSlots: 5,
    });

    expect(metrics.cellSize).toBe(20);
    expect(metrics.boardWidth).toBeGreaterThan(312);
  });

  it("keeps horizontal scrolling as the fallback for boards beyond supported mobile density", () => {
    const metrics = makeBoardViewportMetrics({
      kind: "nonogram",
      availableInlineSize: 328,
      columns: 20,
      rows: 20,
      rowClueSlots: 5,
      columnClueSlots: 5,
    });

    expect(metrics.cellSize).toBe(20);
    expect(metrics.boardWidth).toBeGreaterThan(328);
  });
});
