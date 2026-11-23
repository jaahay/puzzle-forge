import { describe, expect, it } from "vitest";
import { getNextNonogramMark } from "./GridPuzzleWorkspace";
import { getGridEntryStatusMessage, getGridEntryTone } from "../app/useGridController";
import { readFileSync } from "node:fs";

describe("Nonogram cell marking", () => {
  it("distinguishes fill, known-empty and untouched in either mode", () => {
    expect(getNextNonogramMark("", "fill")).toBe("■");
    expect(getNextNonogramMark("■", "fill")).toBe("");
    expect(getNextNonogramMark("×", "fill")).toBe("■");
    expect(getNextNonogramMark("", "cross")).toBe("×");
    expect(getNextNonogramMark("×", "cross")).toBe("");
    expect(getNextNonogramMark("■", "cross")).toBe("×");
  });

  it("keeps empty marks legible and routes edits through existing grid history", () => {
    expect(getGridEntryTone("nonogram", "×")).toBe("empty");
    expect(getGridEntryTone("nonogram", "■")).toBe("accent");
    expect(getGridEntryStatusMessage("nonogram", "×")).toBe("Marked empty square.");
    const source = readFileSync(new URL("./GridPuzzleWorkspace.tsx", import.meta.url), "utf8");
    const controller = readFileSync(new URL("../app/useGridController.ts", import.meta.url), "utf8");
    const persistence = readFileSync(new URL("../app/sessionPersistence.ts", import.meta.url), "utf8");
    expect(source).toContain("onCellInput(cell, getNextNonogramMark(cell.value, nonogramMarkMode))");
    expect(readFileSync(new URL("./GridPuzzlePreview.tsx", import.meta.url), "utf8")).toContain('cell.value === "×" ? <span aria-hidden="true">×</span>');
    expect(source).toContain('aria-pressed={nonogramMarkMode === "cross"}');
    expect(source).toContain('aria-label="Empty × (mark cells empty)">Empty ×</button>');
    expect(controller).not.toContain("toggleNonogramCell");
    expect(persistence).toContain('persistedValue === "×" ? "Marked empty"');
  });
});
