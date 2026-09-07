import { useEffect } from "preact/hooks";

type PuzzleHistoryActionsProps = {
  canUndo: boolean;
  canRedo: boolean;
  disabled?: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

type HistoryShortcutEvent = Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">;

export type PuzzleHistoryShortcutAction = "undo" | "redo" | null;

export const getPuzzleHistoryShortcutAction = (event: HistoryShortcutEvent): PuzzleHistoryShortcutAction => {
  if (event.altKey) return null;

  const key = event.key.toLowerCase();
  const commandModifier = event.ctrlKey || event.metaKey;

  if (key === "z" && commandModifier) return event.shiftKey ? "redo" : "undo";
  if (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey) return "redo";
  return null;
};

const isTextEditingTarget = (target: EventTarget | null) => {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
};

const UndoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 7 4 12l5 5" />
    <path d="M5 12h7a7 7 0 0 1 7 7" />
  </svg>
);

const RedoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m15 7 5 5-5 5" />
    <path d="M19 12h-7a7 7 0 0 0-7 7" />
  </svg>
);

export const PuzzleHistoryActions = ({
  canUndo,
  canRedo,
  disabled = false,
  onUndo,
  onRedo,
}: PuzzleHistoryActionsProps) => {
  useEffect(() => {
    if (disabled || typeof document === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTextEditingTarget(event.target)) return;
      const action = getPuzzleHistoryShortcutAction(event);

      if (action === "undo" && canUndo) {
        event.preventDefault();
        onUndo();
      } else if (action === "redo" && canRedo) {
        event.preventDefault();
        onRedo();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, disabled, onUndo, onRedo]);

  return (
    <div class="puzzle-history-actions" role="group" aria-label="Puzzle history">
      <button
        type="button"
        onClick={onUndo}
        disabled={disabled || !canUndo}
        aria-label="Undo last puzzle action"
        aria-keyshortcuts="Control+Z Meta+Z"
        title="Undo (Ctrl/Cmd+Z)"
      >
        <UndoIcon />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={disabled || !canRedo}
        aria-label="Redo last puzzle action"
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
        title="Redo (Ctrl/Cmd+Shift+Z or Ctrl+Y)"
      >
        <RedoIcon />
      </button>
    </div>
  );
};
