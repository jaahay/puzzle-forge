import type { FunctionComponent } from "preact";
import type { PuzzleId } from "../catalog/types";
import { GridPuzzleWorkspace } from "./GridPuzzleWorkspace";
import { ImageTilePuzzleWorkspace } from "./ImageTilePuzzleWorkspace";
import { JigsawWorkspace } from "./JigsawWorkspace";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { SolitaireWorkspace } from "./SolitaireWorkspace";
import { SudokuWorkspace } from "./SudokuWorkspace";

export type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";

type WorkspaceComponent = FunctionComponent<PuzzleWorkspaceProps>;

const workspaceRegistry = {
  sudoku: SudokuWorkspace,
  nonogram: GridPuzzleWorkspace,
  "word-guess": GridPuzzleWorkspace,
  "logic-grid": GridPuzzleWorkspace,
  "klondike-solitaire": SolitaireWorkspace,
  "peg-solitaire": GridPuzzleWorkspace,
  futoshiki: GridPuzzleWorkspace,
  kenken: GridPuzzleWorkspace,
  minesweeper: GridPuzzleWorkspace,
  jigsaw: JigsawWorkspace,
  "tile-swap": ImageTilePuzzleWorkspace,
  "sliding-puzzle": ImageTilePuzzleWorkspace,
  slitherlink: GridPuzzleWorkspace,
} satisfies Record<PuzzleId, WorkspaceComponent>;

export const PuzzleWorkspace = (props: PuzzleWorkspaceProps) => {
  const Workspace = workspaceRegistry[props.selectedDefinition.id];
  return <Workspace {...props} />;
};
