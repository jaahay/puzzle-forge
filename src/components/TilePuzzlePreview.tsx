import { useMemo, useState } from "preact/hooks";
import type { TileGeneratedPuzzle, TilePuzzlePiece } from "../catalog/types";

type TilePuzzlePreviewProps = { puzzle: TileGeneratedPuzzle };

type TileStyle = { backgroundImage: string; backgroundPosition: string; backgroundSize: string };

const getTileStyle = (puzzle: TileGeneratedPuzzle, tile: TilePuzzlePiece): TileStyle => {
  const [first, second, third, fourth] = puzzle.asset.palette;
  const x = puzzle.width === 1 ? 50 : (tile.column / (puzzle.width - 1)) * 100;
  const y = puzzle.height === 1 ? 50 : (tile.row / (puzzle.height - 1)) * 100;

  return {
    backgroundImage: `
      radial-gradient(circle at ${20 + tile.column * 12}% ${18 + tile.row * 10}%, ${third} 0 9%, transparent 25%),
      linear-gradient(135deg, ${first}, ${second} 48%, ${fourth})
    `,
    backgroundPosition: `${x}% ${y}%`,
    backgroundSize: `${puzzle.width * 100}% ${puzzle.height * 100}%`,
  };
};

const sortByCurrentIndex = (tiles: TilePuzzlePiece[]) => [...tiles].sort((left, right) => left.currentIndex - right.currentIndex);

export const TilePuzzlePreview = ({ puzzle }: TilePuzzlePreviewProps) => {
  const initialTiles = useMemo(() => sortByCurrentIndex(puzzle.tiles), [puzzle.id, puzzle.tiles]);
  const [tiles, setTiles] = useState<TilePuzzlePiece[]>(initialTiles);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const solvedCount = tiles.filter((tile) => tile.currentIndex === tile.solvedIndex).length;
  const isSolved = solvedCount === tiles.length;

  const resetTiles = () => {
    setTiles(initialTiles);
    setSelectedTileId(null);
  };

  const selectOrSwapTile = (tileId: string) => {
    if (isSolved) {
      return;
    }

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

      if (!first || !second) {
        return currentTiles;
      }

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
      </div>

      {showPreview ? (
        <div class="tile-puzzle-art-preview" aria-label="Solved Jigsaw preview image" style={{ backgroundImage: `linear-gradient(135deg, ${puzzle.asset.palette.join(", ")})` }} />
      ) : null}

      <div class={`tile-puzzle-board ${isSolved ? "solved" : ""}`} style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}>
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
