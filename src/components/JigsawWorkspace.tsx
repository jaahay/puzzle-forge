import { useState } from "preact/hooks";
import type { JigsawImageAsset, PuzzleDifficulty } from "../catalog/types";
import {
  getJigsawDifficultyForDimensions,
  jigsawDifficultyOrder,
  resolveJigsawDifficultyDimensions,
} from "../games/jigsaw/difficulty";
import { jigsawImageAssets } from "../games/jigsaw/imageAssets";
import { getDailyPuzzleLabel, getDailyPuzzleSeed } from "../games/shared/daily";
import { TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { TilePuzzlePreview } from "./TilePuzzlePreview";

export const jigsawCustomPreset = "Custom" as const;
export type JigsawPresetSelection = PuzzleDifficulty | typeof jigsawCustomPreset;

export const makeJigsawImageSelectionSettings = (
  asset: JigsawImageAsset,
  preset: JigsawPresetSelection,
) => {
  if (preset === jigsawCustomPreset) {
    return { imageId: asset.id };
  }

  const dimensions = resolveJigsawDifficultyDimensions(asset, preset);
  return {
    imageId: asset.id,
    width: dimensions.width,
    height: dimensions.height,
  };
};

export const JigsawWorkspace = ({
  selectedDefinition, selectedPuzzleIsGeneratable, seed, width, height, puzzle,
  solitaireVariation, statusMessage, isGenerating, onSeedChange, onWidthChange,
  onHeightChange, onSettingsCommit, onGenerate, onRandomize, onReset,
  onSolitaireVariationChange,
}: PuzzleWorkspaceProps) => {
  const [resetVersion, setResetVersion] = useState(0);
  const initialPreset: JigsawPresetSelection = puzzle?.kind === "tiles"
    ? getJigsawDifficultyForDimensions(puzzle.asset, width, height) ?? jigsawCustomPreset
    : jigsawCustomPreset;
  const [selectedPreset, setSelectedPreset] = useState<JigsawPresetSelection>(initialPreset);
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const dailyLabel = puzzle ? getDailyPuzzleLabel(puzzle.puzzleId, puzzle.seed) : null;
  const generateDailyPuzzle = () => onSettingsCommit({ seed: getDailyPuzzleSeed("jigsaw"), width, height });
  const resetJigsaw = () => {
    onReset();
    setResetVersion((current) => current + 1);
  };
  const selectCustomWidth = (nextWidth: number) => {
    setSelectedPreset(jigsawCustomPreset);
    onWidthChange(nextWidth);
  };
  const selectCustomHeight = (nextHeight: number) => {
    setSelectedPreset(jigsawCustomPreset);
    onHeightChange(nextHeight);
  };
  const commitCustomDimensions = (settings?: { width?: number; height?: number }) => {
    setSelectedPreset(jigsawCustomPreset);
    onSettingsCommit(settings);
  };
  const seedInput = <SeedControl seed={seed} onSeedChange={onSeedChange} onSeedCommit={(nextSeed) => onSettingsCommit({ seed: nextSeed })} />;

  const generation = puzzle?.kind === "tiles" ? (
    <div class="jigsaw-generation-stack">
      <div class="jigsaw-difficulty-settings" role="group" aria-label="Jigsaw difficulty">
        <div class="jigsaw-difficulty-heading">
          <strong>Difficulty</strong>
          <span>{selectedPreset} · {width} x {height}</span>
        </div>
        <div class="jigsaw-difficulty-options">
          {jigsawDifficultyOrder.map((difficulty) => {
            const dimensions = resolveJigsawDifficultyDimensions(puzzle.asset, difficulty);
            return (
              <button
                type="button"
                class="jigsaw-difficulty-option"
                aria-pressed={selectedPreset === difficulty}
                disabled={isGenerating}
                onClick={() => {
                  setSelectedPreset(difficulty);
                  onSettingsCommit({ width: dimensions.width, height: dimensions.height });
                }}
                key={difficulty}
              >
                <strong>{difficulty}</strong>
                <span>{dimensions.width} x {dimensions.height} · {dimensions.pieceCount}</span>
              </button>
            );
          })}
        </div>
      </div>

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
        onWidthChange={selectCustomWidth}
        onHeightChange={selectCustomHeight}
        onSettingsCommit={commitCustomDimensions}
        onSolitaireVariationChange={onSolitaireVariationChange}
        onToday={generateDailyPuzzle}
        onUseSeed={onGenerate}
        onRandomize={onRandomize}
        onReset={resetJigsaw}
      />
    </div>
  ) : null;

  const loadingBoard = <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label="Jigsaw is generating"><div class="puzzle-loading-copy"><strong>Generating Jigsaw</strong><span>{statusMessage}</span></div><div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div></section>;
  const board = puzzle?.kind === "tiles" ? (
    <section class="puzzle-panel jigsaw-puzzle-panel" aria-label="Generated Jigsaw puzzle">
      <div class="jigsaw-image-library" role="group" aria-label="Jigsaw image library">
        <div class="jigsaw-image-library-heading">
          <strong>Image library</strong>
          <span>{jigsawImageAssets.length} bundled</span>
        </div>
        <div class="jigsaw-image-library-grid">
          {jigsawImageAssets.map((asset) => {
            const selected = puzzle.asset.id === asset.id;
            return (
              <button
                class="jigsaw-image-option"
                type="button"
                aria-pressed={selected}
                disabled={isGenerating}
                onClick={() => {
                  if (!selected) {
                    onSettingsCommit(makeJigsawImageSelectionSettings(asset, selectedPreset));
                  }
                }}
                key={asset.id}
              >
                <img
                  src={asset.files.thumbnail}
                  alt=""
                  style={{ objectFit: "contain", background: "rgba(2, 6, 23, 0.35)" }}
                />
                <span>{asset.title}</span>
              </button>
            );
          })}
        </div>
        <p class="jigsaw-image-credit">
          {puzzle.asset.credit.text}
          {puzzle.asset.credit.sourceRecordUrl ? (
            <> <a href={puzzle.asset.credit.sourceRecordUrl} target="_blank" rel="noreferrer">Source</a></>
          ) : null}
        </p>
      </div>
      <div class="puzzle-meta"><span>{`${puzzle.width} x ${puzzle.height}`}</span>{dailyLabel ? <span>Daily: {dailyLabel}</span> : null}</div>
      <TilePuzzlePreview puzzle={puzzle} resetVersion={resetVersion} />
      {puzzle.notes.length === 0 ? null : <ul class="notes-list">{puzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
    </section>
  ) : isGenerating ? loadingBoard : null;

  return <PuzzleWorkspaceLayout className="jigsaw-workspace" status={<p class="status-line" aria-live="polite">{statusMessage}</p>} board={board} generation={generation} enableImmersive />;
};
