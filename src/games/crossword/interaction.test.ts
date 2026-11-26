import { describe, expect, it } from "vitest";
import { buildCrosswordTopology, type CrosswordBoard } from "./model";
import { createCrosswordProgress, isCrosswordComplete, restoreCrosswordProgress, writeCrosswordLetter } from "./progress";
import { activeCrosswordEntry, applyCrosswordKey, initialCrosswordSelection, selectCrosswordCell, selectCrosswordEntry } from "./interaction";

const topology = buildCrosswordTopology(["##...", "#....", ".....", "....#", "...##"]);
const board: CrosswordBoard = {
  ...topology, seed: "test", format: "mini", checksum: "fixture",
  solution: "##ACE#KNOWANGLESEED#HER##",
  entries: topology.entries.map(entry => ({ ...entry, clue: "Clue " + entry.number + entry.direction })),
};

describe("Crossword progress", () => {
  it("stores player letters independently from clues and solution, with strict restoration", () => {
    const fresh = createCrosswordProgress(board);
    expect(fresh.letters).toBe("##...#.............#...##");
    const changed = writeCrosswordLetter(board, fresh, 2, "Z");
    expect(changed.letters[2]).toBe("Z");
    expect(board.solution[2]).toBe("A");
    expect(restoreCrosswordProgress(board, changed)).toEqual(changed);
    for (const bad of [null, { ...changed, baselineChecksum: "other" }, { ...changed, letters: changed.letters.slice(1) },
      { ...changed, letters: "A" + changed.letters.slice(1) }, { ...changed, letters: "###" + changed.letters.slice(3) },
      { ...changed, letters: "##z" + changed.letters.slice(3) }]) {
      expect(restoreCrosswordProgress(board, bad)).toBeNull();
    }
    for (const cell of [-1, 0, 1.5, 25]) expect(writeCrosswordLetter(board, fresh, cell, "A")).toBe(fresh);
    for (const letter of ["", "AB", "#", "a", "1"]) expect(writeCrosswordLetter(board, fresh, 2, letter)).toBe(fresh);
  });

  it("distinguishes full incorrect grids from completion and locks completed edits", () => {
    const wrong = { baselineChecksum: board.checksum, letters: board.solution.replace("ACE", "ZCE") };
    const solved = { baselineChecksum: board.checksum, letters: board.solution };
    expect(isCrosswordComplete(board, wrong)).toBe(false);
    expect(isCrosswordComplete(board, solved)).toBe(true);
    expect(isCrosswordComplete(board, { ...solved, baselineChecksum: "wrong" })).toBe(false);
    expect(writeCrosswordLetter(board, solved, 2, ".")).toBe(solved);
  });
});

describe("Crossword selection and input", () => {
  const fresh = createCrosswordProgress(board);
  const first = initialCrosswordSelection(board);

  it("distinguishes the active direction from the shared cell", () => {
    expect(first).toEqual({ cell: 2, direction: "across" });
    expect(activeCrosswordEntry(board, first)?.cells).toEqual([2, 3, 4]);
    const down = selectCrosswordCell(board, first, 2);
    expect(down).toEqual({ cell: 2, direction: "down" });
    expect(activeCrosswordEntry(board, down)?.cells).toEqual([2, 7, 12, 17, 22]);
    expect(selectCrosswordCell(board, down, 3)).toEqual({ cell: 3, direction: "down" });
    expect(selectCrosswordCell(board, down, 1)).toBe(down);
    expect(applyCrosswordKey(board, fresh, first, "Enter")?.selection).toEqual(down);
  });

  it("types into one shared crossing, advances along the active direction and stops at its end", () => {
    const typed = applyCrosswordKey(board, fresh, first, "a")!;
    expect(typed.progress.letters[2]).toBe("A");
    expect(typed.selection).toEqual({ cell: 3, direction: "across" });
    const down = selectCrosswordEntry(board, typed.progress, typed.selection, 1, "down");
    expect(down).toEqual({ cell: 7, direction: "down" });
    const next = applyCrosswordKey(board, typed.progress, down, "n")!;
    expect(next.selection.cell).toBe(12);
    expect(next.progress.letters[2]).toBe("A");
    expect(next.progress.letters[7]).toBe("N");
    const end = applyCrosswordKey(board, fresh, first, "End")!.selection;
    expect(applyCrosswordKey(board, fresh, end, "e")?.selection.cell).toBe(4);
  });

  it("clears current or previous cells predictably without crossing entry boundaries", () => {
    const typed = applyCrosswordKey(board, fresh, first, "a")!;
    const deleted = applyCrosswordKey(board, typed.progress, typed.selection, "Backspace")!;
    expect(deleted.selection).toEqual(first);
    expect(deleted.progress).toEqual(fresh);
    const current = applyCrosswordKey(board, typed.progress, first, "Backspace")!;
    expect(current.progress).toEqual(fresh);
    expect(current.selection).toEqual(first);
    expect(applyCrosswordKey(board, fresh, first, "Backspace")?.selection).toEqual(first);
    expect(applyCrosswordKey(board, typed.progress, typed.selection, "Delete")?.progress).toBe(typed.progress);
  });

  it("uses spatial arrows without wrapping or editing, and selects clues by number and direction", () => {
    expect(applyCrosswordKey(board, fresh, first, "ArrowLeft")?.selection).toEqual(first);
    expect(applyCrosswordKey(board, fresh, first, "ArrowUp")?.selection).toEqual({ cell: 2, direction: "down" });
    expect(applyCrosswordKey(board, fresh, { cell: 4, direction: "across" }, "ArrowRight")?.selection.cell).toBe(4);
    expect(applyCrosswordKey(board, fresh, { cell: 22, direction: "down" }, "ArrowDown")?.selection.cell).toBe(22);
    const lower = applyCrosswordKey(board, fresh, first, "ArrowDown")!;
    expect(lower.selection).toEqual({ cell: 7, direction: "down" });
    expect(lower.progress).toBe(fresh);
    expect(applyCrosswordKey(board, fresh, lower.selection, "ArrowLeft")?.selection).toEqual({ cell: 6, direction: "across" });
    expect(selectCrosswordEntry(board, fresh, lower.selection, 1, "across")).toEqual(first);
    expect(selectCrosswordEntry(board, fresh, lower.selection, 999, "down")).toBe(lower.selection);
    expect(applyCrosswordKey(board, fresh, first, "Tab")).toBeNull();
    expect(applyCrosswordKey(board, fresh, first, "ß")).toBeNull();
  });

  it("allows inspection but not edits once solved", () => {
    const solved = { baselineChecksum: board.checksum, letters: board.solution };
    expect(applyCrosswordKey(board, solved, first, "A")).toBeNull();
    expect(applyCrosswordKey(board, solved, first, "Backspace")).toBeNull();
    expect(applyCrosswordKey(board, solved, first, "ArrowRight")?.selection.cell).toBe(3);
  });
});
