// Document-level puzzle shortcuts must not override the control that owns keyboard focus.
const interactiveTargetSelector = [
  "button",
  "a[href]",
  "summary",
  "input",
  "textarea",
  "select",
  "[contenteditable]:not([contenteditable='false'])",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='menuitem']",
  "[role='option']",
  "[role='textbox']",
  "[role='combobox']",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

type PuzzleShortcutEvent = Pick<
  KeyboardEvent,
  "target" | "defaultPrevented" | "isComposing" | "altKey" | "ctrlKey" | "metaKey"
>;

type PuzzleShortcutOptions = {
  modalOpen?: boolean;
  boardCellSelector?: string;
};

export const shouldHandlePuzzleShortcut = (
  event: PuzzleShortcutEvent,
  { modalOpen = false, boardCellSelector }: PuzzleShortcutOptions = {},
): boolean => {
  if (modalOpen || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) {
    return false;
  }

  const target = event.target as Element | null;
  if (!target || typeof target.closest !== "function") return true;

  const focusedControl = target.closest(interactiveTargetSelector);
  if (!focusedControl) return true;

  return Boolean(boardCellSelector && focusedControl.matches(boardCellSelector));
};

export const isPuzzleModalOpen = () =>
  typeof document !== "undefined" &&
  Boolean(document.querySelector('dialog[open], [aria-modal="true"]'));
