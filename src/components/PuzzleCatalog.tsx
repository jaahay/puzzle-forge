import { puzzleCatalog } from "../catalog/puzzleCatalog";
import type { PuzzleId } from "../catalog/types";

const shortLabelForPuzzle = (title: string) => title.slice(0, 2).toUpperCase();

type PuzzleCatalogProps = {
  isCollapsed: boolean;
  selectedPuzzleId: PuzzleId;
  selectedPuzzleTitle: string;
  onCollapseToggle: () => void;
  onSelectPuzzle: (puzzleId: PuzzleId) => void;
};

export const PuzzleCatalog = ({
  isCollapsed,
  selectedPuzzleId,
  selectedPuzzleTitle,
  onCollapseToggle,
  onSelectPuzzle,
}: PuzzleCatalogProps) => (
  <aside class={`catalog-panel ${isCollapsed ? "collapsed" : ""}`} aria-label="Puzzle catalog" id="puzzle-catalog">
    <div class="panel-heading">
      <span class="catalog-count">{isCollapsed ? selectedPuzzleTitle : `${puzzleCatalog.length} puzzle ideas`}</span>
      <div class="catalog-heading-actions">
        {isCollapsed ? null : <strong>Catalog</strong>}
        <button
          aria-controls="puzzle-catalog-list"
          aria-expanded={!isCollapsed}
          class="catalog-collapse-button"
          onClick={onCollapseToggle}
          type="button"
        >
          {isCollapsed ? "Expand" : "Collapse"}
        </button>
      </div>
    </div>

    {isCollapsed ? (
      <div class="catalog-mini-list" id="puzzle-catalog-list">
        {puzzleCatalog.map((definition) => (
          <button
            aria-label={definition.title}
            class={definition.id === selectedPuzzleId ? "catalog-mini-card selected" : "catalog-mini-card"}
            key={definition.id}
            onClick={() => onSelectPuzzle(definition.id)}
            type="button"
          >
            <span>{shortLabelForPuzzle(definition.title)}</span>
          </button>
        ))}
      </div>
    ) : (
      <div class="catalog-grid" id="puzzle-catalog-list">
        {puzzleCatalog.map((definition) => (
          <button
            class={definition.id === selectedPuzzleId ? "catalog-card selected" : "catalog-card"}
            key={definition.id}
            type="button"
            onClick={() => onSelectPuzzle(definition.id)}
          >
            <span class={`status ${definition.status}`}>{definition.status}</span>
            <strong>{definition.title}</strong>
            <span>{definition.tagline}</span>
          </button>
        ))}
      </div>
    )}
  </aside>
);
