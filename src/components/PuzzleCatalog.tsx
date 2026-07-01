import { getPuzzleAvailability } from "../catalog/puzzleAvailability";
import { homeIcon, puzzleIcons } from "../catalog/puzzleIcons";
import type { PuzzleId } from "../catalog/types";

const { readyPuzzles, previewPuzzles } = getPuzzleAvailability();

type PuzzleCatalogProps = {
  isCollapsed: boolean;
  isHomeSelected: boolean;
  selectedPuzzleId: PuzzleId;
  onCollapseToggle: () => void;
  onHomeSelect: () => void;
  onSelectPuzzle: (puzzleId: PuzzleId) => void;
};

export const PuzzleCatalog = ({ isHomeSelected, selectedPuzzleId, onHomeSelect, onSelectPuzzle }: PuzzleCatalogProps) => {
  const selectedCatalogValue = isHomeSelected ? "home" : selectedPuzzleId;
  const handleNavigation = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;

    if (value === "home") {
      onHomeSelect();
      return;
    }

    onSelectPuzzle(value as PuzzleId);
  };

  return (
    <aside class="catalog-panel" aria-label="Puzzle catalog" id="puzzle-catalog">
      <div class="catalog-mobile-nav">
        <select aria-label="Choose puzzle" value={selectedCatalogValue} onChange={handleNavigation}>
          <option value="home">{homeIcon} Home</option>
          {readyPuzzles.map((definition) => (
            <option key={definition.id} value={definition.id}>{puzzleIcons[definition.id]} {definition.title}</option>
          ))}
          {previewPuzzles.map((definition) => (
            <option key={definition.id} value={definition.id}>{puzzleIcons[definition.id]} {definition.title} · Preview</option>
          ))}
        </select>
      </div>
    </aside>
  );
};
