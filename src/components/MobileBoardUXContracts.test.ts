import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("mobile board composition", () => {
  it("fits all seven Solitaire tableau columns without required horizontal scrolling", () => {
    const css = read("../site/solitaire.css");
    const mobile = css.slice(css.indexOf("@media (max-width: 700px)"));
    expect(mobile).toContain("grid-template-columns: repeat(7, minmax(0, 1fr));");
    expect(mobile).toContain("overflow-x: visible;");
    expect(mobile).toContain(".tableau-row .card-stack");
    expect(mobile).not.toContain("min-width: 37rem;");
    expect(mobile).not.toContain("min-width: 29rem;");
  });

  it("uses the configured Word Guess column count and exposes Hard mode outside Solver", () => {
    const source = read("./WordGuessGame.tsx");
    const css = read("../site/word-guess.css");
    expect(source).toContain('"--word-guess-columns": puzzle.width');
    expect(css).toContain("grid-template-columns: repeat(var(--word-guess-columns), minmax(0, 1fr));");
    expect(source.indexOf('class="word-guess-hard-mode"')).toBeLessThan(source.indexOf('class="word-guess-solver-details"'));
  });
});
