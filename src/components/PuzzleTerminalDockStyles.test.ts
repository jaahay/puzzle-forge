import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspaceCss = readFileSync(
  new URL("../site/workspace.css", import.meta.url),
  "utf8",
);

const getRuleBody = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return workspaceCss.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
};

describe("PuzzleTerminalDock terminal tones", () => {
  it("keeps failed outcomes visually neutral instead of inheriting solved green", () => {
    const failedDock = getRuleBody(".terminal-failed");
    const failedMark = getRuleBody(".terminal-failed .completion-dock-mark");

    expect(failedDock).toContain("border-color: rgba(148, 163, 184, 0.32);");
    expect(failedDock).toContain("color: #e2e8f0;");
    expect(failedMark).toContain("border-color: rgba(148, 163, 184, 0.48);");
    expect(failedMark).toContain("color: #cbd5e1;");
    expect(failedMark).toContain("background: rgba(51, 65, 85, 0.52);");
  });
});
