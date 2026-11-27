import { useState } from "preact/hooks";
import { solvedTerminalState } from "../app/puzzleTerminalState";
import { canMoveCrosswordHistory, isCrosswordComplete, type CrosswordHistoryAction, type CrosswordProgress } from "../games/crossword/progress";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import { CrosswordBoard } from "./CrosswordBoard";
import { NewPuzzleCommand } from "./NewPuzzleCommand";
import { PuzzleHistoryActions } from "./PuzzleHistoryActions";
import { isPuzzleModalOpen } from "../interactions/keyboardOwnership";
import { PuzzleTerminalDock } from "./PuzzleTerminalDock";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import type { ImageWorkspaceProps } from "./PuzzleWorkspace.types";
import { usePuzzleCompletionPresentation } from "./usePuzzleCompletionPresentation";

export const CrosswordWorkspace = ({
  puzzle, crosswordProgress, onCrosswordProgressChange, canMoveCrosswordHistoryNow, onCrosswordHistory, seedLoadInput,
  selectedPuzzleIsGeneratable, statusMessage, isGenerating, onReset,
  onSeedLoadInputChange, onNewPuzzle, onToday, onLoadSeed,
}: ImageWorkspaceProps) => {
  const board = puzzle?.kind === "crossword" ? puzzle : null;
  const progress = board && crosswordProgress?.baselineChecksum === board.checksum ? crosswordProgress : null;
  const [resetVersion, setResetVersion] = useState(0);
  const [checkedProgress, setCheckedProgress] = useState<CrosswordProgress | null>(null);
  const checked = Boolean(progress && checkedProgress === progress);
  const solved = Boolean(board && progress && isCrosswordComplete(board, progress));
  const arrivalIdentity = board ? getPuzzleArrivalIdentity(board) : null;
  const isArriving = usePuzzleArrival(arrivalIdentity);
  const completion = usePuzzleCompletionPresentation({
    enabled: Boolean(board && progress), identity: arrivalIdentity ?? "crossword:pending", solved,
    trackedKeys: [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"],
  });
  const reset = () => onReset(() => { setCheckedProgress(null); setResetVersion(version => version + 1); });
  const disabled = isGenerating || !selectedPuzzleIsGeneratable;
  const moveHistory = (action: CrosswordHistoryAction) => {
    if (!board || disabled || isPuzzleModalOpen()) return;
    if (onCrosswordHistory?.(board.id, action)) setCheckedProgress(null);
  };
  const historyControl = board && progress ? <PuzzleHistoryActions
    canUndo={canMoveCrosswordHistory(board, progress, "undo")} canRedo={canMoveCrosswordHistory(board, progress, "redo")}
    disabled={disabled || solved}
    canUndoNow={() => !isPuzzleModalOpen() && Boolean(canMoveCrosswordHistoryNow?.(board.id, "undo"))}
    canRedoNow={() => !isPuzzleModalOpen() && Boolean(canMoveCrosswordHistoryNow?.(board.id, "redo"))}
    onUndo={() => moveHistory("undo")} onRedo={() => moveHistory("redo")} /> : null;
  const newControl = <NewPuzzleCommand puzzleTitle="Crossword" currentSeed={board?.seed ?? ""}
    configurationSummary="Mini" seedLoadInput={seedLoadInput} disabled={disabled}
    onSeedLoadInputChange={onSeedLoadInputChange} onNewPuzzle={onNewPuzzle} onToday={onToday} onLoadSeed={onLoadSeed}
    info={<p>Select a clue to set the typing direction, or use Enter or Space on the grid to switch direction. Typing into a blank skips filled letters; typing over an existing letter advances one cell at a time. Entry stops within the selected clue.</p>} />;
  const controls = board && progress ? (
    <div class="completion-control-stage crossword-controls" data-phase={completion.phase}>
      <div class="completion-control-layer completion-control-playing" inert={solved} aria-hidden={solved || undefined}>
        <div class="puzzle-actions">
          <button type="button" disabled={disabled || solved || !/[A-Z]/.test(progress.letters)} onClick={() => setCheckedProgress(progress)}>Check</button>
          <button type="button" disabled={disabled || solved} onClick={reset}>Reset</button>
        </div>
      </div>
      <div class="completion-control-layer completion-control-solved" inert={!solved || completion.phase !== "completed"} aria-hidden={!solved || completion.phase !== "completed"}>
        <PuzzleTerminalDock state={solvedTerminalState} label="Crossword solved" announce={solved && completion.phase === "completed"}
          disabled={disabled || !solved} onReset={reset} onNextPuzzle={() => onNewPuzzle()} />
      </div>
    </div>
  ) : null;
  return <PuzzleWorkspaceLayout className="crossword-workspace"
    crown={board ? <CurrentPuzzleHeader key={arrivalIdentity ?? undefined} puzzle={board} isArriving={isArriving} historyControl={historyControl} newPuzzleControl={newControl} /> : null}
    status={!isGenerating && statusMessage ? <p class="status-line" aria-live="polite">{statusMessage}</p> : null}
    pendingReplacement={isGenerating && Boolean(board && progress)}
    board={board && progress ? <section class={`puzzle-panel crossword-panel${isArriving ? " puzzle-arrival" : ""}`} aria-label="Generated Crossword puzzle" inert={isGenerating}>
      <CrosswordBoard board={board} progress={progress} disabled={disabled} resetVersion={resetVersion} checked={checked} controls={controls} onHistory={moveHistory}
        onProgressChange={next => { if (onCrosswordProgressChange?.(board.id, next)) { setCheckedProgress(null); completion.recordCausativeInput(); } }} />
    </section> : isGenerating ? <section class="puzzle-panel puzzle-loading-panel" aria-label="Crossword is generating" aria-live="polite">
      <div class="puzzle-loading-copy"><strong>Generating Crossword</strong></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
    </section> : null}
    playColumnMax={860} />;
};
