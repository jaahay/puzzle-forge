import type { PuzzleDifficulty } from "../catalog/types";

const options: PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];

type Props = {
  value: PuzzleDifficulty;
  onChange: (value: PuzzleDifficulty) => void;
};

export const PuzzleDifficultySelect = ({ value, onChange }: Props) => (
  <select value={value} onChange={(changeEvent) => onChange(changeEvent.currentTarget.value as PuzzleDifficulty)}>
    {options.map((option) => (
      <option key={option}>{option}</option>
    ))}
  </select>
);
