# Puzzle Input and Output Model

Puzzle Forge treats input as part of each puzzle's interaction contract, not as a generic text-entry problem.

A puzzle module should choose controls based on the semantic operation the player is performing. Native text fields are appropriate when the player is actually writing text. They are usually the wrong primitive when the player is selecting constrained symbols for a board.

## Input rule

Use the narrowest control that matches the puzzle action.

| Puzzle input class | Primary control | Examples |
| --- | --- | --- |
| Numeric symbolic input | Custom numeric pad plus physical keyboard support | Sudoku, Logic Grid, Futoshiki, KenKen, Kakuro |
| Alphabetic constrained input | Custom letter keyboard plus physical keyboard support | Word Guess, word ladders, fixed-width clue answers |
| Alphanumeric symbolic input | Custom segmented or mixed keypad plus physical keyboard support | Coordinates, cipher keys, Battleship-style entries, region labels |
| Free-form text input | Native text input | Search, naming, long-form answers, unrestricted clues |
| Point/toggle input | Direct board controls | Nonogram, Minesweeper, Peg Solitaire, Akari toggles |
| Drag/move input | Direct manipulation with keyboard fallback when practical | Solitaire, tile puzzles, path puzzles |

## Output rule

The board is the primary output surface for puzzle state.

Input controls should not obscure the board on mobile unless the puzzle is explicitly a free-form text-entry task. For constrained puzzle input, prefer keeping the board stable and placing puzzle-owned controls near the board.

## Numeric puzzles

Numeric puzzles should share the Sudoku-style input model:

- the player selects a target cell or slot;
- a custom numeric pad writes to that target;
- `1` through `9` on a physical keyboard write digits;
- `0`, `Backspace`, and `Delete` clear when clearing is legal;
- locked or clue cells may be selectable for highlighting, but not editable;
- the input pad is part of gameplay UI, not a hidden native input.

This model currently applies to Sudoku and should be reused by numeric grid puzzles such as Logic Grid, Futoshiki, KenKen, Kakuro, Hitori, Takuzu, and similar future entries.

## Alphabetic puzzles

Alphabetic puzzles should share the Word Guess-style input model when answers are constrained by puzzle structure:

- the game owns the active row, slot, or answer target;
- a custom letter keyboard writes letters;
- physical keyboard events dispatch the same semantic input actions;
- Enter submits when submission is part of the puzzle loop;
- Backspace removes the previous editable letter;
- key states can display puzzle feedback such as absent, present, and correct.

Use native text input only when the answer is genuinely free-form or when platform text features such as IME composition, selection, paste, or long-form editing are central to the interaction.

## Alphanumeric puzzles

Some puzzle classes are truly alphanumeric. They should not automatically fall back to native keyboard input.

Examples:

- coordinate entry such as `A5`, `C7`, or `J10`;
- cipher puzzles with letter-number mappings;
- labeled logic grids that mix category letters and numeric slots;
- crossnumber or crossword hybrids;
- code-token puzzles with compact answers such as `A1B2`;
- map or path puzzles that use row letters and column numbers.

For these, prefer a custom mixed keypad or segmented controls. A coordinate puzzle, for example, may expose row letters and column numbers separately instead of asking the player to type `A5` into a text box.

## Implementation direction

Long term, puzzle input should move toward semantic actions rather than DOM input events:

```ts
type PuzzleInput =
  | { type: "digit"; value: string }
  | { type: "letter"; value: string }
  | { type: "coordinate"; row: string; column: number }
  | { type: "enter" }
  | { type: "backspace" }
  | { type: "clear" }
  | { type: "toggle" };
```

On-screen controls and physical keyboard listeners should dispatch the same semantic actions. Puzzle logic should not depend on whether input came from a button, hardware keyboard, pointer gesture, or future accessibility shortcut.

## Mobile constraint

Mobile behavior is a first-class acceptance criterion for puzzle input.

If a puzzle uses constrained symbols, tapping the board should not unexpectedly summon the device keyboard. The expected mobile loop is:

1. choose a target on the board;
2. choose a symbol from the puzzle-owned controls;
3. observe the board update without layout interruption.

The native keyboard remains available only for puzzle surfaces that intentionally model free-form text entry.
