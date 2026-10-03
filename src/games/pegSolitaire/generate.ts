import { createGeneratedPuzzle, createRandom, normalizeSeed } from "../shared";
import type { PuzzleCell } from "../../catalog/types";

const boardShape = [
  "  xxx  ",
  "  xxx  ",
  "xxxxxxx",
  "xxxxxxx",
  "xxxxxxx",
  "  xxx  ",
  "  xxx  ",
];

const startHoles = [
  [3, 3],
  [2, 3],
  [3, 2],
  [3, 4],
  [4, 3],
] as const;

export const generatePegSolitaire = ({ seed }: { seed: string }) => {
  const normalizedSeed = normalizeSeed(seed);
  const random = createRandom(`${normalizedSeed}:peg-solitaire`);
  const [emptyRow, emptyColumn] = startHoles[Math.floor(random() * startHoles.length)];
  const cells: PuzzleCell[] = [];

  for (let row = 0; row < boardShape.length; row += 1) {
    for (let column = 0; column < boardShape[row].length; column += 1) {
      const isPlayable = boardShape[row][column] === "x";
      const isStartHole = row === emptyRow && column === emptyColumn;

      cells.push({
        row,
        column,
        value: isPlayable ? (isStartHole ? "○" : "●") : "",
        locked: !isPlayable || !isStartHole,
        tone: isPlayable ? (isStartHole ? "empty" : "given") : "disabled",
        ariaLabel: isPlayable
          ? isStartHole
            ? `Opening hole at row ${row + 1}, column ${column + 1}`
            : `Peg at row ${row + 1}, column ${column + 1}`
          : `Unavailable board space at row ${row + 1}, column ${column + 1}`,
      });
    }
  }

  return createGeneratedPuzzle({
    id: `peg-solitaire-${normalizedSeed}`,
    puzzleId: "peg-solitaire",
    title: "Peg Solitaire Board",
    seed: normalizedSeed,
    width: 7,
    height: 7,
    cells,
    notes: [
      "Classic English cross board with a seeded opening hole.",
      "Jump one peg over an adjacent peg into an empty hole, removing the jumped peg.",
      "This preview models board generation; move validation and solver hints can layer on next.",
    ],
  });
};
