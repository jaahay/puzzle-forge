// Editorial theme membership is sense-specific, not Word Guess answer eligibility.
const themeWords = (words: string) => words.split(" ").sort();

const themes = {
  animals: {
    title: "Animals",
    words: themeWords("BEAR BISON CAMEL CHEETAH COUGAR COYOTE DEER DOLPHIN EAGLE FERRET FROG GIRAFFE GOPHER HAMSTER HORSE JAGUAR KOALA LEMUR LEOPARD LION LLAMA LYNX MONKEY MOOSE OTTER PANDA PARROT PENGUIN RABBIT RACCOON SEAL SHARK SKUNK SLOTH TIGER TURTLE WHALE WOLF ZEBRA"),
  },
  garden: {
    title: "Garden",
    words: themeWords("ALOE ASTER BASIL BEANS BIRCH BLOOM BULB CACTUS CARROT CEDAR CLOVER DAISY FERN GARLIC HERBS HOLLY VINES LAVENDER LEAF LILAC LOTUS MAPLE MINT MOSS OLIVE ONION ORCHID PANSY PEONY PETAL POPPY RADISH ROOT ROSE SAGE SEED SHRUB SOIL SPROUT STEM THYME TULIP"),
  },
  kitchen: {
    title: "Kitchen",
    words: themeWords("APRON BASIN BOWL BREAD BUTTER CHEESE CHOP COLANDER COOKIE CREAM CUPBOARD FLOUR FORK FRIDGE GRATER KETTLE KNIFE LADLE LEMON MIXER MUFFIN NOODLE OVEN PEPPER PLATE POTATO RECIPE SALAD SAUCE SKILLET SPATULA SPICE SPOON STOVE SUGAR TOAST TOMATO TRAY WHISK"),
  },
  space: {
    title: "Space",
    words: themeWords("ASTEROID ASTRONAUT COMET COSMOS CRATER EARTH ECLIPSE GALAXY GRAVITY JUPITER LUNAR MARS MERCURY METEOR MOON NEBULA NEPTUNE ORBIT PLANET PLASMA PROBE QUASAR ROCKET SATELLITE SATURN SOLAR SPACE STAR SUNLIGHT TELESCOPE URANUS VENUS VACUUM ZENITH"),
  },
  ocean: {
    title: "Ocean",
    words: themeWords("ANCHOR BEACH BOAT BUOY CANOE COAST CORAL CRAB CURRENT DELTA DOLPHIN DUNE FERRY FISH FOAM HARBOR ISLAND JELLYFISH KELP LAGOON MARINA MAST MUSSEL OCEAN OYSTER PIER REEF SAIL SAND SEAL SHELL SHORE SHRIMP SQUID SURF TIDE WAVE WHALE YACHT"),
  },
  music: {
    title: "Music",
    words: themeWords("ALBUM ALTO BALLAD BANJO BASS BEAT CELLO CHOIR CHORD CLARINET CYMBAL DRUM DUET FLUTE GENRE GUITAR HARP HORN HYMN JAZZ LYRIC MELODY NOTE ORGAN PIANO PITCH RHYTHM SCALE SCORE SONG SOUND TEMPO TENOR TONE TRUMPET TUBA VIOLA VIOLIN WALTZ"),
  },
} as const;

export type WordSearchTheme = "mixed" | keyof typeof themes;

export const wordSearchThemeIds: readonly WordSearchTheme[] = [
  "mixed", "animals", "garden", "kitchen", "space", "ocean", "music",
];

export const defaultWordSearchTheme: WordSearchTheme = "mixed";
export const isWordSearchTheme = (value: unknown): value is WordSearchTheme =>
  typeof value === "string" && wordSearchThemeIds.includes(value as WordSearchTheme);

// Named planets are familiar, intentional theme entries even when excluded
// by the spelling corpus's lower-case-only Word Guess policy.
export const wordSearchNamedTerms = ["JUPITER", "NEPTUNE", "SATURN", "URANUS", "VENUS"] as const;

const mixed = {
  title: "Mixed",
  words: [...new Set(Object.values(themes).flatMap(theme => theme.words))].sort(),
};

export const getWordSearchTheme = (id: WordSearchTheme): { title: string; words: readonly string[] } => {
  if (id === "mixed") return mixed;
  const theme = themes[id];
  if (!theme) throw new Error("Unknown Word Search theme.");
  return theme;
};
