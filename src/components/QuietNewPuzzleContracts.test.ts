import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (name: string) => readFileSync(new URL(name, import.meta.url), "utf8");

const commandSource = read("./NewPuzzleCommand.tsx");
const sudokuSource = read("./SudokuNewPuzzleControl.tsx");
const nonogramSource = read("./NonogramNewPuzzleControl.tsx");
const jigsawSource = read("./JigsawNewPuzzleControl.tsx");
const albumSource = read("./ArtworkAlbum.tsx");
const imageTileSource = read("./ImageTileNewPuzzleControl.tsx");
const nextPuzzleCss = read("../site/next-puzzle.css");
const artworkCss = read("../site/artwork-album.css");
const jigsawCss = read("../site/jigsaw.css");

describe("Quiet New Puzzle contracts", () => {
  it("keeps next-puzzle actions visible while moving current-seed reference into opt-in info", () => {
    const infoPanel = commandSource.indexOf('class="new-puzzle-info-panel"');
    const currentSeed = commandSource.indexOf('class="new-puzzle-info-seed"');
    const seedEntry = commandSource.indexOf('class="new-puzzle-seed-entry"');

    expect(infoPanel).toBeGreaterThan(-1);
    expect(currentSeed).toBeGreaterThan(infoPanel);
    expect(seedEntry).toBeGreaterThan(currentSeed);
    expect(commandSource).not.toContain("new-puzzle-seed-stack");
    expect(commandSource).toContain('<span class="new-puzzle-seed-label" aria-hidden="true">Seed</span>');
    expect(sudokuSource).not.toContain("The locked field is the current puzzle's seed");
    expect(nonogramSource).not.toContain("The locked field is the current puzzle's seed");
    expect(nextPuzzleCss).toContain(".new-puzzle-info-seed");
    expect(nextPuzzleCss).toMatch(/\.new-puzzle-info-panel\s*\{[\s\S]*?max-height:[^;]+;[\s\S]*?overflow:\s*auto;/);
  });

  it("treats help as an inline topmost disclosure with coherent focus and close behavior", () => {
    expect(commandSource).toContain("const [infoOpen, setInfoOpen] = useState(false);");
    expect(commandSource).toContain("aria-expanded={infoOpen}");
    expect(commandSource).toContain('class="new-puzzle-operational" hidden={infoOpen}');
    expect(nextPuzzleCss).toContain(".new-puzzle-operational[hidden]");
    expect(commandSource).toContain("if (infoOpen) {");
    expect(commandSource).toContain("closeInfo(true);");
    expect(commandSource).toContain("if (!event.currentTarget.open) {");
    expect(commandSource).not.toContain('<details class="new-puzzle-info">');
    expect(nextPuzzleCss).toMatch(/\.new-puzzle-info\s*\{[\s\S]*?display:\s*grid;/);
    expect(nextPuzzleCss).not.toMatch(/\.new-puzzle-info\s*\{[^}]*position:\s*absolute/);
    expect(nextPuzzleCss).not.toMatch(/\.new-puzzle-info-panel\s*\{[^}]*position:\s*absolute/);
  });

  it("keeps Jigsaw choices operational while putting their explanations behind info", () => {
    expect(jigsawSource).toContain("jigsawCutStyleDescriptions[cutStyle]");
    expect(jigsawSource).toContain("jigsawBoundaryModeDescriptions[boundaryMode]");
    expect(jigsawSource).toContain("jigsawSpecialPiecesModeDescriptions[specialPiecesMode]");
    expect(jigsawSource).not.toContain('class="jigsaw-cut-style-description"');
    expect(jigsawSource).not.toContain('class="jigsaw-special-pieces-description"');
    expect(jigsawSource).not.toContain("jigsawBoundaryModeDescriptions[mode]");
    expect(jigsawSource).toContain("<span>~{jigsawSizeTargetPieces[preset]} pieces</span>");
    expect(jigsawSource).not.toContain("pieces · {dimensions.width} × {dimensions.height}");
    expect(jigsawCss).not.toContain(".jigsaw-cut-style-description");
    expect(jigsawCss).not.toContain(".jigsaw-boundary-option span");
  });

  it("keeps the Custom-grid warning visible because it changes the immediate action", () => {
    expect(jigsawSource).toContain("Grid may stretch pieces");
    expect(jigsawSource).toContain("Adapt grid");
    expect(jigsawSource).toContain('role="status"');
    expect(jigsawSource).toContain('aria-live="polite"');
  });

  it("keeps Nonogram uniqueness selectable without permanent explanatory narration", () => {
    expect(nonogramSource).toContain("<strong>Require exactly one solution</strong>");
    expect(nonogramSource).not.toContain("new-puzzle-uniqueness-copy");
    expect(nonogramSource).not.toContain("Clues are checked before play.");
    expect(nonogramSource).not.toContain("Off — more than one solution may fit the clues.");
    expect(nextPuzzleCss).not.toContain(".new-puzzle-uniqueness-copy");
  });

  it("moves artwork provenance into the deliberately opened album and removes redundant album copy", () => {
    expect(albumSource).toContain("<h2 id={titleId}>Choose artwork</h2>");
    expect(albumSource).toContain('class="artwork-album-credit"');
    expect(albumSource).toContain("selectedAsset.credit.text");
    expect(albumSource).not.toContain("Artwork Album");
    expect(albumSource).not.toContain("eligible bundled artworks");
    expect(albumSource).not.toContain("Starts a new puzzle with a different eligible artwork when possible.");
    expect(albumSource).not.toContain("artwork-control-credit");
    expect(albumSource).not.toContain("asset.orientation");
    expect(albumSource).not.toContain("puzzleTitle:");
    expect(jigsawSource.match(/puzzleTitle="Jigsaw"/g)?.length).toBe(1);
    expect(imageTileSource.match(/puzzleTitle=\{puzzleTitle\}/g)?.length).toBe(1);
    expect(artworkCss).not.toContain(".artwork-control-credit");
    expect(artworkCss).toContain(".artwork-album-credit");
  });
});
