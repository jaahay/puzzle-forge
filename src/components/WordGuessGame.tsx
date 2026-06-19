import { useEffect, useMemo, useState } from "preact/hooks";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { scoreWordGuess, type WordGuessMark } from "../games/wordle/feedback";
import { formatWordGuessShareText } from "../games/wordle/share";
import { getWordGuessBank, isValidWordGuess } from "../games/wordle/words";

const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"] as const;
type KeyboardMark = WordGuessMark | "unused";
const markRank: Record<KeyboardMark, number> = {
  unused: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

type WordGuessGameProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
  statusMessage: string;
  onCellInput: (cell: PuzzleCell, value: string) => void;
  onSubmitGuess: () => void;
  onRandomize: () => void;
};

const getRows = (cells: PuzzleCell[], rowCount: number) =>
  Array.from({ length: rowCount }, (_, row) => cells.filter((cell) => cell.row === row).sort((left, right) => left.column - right.column));

const getGuess = (rowCells: PuzzleCell[]) => rowCells.map((cell) => cell.value).join("").toUpperCase();

const getLetterFromKey = (key: string) => {
  const letter = key.toUpperCase();
  return letter.length === 1 && letter >= "A" && letter <= "Z" ? letter : "";
};

export const WordGuessGame = ({ puzzle, cells, statusMessage, onCellInput, onSubmitGuess, onRandomize }: WordGuessGameProps) => {
  const answer = puzzle.answerKey?.join("").toUpperCase() ?? "";
  const wordBank = useMemo(() => getWordGuessBank(puzzle.width), [puzzle.width]);
  const rows = useMemo(() => getRows(cells, puzzle.height), [cells, puzzle.height]);
  const [submittedRows, setSubmittedRows] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState(`Type a ${puzzle.width}-letter word.`);
  const [copiedShare, setCopiedShare] = useState(false);
  const activeRow = status === "playing" ? submittedRows : -1;
  const submittedGuesses = rows.slice(0, submittedRows).map(getGuess).filter((guess) => guess.length === puzzle.width);

  useEffect(() => {
    setSubmittedRows(0);
    setStatus("playing");
    setMessage(`Type a ${puzzle.width}-letter word.`);
    setCopiedShare(false);
  }, [puzzle.id, puzzle.width]);

  const submitGuess = () => {
    if (status !== "playing") {
      return;
    }

    const rowCells = rows[activeRow] ?? [];
    const guess = getGuess(rowCells);

    if (guess.length !== puzzle.width) {
      setMessage(`Enter ${puzzle.width} letters before submitting.`);
      return;
    }

    if (!isValidWordGuess(guess, wordBank)) {
      setMessage(`${guess} is not in the ${wordBank.length}-letter guess list.`);
      return;
    }

    onSubmitGuess();

    const nextSubmittedRows = submittedRows + 1;
    const won = guess === answer;
    const lost = !won && nextSubmittedRows >= puzzle.height;

    setSubmittedRows(nextSubmittedRows);
    setStatus(won ? "won" : lost ? "lost" : "playing");
    setMessage(won ? `Solved in ${nextSubmittedRows}/${puzzle.height}.` : lost ? `No match. The word was ${answer}.` : `${puzzle.height - nextSubmittedRows} attempt(s) remain.`);
  };

  const inputLetter = (letter: string) => {
    if (status !== "playing") {
      return;
    }

    const rowCells = rows[activeRow] ?? [];
    const nextCell = rowCells.find((cell) => !cell.value);

    if (!nextCell) {
      return;
    }

    onCellInput(nextCell, letter);
    setMessage(`Type a ${puzzle.width}-letter word.`);
    setCopiedShare(false);
  };

  const backspace = () => {
    if (status !== "playing") {
      return;
    }

    const rowCells = rows[activeRow] ?? [];
    const filledCells = rowCells.filter((cell) => cell.value);
    const previousCell = filledCells[filledCells.length - 1];

    if (previousCell) {
      onCellInput(previousCell, "");
    }

    setCopiedShare(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        submitGuess();
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        backspace();
        return;
      }

      const letter = getLetterFromKey(event.key);
      if (letter) {
        event.preventDefault();
        inputLetter(letter);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  const keyboardMarks = useMemo(() => {
    const marks = new Map<string, KeyboardMark>();

    for (const guess of submittedGuesses) {
      scoreWordGuess(answer, guess).forEach((mark, index) => {
        const letter = guess[index];
        const currentMark = letter ? marks.get(letter) ?? "unused" : "unused";

        if (letter && markRank[mark] > markRank[currentMark]) {
          marks.set(letter, mark);
        }
      });
    }

    return marks;
  }, [answer, submittedGuesses]);

  const shareText = formatWordGuessShareText({
    title: puzzle.title,
    seed: puzzle.seed,
    answer,
    guesses: submittedGuesses,
    maxGuesses: puzzle.height,
    status,
  });

  const copyShareText = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setMessage(shareText);
      return;
    }

    await navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
  };

  return (
    <section class="word-guess-game" aria-label={`${puzzle.width}-letter Word Guess game`}>
      <div class="word-guess-status" aria-live="polite">
        <strong>{message}</strong>
        <span>{statusMessage}</span>
      </div>

      <div class="word-guess-board" aria-label="Word Guess board">
        {rows.map((rowCells, rowIndex) => {
          const guess = getGuess(rowCells);
          const isSubmitted = rowIndex < submittedRows && guess.length === puzzle.width;
          const marks = isSubmitted ? scoreWordGuess(answer, guess) : [];

          return (
            <div class={`word-guess-row ${rowIndex === activeRow ? "active" : ""}`} key={rowIndex} aria-label={`Guess ${rowIndex + 1}`}>
              {rowCells.map((cell) => {
                const mark = marks[cell.column];
                const tileLabel = cell.value ? `${cell.value}${mark ? `, ${mark}` : ""}` : "Empty";

                return (
                  <span class={`word-guess-tile ${mark ?? "pending"}`} key={`${cell.row}-${cell.column}`} aria-label={tileLabel}>
                    {cell.value}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      <div class="word-guess-keyboard" aria-label="Word Guess keyboard">
        {keyboardRows.map((row, rowIndex) => (
          <div class="word-guess-keyboard-row" key={row}>
            {rowIndex === 2 ? (
              <button type="button" class="word-guess-key wide" disabled={status !== "playing"} onClick={submitGuess}>
                Enter
              </button>
            ) : null}
            {Array.from(row).map((letter) => {
              const mark = keyboardMarks.get(letter) ?? "unused";

              return (
                <button type="button" class={`word-guess-key ${mark}`} disabled={status !== "playing"} key={letter} onClick={() => inputLetter(letter)}>
                  {letter}
                </button>
              );
            })}
            {rowIndex === 2 ? (
              <button type="button" class="word-guess-key wide" disabled={status !== "playing"} onClick={backspace}>
                Back
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div class="word-guess-actions">
        <button type="button" onClick={submitGuess} disabled={status !== "playing"}>
          Submit guess
        </button>
        <button type="button" onClick={onRandomize}>
          New word
        </button>
        <button type="button" onClick={copyShareText} disabled={submittedRows === 0}>
          {copiedShare ? "Copied" : "Share"}
        </button>
      </div>
    </section>
  );
};
