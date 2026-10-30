import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAbandonmentBackdropClick } from "./AbandonmentDialog";

const source = readFileSync(new URL("./AbandonmentDialog.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

describe("abandonment dialog backdrop cancellation", () => {
  it("accepts a direct backdrop click, never an interior or absent target", () => {
    const backdrop = new EventTarget();
    const dialog = new EventTarget();
    const button = new EventTarget();
    expect(isAbandonmentBackdropClick(backdrop, backdrop)).toBe(true);
    expect(isAbandonmentBackdropClick(dialog, backdrop)).toBe(false);
    expect(isAbandonmentBackdropClick(button, backdrop)).toBe(false);
    expect(isAbandonmentBackdropClick(null, null)).toBe(false);
  });

  it("uses the existing safe cancellation path and retains keyboard dismissal", () => {
    expect(source).toContain("if (isAbandonmentBackdropClick(event.target, event.currentTarget)) onCancel();");
    expect(source).toContain('onPointerDown={(event) => event.stopPropagation()}');
    expect(source).toContain('onClick={onCancel}>Keep playing</button>');
    expect(source).toContain('event.key === "Escape"');
    expect(app).toContain('onCancel={() => setPendingAbandonment(null)}');
  });

  it("keeps New and Reset confirmation behind explicit destructive buttons", () => {
    expect(source).toContain('onClick={onConfirm}');
    expect(source).toContain('{isNew ? "New puzzle" : "Reset"}');
  });
});
