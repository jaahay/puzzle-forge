import { useState } from "preact/hooks";
import type { JigsawImageAsset, PuzzleDifficulty } from "../catalog/types";
import { getPuzzleImageAssetsFor } from "../games/imageAssets";
import {
  getJigsawDifficultyForDimensions,
  jigsawDifficultyOrder,
  resolveJigsawDifficultyDimensions,
} from "../games/jigsaw/difficulty";
import { getCanonicalDailyGenerationSettings, getCanonicalDailyPuzzleLabel } from "../games/shared/daily";
import { ArtworkAlbum } from "./ArtworkAlbum";
import { ImmediateTopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { ImmediateImageWorkspaceProps } from "./PuzzleWorkspace.types";
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
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
  width,
  height,
  puzzle,
  statusMessage,
  isGenerating,
  onSeedChange,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onGenerate,
  onRandomize,
  onReset,
}: ImmediateImageWorkspaceProps) => {
  const [resetVersion, setResetVersion] = useState(0);
  const jigsawPuzzle = puzzle?.kind === "tiles" && puzzle.puzzleId === "jigsaw" ? puzzle : null;
  const initialPreset: JigsawPresetSelection = jigsawPuzzle
    ? getJigsawDifficultyForDimensions(jigsawPuzzle.asset, width, height) ?? jigsawCustomPreset
    : jigsawCustomPreset;
  const [selectedPreset, setSelectedPreset] = useState<JigsawPresetSelection>(initialPreset);
  const isFixedSize = selectedDefinition.minWidth === selectedDefinition.maxWidth && selectedDefinition.minHeight === selectedDefinition.maxHeight;
  const dailyLabel = jigsawPuzzle ? getCanonicalDailyPuzzleLabel(jigsawPuzzle) : null;
  const generateDailyPuzzle = () => {
    const dailySettings = getCanonicalDailyGenerationSettings("jigsaw");
    const dailyAsset = getPuzzleImageAssetsFor("jigsaw").find((asset) => asset.id === dailySettings.imageId);
    setSelectedPreset(
      dailyAsset
        ? getJigsawDifficultyForDimensions(dailyAsset, dailySettings.width, dailySettings.height) ?? jigsawCustomPreset
        : jigsawCustomPreset,
    );
    onSettingsCommit(dailySettings);
  };
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

  const generation = jigsawPuzzle ? (
    <div class="jigsaw-generation-stack">
      <div class="jigsaw-difficulty-settings" role="group" aria-label="Jigsaw difficulty">
        <div class="jigsaw-difficulty-heading">
          <strong>Difficulty</strong>
          <span>{selectedPreset} · {width} x {height}</span>
        </div>
        <div class="jigsaw-difficulty-options">
          {jigsawDifficultyOrder.map((difficulty) => {
            const dimensions = resolveJigsawDifficultyDimensions(jigsawPuzzle.asset, difficulty);
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

      <ImmediateTopPuzzleConfiguration
        selectedDefinition={selectedDefinition}
        selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
        seedInput={seedInput}
        width={width}
        height={height}
        isFixedSize={isFixedSize}
        isGenerating={isGenerating}
        onWidthChange={selectCustomWidth}
        onHeightChange={selectCustomHeight}
        onSettingsCommit={commitCustomDimensions}
        onToday={generateDailyPuzzle}
        onUseSeed={onGenerate}
        onRandomize={onRandomize}
        onReset={resetJigsaw}
      />
    </div>
  ) : null;

  const loadingBoard = <section class="puzzle-panel puzzle-loading-panel" aria-live="polite" aria-label="Jigsaw is generating"><div class="puzzle-loading-copy"><strong>Generating Jigsaw</strong><span>{statusMessage}</span></div><div class="puzzle-loading-grid" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <span key={index} />)}</div></section>;
  const board = jigsawPuzzle ? (
    <section class="puzzle-panel jigsaw-puzzle-panel" aria-label="Generated Jigsaw puzzle">
      <ArtworkAlbum
        puzzleId="jigsaw"
        puzzleTitle={selectedDefinition.title}
        selectedAsset={jigsawPuzzle.asset}
        disabled={isGenerating}
        onSelectAsset={(asset) => onSettingsCommit(makeJigsawImageSelectionSettings(asset, selectedPreset))}
      />
      <div class="puzzle-meta"><span>{`${jigsawPuzzle.width} x ${jigsawPuzzle.height}`}</span>{dailyLabel ? <span>Daily: {dailyLabel}</span> : null}</div>
      <TilePuzzlePreview puzzle={jigsawPuzzle} resetVersion={resetVersion} />
      {jigsawPuzzle.notes.length === 0 ? null : <ul class="notes-list">{jigsawPuzzle.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
    </section>
  ) : isGenerating ? loadingBoard : null;

  return <PuzzleWorkspaceLayout className="jigsaw-workspace" status={<p class="status-line" aria-live="polite">{statusMessage}</p>} board={board} generation={generation} enableImmersive />;
};
