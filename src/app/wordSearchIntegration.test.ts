import { describe, expect, it } from "vitest";
import { getPuzzleDefinition, isGeneratable } from "../catalog/puzzleCatalog";
import { generatePuzzle } from "../games/registry";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { defaultSudokuVariation } from "../games/sudoku/variation";
import { isWordSearchComplete, selectWordSearchEndpoints } from "../games/wordSearch/progress";
import { wordSearchProfiles } from "../games/wordSearch/model";
import { needsAbandonmentConfirmation } from "./abandonmentPolicy";
import { resolveDailyResource, makeDailyResourceLocatorPath } from "./dailyResource";
import { generatedPuzzleMatchesIdentity, type GenerationRuntimeSettings } from "./generationIdentity";
import { resolveGenerationIdentity } from "./generationSettings";
import { parseNextPuzzleDraftCache } from "./nextPuzzleDraftPersistence";
import { decodeGenerationId, encodeGenerationId } from "./puzzleResourceIdentity";
import { parseAppRoute } from "./routes";
import { buildPersistedPuzzleSession, restorePuzzleSessionFromPersisted } from "./sessionPersistence";
import { buildFreshSessionForGeneratedPuzzle, clonePuzzleSession } from "./usePuzzleSessions";
import { buildNextPuzzleDraft, applyNextPuzzleDraftSettings } from "./useNextPuzzleDrafts";

const defaults: GenerationRuntimeSettings = {
  seed: "example", width: 9, height: 9, difficulty: "Medium", requireUniqueSolution: true,
  solitaireVariation: defaultSolitaireVariation, sudokuVariation: defaultSudokuVariation,
};

const identity = resolveGenerationIdentity({
  puzzleId: "word-search", currentPuzzle: null, runtimeSettings: defaults,
  settings: { seed: "word-search-integration", difficulty: "Hard", wordSearchTheme: "music" },
  makeSeed: () => "unused",
});

