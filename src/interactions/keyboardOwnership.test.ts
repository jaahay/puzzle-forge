import { describe, expect, it } from "vitest";
import { shouldHandlePuzzleShortcut } from "./keyboardOwnership";

const boardCellSelector = '[data-grid-selection-scope="true"] [data-grid-cell-row][data-grid-cell-column]';

const target = (kind: string, matchesBoard = false): EventTarget => ({
  closest: (query: string) =>
    query.split(",").some((part) => part.trim() === kind)
      ? { matches: (selector: string) => matchesBoard && selector === boardCellSelector }
      : null,
}) as unknown as EventTarget;

const keyEvent = (
  focusTarget: EventTarget,
  flags: Partial<Pick<KeyboardEvent, "defaultPrevented" | "isComposing" | "altKey" | "ctrlKey" | "metaKey">> = {},
) => ({
  target: focusTarget,
  defaultPrevented: false,
  isComposing: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  ...flags,
});

describe("document-level puzzle keyboard ownership", () => {
  it("allows ordinary gameplay typing when the page has no focused control", () => {
    expect(shouldHandlePuzzleShortcut(keyEvent(target("body")))).toBe(true);
    expect(shouldHandlePuzzleShortcut(keyEvent(target("body")), { boardCellSelector })).toBe(true);
  });

  it("leaves focused actions, links, disclosures and fields to their native behavior", () => {
    for (const kind of ["button", "a[href]", "summary", "input", "textarea", "select", "[role='button']", "[role='combobox']", "[role='menuitem']", "[contenteditable]:not([contenteditable='false'])", "[tabindex]:not([tabindex='-1'])"]) {
      expect(shouldHandlePuzzleShortcut(keyEvent(target(kind)))).toBe(false);
      expect(shouldHandlePuzzleShortcut(keyEvent(target(kind)), { boardCellSelector })).toBe(false);
    }
  });

  it("lets focused numeric board cells use shortcuts, not the digit pad or other buttons", () => {
    expect(shouldHandlePuzzleShortcut(keyEvent(target("button", true)), { boardCellSelector })).toBe(true);
    expect(shouldHandlePuzzleShortcut(keyEvent(target("button", true)))).toBe(false);
    expect(shouldHandlePuzzleShortcut(keyEvent(target("button")), { boardCellSelector })).toBe(false);
  });

  it("does not steal shortcuts while an overlay is open or an event has already been handled", () => {
    expect(shouldHandlePuzzleShortcut(keyEvent(target("body")), { modalOpen: true })).toBe(false);
    expect(shouldHandlePuzzleShortcut(keyEvent(target("button", true)), { modalOpen: true, boardCellSelector })).toBe(false);
    expect(shouldHandlePuzzleShortcut(keyEvent(target("body"), { defaultPrevented: true }))).toBe(false);
  });

  it("honors composition and modified keystrokes", () => {
    for (const flags of [
      { isComposing: true },
      { altKey: true },
      { ctrlKey: true },
      { metaKey: true },
    ]) {
      expect(shouldHandlePuzzleShortcut(keyEvent(target("body"), flags))).toBe(false);
    }
  });
});
