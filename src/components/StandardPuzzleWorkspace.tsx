import type { PuzzleCell } from "../catalog/types";
import { getDailyPuzzleLabel, getDailyPuzzleSeed } from "../games/shared/daily";
import { CardPuzzlePreview } from "./CardPuzzlePreview";
import { GridPuzzlePreview } from "./GridPuzzlePreview";
import { BottomPuzzleConfiguration, TopPuzzleConfiguration } from "./PuzzleConfiguration";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace";
import { PuzzleWorkspaceLayout } from "./PuzzleWorkspaceLayout";
import { SeedControl } from "./SeedControl";
import { WordGuessGame } from "./WordGuessGame";

const getGivenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => cell.locked).length ?? 0;
const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked && cell.value).length ?? 0;
const getOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !cell.locked).length ?? 0;

export const StandardPuzzleWorkspace = ({
  selectedDefinition,
  selectedPuzzleIsGeneratable,
  seed,
  width,
  height,
  difficulty,
  requireUniqueSolution,
  sudokuVariation,
  puzzle,
  solitaireVariation,
  cardStacks,
  selectedCard,
  solitaireStats,
  gridCells,
  selectedGridCell,
  statusMessage,
  isGenerating,
  onSeedChange,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
  onDifficultyChange,
  onSudokuVariationChange,
  onUniqueSolutionChange,
  onGenerate,
  onRandomize,
  onReset,
  onCheck,
  onSolitaireVariationChange,
  onAutoMoveToFoundations,
  onUndoSolitaire,
  onRedoSolitaire,
  canUndoSolitaire,
  canRedoSolitaire,
  onCardClick,
  onCardDoubleClick,
  onStackClick,
  onCellClick,
  onCellInput,
}: PuzzleWorkspaceProps) => {
  const isSudoku = selectedDefinition.id === "sudoku";
  const isNonogram = selectedDefinition.id === "nonogram";
  const isWordGuess = selectedDefinition.id === "word-guess";
  const isSolitaire = selectedDefinition.id