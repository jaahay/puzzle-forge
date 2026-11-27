import type { ComponentChildren, JSX } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import type { CrosswordBoard as Board, CrosswordDirection } from "../games/crossword/model";
import {
  activeCrosswordEntry, applyCrosswordKey, initialCrosswordSelection, crossingCrosswordEntry, selectCrosswordCell, selectCrosswordEntry,
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
  const crossing = crossingCrosswordEntry(board, selection);
  const entryId = (clue: NonNullable<typeof entry>) => `${clueId}-${clue.direction}-${clue.number}`;
  const describedBy = [entry, crossing].flatMap(clue => clue ? [entryId(clue)] : []).join(" ");
  const solved = isCrosswordComplete(board, progress);
  const filled = !progress.letters.includes(".");
  const incorrect = new Set(checked ? getCrosswordIncorrectCells(board, progress) : []);
  const select = (next: CrosswordSelection, focus = true, scroll = false) => {
    setStored({ identity, selection: next });
    const target = grid.current?.querySelector<HTMLInputElement>(`[data-crossword-cell="${next.cell}"]`);
    if (focus && target) { target.focus({ preventScroll: true }); target.select(); }
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
  const onCellKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLInputElement>, cell: number) => {
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

  const onCellInput = (event: JSX.TargetedEvent<HTMLInputElement, Event>, cell: number) => {
    const input = event.currentTarget;
    if ("isComposing" in event && event.isComposing) return;
    const value = input.value;
    const letter = value.match(/[A-Za-z]/g)?.at(-1);
    // Native keyboards may emit input rather than keydown. Restore the
    // controlled value until the parent accepts the common transition.
    input.value = progress.letters[cell] === "." ? "" : progress.letters[cell];
    if (value === "") applyKey("Backspace", true, { ...selection, cell });
    else if (letter) applyKey(letter, true, { ...selection, cell });
  };

  return (
    <section class="crossword-surface" aria-label="Crossword">
      <div class="crossword-play">
      <div class="crossword-board-column">
        <div class="crossword-grid" ref={grid} role="group" aria-label="Crossword letter cells"
          aria-describedby={helpId} style={{ "--crossword-columns": board.width } as JSX.CSSProperties}>
          {board.blocks.map((block, cell) => {
            if (block) return <div key={cell} class="crossword-block" aria-hidden="true" />;
            const letter = progress.letters[cell] === "." ? "" : progress.letters[cell];
            const number = board.numbers[cell];
            const selected = cell === selection.cell;
            return <div key={cell} class={`crossword-cell${selected ? ` selected direction-${selection.direction}` : ""}${incorrect.has(cell) ? " incorrect" : ""}`}>
              {number !== null && <span class="crossword-cell-number" aria-hidden="true">{number}</span>}
              <input type="text" inputMode="text" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellcheck={false}
                value={letter} readOnly={solved} data-crossword-cell={cell} disabled={disabled} tabIndex={selected ? 0 : -1}
                aria-label={`Row ${Math.floor(cell / board.width) + 1}, column ${cell % board.width + 1}${number !== null ? ", number " + number : ""}${incorrect.has(cell) ? ", incorrect" : ""}`}
                aria-current={selected ? "true" : undefined} aria-describedby={selected ? describedBy : undefined}
                onFocus={event => {
                  const target = event.currentTarget;
                  setStored(current => {
                    const previous = current.identity === identity ? current.selection : initialCrosswordSelection(board);
                    return { identity, selection: selectCrosswordCell(board, previous, cell) };
                  });
                  target.select();
                }}
                onClick={event => event.currentTarget.select()}
                onKeyDown={event => onCellKeyDown(event, cell)}
                onInput={event => onCellInput(event, cell)} />
              {incorrect.has(cell) && <span class="crossword-error-mark" aria-hidden="true">×</span>}
            </div>;
          })}
        </div>
        <p id={helpId} class="sr-only">Type letters to fill the active entry. Arrow keys move between cells. Enter or Space changes direction. Backspace clears a letter. The emphasized clue is active. Choose a clue to change the active entry.</p>
      <aside class="crossword-clue-list" aria-label="Clues">
        {directions.map(direction => <section key={direction} aria-label={directionLabel(direction)}>
          <h3>{directionLabel(direction)}</h3>
          <ul>
            {board.entries.filter(candidate => candidate.direction === direction).map(candidate => {
              const active = candidate === entry;
              const intersects = candidate === crossing;
              return <li key={candidate.number}>
                <button id={entryId(candidate)} type="button" disabled={disabled} aria-current={active ? "true" : undefined}
                  class={active ? "active" : intersects ? "crossing" : undefined}
                  aria-label={`${candidate.number} ${directionLabel(direction)}: ${candidate.clue}${active ? ", active clue" : intersects ? ", intersecting clue" : ""}`}
                  onClick={() => { if (!disabled && !isPuzzleModalOpen()) select(selectCrosswordEntry(board, progress, selection, candidate.number, direction), true, true); }}>
                  <strong>{candidate.number}</strong><span>{candidate.clue}</span>
                </button>
              </li>;
            })}
          </ul>
        </section>)}
      </aside>
        <div class="crossword-feedback" role="status">{checked && !solved
          ? incorrect.size ? `${incorrect.size} ${incorrect.size === 1 ? "letter" : "letters"} to review.` : "All entered letters are correct."
          : filled && !solved ? "Grid filled — review your answers." : ""}</div>
        {controls}
      </div>

      </div>
    </section>
  );
};
