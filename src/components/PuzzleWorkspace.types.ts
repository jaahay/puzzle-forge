import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition, PuzzleDifficulty, PuzzleGenerationRequest, SolitaireVariation, SudokuVariation } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCheckFeedbackTone } from "../interactions/gridChecking";
import type { GridCellSelection } from "../interactions/gridRules";

export type SolitaireStats = { moveCount: number; drawCount: number; recycleCount: number; autoMoveCount: number };
export type GenerationSettings = Partial<Pick<PuzzleGenerationRequest, "seed" | "width" | "height" | "difficulty" | "requireUniqueSolution" | "sudokuVariation" | "solitaireVariation" | "imageId">>;

export type NextPuzzleDraft = {
  width: number;
  height: number;
  difficulty: PuzzleDifficulty;
  requireUniqueSolution: boolean;
  sudokuVariation: SudokuVariation;
  solitaireVariation: SolitaireVariation;
};

export type PuzzleWorkspaceProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seed: string;
  width: number;
  height: number;
  puzzle: GeneratedPuzzle | null;
  nextPuzzleDraft: NextPuzzleDraft;
  seedLoadInput: string;
  cardStacks: CardStack[] | null;
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
  gridCheckFeedbackTone: GridCheckFeedbackTone | null;
  statusMessage: string;
  isGenerating: boolean;
  onSeedChange: (seed: string) => void;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings?: GenerationSettings) => void;
  onGenerate: () => void;
  onRandomize: () => void;
  onReset: () => void;
  onCheck: () => void;
  onNextPuzzleDraftChange: (settings: GenerationSettings) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
  onAutoMoveToFoundations: () => void;
  onUndoSolitaire: () => void;
  onRedoSolitaire: () => void;
  canUndoSolitaire: boolean;
  canRedoSolitaire: boolean;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onCardDoubleClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};
