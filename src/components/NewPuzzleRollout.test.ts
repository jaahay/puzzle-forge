import { describe, expect, it } from "vitest";
import * as gridWorkspaceModule from "./GridPuzzleWorkspace";
import * as newPuzzleCommandModule from "./NewPuzzleCommand";

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

const commandActionFactory = (
  newPuzzleCommandModule as unknown as { createNewPuzzleCommandActions?: CommandActionFactory }
).createNewPuzzleCommandActions;

const gridMetaResolver = (
  gridWorkspaceModule as unknown as { getGridPuzzleMetaItems?: GridMetaResolver }
).getGridPuzzleMetaItems;

const requireCommandActionFactory = () => {
  expect(commandActionFactory).toBeTypeOf("function");
  return commandActionFactory!;
};

const requireGridMetaResolver = () => {
  expect(gridMetaResolver).toBeTypeOf("function");
  return gridMetaResolver!;
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

describe("rolled-out grid puzzle metadata", () => {
  it("keeps Futoshiki uniqueness in the crown and only progress beside the board", () => {
    const resolveGridMeta = requireGridMetaResolver();

    expect(resolveGridMeta({
      isFutoshiki: true,
      isWordGuess: false,
      filledOpenCount: 7,
      openCount: 16,
      dailyLabel: null,
    })).toEqual(["7/16 filled"]);
  });

  it("preserves non-duplicated Word Guess and daily metadata", () => {
    const resolveGridMeta = requireGridMetaResolver();

    expect(resolveGridMeta({
      isFutoshiki: false,
      isWordGuess: true,
      filledOpenCount: 0,
      openCount: 0,
      dailyLabel: "2026-09-16",
    })).toEqual(["Answer-list solvable", "Daily: 2026-09-16"]);
  });
});
