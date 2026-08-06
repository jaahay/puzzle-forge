import { useEffect, useMemo, useState } from "preact/hooks";
import type { JigsawGeneratedPuzzle, JigsawPiece } from "../catalog/types";
import { getJigsawPieceSeamPaths } from "../games/jigsaw/edgePaths";

type TilePuzzlePreviewProps = { puzzle: JigsawGeneratedPuzzle };
type TileStyle = { backgroundImage: string; backgroundPosition: string; backgroundSize: string };
type PersistedTileOrder = { id: string; currentIndex: number };
type PersistedTileOrderEnvelope = {
  schemaVersion: 2;
  puzzleId: "jigsaw";
  puzzleInstanceId: string;
  seed: string;
  width: number;
  height: number;
  assetId: string;
  assetRevision: number;
  edgeModelRevision: number;
  tileOrder: PersistedTileOrder[];
  updatedAt: string;
};

const tileOrderSchemaVersion = 2;
const getTileOrderStorageKey = (puzzle: JigsawGeneratedPuzzle) =>
  `puzzle-forge.jigsaw.${tileOrderSchemaVersion}.${puzzle.id}.${puzzle.seed}.${puzzle.width}x${puzzle.height}`;

const getTileStyle = (puzzle: JigsawGeneratedPuzzle, tile: JigsawPiece): TileStyle => {
  const x = puzzle.width === 1 ? 50 : (tile.column / (puzzle.width - 1)) * 100;
  const y = puzzle.height === 1 ? 50 : (tile.row / (puzzle.height - 1)) * 100;

  return {
    backgroundImage: `url(${puzzle.asset.files.puzzle})`,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: `${puzzle.width * 100}% ${puzzle.height * 100}%`,
  };
};

const sortByCurrentIndex = (tiles: JigsawPiece[]) => [...tiles].sort((left, right) => left.currentIndex - right.currentIndex);

const loadPersistedTileOrder = (puzzle: JigsawGeneratedPuzzle, fallbackTiles: JigsawPiece[]) => {
  if (typeof window === "undefined") return fallbackTiles;
  const rawEnvelope = window.localStorage.getItem(getTileOrderStorageKey(puzzle));
  if (!rawEnvelope) return fallbackTiles;

  try {
    const envelope: unknown = JSON.parse(rawEnvelope);
    if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) return fallbackTiles;
    const candidate = envelope as Partial<PersistedTileOrderEnvelope>;
    if (
      candidate.schemaVersion !== tileOrderSchemaVersion ||
      candidate.puzzleId !== "jigsaw" ||
      candidate.puzzleInstanceId !== puzzle.id ||
      candidate.seed !== puzzle.seed ||
      candidate.width !== puzzle.width ||
      candidate.height !== puzzle.height ||
      candidate.assetId !== puzzle.asset.id ||
      candidate.assetRevision !== puzzle.asset.assetRevision ||
      candidate.edgeModelRevision !== puzzle.edgeModel.catalogRevision ||
      !Array.isArray(candidate.tileOrder)
    ) return fallbackTiles;

    const persistedIndexes = new Map(
      candidate.tileOrder.flatMap((tile) =>
        typeof tile.id === "string" && typeof tile.currentIndex === "number" ? [[tile.id, tile.currentIndex] as const] : [],
      ),
    );
    if (persistedIndexes.size !== fallbackTiles.length) return fallbackTiles;

    return sortByCurrentIndex(
      fallbackTiles.map((tile) => {
        const currentIndex = persistedIndexes.get(tile.id);
        return typeof currentIndex === "number" ? { ...tile, currentIndex } : tile;
      }),
    );
  } catch {
    return fallbackTiles;
  }
};

