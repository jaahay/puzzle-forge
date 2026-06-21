import type { TileGeneratedPuzzle } from "../catalog/types";

type TilePuzzlePreviewProps = {
  puzzle: TileGeneratedPuzzle;
};

export const TilePuzzlePreview = ({ puzzle }: TilePuzzlePreviewProps) => {
  const sortedTiles = [...puzzle.tiles].sort((left, right) => left.currentIndex - right.currentIndex);
  const solvedCount = puzzle.tiles.filter((tile) => tile.currentIndex === tile.solvedIndex).length;

  return (
    <section class="tile-puzzle-preview" aria-label={`${puzzle.title} tile puzzle`}>
      <div class="tile-puzzle-summary">
        <span>{solvedCount}/{puzzle.tiles.length} placed</span>
        <span>{puzzle.asset.title}</span>
      </div>
      <div class="tile-puzzle-board" style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}>
        {sortedTiles.map((tile) => (
          <div class="tile-puzzle-piece" key={tile.id}>
            <span>{tile.solvedIndex + 1}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
