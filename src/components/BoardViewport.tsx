import type { ComponentChildren, JSX } from "preact";
import { useMemo } from "preact/hooks";
import { usePuzzleViewportSize } from "./usePuzzleViewportSize";

export type BoardViewportKind = "square-grid" | "nonogram";

type BoardViewportProps = {
  kind: BoardViewportKind;
  columns: number;
  rows: number;
  rowClueSlots?: number;
  columnClueSlots?: number;
  children: ComponentChildren;
};

export type BoardViewportMetricsInput = {
  kind: BoardViewportKind;
  availableInlineSize: number;
  availableBlockSize?: number;
  columns: number;
  rows: number;
  rowClueSlots?: number;
  columnClueSlots?: number;
};

export type BoardViewportMetrics = {
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
  boardWidth: number;
  boardHeight: number;
  rowClueWidth: number;
  columnClueHeight: number;
};

const squareGridMaxBoardSize = 672;
const squareGridMinCellSize = 28;
const nonogramMaxCellSize = 58;
const nonogramMinCellSize = 20;
const nonogramFrameWidth = 20;
const nonogramClueSlotSize = 16;
const nonogramCluePadding = 18;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const normalizeCount = (value: number) => Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
const roundMetric = (value: number) => Math.round(value * 100) / 100;

const getClueTrackSize = (slots: number, min: number, max: number) =>
  clamp(normalizeCount(slots) * nonogramClueSlotSize + nonogramCluePadding, min, max);

export const getBoardViewportNaturalWidth = ({
  kind,
  columns,
  rowClueSlots = 1,
}: Pick<BoardViewportMetricsInput, "kind" | "columns" | "rowClueSlots">) => {
  if (kind === "square-grid") return squareGridMaxBoardSize;

  const safeColumns = normalizeCount(columns);
  const rowClueWidth = getClueTrackSize(rowClueSlots, 42, 88);
  return roundMetric(rowClueWidth + nonogramMaxCellSize * safeColumns + nonogramFrameWidth);
};

export const makeBoardViewportMetrics = ({
  kind,
  availableInlineSize,
  availableBlockSize = 0,
  columns,
  rows,
  rowClueSlots = 1,
  columnClueSlots = 1,
}: BoardViewportMetricsInput): BoardViewportMetrics => {
  const safeColumns = normalizeCount(columns);
  const safeRows = normalizeCount(rows);
  const availableWidth = Math.max(0, availableInlineSize);
  const availableHeight = Math.max(0, availableBlockSize);

  if (kind === "square-grid") {
    const targetBoardWidth = Math.min(availableWidth || squareGridMaxBoardSize, squareGridMaxBoardSize);
    const targetBoardHeight = Math.min(availableHeight || squareGridMaxBoardSize, squareGridMaxBoardSize);
    const maximumCellSize = squareGridMaxBoardSize / Math.max(safeColumns, safeRows);
    const cellSize = clamp(
      Math.min(targetBoardWidth / safeColumns, targetBoardHeight / safeRows),
      squareGridMinCellSize,
      maximumCellSize,
    );
    const gridWidth = roundMetric(cellSize * safeColumns);
    const gridHeight = roundMetric(cellSize * safeRows);

    return {
      cellSize: roundMetric(cellSize),
      gridWidth,
      gridHeight,
      boardWidth: gridWidth,
      boardHeight: gridHeight,
      rowClueWidth: 0,
      columnClueHeight: 0,
    };
  }

  const rowClueWidth = getClueTrackSize(rowClueSlots, 42, 88);
  const columnClueHeight = getClueTrackSize(columnClueSlots, 42, 104);
  const targetBoardWidth = availableWidth || rowClueWidth + nonogramMaxCellSize * safeColumns + nonogramFrameWidth;
  const availableCellWidth = Math.max(0, targetBoardWidth - rowClueWidth - nonogramFrameWidth);
  const availableCellHeight = availableHeight > 0
    ? Math.max(0, availableHeight - columnClueHeight - nonogramFrameWidth)
    : Number.POSITIVE_INFINITY;
  const cellSize = clamp(
    Math.min(availableCellWidth / safeColumns, availableCellHeight / safeRows),
    nonogramMinCellSize,
    nonogramMaxCellSize,
  );
  const gridWidth = roundMetric(cellSize * safeColumns);
  const gridHeight = roundMetric(cellSize * safeRows);

  return {
    cellSize: roundMetric(cellSize),
    gridWidth,
    gridHeight,
    boardWidth: roundMetric(rowClueWidth + gridWidth + nonogramFrameWidth),
    boardHeight: roundMetric(columnClueHeight + gridHeight + nonogramFrameWidth),
    rowClueWidth: roundMetric(rowClueWidth),
    columnClueHeight: roundMetric(columnClueHeight),
  };
};

export const BoardViewport = ({ kind, columns, rows, rowClueSlots, columnClueSlots, children }: BoardViewportProps) => {
  const {
    ref: viewportRef,
    inlineSize: availableInlineSize,
    blockSize: availableBlockSize,
  } = usePuzzleViewportSize<HTMLDivElement>();
  const safeColumns = normalizeCount(columns);
  const safeRows = normalizeCount(rows);
  const metrics = useMemo(
    () =>
      makeBoardViewportMetrics({
        kind,
        availableInlineSize,
        availableBlockSize,
        columns,
        rows,
        rowClueSlots,
        columnClueSlots,
      }),
    [availableBlockSize, availableInlineSize, columnClueSlots, columns, kind, rowClueSlots, rows],
  );
  const viewportStyle = {
    "--board-columns": String(safeColumns),
    "--board-rows": String(safeRows),
    "--board-column-gap-count": String(Math.max(0, safeColumns - 1)),
    "--board-row-gap-count": String(Math.max(0, safeRows - 1)),
    "--board-cell-size": `${metrics.cellSize}px`,
    "--board-grid-width": `${metrics.gridWidth}px`,
    "--board-grid-height": `${metrics.gridHeight}px`,
    "--board-width": `${metrics.boardWidth}px`,
    "--board-height": `${metrics.boardHeight}px`,
    "--nonogram-row-clue-width": `${metrics.rowClueWidth}px`,
    "--nonogram-column-clue-height": `${metrics.columnClueHeight}px`,
  } as JSX.CSSProperties;
  const viewportKindClass = kind === "square-grid" ? "square-grid-board-viewport" : "nonogram-board-viewport";

  return (
    <div class={`board-viewport ${viewportKindClass}`} ref={viewportRef} style={viewportStyle}>
      <div class="board-viewport-inner">{children}</div>
    </div>
  );
};
