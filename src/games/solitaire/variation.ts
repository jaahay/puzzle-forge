import type { SolitaireDrawMode, SolitaireRedealLimit, SolitaireVariation } from "../../catalog/types";

export const solitaireDrawModes: readonly SolitaireDrawMode[] = ["draw-1", "draw-3"];
export const solitaireRedealLimits: readonly SolitaireRedealLimit[] = ["unlimited", 3, 1, 0];

export const defaultSolitaireVariation: SolitaireVariation = {
  drawMode: "draw-1",
  redeals: "unlimited",
  knownSolvable: false,
};

export const solitaireDrawModeLabels: Record<SolitaireDrawMode, string> = {
  "draw-1": "Draw 1",
  "draw-3": "Draw 3",
};

export const solitaireRedealLimitLabels: Record<string, string> = {
  unlimited: "Unlimited redeals",
  "3": "3 redeals",
  "1": "1 redeal",
  "0": "No redeals",
};

export const normalizeSolitaireVariation = (variation?: Partial<SolitaireVariation> | null): SolitaireVariation => {
  const drawMode = variation?.drawMode === "draw-3" ? "draw-3" : defaultSolitaireVariation.drawMode;
  const redeals = solitaireRedealLimits.includes(variation?.redeals as SolitaireRedealLimit)
    ? (variation?.redeals as SolitaireRedealLimit)
    : defaultSolitaireVariation.redeals;

  return {
    drawMode,
    redeals,
    knownSolvable: variation?.knownSolvable === true,
  };
};

export const solitaireVariationsEqual = (left?: Partial<SolitaireVariation> | null, right?: Partial<SolitaireVariation> | null) => {
  const normalizedLeft = normalizeSolitaireVariation(left);
  const normalizedRight = normalizeSolitaireVariation(right);

  return (
    normalizedLeft.drawMode === normalizedRight.drawMode &&
    normalizedLeft.redeals === normalizedRight.redeals &&
    normalizedLeft.knownSolvable === normalizedRight.knownSolvable
  );
};
