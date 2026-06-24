import { markHomeNavigation } from "../app/homeNavigation";
import { getPuzzleAvailability } from "../catalog/puzzleAvailability";
import { puzzleCatalog } from "../catalog/puzzleCatalog";
import type { PuzzleDefinition, PuzzleId } from "../catalog/types";

const { readyPuzzles, previewPuzzles, plannedPuzzles } = getPuzzleAvailability();

const statusLabel = (status: PuzzleDefinition["status"]) => {
  if (status === "planned") {
    return "Coming soon";
  }

  if (status === "prototype") {
    return "Preview";
  }

  return "Ready";
};

const compactStatusLabel = (status: PuzzleDefinition["status"]) => {
  if (status === "planned") {
    return "Soon";
  }

  return statusLabel(status);
};

const puzzleIcons: Record<PuzzleId, string> = {
  sudoku: "▦",
  nonogram: "▥",
  "word-guess": "Aa",
  "logic-grid": "⌗",
  "klondike-solitaire": "♠",
  "peg-solitaire": "●",
  kenken: "∑",
  minesweeper: "✹",
  jigsaw: "▧",
  slitherlink: "∞",
};

type PuzzleCatalogProps = {
  isCollapsed: boolean;
  selectedPuzzleId: PuzzleId;
  onCollapseToggle: () => void;
  onSelectPuzzle: (puzzleId: PuzzleId) => void;
};

const CompactStatusMarker = ({ status }: { status: PuzzleDefinition["status"] }) => (
  <span class={`catalog-mini-status ${status}`} aria-label={compactStatusLabel(status)} title={compactStatusLabel(status)} />
);

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
        <button aria-controls="puzzle-catalog-list" aria-expanded={!isCollapsed} class="catalog-collapse-button" onClick={onCollapseToggle} type="button">
          {isCollapsed ? "Show" : "Collapse"}
        </button>
      </div>
    </div>

    {isCollapsed ? (
      <div class="catalog-mini-list" id="puzzle-catalog-list">
        <a class="catalog-mini-card home-card" href="/" aria-label="Puzzle Forge home" onClick={markHomeNavigation}>
          <span class="catalog-mini-icon" aria-hidden="true">⌂</span>
          <span class="catalog-mini-title">Home</span>
        </a>
        {puzzleCatalog.map((definition) => (
          <button
            aria-label={`${definition.title}${definition.status === "planned" ? " coming soon" : ""}`}
            class={definition.id === selectedPuzzleId ? "catalog-mini-card selected" : "catalog-mini-card"}
            disabled={definition.status === "planned"}
            key={definition.id}
            onClick={() => onSelectPuzzle(definition.id)}
            type="button"
          >
            <span class="catalog-mini-icon" aria-hidden="true">{puzzleIcons[definition.id]}</span>
            <span class="catalog-mini-title">{definition.title}</span>
            {definition.status === "playable" ? null : <CompactStatusMarker status={definition.status} />}
          </button>
        ))}
      </div>
    ) : (
      <div class="catalog-sections" id="puzzle-catalog-list">
        <a class="catalog-card home-card" href="/" onClick={markHomeNavigation}>
          <strong>Home</strong>
          <span>Return to the puzzle catalog.</span>
        </a>
        <section class="catalog-section" aria-label="Ready puzzles">
          <p class="catalog-section-label">Ready</p>
          <div class="catalog-grid">
            {readyPuzzles.map((definition) => (
              <button class={definition.id === selectedPuzzleId ? "catalog-card selected" : "catalog-card"} key={definition.id} type="button" onClick={() => onSelectPuzzle(definition.id)}>
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
                <button class={definition.id === selectedPuzzleId ? "catalog-card selected" : "catalog-card"} key={definition.id} type="button" onClick={() => onSelectPuzzle(definition.id)}>
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
