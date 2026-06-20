import { puzzleCatalog } from "../catalog/puzzleCatalog";
import type { PuzzleDefinition, PuzzleId } from "../catalog/types";

const shortLabels: Partial<Record<PuzzleId, string>> = {
  sudoku: "9x9",
  nonogram: "N",
  "word-guess": "W",
  "logic-grid": "LG",
  "klondike-solitaire": "S",
  "peg-solitaire": "PS",
  kenken: "K",
  minesweeper: "M",
  slitherlink: "SL",
};

const shortLabelForPuzzle = (definition: PuzzleDefinition) => shortLabels[definition.id] ?? definition.title.slice(0, 2).toUpperCase();
const readyPuzzles = puzzleCatalog.filter((definition) => definition.status === "playable");
const previewPuzzles = puzzleCatalog.filter((definition) => definition.status === "prototype");
const plannedPuzzles = puzzleCatalog.filter((definition) => definition.status === "planned");

const statusLabel = (status: PuzzleDefinition["status"]) => {
  if (status === "planned") {
    return "Coming soon";
  }

  if (status === "prototype") {
    return "Preview";
  }

  return "Ready";
};

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
        {isCollapsed ? null : <strong>{`${readyPuzzles.length} ready`}</strong>}
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
            aria-label={`${definition.title}${definition.status === "planned" ? " coming soon" : ""}`}
            class={definition.id === selectedPuzzleId ? "catalog-mini-card selected" : "catalog-mini-card"}
            disabled={definition.status === "planned"}
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
        <section class="catalog-section" aria-label="Ready puzzles">
          <p class="catalog-section-label">Ready</p>
          <div class="catalog-grid">
            {readyPuzzles.map((definition) => (
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

        {previewPuzzles.length > 0 ? (
          <section class="catalog-section" aria-label="Preview puzzles">
            <p class="catalog-section-label">Preview</p>
            <div class="catalog-grid">
              {previewPuzzles.map((definition) => (
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
        ) : null}

        <section class="catalog-section" aria-label="Coming soon puzzles">
          <p class="catalog-section-label">Coming soon</p>
          <div class="catalog-grid">
            {plannedPuzzles.map((definition) => (
              <button class="catalog-card" disabled key={definition.id} type="button">
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
