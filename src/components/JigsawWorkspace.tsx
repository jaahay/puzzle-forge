import { useState } from "preact/hooks";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import { JigsawNewPuzzleControl } from "./JigsawNewPuzzleControl";
import type { ImageWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { TilePuzzlePreview } from "./TilePuzzlePreview";

export const JigsawWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  puzzle,
  nextPuzzleDraft,
  seedLoadInput,
  statusMessage,
  isGenerating,
  onReset,
  onNextPuzzleDraftChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: ImageWorkspaceProps) => {
  const [resetVersion, setResetVersion] = useState(0);
  const jigsawPuzzle = puzzle?.kind === "tiles" && puzzle.puzzleId === "jigsaw" ? puzzle : null;
  const puzzleArrivalIdentity = jigsawPuzzle ? getPuzzleArrivalIdentity(jigsawPuzzle) : null;
  const isPuzzleArriving = usePuzzleArrival(puzzleArrivalIdentity);

  const resetJigsaw = () => {
    onReset();
    setResetVersion((current) => current + 1);
  };

  const newPuzzleControl = jigsawPuzzle ? (
    <JigsawNewPuzzleControl
      currentSeed={jigsawPuzzle.seed}
      imageId={nextPuzzleDraft.imageId}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      minWidth={selectedDefinition.minWidth}
      maxWidth={selectedDefinition.maxWidth}
      minHeight={selectedDefinition.minHeight}
      maxHeight={selectedDefinition.maxHeight}
      seedLoadInput={seedLoadInput}
      disabled={isGenerating || !selectedPuzzleIsGeneratable}
      onSettingsChange={onNextPuzzleDraftChange}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
    />
  ) : null;
  const crown = jigsawPuzzle ? (
    <CurrentPuzzleHeader
      key={puzzleArrivalIdentity ?? undefined}
      puzzle={jigsawPuzzle}
      newPuzzleControl={newPuzzleControl}
      isArriving={isPuzzleArriving}
    />
  ) : null;

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label="Jigsaw is generating">
      <div class="puzzle-loading-copy"><strong>Generating Jigsaw</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div>
    </section>
  );
  const board = jigsawPuzzle ? (
    <section
      key={puzzleArrivalIdentity ?? undefined}
      class={`puzzle-panel jigsaw-puzzle-panel${isPuzzleArriving ? " puzzle-arrival" : ""}`}
      aria-label="Generated Jigsaw puzzle"
    >
      <TilePuzzlePreview puzzle={jigsawPuzzle} resetVersion={resetVersion} />
      {jigsawPuzzle.notes.length === 0 ? null : (
        <ul class="notes-list">{jigsawPuzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      )}
    </section>
  ) : isGenerating ? loadingBoard : null;

  const gameplay = jigsawPuzzle ? (
    <div class="puzzle-actions">
      <button type="button" onClick={resetJigsaw} disabled={isGenerating}>Reset</button>
    </div>
  ) : null;

  return (
    <PuzzleWorkspaceLayout
      className="jigsaw-workspace"
      crown={crown}
      status={<p class="status-line" aria-live="polite">{statusMessage}</p>}
      board={board}
      gameplay={gameplay}
      enableImmersive
    />
  );
};
