import { useEffect, useRef } from "preact/hooks";

import type { DestructivePuzzleAction } from "../app/abandonmentPolicy";

type Props = { action: DestructivePuzzleAction; onCancel: () => void; onConfirm: () => void };

export const AbandonmentDialog = ({ action, onCancel, onConfirm }: Props) => {
  const safe = useRef<HTMLButtonElement>(null);
  const destructive = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    safe.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  const isNew = action === "new";
  return (
    <div class="puzzle-abandon-backdrop" onPointerDown={(event) => event.stopPropagation()}>
      <section class="puzzle-abandon-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="puzzle-abandon-title" aria-describedby="puzzle-abandon-description"
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          } else if (event.key === "Tab") {
            if (event.shiftKey && document.activeElement === safe.current) {
              event.preventDefault();
              destructive.current?.focus();
            } else if (!event.shiftKey && document.activeElement === destructive.current) {
              event.preventDefault();
              safe.current?.focus();
            }
          }
        }}>
        <h2 id="puzzle-abandon-title">{isNew ? "Start a new puzzle?" : "Reset this puzzle?"}</h2>
        <p id="puzzle-abandon-description">
          {isNew
            ? "You have unfinished progress in this puzzle. Starting another will leave it behind."
            : "Resetting will clear your unfinished progress in this puzzle."}
        </p>
        <div class="puzzle-abandon-actions">
          <button ref={safe} type="button" onClick={onCancel}>Keep playing</button>
          <button ref={destructive} class="puzzle-abandon-confirm" type="button" onClick={onConfirm}>
            {isNew ? "New puzzle" : "Reset"}
          </button>
        </div>
      </section>
    </div>
  );
};
