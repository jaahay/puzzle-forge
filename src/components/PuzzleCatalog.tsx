import { puzzleCatalog } from "../catalog/puzzleCatalog";
import type { PuzzleDefinition, PuzzleId } from "../catalog/types";

const shortLabels: Partial<Record<PuzzleId, string>> = {
  sudoku: "9×9",
  nonogram: "▦",
  "word-guess": "W",
  "logic-grid": "LG",
  "klondike-solitaire": "♠",
  "peg-solitaire": "●",
  kenken: "K",
  minesweeper: "✹",
  slitherlink: "⟲",
};

const shortLabelForPuzzle = (definition: PuzzleDefinition) => shortLabels[definition.id] ?? definition.title.slice(0, 2).toUpperCase();
const playablePuzzles = puzzleCatalog.filter((definition) => definition.status === "playable");
const plannedPuzzles = puzzleCatalog.filter((definition) => definition.status !== "playable");

const statusLabel = (status: PuzzleDefinition["status"]) => (status === "planned" ? "Coming soon" : status);

type PuzzleCatalogProps = {
  isCollapsed: boolean;
  selectedPuzzleId: PuzzleId;
  onCollapseToggle: () => void;
  onSelectPuzzle: (puzzleId: PuzzleId) => void;
};

export const PuzzleCatalog = ({
  isCollapsed,
  selectedPuzzleId,
  onCollapseToggle,
  onSelectPuzzle,
}: PuzzleCatalogProps) => (
  <aside class={`catalog-panel ${isCollapsed ? "collapsed" : ""}`} aria-label="Puzzle catalog" id="puzzle-catalog">
    <div class="panel-heading">
      <span class="catalog-count">Puzzles</span>
      <div class="catalog-heading-actions">
        {isCollapsed ? null : <strong>{`${playablePuzzles.length} playable`}</strong>}
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
            <span>{shortLabelForPuzzle(definition)}</span>
          </button>
        ))}
      </div>
    ) : (
      <div class="catalog-sections" id="puzzle-catalog-list">
        <section class="catalog-section" aria-label="Playable puzzles">
          <p class="catalog-section-label">Play</p>
          <div class="catalog-grid">
            {playablePuzzles.map((definition) => (
              <button
                class={definition.id === selectedPuzzleId ? "catalog-card selected" : "catalog-card"}
                key={definition.id}
                type="button"
                onClick={() => onSelectPuzzle(definition.id)}
              >
                <strong>{definition.title}</strong>
                <span>{definition.tagline}</span>
              </button>
            ))}
          </div>
        </section>

        <section class="catalog-section" aria-label="Coming soon puzzles">
          <p class="catalog-section-label">Coming soon</p>
          <div class="catalog-grid">
            {plannedPuzzles.map((definition) => (
              <button
                class={definition.id === selectedPuzzleId ? "catalog-card selected" : "catalog-card"}
                key={definition.id}
                type="button"
                onClick={() => onSelectPuzzle(definition.id)}
              >
                <span class={`status ${definition.status}`}>{statusLabel(definition.status)}</span>
                <strong>{definition.title}</strong>
                <span>{definition.tagline}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    )}
  </aside>
);
