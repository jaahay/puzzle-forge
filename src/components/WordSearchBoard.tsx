import type { ComponentChildren, JSX } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { chooseWordSearchEndpoint, moveWordSearchFocus, wordSearchCellAt, wordSearchDragEnd, type WordSearchEndpoints } from "../games/wordSearch/interaction";
import { wordSearchPath, type WordSearchBoard as Board } from "../games/wordSearch/model";
import { isWordSearchComplete, wordSearchFoundCells, type WordSearchProgress } from "../games/wordSearch/progress";
import "../site/word-search.css";

type Props = {
  board: Board;
  progress: WordSearchProgress;
  onSelectEndpoints: (start: number, end: number) => void;
  disabled?: boolean;
  resetVersion?: number;
  controls?: ComponentChildren;
};

type Drag = {
  pointerId: number;
  start: number;
  end: number;
  moved: boolean;
};

const PathMark = ({ size, start, end, preview = false }: WordSearchEndpoints & { size: number; preview?: boolean }) => (
  <line
    class={preview ? "word-search-path-preview" : "word-search-path-found"}
    x1={start % size + 0.5} y1={Math.floor(start / size) + 0.5}
    x2={end % size + 0.5} y2={Math.floor(end / size) + 0.5}
  />
);

// This surface owns only gesture/focus state. Its parent owns the current
// resource's progress, completion, persistence and reset.
type SurfaceProps = Omit<Props, "controls" | "resetVersion"> & { found: ReadonlySet<string> };

