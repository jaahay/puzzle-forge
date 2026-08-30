import type { ComponentChildren, JSX } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";

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
const nonogramMinCellSize = 16;
const nonogramFrameWidth = 20;
const nonogramClueSlotSize = 16;
const nonogramCluePadding = 18;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const normalizeCount = (value: number) => Math.max(1, Math.floor(Number.isFinite(value) ? value : 1));
const roundMetric = (value: number) => Math.round(value * 100) / 100;

const getClueTrackSize = (slots: number, min: number, max: number) =>
  clamp(normalizeCount(slots) * nonogramClueSlotSize + nonogramCluePadding, min, max);

export const makeBoardViewportMetrics = ({
  kind,
  availableInlineSize,
  columns,
  rows,
  rowClueSlots = 1,
  columnClueSlots = 1,
}: BoardViewportMetricsInput): BoardViewportMetrics => {
  const safeColumns = normalizeCount(columns);
  const safeRows = normalizeCount(rows);
  const availableWidth = Math.max(0, availableInlineSize);

  if (kind === "square-grid") {
    const targetBoardWidth = Math.min(availableWidth || squareGridMaxBoardSize, squareGridMaxBoardSize);
    const cellSize = clamp(targetBoardWidth / safeColumns, squareGridMinCellSize, squareGridMaxBoardSize / safeColumns);
    const boardSize = roundMetric(cellSize * safeColumns);

    return {
      cellSize: roundMetric(cellSize),
      gridWidth: boardSize,
      gridHeight: boardSize,
      boardWidth: boardSize,
      boardHeight: boardSize,
      rowClueWidth: 0,
      columnClueHeight: 0,
    };
  }

  const rowClueWidth = getClueTrackSize(rowClueSlots, 42, 88);
  const columnClueHeight = getClueTrackSize(columnClueSlots, 42, 104);
  const targetBoardWidth = availableWidth || rowClueWidth + nonogramMaxCellSize * safeColumns + nonogramFrameWidth;
  const availableCellWidth = Math.max(0, targetBoardWidth - rowClueWidth - nonogramFrameWidth);
  const cellSize = clamp(availableCellWidth / safeColumns, nonogramMinCellSize, nonogramMaxCellSize);
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

const getObservedInlineSize = (entry: ResizeObserverEntry, fallback: HTMLElement) => {
  const contentBoxSize = entry.contentBoxSize as ResizeObserverSize | readonly ResizeObserverSize[] | undefined;
  const contentBox = Array.isArray(contentBoxSize) ? contentBoxSize[0] : contentBoxSize;

  return contentBox?.inlineSize ?? fallback.getBoundingClientRect().width;
};

export const BoardViewport = ({ kind, columns, rows, rowClueSlots, columnClueSlots, children }: BoardViewportProps) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [availableInlineSize, setAvailableInlineSize] = useState(0);
  const safeColumns = normalizeCount(columns);
  const safeRows = normalizeCount(rows);
  const metrics = useMemo(
    () =>
      makeBoardViewportMetrics({
        kind,
        availableInlineSize,
        columns,
        rows,
        rowClueSlots,
        columnClueSlots,
      }),
    [availableInlineSize, columnClueSlots, columns, kind, rowClueSlots, rows],
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

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const updateAvailableInlineSize = (nextWidth = viewport.getBoundingClientRect().width) => {
      setAvailableInlineSize(roundMetric(nextWidth));
    };

    updateAvailableInlineSize();

    if (typeof ResizeObserver === "undefined") {
      const handleResize = () => updateAvailableInlineSize();

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;

      if (!entry) {
        return;
      }

      updateAvailableInlineSize(getObservedInlineSize(entry, viewport));
    });

    observer.observe(viewport);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div class={`board-viewport ${viewportKindClass}`} ref={viewportRef} style={viewportStyle}>
      <div class="board-viewport-inner">{children}</div>
    </div>
  );
};
