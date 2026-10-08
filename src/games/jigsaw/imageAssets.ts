import type { JigsawImageAsset } from "../../catalog/types";

type JigsawImageAssetInput = Omit<JigsawImageAsset, "kind" | "files" | "credit"> & {
  creator: string;
  date?: string;
  sourceName: string;
  sourceRecordUrl: string;
  sourceQualifier: string;
};

const makeJigsawImageAsset = ({
  id,
  title,
  alt,
  orientation,
  intrinsicWidth,
  intrinsicHeight,
  creator,
  date,
  sourceName,
  sourceRecordUrl,
  sourceQualifier,
}: JigsawImageAssetInput): JigsawImageAsset => ({
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
    text: `${creator}, ${title}${date ? `, ${date}` : ""}. ${sourceName}, ${sourceQualifier}.`,
    sourceName,
    sourceRecordUrl,
  },
});

type MetJigsawImageAssetInput = Omit<
  JigsawImageAssetInput,
  "sourceName" | "sourceRecordUrl" | "sourceQualifier"
> & {
  objectId: number;
};

const makeMetJigsawImageAsset = ({ objectId, ...input }: MetJigsawImageAssetInput): JigsawImageAsset =>
  makeJigsawImageAsset({
    ...input,
    sourceName: "The Metropolitan Museum of Art",
    sourceRecordUrl: `https://www.metmuseum.org/art/collection/search/${objectId}`,
    sourceQualifier: "Open Access",
  });

type ArticJigsawImageAssetInput = Omit<
  JigsawImageAssetInput,
  "sourceName" | "sourceRecordUrl" | "sourceQualifier"
> & {
  objectId: number;
};

