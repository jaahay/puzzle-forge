import type { JigsawImageAsset } from "../../catalog/types";

type MetJigsawImageAssetInput = Omit<JigsawImageAsset, "kind" | "files" | "credit"> & {
  creator: string;
  date?: string;
  objectId: number;
};

const makeMetJigsawImageAsset = ({
  id,
  title,
  alt,
  orientation,
  intrinsicWidth,
  intrinsicHeight,
  creator,
  date,
  objectId,
}: MetJigsawImageAssetInput): JigsawImageAsset => ({
  kind: "image",
  id,
  title,
  alt,
  orientation,
  intrinsicWidth,
  intrinsicHeight,
  files: {
    puzzle: `/jigsaw/${id}/puzzle.webp`,
    preview: `/jigsaw/${id}/preview.webp`,
    thumbnail: `/jigsaw/${id}/thumbnail.webp`,
  },
  credit: {
    text: `${creator}, ${title}${date ? `, ${date}` : ""}. The Metropolitan Museum of Art, Open Access.`,
    sourceName: "The Metropolitan Museum of Art",
    sourceRecordUrl: `https://www.metmuseum.org/art/collection/search/${objectId}`,
  },
});

export const jigsawImageCatalog = {
  "wheat-field-cypresses": makeMetJigsawImageAsset({
    id: "wheat-field-cypresses",
    title: "Wheat Field with Cypresses",
    alt: "A golden wheat field beneath swirling clouds, with dark green cypresses rising beside distant blue hills.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1630,
    creator: "Vincent van Gogh",
    date: "1889",
    objectId: 436535,
  }),
  "great-wave": makeMetJigsawImageAsset({
    id: "great-wave",
    title: "The Great Wave",
    alt: "A towering blue wave curls over boats with Mount Fuji visible in the distance.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1377,
    creator: "Katsushika Hokusai",
    date: "ca. 1830–32",
    objectId: 45434,
  }),
  "canal-in-venice": makeMetJigsawImageAsset({
    id: "canal-in-venice",
    title: "A Canal in Venice",
    alt: "A sunlit Venetian canal lined with buildings and boats.",
    orientation: "landscape",
    intrinsicWidth: 1955,
    intrinsicHeight: 1472,
    creator: "Martín Rico y Ortega",
    date: "1879",
    objectId: 437460,
  }),
  "gulf-stream": makeMetJigsawImageAsset({
    id: "gulf-stream",
    title: "The Gulf Stream",
    alt: "A man lies in a damaged boat on rough tropical seas, with sharks nearby and a ship on the horizon.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1264,
    creator: "Winslow Homer",
    date: "1899; reworked by 1906",
    objectId: 11122,
  }),
  cypresses: makeMetJigsawImageAsset({
    id: "cypresses",
    title: "Cypresses",
    alt: "Tall dark cypress trees rise through a swirling green-and-blue landscape beneath a turbulent sky.",
    orientation: "portrait",
    intrinsicWidth: 1476,
    intrinsicHeight: 1861,
    creator: "Vincent van Gogh",
    date: "1889",
    objectId: 437980,
  }),
  roses: makeMetJigsawImageAsset({
    id: "roses",
    title: "Roses",
    alt: "A dense bouquet of pale roses and green leaves fills the canvas.",
    orientation: "portrait",
    intrinsicWidth: 1622,
    intrinsicHeight: 2048,
    creator: "Vincent van Gogh",
    date: "1890",
    objectId: 436534,
  }),
  "view-of-toledo": makeMetJigsawImageAsset({
    id: "view-of-toledo",
    title: "View of Toledo",
    alt: "The city of Toledo rises across a dark green landscape beneath dramatic storm clouds.",
    orientation: "portrait",
    intrinsicWidth: 1820,
    intrinsicHeight: 2048,
    creator: "El Greco",
    date: "ca. 1599–1600",
    objectId: 436575,
  }),
  "merced-river-yosemite": makeMetJigsawImageAsset({
    id: "merced-river-yosemite",
    title: "Merced River, Yosemite Valley",
    alt: "The Merced River winds through Yosemite Valley beneath trees and towering cliffs.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1474,
    creator: "Albert Bierstadt",
    date: "1866",
    objectId: 10150,
  }),
  "canadian-rockies-lake-louise": makeMetJigsawImageAsset({
    id: "canadian-rockies-lake-louise",
    title: "Canadian Rockies (Lake Louise)",
    alt: "A mountain lake reflects the Canadian Rockies beneath a luminous sky.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1415,
    creator: "Albert Bierstadt",
    date: "ca. 1889",
    objectId: 10149,
  }),
  "snowy-gorge": makeMetJigsawImageAsset({
    id: "snowy-gorge",
    title: "Snowy Gorge",
    alt: "A tall, narrow Japanese woodblock view of a steep gorge covered in snow.",
    orientation: "portrait",
    intrinsicWidth: 721,
    intrinsicHeight: 2048,
    creator: "Utagawa Hiroshige",
    objectId: 56683,
  }),
  "carrara-marble-quarries": makeMetJigsawImageAsset({
    id: "carrara-marble-quarries",
    title: "Bringing Down Marble from Carrara",
    alt: "Figures work among the pale marble slopes and quarry roads of Carrara.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1595,
    creator: "John Singer Sargent",
    date: "1911",
    objectId: 12052,
  }),
  "self-portrait-dou": makeMetJigsawImageAsset({
    id: "self-portrait-dou",
    title: "Self-Portrait",
    alt: "A painted self-portrait of Gerrit Dou in seventeenth-century dress.",
    orientation: "portrait",
    intrinsicWidth: 1637,
    intrinsicHeight: 2048,
    creator: "Gerrit Dou",
    date: "ca. 1665",
    objectId: 436210,
  }),
} as const satisfies Record<string, JigsawImageAsset>;

export type JigsawImageAssetId = keyof typeof jigsawImageCatalog;

export const jigsawImageAssets = Object.values(jigsawImageCatalog);
export const defaultJigsawImageAsset = jigsawImageCatalog["wheat-field-cypresses"];

export const getJigsawImageAsset = (imageId: string | undefined): JigsawImageAsset => {
  const asset = imageId ? jigsawImageCatalog[imageId as JigsawImageAssetId] : defaultJigsawImageAsset;

  if (!asset) {
    throw new Error(`Unknown bundled Jigsaw image: ${imageId}`);
  }

  return asset;
};
