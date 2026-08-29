import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { SolitaireSettings } from "./SolitaireSettings";

export const SolitaireWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
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
}: PuzzleWorkspaceProps) => {
  const solitairePuzzle = puzzle?.kind === "cards" && puzzle.puzzleId === "klondike-solitaire" ? puzzle : null;
  const seedInput = (
    <SeedControl
      currentSeed={solitairePuzzle?.seed ?? seed}
      seed={seedLoadInput}
      onSeedChange={onSeedLoadInputChange}
    />
  );
  const actionControls = (
    <div class="solitaire-action-row" aria-label="Solitaire controls">
      <button type="button" onClick={onUndoSolitaire} disabled={!canUndoSolitaire} aria-label="Undo Solitaire move" title="Undo">↶</button>
      <button type="button" onClick={onRedoSolitaire} disabled={!canRedoSolitaire} aria-label="Redo Solitaire move" title="Redo">↷</button>
      <button type="button" onClick={onAutoMoveToFoundations} aria-label="Move all currently legal cards to foundations" title="Auto foundation">♣→</button>
    </div>
  );

  const generation = solitairePuzzle ? (
    <TopPuzzleConfiguration
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={nextPuzzleDraft.width}
      height={nextPuzzleDraft.height}
      isFixedSize={selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight}
      isGenerating={isGenerating}
      className="solitaire-control-panel"
      settings={(
        <SolitaireSettings
          variation={nextPuzzleDraft.solitaireVariation}
          onVariationChange={(solitaireVariation) => onNextPuzzleDraftChange({ solitaireVariation })}
        />
      )}
      onWidthChange={(width) => onNextPuzzleDraftChange({ width })}
      onHeightChange={(height) => onNextPuzzleDraftChange({ height })}
      onSettingsCommit={onNextPuzzleDraftChange}
      onToday={onToday}
      onUseSeed={onLoadSeed}
      onRandomize={onNewPuzzle}
      onReset={onReset}
    />
  ) : null;

  const loadingBoard = (
    <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label="Klondike Solitaire is generating">
      <div class="puzzle-loading-copy"><strong>Generating Klondike Solitaire</strong><span>{statusMessage}</span></div>
      <div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <span key={index} />)}</div>
    </section>
  );

  const board = solitairePuzzle && cardStacks ? (
    <section class="puzzle-panel" aria-label="Generated puzzle preview">
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
      status={<p class="status-line" aria-live="polite">{statusMessage}</p>}
      board={board}
      generation={generation}
    />
  );
};
