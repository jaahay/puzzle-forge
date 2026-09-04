import { useEffect, useRef, useState } from "preact/hooks";

type BoundedNumberInputProps = {
  value: number;
  min: number;
  max: number;
  ariaLabel?: string;
  disabled?: boolean;
  commitOnValidInput?: boolean;
  onCommit: (value: number) => void;
};

const clampInteger = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(value)));

export const BoundedNumberInput = ({
  value,
  min,
  max,
  ariaLabel,
  disabled = false,
  commitOnValidInput = false,
  onCommit,
}: BoundedNumberInputProps) => {
  const [draft, setDraft] = useState(String(value));
  const isEditing = useRef(false);

  useEffect(() => {
    if (!isEditing.current) setDraft(String(value));
  }, [value]);

  const updateDraft = (nextDraft: string) => {
    setDraft(nextDraft);
    if (!commitOnValidInput || nextDraft.trim() === "") return;

    const parsed = Number(nextDraft);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) return;
    onCommit(parsed);
  };

  const commit = () => {
    isEditing.current = false;
    const parsed = draft.trim() === "" ? value : Number(draft);
    const nextValue = clampInteger(Number.isFinite(parsed) ? parsed : value, min, max);
    setDraft(String(nextValue));
    onCommit(nextValue);
  };

  return (
    <input
      aria-label={ariaLabel}
      type="number"
      min={min}
      max={max}
      value={draft}
      disabled={disabled}
      onFocus={() => { isEditing.current = true; }}
      onInput={(event) => updateDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.currentTarget instanceof HTMLElement) event.currentTarget.blur();
      }}
    />
  );
};
