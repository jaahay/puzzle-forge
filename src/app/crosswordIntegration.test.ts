import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getPuzzleDefinition, isGeneratable } from "../catalog/puzzleCatalog";
import { generatePuzzle } from "../games/registry";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import { canMoveCrosswordHistory, crosswordHistoryLimit, isCrosswordComplete, moveCrosswordHistory, recordCrosswordEdit, restoreCrosswordProgress, writeCrosswordLetter } from "../games/crossword/progress";
import { resolveGenerationIdentity } from "./generationSettings";
import { generatedPuzzleMatchesIdentity } from "./generationIdentity";
import { decodeGenerationId, encodeGenerationId } from "./puzzleResourceIdentity";
import { parseAppRoute } from "./routes";
import { resolveDailyResource } from "./dailyResource";
import { buildFreshSessionForGeneratedPuzzle, clonePuzzleSession } from "./usePuzzleSessions";
import { buildPersistedPuzzleSession, restorePuzzleSessionFromPersisted } from "./session";
import { formatPuzzleShareProgress, getPuzzleShareResource } from "./puzzleShare";
import { initialSolitaireStats } from "./session";

const bank: unknown = JSON.parse(readFileSync(new URL("../../public/lexicon/crossword/mini-clues.json", import.meta.url), "utf8"));
const identity = resolveGenerationIdentity({
  puzzleId: "crossword", currentPuzzle: null,
  runtimeSettings: { seed: "crossword-integration", width: 9, height: 9, difficulty: "Hard",
    requireUniqueSolution: true, sudokuVariation: defaultSudokuVariation, solitaireVariation: defaultSolitaireVariation },
  makeSeed: () => "unused",
});
const generate = () => generatePuzzle(identity, undefined, undefined, bank);

