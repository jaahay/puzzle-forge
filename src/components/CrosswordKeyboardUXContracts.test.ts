import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./CrosswordBoard.tsx", import.meta.url), "utf8");

describe("Crossword keyboard workspace ownership", () => {
  it("accepts letters before cell focus through the same transition as focused input", () => {
    const pageHandler = source.slice(source.indexOf("const onPageKeyDown"), source.indexOf("const onCellKeyDown"));
    expect(pageHandler).toContain("/^[a-zA-Z]$/.test(event.key)");
    expect(pageHandler).toContain("shouldHandlePuzzleShortcut(event, {");
    expect(pageHandler).toContain("modalOpen: isPuzzleModalOpen()");
    expect(pageHandler).not.toContain("boardCellSelector");
    expect(pageHandler).toContain("if (applyKey(event.key)) event.preventDefault()");
    expect(source).toContain("if (disabled || solved) return;");
    expect(pageHandler).toContain('document.addEventListener("keydown", onPageKeyDown)');
    expect(pageHandler).toContain('document.removeEventListener("keydown", onPageKeyDown)');
    expect(source).toContain("if (applyKey(event.key, true, { ...selection, cell }))");
    expect(source).toContain("event.stopPropagation()");
  });
});
