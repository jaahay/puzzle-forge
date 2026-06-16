export type PuzzleId =
  | "sudoku"
  | "nonogram"
  | "wordle"
  | "logic-grid"
  | "kenken"
  | "minesweeper"
  | "slitherlink";

export type PuzzleStatus = "playable" | "prototype" | "planned";

export type PuzzleCategory = "numbers" | "logic" | "word" | "grid";

export type PuzzleDefinition = {
  id: PuzzleId;
  title: string;
  tagline: string;
  description: string;
  category: PuzzleCategory;
  status: PuzzleStatus;
  tags: string[];
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
};

export type PuzzleCellTone = "given" | "empty" | "accent" | "answer" | "hint";

export type PuzzleCell = {
  row: number;
  column: number;
  value: string;
  locked: boolean;
  tone: PuzzleCellTone;
  ariaLabel?: string;
};

export type GeneratedPuzzle = {
  id: string;
  puzzleId: PuzzleId;
  title: string;
  seed: string;
  width: number;
  height: number;
  cells: PuzzleCell[];
  checksum: string;
  createdAt: string;
  notes: string[];
};

export type PuzzleGenerationRequest = {
  requestId: string;
  puzzleId: PuzzleId;
  seed: string;
  width: number;
  height: number;
};

export type PuzzleGenerationResponse =
  | {
      requestId: string;
      puzzle: GeneratedPuzzle;
    }
  | {
      requestId: string;
      error: string;
    };

export type PuzzleGenerator = (request: Omit<PuzzleGenerationRequest, "requestId">) => GeneratedPuzzle;
