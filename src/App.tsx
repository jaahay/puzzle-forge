import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleAvailability } from "./catalog/puzzleAvailability";
import { getPuzzleDefinition, isGeneratable } from "./catalog/puzzleCatalog";
import type { GeneratedPuzzle, PuzzleDifficulty, PuzzleGenerationRequest, PuzzleId, SolitaireVariation } from "./catalog/types";
import { AboutView } from "./components/AboutView";
import { AppShell } from "./components/AppShell";
import { ChangelogView } from "./components/ChangelogView";
import { PuzzleCatalog } from "./components/PuzzleCatalog";
import { PuzzleWorkspace } from "./components/PuzzleWorkspace";
import { StartView } from "./components/StartView";
import { defaultSolitaireVariation, normalizeSolitaireVariation, solitaireVariationsEqual } from "./games/solitaire/variation";
import { markHomeNavigation, markPuzzleNavigation } from "./app/homeNavigation";
import { defaultSudokuDifficulty, getActiveView, makeRandomSeed } from "./app/runtime";
import { useGridController } from "./app/useGridController";
import { usePuzzleGeneration, type BeginGenerationOptions } from "./app/usePuzzleGeneration";
import { buildRuntimeSession, usePuzzleSessions } from "./app/usePuzzleSessions";
import { useSolitaireController } from "./app/useSolitaireController";
import type { AppView } from "./site/views";

const initialStatusMessage = "Pick a puzzle to start.";

type GenerationBehavior = {
  preserveScroll?: boolean;
};

