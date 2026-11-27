import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("mobile board composition", () => {
  it("fits all seven Solitaire tableau columns without required horizontal scrolling", () => {
    const css = read("../site/solitaire.css");
    const compact = css.slice(css.indexOf("@container solitaire-board (max-width: 58.75rem)"), css.indexOf("@container solitaire-board (max-width: 43.75rem)"));
    expect(compact).toContain("grid-template-columns: repeat(7, minmax(0, 1fr));");
    expect(compact).toContain("overflow-x: visible;");
    expect(compact).toContain(".tableau-row .card-stack");
    expect(compact).not.toContain("min-width: 37rem;");
    expect(compact).not.toContain("min-width: 29rem;");
  });

  it("uses the configured Word Guess column count and exposes Hard mode outside Solver", () => {
    const source = read("./WordGuessGame.tsx");
    const css = read("../site/word-guess.css");
    expect(source).toContain('"--word-guess-columns": puzzle.width');
    expect(css).toContain("grid-template-columns: repeat(var(--word-guess-columns), minmax(0, 1fr));");
    expect(source.indexOf('class="word-guess-hard-mode"')).toBeLessThan(source.indexOf('class="word-guess-solver-details"'));
  });
});
