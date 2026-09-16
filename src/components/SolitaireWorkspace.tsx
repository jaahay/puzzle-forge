import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { CurrentPuzzleHeader, getPuzzleArrivalIdentity, usePuzzleArrival } from "./CurrentPuzzleIdentity";
import type { SolitaireWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SolitaireNewPuzzleControl } from "./SolitaireNewPuzzleControl";

export const SolitaireWorkspace = ({
  selectedPuzzleIsGeneratable,
  puzzle,
  nextPuzzleDraft,
  seedLoadInput,
  cardStacks,
  selectedCard,
  solitaireStats,
  statusMessage,
  isGenerating,
  onReset,
  onNextPuzzleDraftChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
  onAutoMoveToFoundations,
  onUndoSolitaire,
  onRedoSolitaire,
  canUndoSolitaire,
  canRedoSolitaire,
  onCardClick,
  onCardDoubleClick,
  onStackClick,
}: SolitaireWorkspaceProps) => {
  const solitairePuzzle = puzzle?.kind === "cards" && puzzle.puzzleId === "klondike-solitaire" ? puzzle : null;
  const puzzleArrivalIdentity = solitairePuzzle ? getPuzzleArrivalIdentity(solitairePuzzle) : null;
  const isPuzzleArriving = usePuzzleArrival(puzzleArrivalIdentity);
  const newPuzzleControl = solitairePuzzle ? (
    <SolitaireNewPuzzleControl
      currentSeed={solitairePuzzle.seed}
      variation={nextPuzzleDraft.solitaireVariation}
      seedLoadInput={seedLoadInput}
      disabled={isGenerating || !selectedPuzzleIsGeneratable}
      onVariationChange={(solitaireVariation) => onNextPuzzleDraftChange({ solitaireVariation })}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
    />
  ) : null;
  const crown = solitairePuzzle ? (
    <CurrentPuzzleHeader
      key={puzzleArrivalIdentity ?? undefined}
      puzzle={solitairePuzzle}
      newPuzzleControl={newPuzzleControl}
      isArriving={isPuzzleArriving}
    />
  ) : null;
  const actionControls = (
    <div class="solitaire-action-row" aria-label="Solitaire controls">
      <button type="button" onClick={onUndoSolitaire} disabled={!canUndoSolitaire} aria-label="Undo Solitaire move" title="Undo">↶</button>
      <button type="button" onClick={onRedoSolitaire} disabled={!canRedoSolitaire} aria-label="Redo Solitaire move" title="Redo">↷</button>
      <button type="button" onClick={onAutoMoveToFoundations} aria-label="Move all currently legal cards to foundations" title="Auto foundation">♣→</button>
      <button type="button" onClick={onReset} disabled={isGenerating}>Reset</button>
    </div>
  );

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label="Klondike Solitaire is generating">
      <div class="puzzle-loading-copy"><strong>Generating Klondike Solitaire</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index} />)}</div>
    </section>
  );

  const board = solitairePuzzle && cardStacks ? (
    <section
      key={puzzleArrivalIdentity ?? undefined}
      class={`puzzle-panel${isPuzzleArriving ? " puzzle-arrival" : ""}`}
      aria-label="Generated puzzle preview"
    >
      <CardPuzzlePreview
        stacks={cardStacks}
        selectedCard={selectedCard}
        stats={solitaireStats}
        toolbar={actionControls}
        variation={solitairePuzzle.solitaireVariation}
        onCardClick={onCardClick}
        onCardDoubleClick={onCardDoubleClick}
        onStackClick={onStackClick}
      />
    </section>
  ) : isGenerating ? loadingBoard : null;

  return (
    <PuzzleWorkspaceLayout
      className="solitaire-workspace"
      crown={crown}
      status={<p class="status-line" aria-live="polite">{statusMessage}</p>}
      board={board}
    />
  );
};