const makeArticJigsawImageAsset = ({ objectId, ...input }: ArticJigsawImageAssetInput): JigsawImageAsset =>
  makeJigsawImageAsset({
    ...input,
    sourceName: "Art Institute of Chicago",
    sourceRecordUrl: `https://www.artic.edu/artworks/${objectId}`,
    sourceQualifier: "Public Domain",
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
  "young-woman-water-pitcher": makeMetJigsawImageAsset({
    id: "young-woman-water-pitcher",
    title: "Young Woman with a Water Pitcher",
    alt: "A young woman stands beside a window holding a silver water pitcher over a basin, lit by soft daylight.",
    orientation: "portrait",
    intrinsicWidth: 1821,
    intrinsicHeight: 2048,
    creator: "Johannes Vermeer",
    date: "ca. 1662",
    objectId: 437881,
  }),
  "death-of-socrates": makeMetJigsawImageAsset({
    id: "death-of-socrates",
    title: "The Death of Socrates",
    alt: "Socrates sits upright on a bed reaching toward a cup as grieving followers gather around him.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1363,
    creator: "Jacques Louis David",
    date: "1787",
    objectId: 436105,
  }),
  "dancing-class": makeMetJigsawImageAsset({
    id: "dancing-class",
    title: "The Dancing Class",
    alt: "Ballet dancers rehearse in a studio while an instructor stands among figures, mirrors, and pale walls.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1530,
    creator: "Edgar Degas",
    date: "ca. 1870",
    objectId: 436141,
  }),
  "silver-tureen": makeMetJigsawImageAsset({
    id: "silver-tureen",
    title: "The Silver Tureen",
    alt: "A silver tureen, fruit, a hare, and a cat are arranged across a dark still-life table.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1448,
    creator: "Jean Siméon Chardin",
    date: "ca. 1728–30",
    objectId: 435887,
  }),
  "sudden-shower-shin-ohashi": makeMetJigsawImageAsset({
    id: "sudden-shower-shin-ohashi",
    title: "Sudden Shower over Shin-Ōhashi Bridge and Atake",
    alt: "Pedestrians hurry across a bridge in diagonal rain above a dark river beneath a gray-green sky.",
    orientation: "portrait",
    intrinsicWidth: 1406,
    intrinsicHeight: 2048,
    creator: "Utagawa Hiroshige",
    date: "1857",
    objectId: 55433,
  }),
  musicians: makeMetJigsawImageAsset({
    id: "musicians",
    title: "The Musicians",
    alt: "Young musicians cluster around instruments and sheet music in a dark, closely cropped interior.",
    orientation: "landscape",
    intrinsicWidth: 2048,
    intrinsicHeight: 1590,
    creator: "Caravaggio (Michelangelo Merisi)",
    date: "1597",
    objectId: 435844,
  }),
  "unicorn-garden": makeMetJigsawImageAsset({
    id: "unicorn-garden",
    title: "The Unicorn Rests in a Garden",
    alt: "A white unicorn is tethered within a circular fence amid dense flowers, fruit trees, and patterned foliage.",
    orientation: "portrait",
    intrinsicWidth: 1445,
    intrinsicHeight: 2048,
    creator: "Unknown artist",
    date: "1495–1505",
    objectId: 467642,
  }),
  "washington-crossing-delaware": makeMetJigsawImageAsset({
    id: "washington-crossing-delaware",
    title: "Washington Crossing the Delaware",
    alt: "George Washington stands in a crowded boat crossing an icy river as soldiers row beneath a dramatic dawn sky.",
    orientation: "landscape",
    intrinsicWidth: 1937,
    intrinsicHeight: 1135,
    creator: "Emanuel Leutze",
    date: "1851",
    objectId: 11417,
  }),
  "la-grande-jatte": makeArticJigsawImageAsset({
    id: "la-grande-jatte",
    title: "A Sunday on La Grande Jatte — 1884",
    alt: "Figures relax along a sunlit riverbank beneath trees, rendered in dense fields of tiny colored dots.",
    orientation: "landscape",
    intrinsicWidth: 1686,
    intrinsicHeight: 1130,
    creator: "Georges Seurat",
    date: "1884–86; border added 1888–89",
    objectId: 27992,
  }),
  "childs-bath": makeArticJigsawImageAsset({
    id: "childs-bath",
    title: "The Child's Bath",
    alt: "A seated woman gently bathes a child's feet beside a patterned basin, rug, and striped dress.",
    orientation: "portrait",
    intrinsicWidth: 1350,
    intrinsicHeight: 2048,
    creator: "Mary Cassatt",
    date: "1893",
    objectId: 111442,
  }),
  "paris-street-rainy-day": makeArticJigsawImageAsset({
    id: "paris-street-rainy-day",
    title: "Paris Street; Rainy Day",
    alt: "Umbrella-carrying pedestrians cross a broad wet Parisian intersection beneath a pale gray sky.",
    orientation: "landscape",
    intrinsicWidth: 1686,
    intrinsicHeight: 1309,
    creator: "Gustave Caillebotte",
    date: "1877",
    objectId: 20684,
  }),
  "coronation-stone-motecuhzoma": makeArticJigsawImageAsset({
    id: "coronation-stone-motecuhzoma",
    title: "Coronation Stone of Moctezuma Xocoyotzin",
    alt: "A dark carved basalt monument presents dense relief figures and symbols across its rectangular face.",
    orientation: "portrait",
    intrinsicWidth: 1587,
    intrinsicHeight: 2048,
    creator: "Mexica (Aztec), maker unknown",
    date: "ca. 1503",
    objectId: 75644,
  }),
  "embroidered-picture": makeArticJigsawImageAsset({
    id: "embroidered-picture",
    title: "Needlework Picture Depicting the Finding of Moses",
    alt: "A richly embroidered seventeenth-century scene fills the surface with figures, architecture, foliage, and decorative stitching.",
    orientation: "landscape",
    intrinsicWidth: 1686,
    intrinsicHeight: 1319,
    creator: "Unknown maker, England",
    date: "17th century",
    objectId: 9765,
  }),
  "first-of-the-herring": makeArticJigsawImageAsset({
    id: "first-of-the-herring",
    title: "The First of the Herring",
    alt: "A monochrome waterside scene shows fishing boats and figures working beneath a broad luminous sky.",
    orientation: "landscape",
    intrinsicWidth: 1686,
    intrinsicHeight: 1038,
    creator: "Peter Henry Emerson",
    date: "1887",
    objectId: 229759,
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
