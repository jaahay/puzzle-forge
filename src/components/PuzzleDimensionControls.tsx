import type { PuzzleDefinition } from "../catalog/types";

type PuzzleDimensionControlsProps = {
  selectedDefinition: PuzzleDefinition;
  width: number;
  height: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings: { width?: number; height?: number }) => void;
};

const blurOnEnter = (event: KeyboardEvent) => {
  if (event.key === "Enter" && event.currentTarget instanceof HTMLElement) {
    event.currentTarget.blur();
  }
};

export const PuzzleDimensionControls = ({
  selectedDefinition,
  width,
  height,
  onWidthChange,
  onHeightChange,
  onSettingsCommit,
}: PuzzleDimensionControlsProps) => (
  <>
    <label>
      Width
      <input
        type="number"
        min={selectedDefinition.minWidth}
        max={selectedDefinition.maxWidth}
        value={width}
        onBlur={(event) => onSettingsCommit({ width: Number(event.currentTarget.value) })}
        onInput={(event) => onWidthChange(Number(event.currentTarget.value))}
        onKeyDown={blurOnEnter}
      />
    </label>
    <label>
      Height
      <input
        type="number"
        min={selectedDefinition.minHeight}
        max={selectedDefinition.maxHeight}
        value={height}
        onBlur={(event) => onSettingsCommit({ height: Number(event.currentTarget.value) })}
        onInput={(event) => onHeightChange(Number(event.currentTarget.value))}
        onKeyDown={blurOnEnter}
      />
    </label>
  </>
);
