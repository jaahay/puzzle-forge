import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Puzzle, PuzzleRequest } from "./lib/puzzles";

type WorkerResponse = {
  id: string;
  puzzle: Puzzle;
};

const makeRequestId = () => Math.random().toString(36).slice(2);

export const App = () => {
  const [seed, setSeed] = useState("logic-grid");
  const [width, setWidth] = useState(6);
  const [height, setHeight] = useState(6);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const activeRequestId = useRef<string | null>(null);
  const worker = useMemo(
    () => new Worker(new URL("./workers/puzzleWorker.ts", import.meta.url), { type: "module" }),
    [],
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== activeRequestId.current) {
        return;
      }

      setPuzzle(event.data.puzzle);
      setIsGenerating(false);
    };

    worker.addEventListener("message", handleMessage);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
    };
  }, [worker]);

  const generate = () => {
    const id = makeRequestId();
    const request: PuzzleRequest = { id, seed, width, height };

    activeRequestId.current = id;
    setIsGenerating(true);
    worker.postMessage(request);
  };

  useEffect(() => {
    generate();
    // Generate the first puzzle when the worker is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main class="app-shell">
      <section class="hero-panel">
        <p class="eyebrow">puzzle-forge</p>
        <h1>Procedural logic puzzles, generated off the main thread.</h1>
        <p class="hero-copy">
          Tune a seed and board dimensions, then let a Web Worker build a deterministic puzzle model
          without blocking the interface.
        </p>
      </section>

      <section class="control-panel" aria-label="Puzzle controls">
        <label>
          Seed
          <input value={seed} onInput={(event) => setSeed(event.currentTarget.value)} />
        </label>

        <label>
          Width
          <input
            type="number"
            min="4"
            max="12"
            value={width}
            onInput={(event) => setWidth(Number(event.currentTarget.value))}
          />
        </label>

        <label>
          Height
          <input
            type="number"
            min="4"
            max="12"
            value={height}
            onInput={(event) => setHeight(Number(event.currentTarget.value))}
          />
        </label>

        <button type="button" onClick={generate} disabled={isGenerating}>
          {isGenerating ? "Forging..." : "Forge puzzle"}
        </button>
      </section>

      {puzzle ? (
        <section class="puzzle-panel" aria-live="polite">
          <div class="puzzle-meta">
            <span>{puzzle.width} x {puzzle.height}</span>
            <span>Seed: {puzzle.seed}</span>
            <span>Checksum: {puzzle.checksum}</span>
          </div>

          <div
            class="grid"
            style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}
          >
            {puzzle.cells.map((cell) => (
              <div class={cell.locked ? "cell locked" : "cell"} key={`${cell.row}-${cell.column}`}>
                {cell.value}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
};
