import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleDefinition, isGeneratable, puzzleCatalog } from "./catalog/puzzleCatalog";
import type {
  GeneratedPuzzle,
  PuzzleGenerationRequest,
  PuzzleGenerationResponse,
  PuzzleId,
} from "./catalog/types";

const makeRequestId = () => Math.random().toString(36).slice(2);

export const App = () => {
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<PuzzleId>("sudoku");
  const [seed, setSeed] = useState("daily-catalog");
  const [width, setWidth] = useState(9);
  const [height, setHeight] = useState(9);
  const [puzzle, setPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [statusMessage, setStatusMessage] = useState("Choose a puzzle and generate a board.");
  const [isGenerating, setIsGenerating] = useState(false);
  const activeRequestId = useRef<string | null>(null);
  const worker = useMemo(
    () => new Worker(new URL("./workers/puzzleWorker.ts", import.meta.url), { type: "module" }),
    [],
  );
  const selectedDefinition = getPuzzleDefinition(selectedPuzzleId);
  const selectedPuzzleIsGeneratable = isGeneratable(selectedDefinition);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<PuzzleGenerationResponse>) => {
      if (event.data.requestId !== activeRequestId.current) {
        return;
      }

      setIsGenerating(false);

      if ("error" in event.data) {
        setStatusMessage(event.data.error);
        return;
      }

      setPuzzle(event.data.puzzle);
      setStatusMessage(`${event.data.puzzle.title} generated from seed ${event.data.puzzle.seed}.`);
    };

    worker.addEventListener("message", handleMessage);

    return () => {
      worker.removeEventListener("message", handleMessage);
      worker.terminate();
    };
  }, [worker]);

  const selectPuzzle = (puzzleId: PuzzleId) => {
    const definition = getPuzzleDefinition(puzzleId);

    setSelectedPuzzleId(puzzleId);
    setWidth(definition.defaultWidth);
    setHeight(definition.defaultHeight);
    setPuzzle(null);
    setStatusMessage(
      isGeneratable(definition)
        ? `${definition.title} is ready to generate.`
        : `${definition.title} is planned for a future generator.`,
    );
  };

  const generate = () => {
    if (!selectedPuzzleIsGeneratable) {
      setStatusMessage(`${selectedDefinition.title} is planned, not generatable yet.`);
      return;
    }

    const requestId = makeRequestId();
    const request: PuzzleGenerationRequest = {
      requestId,
      puzzleId: selectedPuzzleId,
      seed,
      width,
      height,
    };

    activeRequestId.current = requestId;
    setIsGenerating(true);
    setStatusMessage(`Generating ${selectedDefinition.title}...`);
    worker.postMessage(request);
  };

  useEffect(() => {
    generate();
    // Generate the first catalog entry when the worker is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main class="app-shell">
      <section class="hero-panel">
        <p class="eyebrow">puzzles catalog</p>
        <h1>One home for Sudoku, Nonogram, Wordle-like puzzles, and whatever comes next.</h1>
        <p class="hero-copy">
          Browse the catalog, pick a puzzle family, and generate deterministic boards in a Web Worker
          so the interface stays responsive.
        </p>
      </section>

      <section class="catalog-layout">
        <aside class="catalog-panel" aria-label="Puzzle catalog">
          <div class="panel-heading">
            <span>{puzzleCatalog.length} puzzle ideas</span>
            <strong>Catalog</strong>
          </div>

          <div class="catalog-grid">
            {puzzleCatalog.map((definition) => (
              <button
                class={definition.id === selectedPuzzleId ? "catalog-card selected" : "catalog-card"}
                key={definition.id}
                type="button"
                onClick={() => selectPuzzle(definition.id)}
              >
                <span class={`status ${definition.status}`}>{definition.status}</span>
                <strong>{definition.title}</strong>
                <span>{definition.tagline}</span>
              </button>
            ))}
          </div>
        </aside>

        <section class="workspace-panel" aria-label="Selected puzzle workspace">
          <div class="workspace-copy">
            <span class={`status ${selectedDefinition.status}`}>{selectedDefinition.status}</span>
            <h2>{selectedDefinition.title}</h2>
            <p>{selectedDefinition.description}</p>
            <div class="tag-row">
              {selectedDefinition.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>

          <div class="control-panel" aria-label="Puzzle controls">
            <label>
              Seed
              <input value={seed} onInput={(event) => setSeed(event.currentTarget.value)} />
            </label>

            <label>
              Width
              <input
                type="number"
                min={selectedDefinition.minWidth}
                max={selectedDefinition.maxWidth}
                value={width}
                onInput={(event) => setWidth(Number(event.currentTarget.value))}
              />
            </label>

            <label>
              Height
              <input
                type="number"
                min={selectedDefinition.minHeight}
                max={selectedDefinition.maxHeight}
                value={height}
                onInput={(event) => setHeight(Number(event.currentTarget.value))}
              />
            </label>

            <button type="button" onClick={generate} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
              {isGenerating ? "Generating..." : "Generate"}
            </button>
          </div>

          <p class="status-line" aria-live="polite">{statusMessage}</p>

          {puzzle ? (
            <section class="puzzle-panel" aria-label="Generated puzzle preview">
              <div class="puzzle-meta">
                <span>{puzzle.width} x {puzzle.height}</span>
                <span>Seed: {puzzle.seed}</span>
                <span>Checksum: {puzzle.checksum}</span>
              </div>

              <div
                class={`grid ${puzzle.puzzleId}`}
                style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}
              >
                {puzzle.cells.map((cell) => (
                  <div
                    aria-label={cell.ariaLabel}
                    class={`cell ${cell.tone}`}
                    key={`${cell.row}-${cell.column}`}
                  >
                    {cell.value}
                  </div>
                ))}
              </div>

              <ul class="notes-list">
                {puzzle.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </section>
      </section>
    </main>
  );
};
