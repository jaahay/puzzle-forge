import type { SolitaireVariation } from "../catalog/types";
import {
  solitaireDrawModeLabels,
  solitaireRedealLimitLabels,
  solitaireWasteModeLabels,
} from "../games/solitaire/variation";
import { NewPuzzleCommand } from "./NewPuzzleCommand";
import { SolitaireSettings } from "./SolitaireSettings";

type SolitaireNewPuzzleControlProps = {
  currentSeed: string;
  variation: SolitaireVariation;
  seedLoadInput: string;
  disabled: boolean;
  onVariationChange: (variation: SolitaireVariation) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

export const getSolitaireConfigurationSummary = (variation: SolitaireVariation) => [
  solitaireDrawModeLabels[variation.drawMode],
  solitaireRedealLimitLabels[String(variation.redeals)],
  solitaireWasteModeLabels[variation.wasteMode],
].join(" · ");

export const SolitaireNewPuzzleControl = ({
  currentSeed,
  variation,
  seedLoadInput,
  disabled,
  onVariationChange,
  onSeedLoadInputChange,
  onNewPuzzle,
  onToday,
  onLoadSeed,
}: SolitaireNewPuzzleControlProps) => {
  const configurationSummary = getSolitaireConfigurationSummary(variation);

  return (
    <NewPuzzleCommand
      puzzleTitle="Solitaire"
      currentSeed={currentSeed}
      configurationSummary={configurationSummary}
      seedLoadInput={seedLoadInput}
      disabled={disabled}
      onSeedLoadInputChange={onSeedLoadInputChange}
      onNewPuzzle={onNewPuzzle}
      onToday={onToday}
      onLoadSeed={onLoadSeed}
      info={(
        <>
          <p>Draw, redeal, and waste rules configure the next deal only. Changing them here does not alter the deal currently being played.</p>
          <p>Random, Today, and ordinary seed loads all use the selected rules.</p>
        </>
      )}
      settings={<SolitaireSettings variation={variation} onVariationChange={onVariationChange} />}
    />
  );
};
