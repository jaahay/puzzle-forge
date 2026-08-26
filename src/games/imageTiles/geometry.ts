import type { PuzzleImageAsset } from "../../catalog/types";

export type ImageTileCrop = {
  widthPercent: number;
  heightPercent: number;
  leftPercent: number;
  topPercent: number;
};

export const getImageTileCrop = (
  asset: Pick<PuzzleImageAsset, "intrinsicWidth" | "intrinsicHeight">,
  boardWidth: number,
  boardHeight: number,
  row: number,
  column: number,
): ImageTileCrop => {
  const safeBoardWidth = Math.max(1, boardWidth);
  const safeBoardHeight = Math.max(1, boardHeight);
  const sourceAspect = Math.max(1, asset.intrinsicWidth) / Math.max(1, asset.intrinsicHeight);
  const boardAspect = safeBoardWidth / safeBoardHeight;

  const imageHeightUnits = sourceAspect >= boardAspect
    ? safeBoardHeight
    : safeBoardWidth / sourceAspect;
  const imageWidthUnits = sourceAspect >= boardAspect
    ? safeBoardHeight * sourceAspect
    : safeBoardWidth;
  const cropXUnits = (imageWidthUnits - safeBoardWidth) / 2;
  const cropYUnits = (imageHeightUnits - safeBoardHeight) / 2;

  return {
    widthPercent: imageWidthUnits * 100,
    heightPercent: imageHeightUnits * 100,
    leftPercent: -(cropXUnits + column) * 100,
    topPercent: -(cropYUnits + row) * 100,
  };
};
