import type { GenerationSettings, NextPuzzleDraft } from "../app/generationSettings";
import type { SolitaireStats } from "../app/session";
import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDefinition } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import type { GridCheckFeedbackTone } from "../interactions/gridChecking";
import type { GridCellSelection } from "../interactions/gridRules";
import type { JigsawPlacement } from "../games/jigsaw/placement";

export type { GenerationSettings, NextPuzzleDraft } from "../app/generationSettings";

export type CoreWorkspaceProps = {
  selectedDefinition: PuzzleDefinition;
  selectedPuzzleIsGeneratable: boolean;
  seed: string;
  puzzle: GeneratedPuzzle | null;
  statusMessage: string;
  onStatusMessageChange: (message: string) => void;
  isGenerating: boolean;
  onReset: () => void;
};

export type ProspectiveGenerationProps = {
  nextPuzzleDraft: NextPuzzleDraft;
  seedLoadInput: string;
  onNextPuzzleDraftChange: (settings: GenerationSettings) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: () => void;
  onToday: () => void;
  onLoadSeed: () => void;
};

export type GridInteractionProps = {
  gridCells: PuzzleCell[] | null;
  selectedGridCell: GridCellSelection | null;
  gridCheckFeedbackTone: GridCheckFeedbackTone | null;
  canUndoGrid: boolean;
  canRedoGrid: boolean;
  canUndoGridNow: () => boolean;
  canRedoGridNow: () => boolean;
  onUndoGrid: () => void;
  onRedoGrid: () => void;
  onCommitGridHistory: () => void;
  onCheck: () => void;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

export type JigsawInteractionProps = {
  jigsawPlacements: JigsawPlacement[] | null;
  onJigsawPlacementsChange: (placements: JigsawPlacement[]) => void;
};

export type SolitaireInteractionProps = {
  cardStacks: CardStack[] | null;
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  onAutoMoveToFoundations: () => void;
  onUndoSolitaire: () => void;
  onRedoSolitaire: () => void;
  canUndoSolitaire: boolean;
  canRedoSolitaire: boolean;
  canUndoSolitaireNow: () => boolean;
  canRedoSolitaireNow: () => boolean;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onCardDoubleClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
};

export type SudokuWorkspaceProps = CoreWorkspaceProps & ProspectiveGenerationProps & GridInteractionProps;
export type GridPuzzleWorkspaceProps = CoreWorkspaceProps & ProspectiveGenerationProps & GridInteractionProps;
export type SolitaireWorkspaceProps = CoreWorkspaceProps & ProspectiveGenerationProps & SolitaireInteractionProps;
export type JigsawWorkspaceProps = CoreWorkspaceProps & ProspectiveGenerationProps & JigsawInteractionProps;
export type ImageWorkspaceProps = CoreWorkspaceProps & ProspectiveGenerationProps;

export type PuzzleWorkspaceProps = {
  core: CoreWorkspaceProps;
  prospective: ProspectiveGenerationProps;
  grid: GridInteractionProps;
  solitaire: SolitaireInteractionProps;
  jigsaw: JigsawInteractionProps;
};
