import { puzzleCatalog } from "../catalog/puzzleCatalog";
import type { PuzzleId } from "../catalog/types";

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
  <aside class="catalog-panel" aria-label="Puzzle catalog" id="puzzle-catalog">
    <div class="panel-heading">
      <span class="catalog-count">{puzzleCatalog.length} puzzle ideas</span>
      <div class="catalog-heading-actions">
        <strong>Catalog</strong>
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

    <div class="catalog-rail" hidden={!isCollapsed} aria-hidden={!isCollapsed}>
      <span>Catalog</span>
      <strong>{selectedPuzzleTitle}</strong>
    </div>

    <div class="catalog-grid" id="puzzle-catalog-list" hidden={isCollapsed}>
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
  </aside>
);
