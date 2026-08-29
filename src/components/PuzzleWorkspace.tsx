import type { FunctionComponent } from "preact";
import type { PuzzleId } from "../catalog/types";
import { ImageTilePuzzleWorkspace } from "./ImageTilePuzzleWorkspace";
import { JigsawWorkspace } from "./JigsawWorkspace";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { StandardPuzzleWorkspace } from "./StandardPuzzleWorkspace";
import { SudokuWorkspace } from "./SudokuWorkspace";

export type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";

type WorkspaceComponent = FunctionComponent<PuzzleWorkspaceProps>;

const workspaceRegistry = {
  sudoku: SudokuWorkspace,
  nonogram: StandardPuzzleWorkspace,
  "word-guess": StandardPuzzleWorkspace,
  "logic-grid": StandardPuzzleWorkspace,
  "klondike-solitaire": StandardPuzzleWorkspace,
  "peg-solitaire": StandardPuzzleWorkspace,
  futoshiki: StandardPuzzleWorkspace,
  kenken: StandardPuzzleWorkspace,
  minesweeper: StandardPuzzleWorkspace,
  jigsaw: JigsawWorkspace,
  "tile-swap": ImageTilePuzzleWorkspace,
  "sliding-puzzle": ImageTilePuzzleWorkspace,
  slitherlink: StandardPuzzleWorkspace,
} satisfies Record<PuzzleId, WorkspaceComponent>;

export const PuzzleWorkspace = (props: PuzzleWorkspaceProps) => {
  const Workspace = workspaceRegistry[props.selectedDefinition.id];
  return <Workspace {...props} />;
};
