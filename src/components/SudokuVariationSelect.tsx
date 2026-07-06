import type { SudokuVariation } from "../catalog/types";
import { sudokuVariationLabels, sudokuVariations } from "../games/sudoku/variation";

type SudokuVariationSelectProps = {
  value: SudokuVariation;
  onChange: (variation: SudokuVariation) => void;
};

export const SudokuVariationSelect = ({ value, onChange }: SudokuVariationSelectProps) => (
  <select value={value} onChange={(event) => onChange(event.currentTarget.value as SudokuVariation)}>
    {sudokuVariations.map((variation) => (
      <option key={variation} value={variation}>
        {sudokuVariationLabels[variation]}
      </option>
    ))}
  </select>
);
