import { describe, expect, it } from "vitest";
import { getPuzzleHistoryShortcutAction } from "./PuzzleHistoryActions";

const shortcut = (overrides: Partial<KeyboardEvent> = {}) => ({
  key: "z",
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...overrides,
});

describe("puzzle history keyboard shortcuts", () => {
  it("maps conventional undo shortcuts", () => {
    expect(getPuzzleHistoryShortcutAction(shortcut({ ctrlKey: true }))).toBe("undo");
    expect(getPuzzleHistoryShortcutAction(shortcut({ metaKey: true }))).toBe("undo");
  });

  it("maps conventional redo shortcuts", () => {
    expect(getPuzzleHistoryShortcutAction(shortcut({ ctrlKey: true, shiftKey: true }))).toBe("redo");
    expect(getPuzzleHistoryShortcutAction(shortcut({ metaKey: true, shiftKey: true }))).toBe("redo");
    expect(getPuzzleHistoryShortcutAction(shortcut({ key: "y", ctrlKey: true }))).toBe("redo");
  });

  it("does not claim ordinary typing or alt-modified shortcuts", () => {
    expect(getPuzzleHistoryShortcutAction(shortcut())).toBeNull();
    expect(getPuzzleHistoryShortcutAction(shortcut({ altKey: true, ctrlKey: true }))).toBeNull();
    expect(getPuzzleHistoryShortcutAction(shortcut({ key: "y", metaKey: true }))).toBeNull();
  });
});
