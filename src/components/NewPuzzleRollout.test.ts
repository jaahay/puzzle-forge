import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getCurrentPuzzleIdentity } from "./CurrentPuzzleIdentity";
import * as gridWorkspaceModule from "./GridPuzzleWorkspace";
import * as jigsawWorkspaceModule from "./JigsawWorkspace";
import * as newPuzzleCommandModule from "./NewPuzzleCommand";
import * as wordGuessNewPuzzleControlModule from "./WordGuessNewPuzzleControl";

type CommandActions = {
  startRandomPuzzle: (restoreMenuFocus?: boolean) => void;
  startToday: () => void;
  loadSeed: () => void;
};

type CommandActionFactory = (options: {
  disabled: boolean;
  seedLoadInput: string;
  closeOptions: (restoreFocus?: boolean) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
  renewSeedCandidate: () => void;
}) => CommandActions;

type GridMetaResolver = (options: {
  isFutoshiki: boolean;
  isWordGuess: boolean;
  filledOpenCount: number;
  openCount: number;
  dailyLabel: string | null;
}) => string[];

type JigsawGameplayNotesResolver = (notes: string[], assetTitle: string) => string[];

const commandActionFactory = (
  newPuzzleCommandModule as unknown as { createNewPuzzleCommandActions?: CommandActionFactory }
).createNewPuzzleCommandActions;

const gridMetaResolver = (
  gridWorkspaceModule as unknown as { getGridPuzzleMetaItems?: GridMetaResolver }
).getGridPuzzleMetaItems;

const jigsawGameplayNotesResolver = (
  jigsawWorkspaceModule as unknown as { getJigsawGameplayNotes?: JigsawGameplayNotesResolver }
).getJigsawGameplayNotes;

const wordGuessDimensionSeparator = (
  wordGuessNewPuzzleControlModule as unknown as { wordGuessDimensionSeparator?: string }
).wordGuessDimensionSeparator;

const workspaceHierarchyCss = readFileSync(
  new URL("../site/workspace-hierarchy.css", import.meta.url),
  "utf8",
);

const requireCommandActionFactory = () => {
  expect(commandActionFactory).toBeTypeOf("function");
  return commandActionFactory!;
};

const requireGridMetaResolver = () => {
  expect(gridMetaResolver).toBeTypeOf("function");
  return gridMetaResolver!;
};

const requireJigsawGameplayNotesResolver = () => {
  expect(jigsawGameplayNotesResolver).toBeTypeOf("function");
  return jigsawGameplayNotesResolver!;
};

describe("shared New puzzle command interactions", () => {
  const makeHarness = (overrides: Partial<Parameters<CommandActionFactory>[0]> = {}) => {
    const calls = {
      closeOptions: [] as boolean[],
      newPuzzle: 0,
      today: 0,
      loadSeed: 0,
      renewSeed: 0,
    };
    const factory = requireCommandActionFactory();
    const actions = factory({
      disabled: false,
      seedLoadInput: "candidate-seed",
      closeOptions: (restoreFocus = false) => calls.closeOptions.push(restoreFocus),
      onNewPuzzle: () => { calls.newPuzzle += 1; },
      onToday: () => { calls.today += 1; },
      onLoadSeed: () => { calls.loadSeed += 1; },
      renewSeedCandidate: () => { calls.renewSeed += 1; },
      ...overrides,
    });

    return { actions, calls };
  };

  it("starts an immediate random puzzle from primary New without restoring chooser focus", () => {
    const { actions, calls } = makeHarness();

    actions.startRandomPuzzle(false);

    expect(calls).toEqual({
      closeOptions: [false],
      newPuzzle: 1,
      today: 0,
      loadSeed: 0,
      renewSeed: 1,
    });
  });

  it("uses the same random creation action from the chooser and restores chooser focus", () => {
    const { actions, calls } = makeHarness();

    actions.startRandomPuzzle(true);

    expect(calls.closeOptions).toEqual([true]);
    expect(calls.newPuzzle).toBe(1);
    expect(calls.renewSeed).toBe(1);
  });

  it("runs Today and entered Seed as explicit creation actions", () => {
    const todayHarness = makeHarness();
    todayHarness.actions.startToday();
    expect(todayHarness.calls.today).toBe(1);
    expect(todayHarness.calls.closeOptions).toEqual([true]);
    expect(todayHarness.calls.renewSeed).toBe(1);

    const seedHarness = makeHarness();
    seedHarness.actions.loadSeed();
    expect(seedHarness.calls.loadSeed).toBe(1);
    expect(seedHarness.calls.closeOptions).toEqual([true]);
    expect(seedHarness.calls.renewSeed).toBe(1);
  });

  it("keeps disabled commands and blank entered seeds inert", () => {
    const disabledHarness = makeHarness({ disabled: true });
    disabledHarness.actions.startRandomPuzzle();
    disabledHarness.actions.startToday();
    disabledHarness.actions.loadSeed();
    expect(disabledHarness.calls).toEqual({
      closeOptions: [],
      newPuzzle: 0,
      today: 0,
      loadSeed: 0,
      renewSeed: 0,
    });

    const blankSeedHarness = makeHarness({ seedLoadInput: "   " });
    blankSeedHarness.actions.loadSeed();
    expect(blankSeedHarness.calls.loadSeed).toBe(0);
    expect(blankSeedHarness.calls.closeOptions).toEqual([]);
    expect(blankSeedHarness.calls.renewSeed).toBe(0);
  });
});

