import type { ComponentChildren, JSX } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { CrosswordBoard as Board, CrosswordDirection } from "../games/crossword/model";
import {
  activeCrosswordEntry, applyCrosswordKey, initialCrosswordSelection, moveCrosswordClue, selectCrosswordCell, selectCrosswordEntry,
  type CrosswordSelection,
} from "../games/crossword/interaction";
import { getCrosswordIncorrectCells, isCrosswordComplete, type CrosswordProgress } from "../games/crossword/progress";
import { isPuzzleModalOpen } from "../interactions/keyboardOwnership";
import "../site/crossword.css";

type Props = {
  board: Board;
  progress: CrosswordProgress;
  onProgressChange: (progress: CrosswordProgress) => void;
  disabled?: boolean;
  resetVersion?: number;
  checked?: boolean;
  controls?: ComponentChildren;
};

const directions: readonly CrosswordDirection[] = ["across", "down"];
const keyboardRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const directionLabel = (direction: CrosswordDirection) => direction === "across" ? "Across" : "Down";

// The parent owns the resource and progress. Only selection and focus live
// here; no private persistence, generation, or completion state.
export const CrosswordBoard = ({ board, progress, onProgressChange, disabled = false, controls, resetVersion = 0, checked = false }: Props) => {
  // Reset only transient selection, not the surrounding controls or their focus.
  const identity = JSON.stringify([board.seed, board.checksum, resetVersion]);
  const [stored, setStored] = useState(() => ({ identity, selection: initialCrosswordSelection(board) }));
  const selection = stored.identity === identity ? stored.selection : initialCrosswordSelection(board);
  useEffect(() => {
    setStored(current => current.identity === identity ? current : { identity, selection: initialCrosswordSelection(board) });
  }, [identity, board]);
  const grid = useRef<HTMLDivElement>(null);
  const clueId = useId();
  const helpId = useId();
  const entry = activeCrosswordEntry(board, selection);
  const activeCells = new Set(entry?.cells ?? []);
  const solved = isCrosswordComplete(board, progress);
  const filled = !progress.letters.includes(".");
  const incorrect = new Set(checked ? getCrosswordIncorrectCells(board, progress) : []);
  const select = (next: CrosswordSelection, focus = true, scroll = false) => {
    setStored({ identity, selection: next });
    const target = grid.current?.querySelector<HTMLButtonElement>(`[data-crossword-cell="${next.cell}"]`);
    if (focus) target?.focus({ preventScroll: true });
    if (scroll) target?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const applyKey = (key: string, focus = true, from = selection) => {
    if (disabled || isPuzzleModalOpen()) return false;
    const action = applyCrosswordKey(board, progress, from, key);
    if (!action) return false;
    if (action.progress !== progress) onProgressChange(action.progress);
    select(action.selection, focus || isCrosswordComplete(board, action.progress));
    return true;
  };
  const moveClue = (offset: -1 | 1) => {
    if (!disabled && !isPuzzleModalOpen()) select(moveCrosswordClue(board, progress, selection, offset));
  };
  const onCellKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLButtonElement>, cell: number) => {
    if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey || isPuzzleModalOpen()) return;
    if (event.shiftKey && !/^[A-Z]$/.test(event.key)) return;
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      return;
    }
    if (applyKey(event.key, true, { ...selection, cell })) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <section class="crossword-surface" aria-label="Crossword">
      <div class="crossword-play">
      <div class="crossword-board-column">
        <div class="crossword-clue-navigation">
          <div class="crossword-active-clue" id={clueId} aria-live="polite" aria-atomic="true">
            {entry && <><strong>{entry.number} {directionLabel(entry.direction)}</strong><span>{entry.clue}</span></>}
          </div>
          <div class="crossword-clue-step" aria-label="Clue navigation" role="group">
            <button type="button" disabled={disabled} onClick={() => moveClue(-1)}>Previous clue</button>
            <button type="button" disabled={disabled} onClick={() => moveClue(1)}>Next clue</button>
          </div>
        </div>
        <div class="crossword-grid" ref={grid} role="group" aria-label="Crossword letter cells"
          aria-describedby={helpId} style={{ "--crossword-columns": board.width } as JSX.CSSProperties}>
          {board.blocks.map((block, cell) => {
            if (block) return <div key={cell} class="crossword-block" aria-hidden="true" />;
            const letter = progress.letters[cell] === "." ? "" : progress.letters[cell];
            const number = board.numbers[cell];
            const selected = cell === selection.cell;
            return <button key={cell} type="button" class={`crossword-cell${activeCells.has(cell) ? " in-entry" : ""}${selected ? " selected" : ""}${incorrect.has(cell) ? " incorrect" : ""}`}
              data-crossword-cell={cell} disabled={disabled} tabIndex={selected ? 0 : -1}
              aria-label={`Row ${Math.floor(cell / board.width) + 1}, column ${cell % board.width + 1}, ${number !== null ? "number " + number + ", " : ""}${letter || "empty"}${incorrect.has(cell) ? ", incorrect" : ""}`}
              aria-current={selected ? "true" : undefined}
              aria-describedby={selected ? clueId : undefined}
              onClick={() => { if (!disabled && !isPuzzleModalOpen()) select(selectCrosswordCell(board, selection, cell)); }}
              onKeyDown={event => onCellKeyDown(event, cell)}>
              {number !== null && <span class="crossword-cell-number" aria-hidden="true">{number}</span>}
              <span aria-hidden="true">{letter}</span>
              {incorrect.has(cell) && <span class="crossword-error-mark" aria-hidden="true">×</span>}
            </button>;
          })}
        </div>
        <p id={helpId} class="sr-only">Type letters to fill the active entry. Arrow keys move between cells. Enter or Space changes direction. Backspace clears a letter. Choose any clue to jump to its entry.</p>
        {!solved && <div class="crossword-keyboard" role="group" aria-label="Letter keyboard">
          {keyboardRows.map(row => <div class="crossword-keyboard-row" key={row}>
            {[...row].map(letter => <button key={letter} type="button" disabled={disabled}
              onClick={event => applyKey(letter, event.detail > 0)}>{letter}</button>)}
            {row === keyboardRows[2] && <button type="button" class="crossword-delete" disabled={disabled}
              onClick={event => applyKey("Backspace", event.detail > 0)}>Backspace</button>}
          </div>)}
        </div>}
        <div class="crossword-feedback" role="status">{checked && !solved
          ? incorrect.size ? `${incorrect.size} ${incorrect.size === 1 ? "letter" : "letters"} to review.` : "All entered letters are correct."
          : filled && !solved ? "Grid filled — review your answers." : ""}</div>
        {controls}
      </div>
      <aside class="crossword-clue-list" aria-label="Clues">
        {directions.map(direction => <section key={direction} aria-label={directionLabel(direction)}>
          <h3>{directionLabel(direction)}</h3>
          <ul>
            {board.entries.filter(candidate => candidate.direction === direction).map(candidate => {
              const active = candidate === entry;
              return <li key={candidate.number}>
                <button type="button" disabled={disabled} aria-current={active ? "true" : undefined}
                  class={active ? "active" : undefined}
                  onClick={() => { if (!disabled && !isPuzzleModalOpen()) select(selectCrosswordEntry(board, progress, selection, candidate.number, direction), true, true); }}>
                  <strong>{candidate.number}</strong><span>{candidate.clue}</span>
                </button>
              </li>;
            })}
          </ul>
        </section>)}
      </aside>
      </div>
    </section>
  );
};
