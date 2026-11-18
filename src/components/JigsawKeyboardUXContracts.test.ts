import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./TilePuzzlePreview.tsx", import.meta.url), "utf8");

describe("Jigsaw keyboard workspace parity", () => {
  it("uses one focusable stage rather than tabbing through every puzzle piece", () => {
    expect(source).toContain("tabIndex={-1}");
    expect(source).toContain('tabIndex={0}');
    expect(source).toContain("selectKeyboardIsland");
    expect(source).toContain("keyboardSelected={Boolean(");
    expect(source).toContain('role="status" aria-live="polite"');
  });

  it("shares snap, action history and free-drop layering with pointer movement", () => {
    expect(source).toContain("advanceJigsawKeyboardPiece(");
    expect(source).toContain("commitJigsawPlacementAction(historyRef.current, before, after)");
    expect((source.match(/settleJigsawDropStack\(/g) ?? []).length).toBe(2);
    expect(source).toContain("const settleJigsawDropStack = (");
    expect(source).toContain("getJigsawComponentPieceIds(before.assembly, keyboardPieceId)");
  });
});
