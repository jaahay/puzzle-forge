import { useEffect, useMemo, useState } from "preact/hooks";
import type { TileGeneratedPuzzle, TilePuzzlePiece } from "../catalog/types";

type TilePuzzlePreviewProps = { puzzle: TileGeneratedPuzzle };
type TileStyle = { backgroundImage: string; backgroundPosition: string; backgroundSize: string };
type PersistedTileOrder = { id: string; currentIndex: number };
type PersistedTileOrder