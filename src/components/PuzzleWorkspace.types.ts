import type { GenerationSettings, NextPuzzleDraft } from "../app/generationSettings";
import type { SolitaireStats } from "../app/session";
import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCheckFeedbackTone } from "../interactions/gridChecking";
import type { GridCellSelection } from "../interactions/gridRules";

export type { GenerationSettings, NextPuzzleDraft } from "../app/generationSettings";

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

type CoreWorkspaceKeys =
  | "selectedDefinition"
  | "selectedPuzzleIsGeneratable"
  | "seed"
  | "puzzle"
  | "statusMessage"
  | "isGenerating"
  | "onReset";

type ProspectiveGenerationKeys =
  | "nextPuzzleDraft"
  | "seedLoadInput"
  | "onNextPuzzleDraftChange"
  | "onSeedLoadInputChange"
  | "onNewPuzzle"
  | "onToday"
  | "onLoadSeed";

type GridInteractionKeys =
  | "gridCells"
  | "selectedGridCell"
  | "gridCheckFeedbackTone"
  | "onCheck"
  | "onCellClick"
  | "onCellInput";

type SolitaireInteractionKeys =
  | "cardStacks"
  | "selectedCard"
  | "solitaireStats"
  | "onAutoMoveToFoundations"
  | "onUndoSolitaire"
  | "onRedoSolitaire"
  | "canUndoSolitaire"
  | "canRedoSolitaire"
  | "onCardClick"
  | "onCardDoubleClick"
  | "onStackClick";

type ImmediateGenerationKeys =
  | "width"
  | "height"
  | "onSeedChange"
  | "onWidthChange"
  | "onHeightChange"
  | "onSettingsCommit"
  | "onGenerate"
  | "onRandomize";

export type SudokuWorkspaceProps = Pick<
  PuzzleWorkspaceProps,
  CoreWorkspaceKeys | ProspectiveGenerationKeys | GridInteractionKeys
>;

export type GridPuzzleWorkspaceProps = Pick<
  PuzzleWorkspaceProps,
  CoreWorkspaceKeys | ProspectiveGenerationKeys | GridInteractionKeys
>;

export type SolitaireWorkspaceProps = Pick<
  PuzzleWorkspaceProps,
  CoreWorkspaceKeys | ProspectiveGenerationKeys | SolitaireInteractionKeys
>;

export type ImmediateImageWorkspaceProps = Pick<
  PuzzleWorkspaceProps,
  CoreWorkspaceKeys | ImmediateGenerationKeys
>;
