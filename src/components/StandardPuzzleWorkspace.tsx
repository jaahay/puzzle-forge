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
const getFilledOpenCount = (cells: PuzzleCell[] | null) => cells?.filter((cell) => !