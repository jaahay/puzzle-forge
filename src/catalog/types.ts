export type PuzzleId =
  | "sudoku"
  | "nonogram"
  | "word-guess"
  | "logic-grid"
  | "klondike-solitaire"
  | "peg-solitaire"
  | "futoshiki"
  | "kenken"
  | "minesweeper"
  | "jigsaw"
  | "tile-swap"
  | "sliding-puzzle"
  | "slitherlink";

export type ImageTilePuzzleId = "tile-swap" | "sliding-puzzle";
export type ImageBackedPuzzleId = "jigsaw" | ImageTilePuzzleId;

export type PuzzleStatus = "playable" | "prototype" | "planned";

export type PuzzleCategory = "numbers" | "logic" | "word" | "grid" | "cards";

export type PuzzleDifficulty = "Easy" | "Medium" | "Hard" | "Expert";
export type SudokuVariation = "classic" | "diagonal" | "zero-killer";

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

export type GridPuzzleCage = {
  id: string;
  cells: Array<{ row: number; column: number }>;
  sum: number;
};

export type GridPuzzleInequality = {
  lesser: { row: number; column: number };
  greater: { row: number; column: number };
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

export type SolitaireDrawMode = "draw-1" | "draw-3";
export type SolitaireRedealLimit = "unlimited" | 3 | 1 | 0;
export type SolitaireWasteMode = "standard" | "relaxed";

export type SolitaireVariation = {
  drawMode: SolitaireDrawMode;
  redeals: SolitaireRedealLimit;
  wasteMode: SolitaireWasteMode;
  knownSolvable: boolean;
};

export type PuzzleVariationSettings = {
  sudokuVariation?: SudokuVariation;
  solitaireVariation?: SolitaireVariation;
  imageId?: string;
};

export type GeneratedTilePuzzleAsset = {
  id: string;
  title: string;
  kind: "generated";
  palette: string[];
};

export type PuzzleImageAsset = {
  kind: "image";
  id: string;
  title: string;
  alt: string;
  orientation: "landscape" | "portrait" | "square";
  intrinsicWidth: number;
  intrinsicHeight: number;
  eligiblePuzzleIds?: readonly ImageBackedPuzzleId[];
  files: {
    puzzle: string;
    preview: string;
    thumbnail: string;
  };
  credit: {
    text: string;
    sourceName: string;
    sourceRecordUrl?: string;
  };
};

export type JigsawImageAsset = PuzzleImageAsset;
export type TilePuzzleAsset = GeneratedTilePuzzleAsset | PuzzleImageAsset;

export type JigsawEdgeSide = "top" | "right" | "bottom" | "left";
export type JigsawEdgePolarity = "flat" | "tab" | "blank";
export type JigsawEdgePathFamily = "round-tab" | "angular-tab" | "wave-tab";
export type JigsawEdgeProfileId = "classic-round" | "soft-round" | "angular" | "wave" | "simple-lock";

export type JigsawEdgeProfile = {
  id: JigsawEdgeProfileId;
  label: string;
  description: string;
  pathFamily: JigsawEdgePathFamily;
  difficultyWeight: number;
};

type JigsawPieceEdgeBase = {
  edgeId: string;
  side: JigsawEdgeSide;
};

export type JigsawBoundaryEdge = JigsawPieceEdgeBase & {
  boundary: true;
  neighborPieceId: null;
  neighborEdgeId: null;
  profileId: null;
  polarity: "flat";
  seedOffset: 0;
};

export type JigsawInteriorEdge = JigsawPieceEdgeBase & {
  boundary: false;
  neighborPieceId: string;
  neighborEdgeId: string;
  profileId: JigsawEdgeProfileId;
  polarity: Exclude<JigsawEdgePolarity, "flat">;
  seedOffset: number;
};

export type JigsawPieceEdge = JigsawBoundaryEdge | JigsawInteriorEdge;

export type JigsawEdgeModel = {
  catalogRevision: number;
  profileIds: readonly JigsawEdgeProfileId[];
};

export type TilePuzzlePiece = {
  id: string;
  currentIndex: number;
  solvedIndex: number;
  row: number;
  column: number;
};

export type JigsawPiece = TilePuzzlePiece & {
  edges: JigsawPieceEdge[];
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
  sudokuVariation?: SudokuVariation;
  notes: string[];
};

export type GridGeneratedPuzzle = BaseGeneratedPuzzle & {
  kind: "grid";
  cells: PuzzleCell[];
  answerKey?: string[];
  clues?: GridPuzzleClues;
  cages?: GridPuzzleCage[];
  inequalities?: GridPuzzleInequality[];
};

export type CardGeneratedPuzzle = BaseGeneratedPuzzle & {
  kind: "cards";
  stacks: CardStack[];
  solitaireVariation: SolitaireVariation;
};

export type TileGeneratedPuzzle = BaseGeneratedPuzzle & {
  kind: "tiles";
  tiles: TilePuzzlePiece[];
  asset: TilePuzzleAsset;
};

export type JigsawGeneratedPuzzle = Omit<TileGeneratedPuzzle, "puzzleId" | "tiles" | "asset"> & {
  puzzleId: "jigsaw";
  tiles: JigsawPiece[];
  asset: PuzzleImageAsset;
  edgeModel: JigsawEdgeModel;
};

export type TileSwapGeneratedPuzzle = Omit<TileGeneratedPuzzle, "puzzleId" | "asset"> & {
  puzzleId: "tile-swap";
  asset: PuzzleImageAsset;
};

export type SlidingPuzzleGeneratedPuzzle = Omit<TileGeneratedPuzzle, "puzzleId" | "asset"> & {
  puzzleId: "sliding-puzzle";
  asset: PuzzleImageAsset;
  emptyIndex: number;
};

export type ImageTileGeneratedPuzzle = TileSwapGeneratedPuzzle | SlidingPuzzleGeneratedPuzzle;

export type GeneratedPuzzle =
  | GridGeneratedPuzzle
  | CardGeneratedPuzzle
  | JigsawGeneratedPuzzle
  | ImageTileGeneratedPuzzle;

export type PuzzleGenerationParams = {
  puzzleId: PuzzleId;
  seed: string;
  width: number;
  height: number;
  difficulty?: PuzzleDifficulty;
  requireUniqueSolution?: boolean;
} & PuzzleVariationSettings;

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
export type JigsawPuzzleGenerator = (params: PuzzleGenerationParams) => JigsawGeneratedPuzzle;
export type TileSwapPuzzleGenerator = (params: PuzzleGenerationParams) => TileSwapGeneratedPuzzle;
export type SlidingPuzzleGenerator = (params: PuzzleGenerationParams) => SlidingPuzzleGeneratedPuzzle;
export type TilePuzzleGenerator = (params: PuzzleGenerationParams) => JigsawGeneratedPuzzle | ImageTileGeneratedPuzzle;

export type PuzzleGenerator = GridPuzzleGenerator | CardPuzzleGenerator | TilePuzzleGenerator;