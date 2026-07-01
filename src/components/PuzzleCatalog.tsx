import { getPuzzleAvailability } from "../catalog/puzzleAvailability";
import { homeIcon, puzzleIcons } from "../catalog/puzzleIcons";
import type { PuzzleDefinition, PuzzleId } from "../catalog/types";

const { readyPuzzles, previewPuzzles, plannedPuzzles } = getPuzzleAvailability();

type PuzzleCatalogProps = {
  isCollapsed: boolean;
  isHomeSelected: boolean;
  selectedPuzzleId: PuzzleId;
  onCollapseToggle: () => void;
  onHomeSelect: () => void;
  onSelectPuzzle: (puzzleId: PuzzleId) => void;
};

type CatalogEntry = {
  definition: PuzzleDefinition;
  statusLabel?: string;
  disabled?: boolean;
};

const readyEntries: CatalogEntry[] = readyPuzzles.map((definition) => ({ definition }));
const previewEntries: CatalogEntry[] = previewPuzzles.map((definition) => ({ definition, statusLabel: "Preview" }));
const plannedEntries: CatalogEntry[] = plannedPuzzles.map((definition) => ({ definition, statusLabel: "Soon", disabled: true }));
const catalogSections = [
  { label: "Ready", entries: readyEntries },
  { label: "Preview", entries: previewEntries },
  { label: "Coming soon", entries: plannedEntries },
].filter((section) => section.entries.length > 0);
const catalogEntries = catalogSections.flatMap((section) => section.entries);

const getPuzzleAriaLabel = ({ definition, statusLabel, disabled }: CatalogEntry) => {
  const statusCopy = statusLabel ? `, ${statusLabel}` : "";
  const disabledCopy = disabled ? ", unavailable" : "";

  return `${definition.title}${statusCopy}${disabledCopy}`;
};

export const PuzzleCatalog = ({
  isCollapsed,
  isHomeSelected,
  selectedPuzzleId,
  onCollapseToggle,
  onHomeSelect,
  onSelectPuzzle,
}: PuzzleCatalogProps) => (
  <aside class={`catalog-panel ${isCollapsed ? "collapsed" : "expanded"}`} aria-label="Puzzle catalog" id="puzzle-catalog">
    <div class="catalog-toolbar">
      <button
        type="button"
        class={`catalog-home-button ${isHomeSelected ? "selected" : ""}`}
        aria-current={isHomeSelected ? "page" : undefined}
        onClick={onHomeSelect}
      >
        <span class="catalog-card-icon" aria-hidden="true">{homeIcon}</span>
        <span class="catalog-home-copy">Home</span>
      </button>

      <button
        type="button"
        class="catalog-collapse-toggle"
        aria-controls="puzzle-catalog-sections"
        aria-expanded={!isCollapsed}
        onClick={onCollapseToggle}
      >
        {isCollapsed ? "Expand" : "Compact"}
      </button>
    </div>

    <nav class="catalog-mini-list" aria-label="Compact puzzle navigation">
      {catalogEntries.map((entry) => {
        const { definition, disabled, statusLabel } = entry;
        const isSelected = !isHomeSelected && definition.id === selectedPuzzleId;

        return (
          <button
            key={definition.id}
            type="button"
            class={`catalog-mini-button ${isSelected ? "selected" : ""}`}
            aria-current={isSelected ? "page" : undefined}
            aria-label={getPuzzleAriaLabel(entry)}
            title={getPuzzleAriaLabel(entry)}
            disabled={disabled}
            onClick={() => onSelectPuzzle(definition.id)}
          >
            <span class="catalog-card-icon" aria-hidden="true">{puzzleIcons[definition.id]}</span>
            {statusLabel ? <span class={`catalog-mini-status ${definition.status}`} aria-hidden="true" /> : null}
          </button>
        );
      })}
    </nav>

    <div class="catalog-sections" id="puzzle-catalog-sections">
      {catalogSections.map((section) => (
        <section class="catalog-section" aria-label={`${section.label} puzzles`} key={section.label}>
          <p class="catalog-section-label">{section.label}</p>
          <div class="catalog-grid">
            {section.entries.map((entry) => {
              const { definition, disabled, statusLabel } = entry;
              const isSelected = !isHomeSelected && definition.id === selectedPuzzleId;

              return (
                <button
                  key={definition.id}
                  type="button"
                  class={`catalog-card ${isSelected ? "selected" : ""}`}
                  aria-current={isSelected ? "page" : undefined}
                  disabled={disabled}
                  onClick={() => onSelectPuzzle(definition.id)}
                >
                  <span class="catalog-card-icon" aria-hidden="true">{puzzleIcons[definition.id]}</span>
                  {statusLabel ? <span class={`status ${definition.status}`}>{statusLabel}</span> : null}
                  <strong>{definition.title}</strong>
                  <span>{definition.tagline}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  </aside>
);
