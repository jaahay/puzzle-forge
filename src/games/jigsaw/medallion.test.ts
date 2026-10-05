import { describe, expect, it } from "vitest";
import { defaultJigsawImageAsset } from "./imageAssets";
import { deriveJigsawMedallionGeometry } from "./medallion";
import { getJigsawPieceAspectRatio } from "./size";

describe("Jigsaw medallion geometry", () => {
  it("keeps the medallion circular in world space for non-square grid cells", () => {
    const geometry = deriveJigsawMedallionGeometry(
      6,
      4,
      defaultJigsawImageAsset,
    );
    expect(geometry).not.toBeNull();
    if (!geometry) return;

    const pieceAspectRatio = getJigsawPieceAspectRatio(
      defaultJigsawImageAsset,
      6,
      4,
    );
    expect(geometry.radiusX * pieceAspectRatio).toBeCloseTo(
      geometry.radiusY,
      2,
    );
  });

  it("declines topology when the board or piece aspect is not safely qualifying", () => {
    expect(deriveJigsawMedallionGeometry(
      3,
      6,
      defaultJigsawImageAsset,
    )).toBeNull();

    expect(deriveJigsawMedallionGeometry(
      32,
      4,
      defaultJigsawImageAsset,
    )).toBeNull();
  });
});