describe("Word Search platform integration", () => {
  it("registers a generatable catalog entry with a distinct generated kind and canonical profile", () => {
    expect(isGeneratable(getPuzzleDefinition("word-search"))).toBe(true);
    expect(parseAppRoute("/word-search", "")).toEqual({ kind: "puzzle", puzzleId: "word-search" });
    expect(identity.width).toBe(wordSearchProfiles.Hard.size);
    expect(identity.height).toBe(identity.width);
    const generationId = encodeGenerationId(identity);
    const decoded = decodeGenerationId("word-search", generationId);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) throw new Error("Invalid identity");
    expect(decoded.identity).toMatchObject({ difficulty: "Hard", wordSearchTheme: "music", width: 10, height: 10 });
    const puzzle = generatePuzzle(decoded.identity);
    expect(puzzle.kind).toBe("word-search");
    expect(generatedPuzzleMatchesIdentity(puzzle, decoded.identity)).toBe(true);
    expect(generatedPuzzleMatchesIdentity(puzzle, { ...decoded.identity, wordSearchTheme: "garden" })).toBe(false);
    expect(encodeGenerationId({ ...identity, wordSearchTheme: "garden" })).not.toBe(generationId);
    expect(() => encodeGenerationId({ ...identity, width: 11 })).toThrow("Invalid Word Search profile");
    expect(parseAppRoute(`/word-search/${generationId}`, "")).toEqual({ kind: "resource", puzzleId: "word-search", generationId });
  });

  it("separates theme and difficulty daily tracks, with strict query parsing", () => {
    const first = resolveDailyResource("word-search", "2026-11-24", "?theme=ocean&difficulty=expert");
    const second = resolveDailyResource("word-search", "2026-11-24", "?theme=garden&difficulty=expert");
    const third = resolveDailyResource("word-search", "2026-11-24", "?theme=ocean&difficulty=hard");
    if (!first.ok || !second.ok || !third.ok) throw new Error("Missing daily");
    expect(first.query).toBe("difficulty=expert&theme=ocean");
    expect(first.identity.width).toBe(12);
    expect(first.identity.seed).not.toBe(second.identity.seed);
    expect(first.identity.seed).not.toBe(third.identity.seed);
    expect(makeDailyResourceLocatorPath(first.identity)).toBe("/word-search/daily/2026-11-24?difficulty=expert&theme=ocean");
    expect(resolveDailyResource("word-search", "2026-11-24", "?theme=bogus")).toEqual({ ok: false, reason: "invalid-query" });
    expect(resolveDailyResource("word-search", "2026-11-24", "?size=8x8")).toEqual({ ok: false, reason: "invalid-query" });
    expect(resolveDailyResource("word-search", "2026-11-24", "?theme=ocean&theme=garden")).toEqual({ ok: false, reason: "invalid-query" });
  });

  it("remembers prospective settings without independent dimension state", () => {
    const draft = buildNextPuzzleDraft({ puzzleId: "word-search", selectedPuzzleId: "word-search", currentPuzzle: null, runtimeSettings: defaults });
    expect(draft).toMatchObject({ width: 10, height: 10, difficulty: "Medium", wordSearchTheme: "mixed" });
    const changed = applyNextPuzzleDraftSettings(draft, { difficulty: "Easy", wordSearchTheme: "space" });
    expect(changed).toMatchObject({ width: 8, height: 8, difficulty: "Easy", wordSearchTheme: "space" });
    expect(parseNextPuzzleDraftCache({ schemaVersion: 1, drafts: { "word-search": changed } })["word-search"]).toEqual(changed);
    expect(parseNextPuzzleDraftCache({ schemaVersion: 1, drafts: { "word-search": { ...changed, width: 9 } } })["word-search"]).toBeUndefined();
  });

  it("persists only found words, rejects mismatched baselines and restores completion", () => {
    const generated = generatePuzzle(identity);
    const session = buildFreshSessionForGeneratedPuzzle(generated);
    if (session.kind !== "word-search") throw new Error("Incorrect session kind");
    const puzzle = session.puzzle;
    const target = puzzle.targets[0]!;
    const first = selectWordSearchEndpoints(puzzle, session.progress, target.end, target.start);
    const current = { ...session, progress: { kind: "word-search" as const, ...first } };
    const resource = { puzzleId: "word-search" as const, generationId: encodeGenerationId(identity) };
    const persisted = buildPersistedPuzzleSession(resource, current);
    if (!persisted) throw new Error("Could not persist");
    expect(persisted.progress).toEqual({ kind: "word-search", found: [target.word] });
    expect(clonePuzzleSession(current)).toEqual(current);
    const restored = restorePuzzleSessionFromPersisted(persisted, generatePuzzle(identity));
    expect(restored?.progress).toEqual(current.progress);
    expect(restorePuzzleSessionFromPersisted({ ...persisted, baselineChecksum: "different" }, generated)).toBeNull();
    expect(restorePuzzleSessionFromPersisted({ ...persisted, progress: { kind: "word-search", found: ["NOTAWORD"] } }, generated)).toBeNull();
    expect(restorePuzzleSessionFromPersisted({ ...persisted, progress: { kind: "word-search", found: [target.word, target.word] } }, generated)).toBeNull();
    const complete = puzzle.targets.reduce((progress, t) => selectWordSearchEndpoints(puzzle, progress, t.start, t.end), first);
    expect(isWordSearchComplete(puzzle, complete)).toBe(true);
    const completed = buildPersistedPuzzleSession(resource, { ...session, progress: { kind: "word-search", ...complete } });
    expect(completed?.progress).toEqual({ kind: "word-search", found: puzzle.targets.map(t => t.word) });
    const restoredComplete = restorePuzzleSessionFromPersisted(completed!, generated);
    expect(restoredComplete?.kind === "word-search" && isWordSearchComplete(restoredComplete.puzzle, restoredComplete.progress)).toBe(true);
    const runtime = { gridCells: null, cardStacks: null, solitaireStats: null, jigsawAssembly: null,
      workspaceProgress: { puzzleInstanceId: puzzle.id, hasProgress: true, terminal: false } };
    expect(needsAbandonmentConfirmation(puzzle, runtime)).toBe(true);
    expect(needsAbandonmentConfirmation(puzzle, { ...runtime, workspaceProgress: { ...runtime.workspaceProgress, terminal: true } })).toBe(false);
  });
});
