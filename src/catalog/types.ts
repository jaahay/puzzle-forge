export type PuzzleId =
  | "sudoku"
  | "nonogram"
  | "word-guess"
  | "logic-grid"
  | "klondike-solitaire"
  | "peg-solitaire"
  | "kenken"
  | "minesweeper"
  | "slitherlink";

export type PuzzleStatus = "playable" | "prototype" | "planned";

export type PuzzleCategory = "numbers" | "logic" | "word" | "grid" | "cards";

export type PuzzleDifficulty = "Easy" | "Medium" | "Hard" | "Expert";

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

export type PuzzleCellTone = "given" | "empty" | "accent" | "answer" | "hint" | "disabled";

export type PuzzleCell = {
  row: number;
  column: number;
  value: string;
  locked: boolean;
  tone: PuzzleCellTone;
  ariaLabel?: string;
};

export type GridPuzzleClues = {
  rows?: number[][];
  columns?: number[][];
};

export type CardSuit = "clubs" | "diamonds" | "hearts" | "spades";

export type CardRank =
  | "ace"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "jack"
  | "queen"
  | "king";

export type CardColor = "red" | "black";

export type PlayingCard = {
  suit: CardSuit;
  rank: CardRank;
  code: string;
  color: CardColor;
  label: string;
  faceUp: boolean;
};

export type CardStackRole = "stock" | "waste" | "foundation" | "tableau";

export type CardStack = {
  id: string;
  title: string;
  role: CardStackRole;
  cards: PlayingCard[];
  faceDownCount?: number;
};

type BaseGeneratedPuzzle = {
  id: string;
  puzzleId: PuzzleId;
  title: string;
  seed: string;
  width: number;
  height: number;
  checksum: string;
  createdAt: string;
  difficulty?: PuzzleDifficulty;
  uniqueSolution?: boolean;
  notes: string[];
};

export type GridGeneratedPuzzle = BaseGeneratedPuzzle & {
  kind: "grid";
  cells: PuzzleCell[];
  answerKey?: string[];
  clues?: GridPuzzleClues;
};

export type CardGeneratedPuzzle = BaseGeneratedPuzzle & {
  kind: "cards";
  stacks: CardStack[];
};

export type GeneratedPuzzle = GridGeneratedPuzzle | CardGeneratedPuzzle;

export type PuzzleGenerationParams = {
  puzzleId: PuzzleId;
  seed: string;
  width: number;
  height: number;
  difficulty?: PuzzleDifficulty;
  requireUniqueSolution?: boolean;
};

export type PuzzleGenerationRequest = {
  requestId: string;
} & PuzzleGenerationParams;

export type PuzzleGenerationResponse =
  | {
      requestId: string;
      puzzle: GeneratedPuzzle;
    }
  | {
      requestId: string;
      error: string;
    };

export type GridPuzzleGenerator = (params: PuzzleGenerationParams) => GridGeneratedPuzzle;

export type CardPuzzleGenerator = (params: PuzzleGenerationParams) => CardGeneratedPuzzle;

export type PuzzleGenerator = GridPuzzleGenerator | CardPuzzleGenerator;