describe("rolled-out puzzle presentation", () => {
  it("keeps Futoshiki invariants out of current-puzzle identity", () => {
    const puzzle = {
      kind: "grid",
      puzzleId: "futoshiki",
      seed: "futoshiki-review",
      width: 5,
      height: 5,
      difficulty: "Hard",
      uniqueSolution: true,
    } as unknown as Parameters<typeof getCurrentPuzzleIdentity>[0];

    expect(getCurrentPuzzleIdentity(puzzle, "2026-09-16")).toMatchObject({
      puzzleLabel: "Futoshiki",
      details: [],
      difficultyLabel: "Hard",
    });
  });

  it("keeps only Futoshiki progress beside the board", () => {
    const resolveGridMeta = requireGridMetaResolver();

    expect(resolveGridMeta({
      isFutoshiki: true,
      isWordGuess: false,
      filledOpenCount: 7,
      openCount: 16,
      dailyLabel: null,
    })).toEqual(["7/16 filled"]);
  });

  it("keeps Word Guess provenance in the crown instead of repeating it beside the board", () => {
    const resolveGridMeta = requireGridMetaResolver();

    expect(resolveGridMeta({
      isFutoshiki: false,
      isWordGuess: true,
      filledOpenCount: 0,
      openCount: 0,
      dailyLabel: "2026-09-16",
    })).toEqual(["Answer-list solvable"]);
  });

  it("uses a non-geometric separator for Word Guess choices", () => {
    expect(wordGuessDimensionSeparator).toBe("·");
  });

  it("leaves image-family preview summaries to gameplay state while the crown owns identity", () => {
    const selectors = [
      ".jigsaw-workspace .tile-puzzle-summary > span:nth-child(2)",
      ".jigsaw-workspace .tile-puzzle-summary > span:nth-child(3)",
      ".image-tile-workspace .image-tile-summary > span:nth-child(2)",
      ".image-tile-workspace .image-tile-summary > span:nth-child(3)",
    ];

    selectors.forEach((selector) => expect(workspaceHierarchyCss).toContain(selector));
    expect(workspaceHierarchyCss).toMatch(/\.jigsaw-workspace \.tile-puzzle-summary[\s\S]*?\.image-tile-workspace \.image-tile-summary[\s\S]*?\{\s*display:\s*none;\s*\}/);
  });

  it("filters the generated Jigsaw artwork note while preserving real gameplay notes", () => {
    const resolveNotes = requireJigsawGameplayNotesResolver();

    expect(resolveNotes([
      "Jigsaw using the bundled Alpine Lake image.",
      "A future gameplay-specific note.",
    ], "Alpine Lake")).toEqual(["A future gameplay-specific note."]);
  });
});
