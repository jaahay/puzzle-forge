import { describe, expect, it } from "vitest";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { parseNextPuzzleDraftCache } from "./nextPuzzleDraftPersistence";

const zeroKillerDraft = {
  width: 9,
  height: 9,
  difficulty: "Hard" as const,
  requireUniqueSolution: true,
  sudokuVariation: "zero-killer" as const,
  solitaireVariation: { ...defaultSolitaireVariation },
};

describe("persisted next-puzzle preferences", () => {
  it("restores a remembered Sudoku mode and difficulty", () => {
    const drafts = parseNextPuzzleDraftCache({
      schemaVersion: 1,
      drafts: { sudoku: zeroKillerDraft },
    });

    expect(drafts.sudoku).toEqual(zeroKillerDraft);
  });

  it("drops malformed or out-of-range preferences instead of trusting browser storage", () => {
    const drafts = parseNextPuzzleDraftCache({
      schemaVersion: 1,
      drafts: {
        sudoku: { ...zeroKillerDraft, width: 3 },
        nonogram: { ...zeroKillerDraft, width: "large" },
      },
    });

    expect(drafts).toEqual({});
  });

  it("ignores unknown persistence schemas", () => {
    expect(parseNextPuzzleDraftCache({ schemaVersion: 2, drafts: { sudoku: zeroKillerDraft } })).toEqual({});
  });
});
