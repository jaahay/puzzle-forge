import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isNewPuzzleSheetBackdropClick, newPuzzleSheetMediaQuery } from "./NewPuzzleCommand";
const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");
const command = read("./NewPuzzleCommand.tsx");
const confirm = read("./AbandonmentDialog.tsx");
const css = read("../site/new-puzzle-sheet.css");
const jigsaw = read("./JigsawNewPuzzleControl.tsx");
describe("responsive New puzzle sheet", () => {
  it("uses the same content for desktop disclosure and mobile native dialog", () => {
    expect(newPuzzleSheetMediaQuery).toContain("max-width: 700px");
    expect(command).toContain("dialog.showModal()");
    expect(command).toContain("createPortal(");
    expect(command).toContain("const panel = (");
    expect(command).toContain("isSheetViewport ? (optionsOpen && sheetHost");
    expect(command).toContain(") : panel}");
  });
  it("restores focus and respects a nested abandonment confirmation", () => {
    expect(command).toContain("onCancel={(event) => {");
    expect(command).toContain('document.querySelector(\'[role="alertdialog"][aria-modal="true"]\')');
    expect(command).toContain('aria-label="Close new puzzle options"');
    expect(confirm).toContain('document.querySelector("dialog.new-puzzle-mobile-sheet[open]")');
    expect(command).toContain('focus({ preventScroll: true })');
  });
  it("constrains content to the visible viewport", () => {
    expect(command).toContain("window.visualViewport");
    expect(css).toContain("var(--new-puzzle-visible-height, 100dvh)");
    expect(css).toMatch(/\.new-puzzle-sheet-scroll\s*\{[^}]*overflow-y:\s*auto;/);
  });
  it("treats only actual backdrop clicks as dismissal", () => {
    const dialog = new EventTarget();
    const bounds = { left: 0, right: 300, top: 100, bottom: 550 };
    expect(isNewPuzzleSheetBackdropClick(dialog, dialog, { x: 150, y: 300 }, bounds)).toBe(false);
    expect(isNewPuzzleSheetBackdropClick(dialog, dialog, { x: 150, y: 30 }, bounds)).toBe(true);
    expect(isNewPuzzleSheetBackdropClick(new EventTarget(), dialog, { x: 150, y: 30 }, bounds)).toBe(false);
  });
  it("preserves Jigsaw settings", () => {
    ["Jigsaw cut style","Jigsaw outer boundary","Jigsaw special pieces","Jigsaw size","Custom Jigsaw size","<ArtworkAlbum"]
      .forEach((label) => expect(jigsaw).toContain(label));
  });
});