const WordSearchBoardSurface = ({ board, progress, onSelectEndpoints, disabled = false, found }: SurfaceProps) => {
  const { size } = board;
  const instructionsId = useId();
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [focusCell, setFocusCell] = useState(0);
  const complete = isWordSearchComplete(board, progress);
  const blocked = disabled || complete;
  const foundCells = wordSearchFoundCells(board, progress);
  const keyboardPreview = anchor !== null && wordSearchPath(size, anchor, focusCell).length > 0
    ? { start: anchor, end: focusCell } : anchor !== null ? { start: anchor, end: anchor } : null;
  const preview = blocked ? null : drag ?? keyboardPreview;
  const previewCells = new Set(preview ? wordSearchPath(size, preview.start, preview.end) : []);

  const clearDrag = () => {
    const previous = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (previous && gridRef.current?.hasPointerCapture(previous.pointerId)) {
      gridRef.current.releasePointerCapture(previous.pointerId);
    }
  };

  useEffect(() => {
    if (blocked) {
      clearDrag();
      setAnchor(null);
    }
  }, [blocked]);

  const commit = ({ start, end }: WordSearchEndpoints) => {
    if (blocked) return;
    onSelectEndpoints(start, end);
  };

  const activate = (cell: number) => {
    if (blocked) return;
    const choice = chooseWordSearchEndpoint(size, anchor, cell);
    setAnchor(choice.anchor);
    if (choice.selection) commit(choice.selection);
  };

  const focusAt = (cell: number) => {
    setFocusCell(cell);
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-word-search-cell="${cell}"]`)?.focus({ preventScroll: true });
  };

  const onPointerDown = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (blocked || !event.isPrimary || event.button !== 0 || dragRef.current) return;
    const start = wordSearchCellAt(size, event.currentTarget.getBoundingClientRect(), { x: event.clientX, y: event.clientY });
    if (start === null) return;
    event.preventDefault();
    focusAt(start);
    const next = { pointerId: event.pointerId, start, end: start, moved: false };
    dragRef.current = next;
    setDrag(next);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateDrag = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId || blocked) return null;
    const end = wordSearchDragEnd(size, current.start, event.currentTarget.getBoundingClientRect(), { x: event.clientX, y: event.clientY });
    const moved = current.moved || end !== current.start;
    if (end === current.end && moved === current.moved) return current;
    const next = { ...current, end, moved };
    dragRef.current = next;
    setDrag(next);
    return next;
  };

  const onPointerUp = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    const current = updateDrag(event);
    if (!current) return;
    const releasedCell = wordSearchCellAt(size, event.currentTarget.getBoundingClientRect(), { x: event.clientX, y: event.clientY });
    clearDrag();
    if (current.moved) {
      setAnchor(null);
      if (current.end !== current.start) commit(current);
    } else if (releasedCell === current.start) {
      activate(current.start);
    }
  };

  const cancelPointer = (event: JSX.TargetedPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    clearDrag();
    setAnchor(null);
  };

  const onCellKeyDown = (event: JSX.TargetedKeyboardEvent<HTMLButtonElement>, cell: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "Escape" && (anchor !== null || dragRef.current)) {
      event.preventDefault();
      event.stopPropagation();
      clearDrag();
      setAnchor(null);
      return;
    }
    if (disabled || dragRef.current) return;
    if (event.repeat && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      return;
    }
    const next = moveWordSearchFocus(size, cell, event.key);
    if (next !== null) {
      event.preventDefault();
      focusAt(next);
    }
    // Native button keyboard activation and assistive technology use click.
  };

  return (
    <>
        <div class="word-search-board"
          ref={gridRef}
          style={{ "--word-search-size": size } as JSX.CSSProperties}
          role="group"
          aria-label="Letter board"
          aria-describedby={instructionsId}
          aria-disabled={blocked || undefined}
          onPointerDown={onPointerDown}
          onPointerMove={updateDrag}
          onPointerUp={onPointerUp}
          onPointerCancel={cancelPointer}
          onLostPointerCapture={cancelPointer}
        >
          <svg class="word-search-paths" viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
            {board.targets.filter(target => found.has(target.word)).map(target => (
              <PathMark key={target.word} size={size} start={target.start} end={target.end} />
            ))}
            {preview ? <PathMark size={size} start={preview.start} end={preview.end} preview /> : null}
          </svg>
          {board.letters.map((letter, cell) => (
            <button key={cell} type="button"
              data-word-search-cell={cell}
              class={`word-search-letter${foundCells.has(cell) ? " found" : ""}${previewCells.has(cell) ? " preview" : ""}`}
              aria-label={`${letter}, row ${Math.floor(cell / size) + 1}, column ${cell % size + 1}${foundCells.has(cell) ? ", found word" : ""}`}
              aria-pressed={previewCells.has(cell)}
              aria-disabled={blocked || undefined}
              disabled={disabled}
              tabIndex={cell === focusCell ? 0 : -1}
              onFocus={() => setFocusCell(cell)}
              onKeyDown={event => onCellKeyDown(event, cell)}
              onClick={event => { if (event.detail === 0 && !dragRef.current) activate(cell); }}
            >{letter}</button>
          ))}
        </div>
        <p class="word-search-instructions" id={instructionsId}>Drag across a word or select its two endpoints.
          <span class="sr-only"> Use arrow keys to move between letters, Enter or Space to select endpoints, and Escape to cancel.</span>
        </p>
    </>
  );
};

// Only the gesture surface remounts on reset; the surrounding controls and
// word list keep their DOM identity (including the Reset focus target).
export const WordSearchBoard = ({ controls, resetVersion, ...props }: Props) => {
  const { board, progress } = props;
  const found = new Set(progress.found);
  return (
    <section class="word-search-play" aria-label="Word Search">
      <div class="word-search-board-column">
        <WordSearchBoardSurface key={`${board.checksum}:${resetVersion ?? 0}`} {...props} found={found} />
        {controls}
      </div>
      <aside class="word-search-word-list" aria-label="Words to find">
        <ul>
          {board.targets.map(target => (
            <li key={target.word} class={found.has(target.word) ? "found" : undefined}>
              <span>{target.word}</span>
              {found.has(target.word) ? <span class="sr-only"> (found)</span> : null}
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
};
