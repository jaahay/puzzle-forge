import { describe, expect, it } from "vitest";
import { generateJigsaw } from "./generate";
import { defaultJigsawImageAsset } from "./imageAssets";

const makeJigsaw = (
  jigsawImageId: string = defaultJigsawImageAsset.id,
  jigsawAssetRevision: number = defaultJigsawImageAsset.assetRevision,
) =>
  generateJigsaw({
    puzzleId: "jigsaw",
    seed: "phase-one-seed",
