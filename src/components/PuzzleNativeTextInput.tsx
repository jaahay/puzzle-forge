import type { ComponentChildren } from "preact";
import { useRef } from "preact/hooks";

const nativeTextInputMarker = "true";

export type PuzzleNativeEnterKeyHint = "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
export type PuzzleNativeInputMode = "text" | "numeric" | "decimal" | "search" | "email" | "tel" | "url";

type PuzzleNativeTextInputProps = {
  children: ComponentChildren;
  className: string;
  inputClassName: string;
  ariaLabel: string;
  enabled: boolean;
  inputMode?: PuzzleNativeInputMode;
  enterKeyHint?: PuzzleNativeEnterKeyHint;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  hapticsEnabled?: boolean;
  hapticDurationMs?: number;
  onTextInput: (value: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
};

type NavigatorWithVibrate = Navigator & {
  vibrate?: (pattern: number | number[]) => boolean;
};

export const isPuzzleNativeTextInputTarget = (target: EventTarget | null) =>
  (target as HTMLElement | null)?.dataset?.puzzleNativeTextInput === nativeTextInputMarker;

export const PuzzleNativeTextInput = ({
  children,
  className,
  inputClassName,
  ariaLabel,
  enabled,
  inputMode = "text",
  enterKeyHint = "done",
  autoCapitalize = "none",
  hapticsEnabled = false,
  hapticDurationMs = 8,
  onTextInput,
  onBackspace,
  onEnter,
}: PuzzleNativeTextInputProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const browserInputAttributes = {
    autocapitalize: autoCapitalize,
    autocorrect: "off",
    enterkeyhint: enterKeyHint,
  } as Record<string, string>;

  const pulseHaptics = () => {
    if (!hapticsEnabled || typeof navigator === "undefined") {
      return;
    }

    const vibrate = (navigator as NavigatorWithVibrate).vibrate;
    if (typeof vibrate === "function") {
      vibrate(hapticDurationMs);
    }
  };

  const focusInput = () => {
    if (enabled) {
      inputRef.current?.focus();
    }
  };

  const handleInputValue = (input: HTMLInputElement) => {
    const value = input.value;

    if (!value) {
      return;
    }

    onTextInput(value);
    pulseHaptics();
    input.value = "";
  };

  const handleInputKey = (event: KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      onEnter();
      pulseHaptics();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      onBackspace();
      pulseHaptics();
      return;
    }

    event.stopPropagation();
  };

  return (
    <div class={className} onClick={focusInput}>
      <input
        ref={inputRef}
        class={inputClassName}
        type="text"
        inputMode={inputMode}
        autoComplete="off"
        {...browserInputAttributes}
        spellCheck={false}
        aria-label={ariaLabel}
        disabled={!enabled}
        tabIndex={enabled ? 0 : -1}
        data-puzzle-native-text-input={nativeTextInputMarker}
        onInput={(event) => handleInputValue(event.currentTarget)}
        onKeyDown={(event) => handleInputKey(event)}
      />
      {children}
    </div>
  );
};
