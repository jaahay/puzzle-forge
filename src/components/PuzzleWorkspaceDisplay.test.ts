import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { attemptWorkspaceFullscreen } from "./PuzzleWorkspaceLayout";

const fakeWorkspace = (requestFullscreen = vi.fn(async () => undefined)) =>
  ({ requestFullscreen } as unknown as Element);

describe("workspace fullscreen transitions", () => {
  it("requests fullscreen on the existing workspace and only exits its own fullscreen", async () => {
    const request = vi.fn(async () => undefined);
    const workspace = fakeWorkspace(request);
    const exit = vi.fn(async () => undefined);
    expect(await attemptWorkspaceFullscreen(workspace, { fullscreenElement: null, exitFullscreen: exit })).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(exit).not.toHaveBeenCalled();
    expect(await attemptWorkspaceFullscreen(workspace, { fullscreenElement: workspace, exitFullscreen: exit })).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("does not disturb a different fullscreen owner", async () => {
    const request = vi.fn(async () => undefined);
    const workspace = fakeWorkspace(request);
    const exit = vi.fn(async () => undefined);
    expect(await attemptWorkspaceFullscreen(workspace, { fullscreenElement: fakeWorkspace(), exitFullscreen: exit })).toBe(false);
    expect(request).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it("treats both request and exit rejection as recoverable outcomes", async () => {
    const failure = vi.fn(async () => { throw new Error("Browser denied fullscreen"); });
    const workspace = fakeWorkspace(failure);
    const exit = vi.fn(async () => { throw new Error("Browser denied exit"); });
    expect(await attemptWorkspaceFullscreen(workspace, { fullscreenElement: null, exitFullscreen: exit })).toBe(false);
    expect(await attemptWorkspaceFullscreen(workspace, { fullscreenElement: workspace, exitFullscreen: exit })).toBe(false);
    expect(failure).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });
});

describe("universal workspace display composition", () => {
  const read = (file: string) => readFileSync(new URL(file, import.meta.url), "utf8");
  const layout = read("./PuzzleWorkspaceLayout.tsx");
  const header = read("./CurrentPuzzleIdentity.tsx");
  const css = read("../site/immersive.css");
  const workspaces = ["Sudoku", "GridPuzzle", "Solitaire", "ImageTilePuzzle", "Jigsaw", "WordSearch", "Crossword"];

  it.each(workspaces)("uses the shared crown/display owner in %s without opt-in or bespoke mode controls", name => {
    const source = read(`./${name}Workspace.tsx`);
    expect(source).toContain("<PuzzleWorkspaceLayout");
    expect(source).toContain("crown=");
    expect(source).toContain("<CurrentPuzzleHeader");
    expect(source).not.toContain("enableImmersive");
    expect(source).not.toContain("immersiveFullscreenControl");
  });

  it("places a single display action group next to existing New and Share actions", () => {
    expect(header).toMatch(/<PuzzleShareButton[\s\S]*?\{newPuzzleControl\}[\s\S]*?<PuzzleWorkspaceDisplayControls \/>/);
    expect(layout).not.toContain("PuzzleShareButton");
    expect(layout).toContain('mode.isExpanded && mode.fullscreenAvailable');
    expect(layout).toContain('class="workspace-expand-action"');
  });

  it("retains gameplay and completion controls and suppresses ordinary navigation only", () => {
    expect(layout).toContain('!play && gameplay ? <section');
    expect(css).not.toContain(".is-immersive .workspace-layout-gameplay");
    expect(css).not.toContain(".is-immersive .workspace-layout-status");
    expect(css).toMatch(/\.app-shell:has\(\.puzzle-workspace-layout\.is-immersive\) > \.app-header\s*\{\s*visibility: hidden;/);
    expect(css).toContain("position: sticky;");
  });

  it("defers Escape to active fullscreen, modal dialogs and puzzle menus", () => {
    expect(layout).toContain("document.fullscreenElement || transitionRef.current");
    expect(layout).toContain("event.defaultPrevented || isPuzzleModalOpen()");
    expect(layout).toContain(".new-puzzle-options[open], .jigsaw-tools-toggle");
    expect(layout).toContain('querySelector<HTMLElement>(".workspace-expand-action")?.focus()');
  });

  it("preserves the numeric selection and restores play focus only for mouse activation", () => {
    const numeric = read("./NumericGridInput.tsx");
    expect(numeric).toContain('target.closest(`${gridSelectionScopeSelector}, .puzzle-workspace-display-tools`)');
    expect(layout).toContain('event.detail > 0 && mouseActivation.current');
    expect(layout).toContain('event.pointerType === "mouse"');
    expect(layout).toContain('origin.closest(".workspace-layout-play-surface")');
    expect(layout).toContain('!origin.closest("[inert]")');
    expect(layout).toContain('document.activeElement !== trigger');
    expect(layout).toContain('focus({ preventScroll: true })');
    expect(css).toContain('scroll-padding-block-start: calc(var(--workspace-crown-height');
  });

  it("provides wide reference-list layouts and touch input without a fullscreen-only composition", () => {
    const wordSearch = read("../site/word-search.css");
    const crossword = read("../site/crossword.css");
    const wordGuess = read("../site/word-guess.css");
    expect(wordSearch).toContain("@container (min-width: 40rem)");
    expect(wordSearch).toContain("grid-template-columns: minmax(0, var(--word-search-board-limit)) minmax(9rem, 1fr)");
    expect(crossword).toContain("@container (min-width: 40rem)");
    expect(read("./CrosswordBoard.tsx")).toContain('class="crossword-active-clue"');
    expect(wordGuess).toContain("@media (any-pointer: coarse)");
    expect(wordGuess).toContain(".word-guess-keyboard { display: grid; }");
    expect(read("./WordGuessGame.tsx")).toContain('"--word-guess-rows": puzzle.height');
    expect(read("../site/numeric-grid.css")).toContain(".futoshiki-workspace .numeric-grid-digit-pad");
  });

  it("keeps Jigsaw reset in its existing tools instead of a separate canvas row", () => {
    expect(read("./TilePuzzlePreview.tsx")).toContain('onClick={onReset} disabled={inputSuspended}>Reset puzzle</button>');
    expect(read("./JigsawWorkspace.tsx")).toContain("onReset={() => resetJigsaw()}");
    expect(read("./JigsawWorkspace.tsx")).not.toContain("gameplay={gameplay}");
  });

  it("keeps generation failures visible in the native fullscreen layer", () => {
    const app = read("../App.tsx");
    expect(app).toContain('class="generation-failure-notice" role="alert"');
    expect(app).toContain("return host ? createPortal(notice, host) : notice;");
  });
});
