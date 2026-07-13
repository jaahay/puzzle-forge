import type { JigsawImageAsset } from "../../catalog/types";

export const jigsawImageAssets = [
  {
    kind: "image",
    id: "aurora-lake",
    title: "Aurora Lake",
    src: "/jigsaw/aurora-lake.svg",
    alt: "A geometric night landscape with an aurora above mountains and a lake.",
    attribution: "Puzzle Forge original artwork",
  },
  {
    kind: "image",
    id: "desert-sunrise",
    title: "Desert Sunrise",
    src: "/jigsaw/desert-sunrise.svg",
    alt: "A geometric sunrise over layered desert mesas and dunes.",
    attribution: "Puzzle Forge original artwork",
  },
] as const satisfies readonly JigsawImageAsset[];

export type JigsawImageAssetId = (typeof jigsawImageAssets)[number]["id"];

export const defaultJigsawImageAsset = jigsawImageAssets[0];

export const getJigsawImageAsset = (imageId: string | undefined): JigsawImageAsset =>
  jigsawImageAssets.find((asset) => asset.id === imageId) ?? defaultJigsawImageAsset;
