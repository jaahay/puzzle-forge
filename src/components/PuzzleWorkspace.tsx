import type { PuzzleId } from "../catalog/types";
import { GridPuzzleWorkspace } from "./GridPuzzleWorkspace";
import { ImageTilePuzzleWorkspace } from "./ImageTilePuzzleWorkspace";
import { JigsawWorkspace } from "./JigsawWorkspace";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { SolitaireWorkspace } from "./SolitaireWorkspace";
import { SudokuWorkspace } from "./SudokuWorkspace";

export type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";

const unreachablePuzzleId = (puzzleId: never): never => {
  throw new Error(`No workspace registered for puzzle type: ${String(puzzleId)}`);
};

export const PuzzleWorkspace = ({ core, prospective, grid, solitaire, immediate }: PuzzleWorkspaceProps) => {
  const puzzleId: PuzzleId = core.selectedDefinition.id;

  switch (puzzleId) {
    case "sudoku":
      return <SudokuWorkspace {...core} {...prospective} {...grid} />;
    case "klondike-solitaire":
      return <SolitaireWorkspace {...core} {...prospective} {...solitaire} />;
    case "jigsaw":
      return <JigsawWorkspace {...core} {...immediate} />;
    case "tile-swap":
    case "sliding-puzzle":
      return <ImageTilePuzzleWorkspace {...core} {...immediate} />;
    case "nonogram":
    case "word-guess":
    case "logic-grid":
    case "peg-solitaire":
    case "futoshiki":
    case "kenken":
    case "minesweeper":
    case "slitherlink":
      return <GridPuzzleWorkspace {...core} {...prospective} {...grid} />;
    default:
      return unreachablePuzzleId(puzzleId);
  }
};
