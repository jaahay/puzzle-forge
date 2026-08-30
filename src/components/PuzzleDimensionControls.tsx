import type { PuzzleDefinition } from "../catalog/types";
import { BoundedNumberInput } from "./BoundedNumberInput";

type PuzzleDimensionControlsProps = {
  selectedDefinition: PuzzleDefinition;
  width: number;
  height: number;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onSettingsCommit: (settings: { width?: number; height?: number }) => void;
};

export const PuzzleDimensionControls = ({
  selectedDefinition,
  width,
  height,
  onSettingsCommit,
}: PuzzleDimensionControlsProps) => (
  <>
    <label>
      Width
      <BoundedNumberInput
        value={width}
        min={selectedDefinition.minWidth}
        max={selectedDefinition.maxWidth}
        onCommit={(nextWidth) => onSettingsCommit({ width: nextWidth })}
      />
    </label>
    <label>
      Height
      <BoundedNumberInput
        value={height}
        min={selectedDefinition.minHeight}
        max={selectedDefinition.maxHeight}
        onCommit={(nextHeight) => onSettingsCommit({ height: nextHeight })}
      />
    </label>
  </>
);
