import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { usePuzzleWorkspaceDisplayMode } from "./PuzzleWorkspaceLayout";

export type PuzzleViewportSize = {
  inlineSize: number;
  blockSize: number;
};

const defaultBottomInset = 24;
const roundMetric = (value: number) => Math.round(value * 100) / 100;

export const measurePuzzleViewportSize = (
  rect: Pick<DOMRect, "width" | "top">,
  viewportHeight: number,
  bottomInset = defaultBottomInset,
): PuzzleViewportSize => ({
  inlineSize: roundMetric(Math.max(0, rect.width)),
  blockSize: roundMetric(
    Math.max(
      0,
      Math.max(0, viewportHeight) - Math.max(0, rect.top) - Math.max(0, bottomInset),
    ),
  ),
});

type ControlLane = Pick<DOMRect, "left" | "right" | "width" | "height">;

export const getBoardControlReserve = (board: ControlLane, lanes: readonly ControlLane[]) =>
  lanes.reduce((sum, lane) => {
    const overlap = Math.min(board.right, lane.right) - Math.max(board.left, lane.left);
    return sum + (lane.height > 0 && overlap > Math.min(board.width, lane.width) / 2
      ? lane.height + 12 : 0);
  }, 0);

const getViewportHeight = () =>
  window.visualViewport?.height ||
  document.documentElement.clientHeight ||
  window.innerHeight;

export const usePuzzleViewportSize = <T extends HTMLElement>(
  bottomInset = defaultBottomInset,
) => {
  const { isExpanded, isBrowserFullscreen } = usePuzzleWorkspaceDisplayMode();
  const ref = useRef<T>(null);
  const [size, setSize] = useState<PuzzleViewportSize>({ inlineSize: 0, blockSize: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const workspace = element.closest<HTMLElement>(".puzzle-workspace-layout");
    // Composition owners identify the trailing control lanes.
    const trailingControls = () => Array.from(workspace?.querySelectorAll<HTMLElement>("[data-board-controls]") ?? []);
    const measure = () => {
      const rect = element.getBoundingClientRect();
      // The measured element is the board column, not a board-plus-rail composition.
      const reserve = getBoardControlReserve(rect, trailingControls().map(control => control.getBoundingClientRect()));
      const scrollOffset = isExpanded ? workspace?.scrollTop ?? 0 : window.scrollY;
      const measured = measurePuzzleViewportSize(
        { width: rect.width, top: rect.top + scrollOffset },
        getViewportHeight(),
        bottomInset + reserve,
      );
      // Zero is the unmeasured sentinel for consumers; a measured exhausted
      // height instead uses their existing minimum-size / scrolling fallback.
      const next = { ...measured, blockSize: measured.inlineSize > 0 ? Math.max(1, measured.blockSize) : 0 };
      setSize((current) =>
        current.inlineSize === next.inlineSize && current.blockSize === next.blockSize
          ? current
          : next,
      );
    };

    measure();

    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(measure);
    const observeComposition = () => {
      observer?.disconnect();
      observer?.observe(element);
      if (workspace) {
        for (const region of Array.from(workspace.children)) observer?.observe(region);
      }
      trailingControls().forEach(control => observer?.observe(control));
    };
    observeComposition();
    const compositionObserver = workspace && typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => { observeComposition(); measure(); }) : null;
    if (workspace) compositionObserver?.observe(workspace, { childList: true });

    window.addEventListener("resize", measure);
    document.addEventListener("fullscreenchange", measure);
    window.visualViewport?.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      compositionObserver?.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("fullscreenchange", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [bottomInset, isExpanded, isBrowserFullscreen]);

  return { ref, ...size };
};
