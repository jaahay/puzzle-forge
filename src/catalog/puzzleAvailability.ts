import { isGeneratable, puzzleCatalog } from "./puzzleCatalog";
import type { PuzzleDefinition } from "./types";

export type PuzzleAvailability = {
  readyPuzzles: PuzzleDefinition[];
  previewPuzzles: PuzzleDefinition[];
  plannedPuzzles: PuzzleDefinition[];
  generatablePuzzles: PuzzleDefinition[];
};

export const getPuzzleAvailability = (catalog = puzzleCatalog): PuzzleAvailability => ({
  readyPuzzles: catalog.filter((definition) => definition.status === "playable"),
  previewPuzzles: catalog.filter((definition) => definition.status === "prototype"),
  plannedPuzzles: catalog.filter((definition) => definition.status === "planned"),
  generatablePuzzles: catalog.filter(isGeneratable),
});
