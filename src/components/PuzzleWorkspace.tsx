import type { FunctionComponent } from "preact";
import type { PuzzleId } from "../catalog/types";
import { JigsawWorkspace } from "./JigsawWorkspace";
import type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";
import { StandardPuzzleWorkspace } from "./StandardPuzzleWorkspace";

export type { PuzzleWorkspaceProps } from "./PuzzleWorkspace.types";

type WorkspaceComponent = FunctionComponent<PuzzleWorkspaceProps>;

const workspaceRegistry = {
  sudoku: StandardPuzzleWorkspace,
  nonogram: StandardPuzzleWorkspace,
  "word-guess": StandardPuzzleWorkspace,
  "logic-grid": StandardPuzzleWorkspace,
  "klondike-solitaire": StandardPuzzleWorkspace,
  "peg-solitaire": StandardPuzzleWorkspace,
  futoshiki: StandardPuzzleWorkspace,
  kenken: StandardPuzzleWorkspace,
  minesweeper: StandardPuzzleWorkspace,
  jigsaw: JigsawWorkspace,
  slitherlink: StandardPuzzleWorkspace,
} satisfies Record<PuzzleId, WorkspaceComponent>;

export const PuzzleWorkspace = (props: PuzzleWorkspaceProps) => {
  const Workspace = workspaceRegistry[props.selectedDefinition.id];
  return <Workspace {...props} />;
};
