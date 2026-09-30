import { useLayoutEffect, useRef, useState } from "preact/hooks";

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

const getViewportHeight = () =>
  window.visualViewport?.height ||
  document.documentElement.clientHeight ||
  window.innerHeight;

export const usePuzzleViewportSize = <T extends HTMLElement>(
  bottomInset = defaultBottomInset,
) => {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<PuzzleViewportSize>({ inlineSize: 0, blockSize: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => {
      const next = measurePuzzleViewportSize(
        element.getBoundingClientRect(),
        getViewportHeight(),
        bottomInset,
      );
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
    observer?.observe(element);

    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, [bottomInset]);

  return { ref, ...size };
};
