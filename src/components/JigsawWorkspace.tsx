import { useState } from "preact/hooks";
import { getDailyPuzzleLabel, getDailyPuzzleSeed } from "../games/shared/daily";
import { TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { TilePuzzlePreview } from "./TilePuzzlePreview";

export const JigsawWorkspace = ({
  selectedDefinition, selectedPuzzleIsGeneratable, seed, width, height, puzzle,
  solitaireVariation, statusMessage, isGenerating, onSeedChange, onWidthChange,
  onHeightChange, onSettingsCommit, onGenerate, onRandomize, onReset,
  onSolitaireVariationChange,
}: PuzzleWorkspaceProps) => {
  const [resetVersion, setResetVersion] = useState(0);
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const dailyLabel = puzzle ? getDailyPuzzleLabel(puzzle.puzzleId, puzzle.seed) : null;
  const generateDailyPuzzle = () => onSettingsCommit({ seed: getDailyPuzzleSeed("jigsaw"), width, height });
  const resetJigsaw = () => {
    onReset();
    setResetVersion((current) => current + 1);
  };
  const seedInput = <SeedControl seed={seed} onSeedChange={onSeedChange} onSeedCommit={(nextSeed) => onSettingsCommit({ seed: nextSeed })} />;

  const generation = puzzle ? (
    <TopPuzzleConfiguration
      selectedDefinition={selectedDefinition}
      selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
      seedInput={seedInput}
      width={width}
      height={height}
      solitaireVariation={solitaireVariation}
      isFixedSize={isFixedSize}
      isGenerating={isGenerating}
      isSolitaire={false}
      onWidthChange={onWidthChange}
      onHeightChange={onHeightChange}
      onSettingsCommit={onSettingsCommit}
      onSolitaireVariationChange={onSolitaireVariationChange}
      onToday={generateDailyPuzzle}
      onUseSeed={onGenerate}
      onRandomize={onRandomize}
      onReset={resetJigsaw}
    />
  ) : null;

  const loadingBoard = <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label="Jigsaw is generating"><div class="puzzle-loading-copy"><strong>Generating Jigsaw</strong><span>{statusMessage}</span></div><div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div></section>;
  const board = puzzle?.kind === "tiles" ? (
    <section class="puzzle-panel jigsaw-puzzle-panel" aria-label="Generated Jigsaw puzzle">
      <div class="puzzle-meta"><span>{`${puzzle.width} x ${puzzle.height}`}</span>{dailyLabel ? <span>Daily: {dailyLabel}</span> : null}</div>
      <TilePuzzlePreview puzzle={puzzle} resetVersion={resetVersion} />
      {puzzle.notes.length === 0 ? null : <ul class="notes-list">{puzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
    </section>
  ) : isGenerating ? loadingBoard : null;

  return <PuzzleWorkspaceLayout className="jigsaw-workspace" status={<p class="status-line" aria-live="polite">{statusMessage}</p>} board={board} generation={generation} />;
};