export const App = () => {
  const [activeView, setActiveView] = useState<AppView>(getActiveView);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<PuzzleId>("sudoku");
  const [seed, setSeed] = useState(makeRandomSeed);
  const [width, setWidth] = useState(9);
  const [height, setHeight] = useState(9);
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>(defaultSudokuDifficulty);
  const [requireUniqueSolution, setRequireUniqueSolution] = useState(true);
  const [puzzle, setPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [solitaireVariation, setSolitaireVariation] = useState<SolitaireVariation>(defaultSolitaireVariation);
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage);
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(true);
  const [hasSelectedPuzzle, setHasSelectedPuzzle] = useState(false);
  const [isHomeSelected, setIsHomeSelected] = useState(true);
  const pendingScrollRestore = useRef<{ x: number; y: number } | null>(null);

  const generation = usePuzzleGeneration();
  const sessions = usePuzzleSessions();
  const grid = useGridController();
  const solitaire = useSolitaireController({ statusMessage, onStatusMessage: setStatusMessage, solitaireVariation });
  const { readyPuzzles, previewPuzzles, plannedPuzzles } = useMemo(() => getPuzzleAvailability(), []);
  const selectedDefinition = getPuzzleDefinition(selectedPuzzleId);
  const selectedPuzzleIsGeneratable = isGeneratable(selectedDefinition);

  const rememberScrollPosition = () => {
    if (typeof window === "undefined") {
      return;
    }

    pendingScrollRestore.current = { x: window.scrollX, y: window.scrollY };
  };

  const restoreScrollPosition = () => {
    if (typeof window === "undefined" || !pendingScrollRestore.current) {
      return;
    }

    const savedPosition = pendingScrollRestore.current;
    pendingScrollRestore.current = null;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.scrollTo({ left: savedPosition.x, top: savedPosition.y, behavior: "auto" });
      });
    });
  };

  const restoreSession = (puzzleId: PuzzleId, session: ReturnType<typeof buildRuntimeSession>) => {
    markPuzzleNavigation();
    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    setSelectedPuzzleId(puzzleId);
    setSeed(session.seed);
    setWidth(session.width);
    setHeight(session.height);
    setDifficulty(session.difficulty);
    setRequireUniqueSolution(session.requireUniqueSolution);
    setPuzzle(session.puzzle);
    setSolitaireVariation(normalizeSolitaireVariation(session.solitaireVariation ?? (session.puzzle?.kind === "cards" ? session.puzzle.solitaireVariation : undefined)));
    solitaire.restoreSolitaireSnapshot({
      cardStacks: session.cardStacks,
      selectedCard: session.selectedCard,
      solitaireStats: session.solitaireStats,
      solitaireUndoStack: session.solitaireUndoStack ?? [],
      solitaireRedoStack: session.solitaireRedoStack ?? [],
      statusMessage: session.statusMessage,
    });
    grid.restoreGridSnapshot({
      gridCells: session.gridCells,
      selectedGridCell: session.selectedGridCell,
    });
    generation.setIsGenerating(false);
    restoreScrollPosition();
  };

  const makeCurrentSession = () =>
    buildRuntimeSession({
      puzzleId: selectedPuzzleId,
      seed,
      width,
      height,
      difficulty,
      requireUniqueSolution,
      puzzle,
      cardStacks: solitaire.cardStacks,
      selectedCard: solitaire.selectedCard,
      solitaireStats: solitaire.solitaireStats,
      solitaireUndoStack: solitaire.solitaireUndoStack,
      solitaireRedoStack: solitaire.solitaireRedoStack,
      gridCells: grid.gridCells,
      selectedGridCell: grid.selectedGridCell,
      statusMessage,
    });

  const saveCurrentSession = () => {
    sessions.saveSession(selectedPuzzleId, makeCurrentSession());
  };

  const resetRuntimePuzzleState = () => {
    setPuzzle(null);
    solitaire.resetSolitaire();
    grid.resetGrid();
  };

  const beginGeneration = (options: BeginGenerationOptions = {}, behavior: GenerationBehavior = {}) => {
    if (behavior.preserveScroll) {
      rememberScrollPosition();
    }

    const requestedPuzzleId = options.puzzleId ?? selectedPuzzleId;
    const requestOptions =
      requestedPuzzleId === "klondike-solitaire"
        ? { ...options, solitaireVariation: normalizeSolitaireVariation(options.solitaireVariation ?? solitaireVariation) }
        : options;
    const result = generation.beginGeneration(
      {
        selectedPuzzleId,
        seed,
        width,
        height,
        difficulty,
        requireUniqueSolution,
      },
      requestOptions,
    );

    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    markPuzzleNavigation();

    if (result.kind === "planned") {
      const definition = getPuzzleDefinition(result.puzzleId);
      setSelectedPuzzleId(result.puzzleId);
      setWidth(definition.defaultWidth);
      setHeight(definition.defaultHeight);
      resetRuntimePuzzleState();
      setStatusMessage(`${result.title} is planned for a future generator.`);
      restoreScrollPosition();
      return;
    }

    const { request, title } = result;
    setSelectedPuzzleId(request.puzzleId);
    setSeed(request.seed);
    setWidth(request.width);
    setHeight(request.height);
    setDifficulty(request.difficulty ?? difficulty);
    setRequireUniqueSolution(Boolean(request.requireUniqueSolution));
    if (request.puzzleId === "klondike-solitaire") {
      setSolitaireVariation(normalizeSolitaireVariation(request.solitaireVariation));
    }
    if (puzzle?.puzzleId !== request.puzzleId) {
      resetRuntimePuzzleState();
    }
    setStatusMessage(`Generating ${title}...`);
  };

  const handleGeneratedPuzzle = (generatedPuzzle: GeneratedPuzzle) => {
    const restoredSession = sessions.restorePendingSessionForPuzzle(generatedPuzzle);

    if (restoredSession) {
      restoreSession(generatedPuzzle.puzzleId, restoredSession);
      return;
    }

    const readyMessage = generation.makeReadyMessage(generatedPuzzle);
    setPuzzle(generatedPuzzle);
    if (generatedPuzzle.kind === "cards") {
      setSolitaireVariation(normalizeSolitaireVariation(generatedPuzzle.solitaireVariation));
    }
    solitaire.restoreSolitaireSnapshot({
      cardStacks: generatedPuzzle.kind === "cards" ? generatedPuzzle.stacks : null,
      selectedCard: null,
      solitaireStats: solitaire.solitaireStats,
      solitaireUndoStack: [],
      solitaireRedoStack: [],
      statusMessage: readyMessage,
    });
    grid.prepareGeneratedGrid(generatedPuzzle);
    solitaire.resetSolitaireStats();
    solitaire.clearSolitaireHistory();
    setStatusMessage(readyMessage);
    restoreScrollPosition();
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncActiveView = () => setActiveView(getActiveView());

    window.addEventListener("hashchange", syncActiveView);

    return () => {
      window.removeEventListener("hashchange", syncActiveView);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      generation.handleGenerationMessage(
        event,
        handleGeneratedPuzzle,
        (error) => {
          sessions.pendingRestorePuzzleId.current = null;
          setStatusMessage(error);
          restoreScrollPosition();
        },
      );
    };

    generation.worker.addEventListener("message", handleMessage);

    sessions.loadPersistedSessionsOnce({
      restoreSession,
      beginGeneration: (session) => beginGeneration(session),
    });

    return () => {
      generation.worker.removeEventListener("message", handleMessage);
    };
  }, [generation.worker]);

  useEffect(() => {
    if (!hasSelectedPuzzle || generation.isGenerating || isHomeSelected) {
      return;
    }

    saveCurrentSession();
  }, [
    hasSelectedPuzzle,
    isHomeSelected,
    generation.isGenerating,
    selectedPuzzleId,
    seed,
    width,
    height,
    difficulty,
    requireUniqueSolution,
    puzzle,
    solitaire.cardStacks,
    solitaire.selectedCard,
    solitaire.solitaireStats,
    solitaire.solitaireUndoStack,
    solitaire.solitaireRedoStack,
    grid.gridCells,
    grid.selectedGridCell,
    statusMessage,
  ]);

  const selectHome = () => {
    if (hasSelectedPuzzle && !isHomeSelected) {
      saveCurrentSession();
    }

    markHomeNavigation();
    setActiveView("catalog");
    setHasSelectedPuzzle(true);
    setIsHomeSelected(true);

    if (typeof window !== "undefined" && window.location.hash) {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  };

  const selectPuzzle = (puzzleId: PuzzleId) => {
    if (puzzleId === selectedPuzzleId && hasSelectedPuzzle && !isHomeSelected) {
      return;
    }

    if (hasSelectedPuzzle && !isHomeSelected) {
      saveCurrentSession();
    }

    markPuzzleNavigation();
    setIsHomeSelected(false);
    const cachedSession = sessions.getCachedSession(puzzleId);

    if (cachedSession) {
      restoreSession(puzzleId, cachedSession);
      return;
    }

    const definition = getPuzzleDefinition(puzzleId);
    const nextSeed = makeRandomSeed();
    const nextDifficulty = puzzleId === "sudoku" ? defaultSudokuDifficulty : difficulty;

    beginGeneration({
      puzzleId,
      seed: nextSeed,
      width: definition.defaultWidth,
      height: definition.defaultHeight,
      difficulty: nextDifficulty,
      requireUniqueSolution,
      solitaireVariation: puzzleId === "klondike-solitaire" ? solitaireVariation : undefined,
    });
  };

  const generate = () => {
    beginGeneration({}, { preserveScroll: true });
  };

  const randomize = () => {
    beginGeneration({ seed: makeRandomSeed() }, { preserveScroll: true });
  };

  const commitGenerationSettings = ({
    seed: nextSeed,
    width: nextWidth,
    height: nextHeight,
    difficulty: nextDifficulty,
    requireUniqueSolution: nextRequireUniqueSolution,
    solitaireVariation: nextSolitaireVariation,
  }: Partial<Pick<PuzzleGenerationRequest, "seed" | "width" | "height" | "difficulty" | "requireUniqueSolution" | "solitaireVariation">> = {}) => {
    const definition = getPuzzleDefinition(selectedPuzzleId);
    const generationSeed = typeof nextSeed === "string" ? nextSeed.trim() : seed.trim();
    const fallbackSeed = puzzle?.seed ?? makeRandomSeed();
    const normalizedSeed = generationSeed || fallbackSeed;
    const generationWidth = Number.isFinite(nextWidth) ? Number(nextWidth) : width || definition.defaultWidth;
    const generationHeight = Number.isFinite(nextHeight) ? Number(nextHeight) : height || definition.defaultHeight;
    const generationDifficulty = nextDifficulty ?? difficulty;
    const generationRequireUniqueSolution = typeof nextRequireUniqueSolution === "boolean" ? nextRequireUniqueSolution : requireUniqueSolution;
    const currentGrid = puzzle?.kind === "grid" ? puzzle : null;
    const currentSolitaireVariation = puzzle?.kind === "cards" ? puzzle.solitaireVariation : undefined;
    const generationSolitaireVariation = normalizeSolitaireVariation(nextSolitaireVariation ?? currentSolitaireVariation ?? solitaireVariation);
    const settingsAreCurrent =
      puzzle?.puzzleId === selectedPuzzleId &&
      puzzle.seed === normalizedSeed &&
      (!currentGrid || (currentGrid.width === generationWidth && currentGrid.height === generationHeight)) &&
      (selectedPuzzleId !== "sudoku" || puzzle.difficulty === generationDifficulty) &&
      (selectedPuzzleId !== "nonogram" || (puzzle.difficulty === generationDifficulty && Boolean(puzzle.uniqueSolution) === generationRequireUniqueSolution)) &&
      (selectedPuzzleId !== "klondike-solitaire" || solitaireVariationsEqual(currentSolitaireVariation, generationSolitaireVariation));

    if (normalizedSeed !== seed) {
      setSeed(normalizedSeed);
    }

    if (generationWidth !== width) {
      setWidth(generationWidth);
    }

    if (generationHeight !== height) {
      setHeight(generationHeight);
    }

    if (generationDifficulty !== difficulty) {
      setDifficulty(generationDifficulty);
    }

    if (generationRequireUniqueSolution !== requireUniqueSolution) {
      setRequireUniqueSolution(generationRequireUniqueSolution);
    }

    if (selectedPuzzleId === "klondike-solitaire") {
      setSolitaireVariation(generationSolitaireVariation);
    }

    if (settingsAreCurrent) {
      return;
    }

    beginGeneration(
      {
        seed: normalizedSeed,
        width: generationWidth,
        height: generationHeight,
        difficulty: generationDifficulty,
        requireUniqueSolution: generationRequireUniqueSolution,
        solitaireVariation: selectedPuzzleId === "klondike-solitaire" ? generationSolitaireVariation : undefined,
      },
      { preserveScroll: true },
    );
  };

  const handleDifficultyChange = (nextDifficulty: PuzzleDifficulty) => {
    if (selectedPuzzleId === "sudoku") {
      beginGeneration({ puzzleId: "sudoku", seed, width: 9, height: 9, difficulty: nextDifficulty }, { preserveScroll: true });
      return;
    }

    if (selectedPuzzleId === "nonogram") {
      commitGenerationSettings({ difficulty: nextDifficulty });
      return;
    }

    setDifficulty(nextDifficulty);
  };

  const handleUniqueSolutionChange = (nextRequireUniqueSolution: boolean) => {
    if (selectedPuzzleId === "nonogram") {
      commitGenerationSettings({ requireUniqueSolution: nextRequireUniqueSolution });
      return;
    }

    setRequireUniqueSolution(nextRequireUniqueSolution);
  };

  const handleCheck = () => {
    if (!puzzle) {
      return;
    }

    if (puzzle.kind === "cards") {
      solitaire.checkSolitaire();
      return;
    }

    grid.checkGrid(puzzle, setStatusMessage);
  };

  return (
    <AppShell activeView={activeView} onHomeSelect={selectHome}>
      {activeView === "catalog" ? (
        <section class={`catalog-layout ${isCatalogCollapsed ? "catalog-collapsed" : ""}`}>
          <PuzzleCatalog
            isCollapsed={isCatalogCollapsed}
            isHomeSelected={isHomeSelected || !hasSelectedPuzzle}
            selectedPuzzleId={selectedPuzzleId}
            onCollapseToggle={() => setIsCatalogCollapsed((current) => !current)}
            onHomeSelect={selectHome}
            onSelectPuzzle={selectPuzzle}
          />

          {isHomeSelected || !hasSelectedPuzzle ? (
            <StartView
              readyPuzzles={readyPuzzles}
              previewPuzzles={previewPuzzles}
              plannedPuzzles={plannedPuzzles}
              onSelectPuzzle={selectPuzzle}
            />
          ) : (
            <PuzzleWorkspace
              selectedDefinition={selectedDefinition}
              selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
              seed={seed}
              width={width}
              height={height}
              difficulty={difficulty}
              requireUniqueSolution={requireUniqueSolution}
              puzzle={puzzle}
              solitaireVariation={puzzle?.kind === "cards" ? puzzle.solitaireVariation : solitaireVariation}
              cardStacks={solitaire.cardStacks}
              selectedCard={solitaire.selectedCard}
              solitaireStats={solitaire.solitaireStats}
              gridCells={grid.gridCells}
              selectedGridCell={grid.selectedGridCell}
              statusMessage={statusMessage}
              isGenerating={generation.isGenerating}
              onSeedChange={setSeed}
              onWidthChange={setWidth}
              onHeightChange={setHeight}
              onSettingsCommit={commitGenerationSettings}
              onDifficultyChange={handleDifficultyChange}
              onUniqueSolutionChange={handleUniqueSolutionChange}
              onGenerate={generate}
              onRandomize={randomize}
              onCheck={handleCheck}
              onSolitaireVariationChange={(variation) => commitGenerationSettings({ solitaireVariation: variation })}
              onAutoMoveToFoundations={solitaire.autoMoveToFoundations}
              onUndoSolitaire={solitaire.undoSolitaireMove}
              onRedoSolitaire={solitaire.redoSolitaireMove}
              canUndoSolitaire={solitaire.solitaireUndoStack.length > 0}
              canRedoSolitaire={solitaire.solitaireRedoStack.length > 0}
              onCardClick={solitaire.handleCardClick}
              onCardDoubleClick={solitaire.moveSingleCardToFoundation}
              onStackClick={solitaire.handleStackClick}
              onCellClick={(cell) => grid.handleGridCellClick(puzzle, cell, setStatusMessage)}
              onCellInput={(cell, value) => grid.handleGridCellInput(puzzle, cell, value, setStatusMessage)}
            />
          )}
        </section>
      ) : activeView === "changelog" ? (
        <ChangelogView />
      ) : (
        <AboutView />
      )}
    </AppShell>
  );
};