describe("Crossword platform integration", () => {
  it("registers Mini as a fixed format with seed-only configuration and a daily track", () => {
    expect(isGeneratable(getPuzzleDefinition("crossword"))).toBe(true);
    expect(parseAppRoute("/crossword", "")).toEqual({ kind: "puzzle", puzzleId: "crossword" });
    expect(identity.width).toBe(5);
    expect(identity.height).toBe(5);
    const generationId = encodeGenerationId(identity);
    expect(encodeGenerationId({ ...identity, difficulty: "Easy" })).toBe(generationId);
    expect(() => encodeGenerationId({ ...identity, width: 6 })).toThrow();
    const decoded = decodeGenerationId("crossword", generationId);
    expect(decoded.ok && generatedPuzzleMatchesIdentity(generate(), decoded.identity)).toBe(true);
    expect(resolveDailyResource("crossword", "2026-11-25", "").ok).toBe(true);
    expect(resolveDailyResource("crossword", "2026-11-25", "?difficulty=hard").ok).toBe(false);
    expect(() => generatePuzzle(identity)).toThrow();
  });

  it("persists bounded edit history at the actual undo position, including redo", () => {
    const session = buildFreshSessionForGeneratedPuzzle(generate());
    if (session.kind !== "crossword") throw new Error("Unexpected puzzle kind");
    const board = session.puzzle;
    const cell = board.blocks.findIndex(block => !block);
    const fresh = session.progress;
    const edit = (current: typeof fresh, letter: string) =>
      recordCrosswordEdit(board, current, writeCrosswordLetter(board, current, cell, letter))!;
    const a = edit(fresh, "A");
    const z = recordCrosswordEdit(board, a, writeCrosswordLetter(board, a, cell, "Z"))!;
    expect(recordCrosswordEdit(board, z, z)).toBeNull();
    const undone = moveCrosswordHistory(board, z, "undo")!;
    expect(undone.letters).toBe(a.letters);
    const resource = { puzzleId: "crossword" as const, generationId: encodeGenerationId(identity) };
    const persisted = buildPersistedPuzzleSession(resource, { ...session, progress: { kind: "crossword", ...undone } })!;
    expect(persisted.progress).toEqual({ kind: "crossword", letters: a.letters,
      history: { undo: [fresh.letters], redo: [z.letters] } });
    const restored = restorePuzzleSessionFromPersisted(persisted, generate());
    if (restored?.kind !== "crossword") throw new Error("History did not restore");
    expect(moveCrosswordHistory(board, restored.progress, "redo")?.letters).toBe(z.letters);
    const branched = recordCrosswordEdit(board, restored.progress, writeCrosswordLetter(board, restored.progress, cell, "B"))!;
    expect(canMoveCrosswordHistory(board, branched, "redo")).toBe(false);
    expect(moveCrosswordHistory(board, branched, "undo")?.letters).toBe(a.letters);
    const reset = buildFreshSessionForGeneratedPuzzle(board);
    expect(reset.progress).toEqual(fresh);
    expect(moveCrosswordHistory(board, fresh, "undo")).toBeNull();
    expect(restoreCrosswordProgress(board, { ...undone, history: { undo: ["A".repeat(25)], redo: [] } })).toBeNull();
    expect(restoreCrosswordProgress(board, { ...undone, history: { undo: Array(crosswordHistoryLimit + 1).fill(fresh.letters), redo: [] } })).toBeNull();
    expect(moveCrosswordHistory(board, { ...undone, letters: board.solution }, "undo")).toBeNull();
    let repeated = a;
    for (let i = 0; i < crosswordHistoryLimit + 10; i++) {
      repeated = recordCrosswordEdit(board, repeated, writeCrosswordLetter(board, repeated, cell, i % 2 ? "A" : "Z"))!;
    }
    expect(repeated.history?.undo.length).toBe(crosswordHistoryLimit);
    const cloned = clonePuzzleSession({ ...session, progress: { kind: "crossword", ...undone } });
    if (cloned.kind !== "crossword") throw new Error("Unexpected clone");
    expect(cloned.progress.history).toEqual(undone.history);
    expect(cloned.progress.history?.undo).not.toBe(undone.history?.undo);
  });

  it("persists only player letters, validates regenerated geometry and baseline, and shares no answers", () => {
    const session = buildFreshSessionForGeneratedPuzzle(generate());
    if (session.kind !== "crossword") throw new Error("Unexpected puzzle kind");
    const cell = session.puzzle.blocks.findIndex(block => !block);
    const progress = writeCrosswordLetter(session.puzzle, session.progress, cell, "A");
    const current = { ...session, progress: { kind: "crossword" as const, ...progress } };
    const resource = { puzzleId: "crossword" as const, generationId: encodeGenerationId(identity) };
    const persisted = buildPersistedPuzzleSession(resource, current)!;
    expect(persisted.progress).toEqual({ kind: "crossword", letters: progress.letters });
    expect(clonePuzzleSession(current)).toEqual(current);
    expect(restorePuzzleSessionFromPersisted(persisted, generate())?.progress).toEqual(current.progress);
    expect(restorePuzzleSessionFromPersisted({ ...persisted, baselineChecksum: "wrong" }, generate())).toBeNull();
    expect(restorePuzzleSessionFromPersisted({ ...persisted, progress: { kind: "crossword", letters: "A".repeat(25) } }, generate())).toBeNull();
    const solved = { ...progress, letters: session.puzzle.solution };
    expect(isCrosswordComplete(session.puzzle, solved)).toBe(true);
    const completed = buildPersistedPuzzleSession(resource, { ...current, progress: { kind: "crossword", ...solved } })!;
    const restored = restorePuzzleSessionFromPersisted(completed, generate());
    expect(restored?.kind === "crossword" && isCrosswordComplete(restored.puzzle, restored.progress)).toBe(true);
    const share = getPuzzleShareResource({ kind: "resource", ...resource }, session.puzzle, "https://example.test");
    expect(share?.url).toBe("https://example.test/crossword/" + resource.generationId);
    const report = { gridCells: null, cardStacks: null, solitaireStats: initialSolitaireStats,
      imageTileRuntime: null, jigsawRuntime: null, wordSearchProgress: null, crosswordProgress: progress };
    expect(formatPuzzleShareProgress(session.puzzle, report)).toBe("In progress · 1 letter entered");
    expect(formatPuzzleShareProgress(session.puzzle, { ...report, crosswordProgress: solved })).toBe("Solved");
  });
});
