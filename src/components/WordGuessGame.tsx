import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { GridGeneratedPuzzle, PuzzleCell } from "../catalog/types";
import { getWordGuessAnalysis } from "../games/wordGuess/analysis";
import { scoreWordGuess } from "../games/wordGuess/feedback";
import { readWordGuessProgress, writeWordGuessProgress, type WordGuessProgressStatus } from "../games/wordGuess/progress";
import { formatWordGuessShareText } from "../games/wordGuess/share";
import { getWordGuessBank, isValidWordGuess, normalizeWordGuessWord } from "../games/wordGuess/words";

const difficultyLabels = {
  gentle: "Gentle",
  steady: "Steady",
  sharp: "Sharp",
  severe: "Severe",
} as const;

const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const markRank = {
  absent: 1,
  present: 2,
  correct: 3,
} as const;

type WordGuessMark = keyof typeof markRank;

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

const getLetterMarks = (answer: string, submittedGuesses: string[]) => {
  const marks: Partial<Record<string, WordGuessMark>> = {};

  submittedGuesses.forEach((guess) => {
    scoreWordGuess(answer, guess).forEach((mark, index) => {
      const letter = guess[index];
      const existingMark = marks[letter];

      if (!existingMark || markRank[mark] > markRank[existingMark]) {
        marks[letter] = mark;
      }
    });
  });

  return marks;
};

const restoreGuessIntoRow = (rowCells: PuzzleCell[], guess: string, onCellInput: (cell: PuzzleCell, value: string) => void) => {
  Array.from(guess).forEach((letter, columnIndex) => {
    const cell = rowCells[columnIndex];

    if (cell && cell.value !== letter) {
      onCellInput(cell, letter);
    }
  });
};

