import { describe, expect, it } from "vitest";
import { createNewPuzzleCommandActions } from "./NewPuzzleCommand";

describe("New puzzle command confirmation lifecycle", () => {
  const setup = (disabled = false, seedLoadInput = "chosen-seed") => {
    const effects: string[] = [];
    let afterStart: (() => void) | undefined;
    const actions = createNewPuzzleCommandActions({
      disabled,
      seedLoadInput,
      closeOptions: (restoreFocus) => { effects.push(`close:${Boolean(restoreFocus)}`); },
      onNewPuzzle: (callback) => { effects.push("request:new"); afterStart = callback; },
      onToday: (callback) => { effects.push("request:today"); afterStart = callback; },
      onLoadSeed: (callback) => { effects.push("request:seed"); afterStart = callback; },
      onRestartPuzzle: (callback) => { effects.push("request:restart"); afterStart = callback; },
      renewSeedCandidate: () => { effects.push("renew:seed"); },
    });
    return { actions, effects, confirm: () => { afterStart?.(); } };
  };

  it("does not close the options or change a seed while confirmation is pending or cancelled", () => {
    const { actions, effects } = setup();
    actions.startRandomPuzzle(true);
    expect(effects).toEqual(["request:new"]);
    // Cancel intentionally does not call the action's completion callback.
    expect(effects).toEqual(["request:new"]);
  });

  it("commits the menu and seed only after confirmed New", () => {
    const { actions, effects, confirm } = setup();
    actions.startRandomPuzzle(true);
    confirm();
    expect(effects).toEqual(["request:new", "close:true", "renew:seed"]);
  });

  it("defers Today and seeded-load cleanup until the action starts", () => {
    for (const action of ["today", "seed"] as const) {
      const { actions, effects, confirm } = setup();
      if (action === "today") actions.startToday();
      else actions.loadSeed();
      expect(effects).toEqual([`request:${action}`]);
      confirm();
      expect(effects).toEqual([`request:${action}`, "close:true", "renew:seed"]);
    }
  });

  it("only closes the options after confirming a restart of the current puzzle", () => {
    const { actions, effects, confirm } = setup();
    actions.restartPuzzle();
    expect(effects).toEqual(["request:restart"]);
    // Cancelled restart: no callback, so the configuration remains open.
    expect(effects).toEqual(["request:restart"]);
    confirm();
    expect(effects).toEqual(["request:restart", "close:true"]);
  });

  it("performs no request or cleanup when disabled or seed input is blank", () => {
    const disabled = setup(true);
    disabled.actions.startRandomPuzzle();
    disabled.actions.startToday();
    disabled.actions.loadSeed();
    disabled.actions.restartPuzzle();
    expect(disabled.effects).toEqual([]);
    const empty = setup(false, "  ");
    empty.actions.loadSeed();
    expect(empty.effects).toEqual([]);
  });
});
