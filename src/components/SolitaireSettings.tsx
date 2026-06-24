import type { SolitaireDrawMode, SolitaireRedealLimit, SolitaireVariation, SolitaireWasteMode } from "../catalog/types";
import {
  solitaireDrawModeLabels,
  solitaireDrawModes,
  solitaireRedealLimitLabels,
  solitaireRedealLimits,
  solitaireWasteModeLabels,
  solitaireWasteModes,
} from "../games/solitaire/variation";

type SolitaireSettingsProps = {
  variation: SolitaireVariation;
  isGenerating: boolean;
  onVariationChange: (variation: SolitaireVariation) => void;
  onGenerate: () => void;
  onRandomize: () => void;
};

const parseRedealLimit = (value: string): SolitaireRedealLimit =>
  value === "unlimited" ? "unlimited" : value === "3" ? 3 : value === "1" ? 1 : 0;

export const SolitaireSettings = ({
  variation,
  isGenerating,
  onVariationChange,
  onGenerate,
  onRandomize,
}: SolitaireSettingsProps) => {
  const updateDrawMode = (drawMode: SolitaireDrawMode) => {
    onVariationChange({ ...variation, drawMode, knownSolvable: false });
  };

  const updateRedeals = (redeals: SolitaireRedealLimit) => {
    onVariationChange({ ...variation, redeals, knownSolvable: false });
  };

  const updateWasteMode = (wasteMode: SolitaireWasteMode) => {
    onVariationChange({ ...variation, wasteMode, knownSolvable: false });
  };

  return (
    <div class="solitaire-settings" aria-label="Solitaire variation settings">
      <label>
        Draw
        <select value={variation.drawMode} onChange={(event) => updateDrawMode(event.currentTarget.value as SolitaireDrawMode)}>
          {solitaireDrawModes.map((drawMode) => (
            <option key={drawMode} value={drawMode}>
              {solitaireDrawModeLabels[drawMode]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Redeals
        <select value={String(variation.redeals)} onChange={(event) => updateRedeals(parseRedealLimit(event.currentTarget.value))}>
          {solitaireRedealLimits.map((redealLimit) => (
            <option key={String(redealLimit)} value={String(redealLimit)}>
              {solitaireRedealLimitLabels[String(redealLimit)]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Waste
        <select value={variation.wasteMode} onChange={(event) => updateWasteMode(event.currentTarget.value as SolitaireWasteMode)}>
          {solitaireWasteModes.map((wasteMode) => (
            <option key={wasteMode} value={wasteMode}>
              {solitaireWasteModeLabels[wasteMode]}
            </option>
          ))}
        </select>
      </label>

      <div class="solitaire-proof-state" aria-label="Solvability verification state">
        <span>Solvability</span>
        <strong>{variation.knownSolvable ? "Verified" : "Not verified"}</strong>
      </div>

      <div class="puzzle-settings-actions solitaire-settings-actions">
        <button type="button" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Use seed"}
        </button>
        <button type="button" onClick={onRandomize} disabled={isGenerating}>
          Random
        </button>
      </div>

      <p class="solitaire-solvability-note">
        Standard waste plays the top card only. Relaxed waste lets any visible waste card move. Random deals are not solver-verified yet.
      </p>
    </div>
  );
};
