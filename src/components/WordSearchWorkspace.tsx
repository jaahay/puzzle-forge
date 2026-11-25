import { useState } from "preact/hooks";
import { solvedTerminalState } from "../app/puzzleTerminalState";
import { isWordSearchComplete } from "../games/wordSearch/progress";
import { defaultWordSearchTheme } from "../games/wordSearch/themes";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import { PuzzleTerminalDock } from "./PuzzleTerminalDock";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import type { ImageWorkspaceProps } from "./PuzzleWorkspace.types";
import { WordSearchBoard } from "./WordSearchBoard";
import { WordSearchNewPuzzleControl } from "./WordSearchNewPuzzleControl";
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";

export const WordSearchWorkspace = ({
  puzzle, wordSearchProgress, onWordSearchSelection, nextPuzzleDraft, seedLoadInput,
  selectedPuzzleIsGeneratable, statusMessage, isGenerating, onReset, onNextPuzzleDraftChange,
  onSeedLoadInputChange, onNewPuzzle, onToday, onLoadSeed,
}: ImageWorkspaceProps) => {
  const board = puzzle?.kind === "word-search" ? puzzle : null;
  const progress = board && wordSearchProgress?.baselineChecksum === board.checksum ? wordSearchProgress : null;
  const [resetVersion, setResetVersion] = useState(0);
  const solved = Boolean(board && progress && isWordSearchComplete(board, progress));
  const arrivalIdentity = board ? getPuzzleArrivalIdentity(board) : null;
  const isArriving = usePuzzleArrival(arrivalIdentity);
  const completion = usePuzzleCompletionPresentation({
    enabled: Boolean(board && progress),
    identity: board?.id ?? "word-search:pending",
    solved,
    trackedKeys: ["Enter", " "],
  });
  const reset = () => onReset(() => setResetVersion(version => version + 1));
  const disabled = isGenerating || !selectedPuzzleIsGeneratable;
  const newControl = <WordSearchNewPuzzleControl
    currentSeed={board?.seed ?? ""}
    difficulty={nextPuzzleDraft.difficulty}
    theme={nextPuzzleDraft.wordSearchTheme ?? defaultWordSearchTheme}
    seedLoadInput={seedLoadInput}
    disabled={disabled}
    onDifficultyChange={difficulty => onNextPuzzleDraftChange({ difficulty })}
    onThemeChange={wordSearchTheme => onNextPuzzleDraftChange({ wordSearchTheme })}
    onSeedLoadInputChange={onSeedLoadInputChange}
    onNewPuzzle={onNewPuzzle}
    onToday={onToday}
    onLoadSeed={onLoadSeed}
  />;
  return <PuzzleWorkspaceLayout
    className="word-search-workspace"
    crown={board ? <CurrentPuzzleHeader key={arrivalIdentity ?? undefined} puzzle={board} isArriving={isArriving} newPuzzleControl={newControl} /> : null}
    status={statusMessage ? <p class="status-line" aria-live="polite">{statusMessage}</p> : null}
    board={board && progress ? <section class={`puzzle-panel word-search-panel${isArriving ? " puzzle-arrival" : ""}${completion.phase === "celebrating" ? " word-search-celebrating" : ""}`} aria-label="Generated Word Search puzzle" inert={isGenerating}>
      <WordSearchBoard key={board.id} board={board} progress={progress} disabled={disabled} resetVersion={resetVersion}
        onSelectEndpoints={(start, end) => {
          if (onWordSearchSelection?.(board.id, start, end)) completion.recordCausativeInput();
        }} />
    </section> : isGenerating ? <section class="puzzle-panel puzzle-loading-panel" aria-label="Word Search is generating" aria-live="polite">
      <div class="puzzle-loading-copy"><strong>Generating Word Search</strong></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
    </section> : null}
    gameplay={board && progress ? solved ? completion.phase === "completed" ? <PuzzleTerminalDock state={solvedTerminalState} label="All words found" disabled={disabled} onReset={reset} onNextPuzzle={() => onNewPuzzle()} /> : null
      : <div class="puzzle-actions"><button type="button" disabled={disabled} onClick={reset}>Reset</button></div> : null}
    enableImmersive
    playColumnMax={860}
  />;
};