export const WordGuessGame = ({ puzzle, cells, statusMessage, onCellInput, onSubmitGuess, onRandomize }: WordGuessGameProps) => {
  const answer = puzzle.answerKey?.join("").toUpperCase() ?? "";
  const wordBank = useMemo(() => getWordGuessBank(puzzle.width), [puzzle.width]);
  const rows = useMemo(() => getRows(cells, puzzle.height), [cells, puzzle.height]);
  const [submittedRows, setSubmittedRows] = useState(0);
  const [status, setStatus] = useState<WordGuessProgressStatus>("playing");
  const [message, setMessage] = useState(`Type a ${puzzle.width}-letter word.`);
  const [copiedShare, setCopiedShare] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  const restoredPuzzleId = useRef<string | null>(null);
  const skipNextSave = useRef(false);
  const nativeInputRef = useRef<HTMLInputElement | null>(null);
  const activeRow = status === "playing" ? submittedRows : -1;
  const rowGuesses = rows.map(getGuess);
  const submittedGuesses = rowGuesses.slice(0, submittedRows).filter((guess) => guess.length === puzzle.width);
  const submittedGuessKey = submittedGuesses.join("|");
  const analysis = useMemo(() => getWordGuessAnalysis(answer, submittedGuesses, wordBank), [answer, submittedGuessKey, wordBank]);
  const letterMarks = useMemo(() => getLetterMarks(answer, submittedGuesses), [answer, submittedGuessKey]);

  useEffect(() => {
    if (restoredPuzzleId.current === puzzle.id) {
      return;
    }

    restoredPuzzleId.current = puzzle.id;
    skipNextSave.current = true;
    setSubmittedRows(0);
    setStatus("playing");
    setMessage(`Type a ${puzzle.width}-letter word.`);
    setCopiedShare(false);
    setHardMode(false);

    const saved = readWordGuessProgress(puzzle.id);

    if (saved && saved.puzzleId === puzzle.id && saved.wordLength === puzzle.width && saved.maxGuesses === puzzle.height) {
      const restoredGuesses = saved.guesses
        .slice(0, puzzle.height)
        .map((guess) => normalizeWordGuessWord(guess).slice(0, puzzle.width))
        .filter((guess) => guess.length === puzzle.width);
      const restoredCurrentInput = saved.status === "playing" ? normalizeWordGuessWord(saved.currentInput ?? "").slice(0, puzzle.width) : "";
      const restoredSubmittedRows = Math.min(restoredGuesses.length, puzzle.height);

      restoredGuesses.forEach((guess, rowIndex) => {
        restoreGuessIntoRow(rows[rowIndex] ?? [], guess, onCellInput);
      });

      if (restoredCurrentInput && restoredSubmittedRows < puzzle.height) {
        restoreGuessIntoRow(rows[restoredSubmittedRows] ?? [], restoredCurrentInput, onCellInput);
      }

      setSubmittedRows(restoredSubmittedRows);
      setStatus(saved.status);
      setMessage(
        saved.status === "won"
          ? `Solved in ${restoredSubmittedRows}/${puzzle.height}.`
          : saved.status === "lost"
            ? `No match. The word was ${answer}.`
            : restoredSubmittedRows > 0
              ? `${puzzle.height - restoredSubmittedRows} attempt(s) remain.`
              : `Type a ${puzzle.width}-letter word.`,
      );
    }

    window.setTimeout(() => {
      skipNextSave.current = false;
    }, 0);
  }, [answer, onCellInput, puzzle.id, puzzle.height, puzzle.width, rows]);

  useEffect(() => {
    if (skipNextSave.current) {
      return;
    }

    const currentInput = status === "playing" ? rowGuesses[submittedRows] ?? "" : "";
    writeWordGuessProgress({
      puzzleId: puzzle.id,
      wordLength: puzzle.width,
      maxGuesses: puzzle.height,
      guesses: submittedGuesses,
      currentInput: currentInput || undefined,
      status,
    });
  }, [puzzle.id, puzzle.height, puzzle.width, rowGuesses, status, submittedGuesses, submittedRows]);

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
      setMessage(`${guess} is not in the ${wordBank.length}-letter word list.`);
      return;
    }

    if (hardMode && submittedGuesses.length > 0 && !analysis.currentCandidates.includes(guess)) {
      setMessage(`Hard mode: ${guess} is ruled out by previous feedback.`);
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

  const focusNativeInput = () => {
    if (status === "playing") {
      nativeInputRef.current?.focus();
    }
  };

  const handleNativeInput = (value: string) => {
    Array.from(normalizeWordGuessWord(value)).forEach(inputLetter);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target === nativeInputRef.current || event.altKey || event.ctrlKey || event.metaKey) {
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
        <span>Type or tap letters, then Enter. Backspace erases.</span>
      </div>

      <div class="word-guess-board-shell" onClick={focusNativeInput}>
        <input
          ref={nativeInputRef}
          class="word-guess-native-input"
          type="text"
          autoComplete="off"
          spellcheck={false}
          aria-label="Type your Word Guess answer"
          disabled={status !== "playing"}
          tabIndex={status === "playing" ? 0 : -1}
          onInput={(event) => {
            const input = event.currentTarget;
            handleNativeInput(input.value);
            input.value = "";
          }}
          onKeyDown={(event) => {
            if (event.altKey || event.ctrlKey || event.metaKey) {
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              event.stopPropagation();
              submitGuess();
              return;
            }

            if (event.key === "Backspace") {
              event.preventDefault();
              event.stopPropagation();
              backspace();
              return;
            }

            event.stopPropagation();
          }}
        />
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
      </div>

      <div class="word-guess-keyboard" aria-label="Word Guess on-screen keyboard">
        {keyboardRows.map((row, rowIndex) => (
          <div class="word-guess-keyboard-row" key={row}>
            {rowIndex === 2 ? (
              <button class="word-guess-key wide" type="button" onClick={submitGuess} disabled={status !== "playing"}>
                Enter
              </button>
            ) : null}
            {Array.from(row).map((letter) => {
              const mark = letterMarks[letter];

              return (
                <button class={`word-guess-key ${mark ?? "unknown"}`} key={letter} type="button" onClick={() => inputLetter(letter)} disabled={status !== "playing"}>
                  {letter}
                </button>
              );
            })}
            {rowIndex === 2 ? (
              <button class="word-guess-key wide" type="button" onClick={backspace} disabled={status !== "playing"} aria-label="Backspace">
                ⌫
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div class="word-guess-actions">
        <button type="button" onClick={submitGuess} disabled={status !== "playing"}>
          Submit
        </button>
        <button type="button" onClick={onRandomize}>
          New word
        </button>
        <button type="button" onClick={copyShareText} disabled={submittedRows === 0}>
          {copiedShare ? "Copied" : "Share"}
        </button>
      </div>

      <details class="word-guess-solver-details">
        <summary>Solver details</summary>
        <div class="word-guess-analysis-header">
          <div>
            <strong>{analysis.candidateCount}</strong>
            <span>possible answer{analysis.candidateCount === 1 ? "" : "s"} remain</span>
          </div>
          <div>
            <strong>{difficultyLabels[analysis.difficultyBand]}</strong>
            <span>difficulty estimate</span>
          </div>
          <div>
            <strong>{analysis.bestStarter.guess || "—"}</strong>
            <span>solver starter</span>
          </div>
        </div>

        <label class="word-guess-hard-mode">
          <input type="checkbox" checked={hardMode} onChange={(event) => setHardMode(event.currentTarget.checked)} disabled={status !== "playing" && submittedRows > 0} />
          <span>Hard mode: guesses must remain possible under prior feedback.</span>
        </label>

        {analysis.steps.length > 0 ? (
          <ol class="word-guess-candidate-steps">
            {analysis.steps.map((step, index) => (
              <li key={`${step.guess}-${index}`}>
                <strong>{step.guess}</strong>
                <span>{step.before} → {step.after}</span>
                <span>{step.eliminated} eliminated</span>
              </li>
            ))}
          </ol>
        ) : (
          <p class="word-guess-analysis-note">
            Dictionary: {wordBank.dictionaryId}. {wordBank.answers.length} possible answers, {wordBank.validGuesses.length} valid guesses.
          </p>
        )}
      </details>

      <span class="sr-only">{statusMessage}</span>
    </section>
  );
};