const savePersistedTileOrder = (puzzle: JigsawGeneratedPuzzle, tiles: JigsawPiece[]) => {
  if (typeof window === "undefined") return;
  const envelope: PersistedTileOrderEnvelope = {
    schemaVersion: tileOrderSchemaVersion,
    puzzleId: "jigsaw",
    puzzleInstanceId: puzzle.id,
    seed: puzzle.seed,
    width: puzzle.width,
    height: puzzle.height,
    assetId: puzzle.asset.id,
    assetRevision: puzzle.asset.assetRevision,
    edgeModelRevision: puzzle.edgeModel.catalogRevision,
    tileOrder: tiles.map(({ id, currentIndex }) => ({ id, currentIndex })),
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(getTileOrderStorageKey(puzzle), JSON.stringify(envelope));
};

export const TilePuzzlePreview = ({ puzzle }: TilePuzzlePreviewProps) => {
  const initialTiles = useMemo(() => sortByCurrentIndex(puzzle.tiles), [puzzle.id, puzzle.tiles]);
  const [tiles, setTiles] = useState<JigsawPiece[]>(() => loadPersistedTileOrder(puzzle, initialTiles));
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEdgeSeams, setShowEdgeSeams] = useState(true);
  const solvedCount = tiles.filter((tile) => tile.currentIndex === tile.solvedIndex).length;
  const isSolved = solvedCount === tiles.length;

  useEffect(() => {
    setTiles(loadPersistedTileOrder(puzzle, initialTiles));
    setSelectedTileId(null);
  }, [initialTiles, puzzle]);

  useEffect(() => savePersistedTileOrder(puzzle, tiles), [puzzle, tiles]);

  const resetTiles = () => {
    setTiles(initialTiles);
    setSelectedTileId(null);
  };

  const selectOrSwapTile = (tileId: string) => {
    if (isSolved) return;
    if (!selectedTileId) {
      setSelectedTileId(tileId);
      return;
    }
    if (selectedTileId === tileId) {
      setSelectedTileId(null);
      return;
    }

    setTiles((currentTiles) => {
      const first = currentTiles.find((tile) => tile.id === selectedTileId);
      const second = currentTiles.find((tile) => tile.id === tileId);
      if (!first || !second) return currentTiles;
      return currentTiles
        .map((tile) => {
          if (tile.id === first.id) return { ...tile, currentIndex: second.currentIndex };
          if (tile.id === second.id) return { ...tile, currentIndex: first.currentIndex };
          return tile;
        })
        .sort((left, right) => left.currentIndex - right.currentIndex);
    });
    setSelectedTileId(null);
  };

  const previewStyle = {
    backgroundImage: `url(${puzzle.asset.files.preview})`,
    aspectRatio: `${puzzle.asset.intrinsicWidth} / ${puzzle.asset.intrinsicHeight}`,
  };
  const boardStyle = {
    gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))`,
    aspectRatio: `${puzzle.asset.intrinsicWidth} / ${puzzle.asset.intrinsicHeight}`,
  };

  return (
    <section class="tile-puzzle-preview" aria-label={`${puzzle.title} tile puzzle`}>
      <div class="tile-puzzle-summary">
        <span>{isSolved ? "Solved" : `${solvedCount}/${puzzle.tiles.length} placed`}</span>
        <span>{puzzle.asset.title}</span>
        <span>{puzzle.width} x {puzzle.height}</span>
      </div>

      <div class="tile-puzzle-tools">
        <button type="button" onClick={() => setShowPreview((current) => !current)}>{showPreview ? "Hide preview" : "Preview image"}</button>
        <button type="button" onClick={resetTiles}>Reset shuffle</button>
        <button
          type="button"
          aria-pressed={showEdgeSeams}
          onClick={() => setShowEdgeSeams((current) => !current)}
        >
          {showEdgeSeams ? "Hide edge guides" : "Show edge guides"}
        </button>
      </div>

      {showPreview ? (
        <div class="tile-puzzle-art-preview" aria-label={puzzle.asset.alt} style={previewStyle} />
      ) : null}

      <div class={`tile-puzzle-board image-backed ${showEdgeSeams ? "edge-seams" : ""} ${isSolved ? "solved" : ""}`} style={boardStyle}>
        {tiles.map((tile) => {
          const selected = tile.id === selectedTileId;
          const placed = tile.currentIndex === tile.solvedIndex;
          return (
            <button
              class={`tile-puzzle-piece ${selected ? "selected" : ""} ${placed ? "placed" : ""}`}
              key={tile.id}
              onClick={() => selectOrSwapTile(tile.id)}
              style={getTileStyle(puzzle, tile)}
              type="button"
              aria-label={`Tile ${tile.solvedIndex + 1}${placed ? ", placed" : ""}${selected ? ", selected" : ""}`}
            >
              {showEdgeSeams ? (
                <svg
                  class="tile-puzzle-edge-seams"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {getJigsawPieceSeamPaths(tile).map((seam) => (
                    <path
                      class={`tile-puzzle-edge-seam ${seam.boundary ? "boundary" : "interior"} ${seam.polarity}`}
                      d={seam.d}
                      key={seam.edgeId}
                    />
                  ))}
                </svg>
              ) : null}
              <span>{tile.solvedIndex + 1}</span>
            </button>
          );
        })}
      </div>

      <p class="tile-puzzle-hint" aria-live="polite">
        {isSolved ? "Jigsaw solved." : selectedTileId ? "Select another tile to swap." : "Select a tile, then another tile to swap."}
      </p>
    </section>
  );
};
