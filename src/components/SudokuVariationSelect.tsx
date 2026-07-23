import type { SudokuVariation } from "../catalog/types";
import { sudokuVariationDifficultyNotes, sudokuVariationLabels, sudokuVariations } from "../games/sudoku/variation";

type SudokuVariationSelectProps = {
  value: SudokuVariation;
  onChange: (variation: SudokuVariation) => void;
};

export const SudokuVariationSelect = ({ value, onChange }: SudokuVariationSelectProps) => (
  <>
    <select value={value} onChange={(event) => onChange(event.currentTarget.value as SudokuVariation)}>
      {sudokuVariations.map((variation) => (
        <option key={variation} value={variation}>
          {sudokuVariationLabels[variation]}
        </option>
      ))}
    </select>
    {sudokuVariationDifficultyNotes[value] ? <small>{sudokuVariationDifficultyNotes[value]}</small> : null}
  </>
);
