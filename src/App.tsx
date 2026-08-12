import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleAvailability } from "./catalog/puzzleAvailability";
import { getPuzzleDefinition, isGeneratable } from "./catalog/puzzleCatalog";
import type { GeneratedPuzzle, PuzzleDifficulty, PuzzleGenerationRequest, PuzzleId, SolitaireVariation, SudokuVariation } from "./catalog/types";
import { AboutView } from "./components/AboutView";
import { AppShell } from "./components/AppShell";
import { ChangelogView } from "./components/ChangelogView";
import { NotFoundView } from "./components/NotFoundView";
import { PuzzleCatalog } from "./components/PuzzleCatalog";
import { PuzzleWorkspace } from "./components/PuzzleWorkspace";
import { StartView } from "./components/StartView";
import { defaultSolitaireVariation, normalizeSolitaireVariation, solitaireVariationsEqual } from "./games/solitaire/variation";
import { defaultSudokuVariation, normalizeSudokuVariation } from "./games/sudoku/variation";
import { getInitialSelectedPuzzleId, markHomeNavigation, markPuzzleNavigation } from "./app/homeNavigation";
import { defaultSudokuDifficulty, makeRandomSeed } from "./app/runtime";
import { getCurrentAppRoute, parseAppRoute, pushAppRoute, type AppRoute } from "./app/routes";
import { initialSolitaireStats, loadPersistedPuzzleSessions } from "./app/session";
import { useGridController } from "./app/useGridController";
import { makeMissingPuzzleGenerationOptions, shouldRecoverMissingPuzzleSurface, usePuzzleGeneration, type BeginGenerationOptions } from "./app/usePuzzleGeneration";
import { buildRuntimeSession, usePuzzleSessions } from "./app/usePuzzleSessions";
import { useSolitaireController } from "./app/useSolitaireController";
import type { AppView } from "./site/views";

const initialStatusMessage = "Pick a puzzle to start.";
type GenerationBehavior = { preserveScroll?: boolean };
type NavigationBehavior = { pushHistory?: boolean };

const viewForRoute = (route: AppRoute): AppView | null => {
  if (route.kind === "updates") return "changelog";
  if (route.kind === "about") return "about";
  if (route.kind === "not-found") return null;
  return "catalog";
};

export const App = () => {
  const initialRoute = useMemo(getCurrentAppRoute, []);
  const storedPuzzleId = useMemo(() => getInitialSelectedPuzzleId(), []);
  const initialSelectedPuzzleId = initialRoute.kind === "puzzle" ? initialRoute.puzzleId : storedPuzzleId;
  const shouldStartOnPuzzleSurface = initialRoute.kind === "puzzle";
  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<PuzzleId>(initialSelectedPuzzleId);
  const [seed, setSeed] = useState(makeRandomSeed);
  const [width, setWidth] = useState(9);
  const [height, setHeight] = useState(9);
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>(defaultSudokuDifficulty);
  const [requireUniqueSolution, setRequireUniqueSolution] = useState(true);
  const [sudokuVariation, setSudokuVariation] = useState<SudokuVariation>(defaultSudokuVariation);
  const [puzzle, setPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [solitaireVariation, setSolitaireVariation] = useState<SolitaireVariation>(defaultSolitaireVariation);
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage);
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(true);
  const [hasSelectedPuzzle, setHasSelectedPuzzle] = useState(shouldStartOnPuzzleSurface);
  const [isHomeSelected, setIsHomeSelected] = useState(!shouldStartOnPuzzleSurface);
  const pendingScrollRestore = useRef<{ x: number; y: number } | null>(null);

  const generation = usePuzzleGeneration();
  const sessions = usePuzzleSessions();
  const grid = useGridController();
  const solitaire = useSolitaireController({ statusMessage, onStatusMessage: setStatusMessage, solitaireVariation });
  const { readyPuzzles, previewPuzzles } = useMemo(() => getPuzzleAvailability(), []);
  const selectedDefinition = getPuzzleDefinition(selectedPuzzleId);
  const selectedPuzzleIsGeneratable = isGeneratable(selectedDefinition);
  const activeView = viewForRoute(route);

  const rememberScrollPosition = () => {
    if (typeof window !== "undefined") pendingScrollRestore.current = { x: window.scrollX, y: window.scrollY };
  };

  const restoreScrollPosition = () => {
    if (typeof window === "undefined" || !pendingScrollRestore.current) return;
    const savedPosition = pendingScrollRestore.current;
    pendingScrollRestore.current = null;
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo({ left: savedPosition.x, top: savedPosition.y, behavior: "auto" })));
  };

  const setAppRoute = (nextRoute: AppRoute, behavior: NavigationBehavior = {}) => {
    if (behavior.pushHistory !== false) pushAppRoute(nextRoute);
    setRoute(nextRoute);
  };

  const restoreSession = (puzzleId: PuzzleId, session: ReturnType<typeof buildRuntimeSession>) => {
    markPuzzleNavigation(puzzleId);
    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    setSelectedPuzzleId(puzzleId);
    setSeed(session.seed);
    setWidth(session.width);
    setHeight(session.height);
    setDifficulty(session.difficulty);
    setRequireUniqueSolution(session.requireUniqueSolution);
    setSudokuVariation(normalizeSudokuVariation(session.sudokuVariation ?? session.puzzle?.sudokuVariation));
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
    grid.restoreGridSnapshot({ gridCells: session.gridCells, selectedGridCell: session.selectedGridCell });
    generation.setIsGenerating(false);
    restoreScrollPosition();
  };

  const makeCurrentSession = () => buildRuntimeSession({
    puzzleId: selectedPuzzleId, seed, width, height, difficulty, requireUniqueSolution, sudokuVariation, puzzle,
    cardStacks: solitaire.cardStacks, selectedCard: solitaire.selectedCard, solitaireStats: solitaire.solitaireStats,
    solitaireUndoStack: solitaire.solitaireUndoStack, solitaireRedoStack: solitaire.solitaireRedoStack,
    gridCells: grid.gridCells, selectedGridCell: grid.selectedGridCell, statusMessage,
  });

  const saveCurrentSession = () => { if (puzzle) sessions.saveSession(selectedPuzzleId, makeCurrentSession()); };
  const resetRuntimePuzzleState = () => { setPuzzle(null); solitaire.resetSolitaire(); grid.resetGrid(); };

  const beginGeneration = (options: BeginGenerationOptions = {}, behavior: GenerationBehavior = {}) => {
    if (behavior.preserveScroll) rememberScrollPosition();
    const requestedPuzzleId = options.puzzleId ?? selectedPuzzleId;
    let requestOptions = options;
    if (requestedPuzzleId === "klondike-solitaire") {
      requestOptions = { ...options, solitaireVariation: normalizeSolitaireVariation(options.solitaireVariation ?? solitaireVariation) };
    } else if (requestedPuzzleId === "sudoku") {
      requestOptions = { ...options, sudokuVariation: normalizeSudokuVariation(options.sudokuVariation ?? sudokuVariation) };
    } else if (requestedPuzzleId === "jigsaw") {
      const currentJigsawAsset = puzzle?.kind === "tiles" ? puzzle.asset : null;
      requestOptions = {
        ...options,
        imageId: options.imageId ?? currentJigsawAsset?.id,
      };
    }
    const result = generation.beginGeneration({ selectedPuzzleId, seed, width, height, difficulty, requireUniqueSolution, sudokuVariation }, requestOptions);

    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    markPuzzleNavigation(requestedPuzzleId);
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
    if (request.puzzleId === "sudoku") setSudokuVariation(normalizeSudokuVariation(request.sudokuVariation));
    if (request.puzzleId === "klondike-solitaire") setSolitaireVariation(normalizeSolitaireVariation(request.solitaireVariation));
    if (puzzle?.puzzleId !== request.puzzleId) resetRuntimePuzzleState();
    setStatusMessage(`Generating ${title}...`);
  };

  const beginPersistedPuzzle = (puzzleId: PuzzleId) => {
    const persistedSession = sessions.persistedSessionCache.current[puzzleId];
    if (!persistedSession) return false;
    sessions.pendingRestorePuzzleId.current = puzzleId;
    beginGeneration({
      puzzleId,
      seed: persistedSession.seed,
      width: persistedSession.width,
      height: persistedSession.height,
      difficulty: persistedSession.difficulty,
      requireUniqueSolution: persistedSession.requireUniqueSolution,
      sudokuVariation: persistedSession.sudokuVariation,
      solitaireVariation: persistedSession.solitaireVariation,
      imageId: persistedSession.imageId,
    });
    return true;
  };

  const handleGeneratedPuzzle = (generatedPuzzle: GeneratedPuzzle) => {
    const restoredSession = sessions.restorePendingSessionForPuzzle(generatedPuzzle);
    if (restoredSession) { restoreSession(generatedPuzzle.puzzleId, restoredSession); return; }
    const readyMessage = generation.makeReadyMessage(generatedPuzzle);
    setPuzzle(generatedPuzzle);
    if (generatedPuzzle.puzzleId === "sudoku") setSudokuVariation(normalizeSudokuVariation(generatedPuzzle.sudokuVariation));
    if (generatedPuzzle.kind === "cards") setSolitaireVariation(normalizeSolitaireVariation(generatedPuzzle.solitaireVariation));
    solitaire.restoreSolitaireSnapshot({ cardStacks: generatedPuzzle.kind === "cards" ? generatedPuzzle.stacks : null, selectedCard: null, solitaireStats: solitaire.solitaireStats, solitaireUndoStack: [], solitaireRedoStack: [], statusMessage: readyMessage });
    grid.prepareGeneratedGrid(generatedPuzzle);
    solitaire.resetSolitaireStats();
    solitaire.clearSolitaireHistory();
    setStatusMessage(readyMessage);
    restoreScrollPosition();
  };

  const selectHome = (behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    markHomeNavigation();
    setAppRoute({ kind: "home" }, behavior);
    setIsHomeSelected(true);
  };

  const selectPuzzle = (puzzleId: PuzzleId, behavior: NavigationBehavior = {}) => {
    setAppRoute({ kind: "puzzle", puzzleId }, behavior);
    if (puzzleId === selectedPuzzleId && hasSelectedPuzzle && !isHomeSelected && puzzle) return;
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    markPuzzleNavigation(puzzleId);
    setIsHomeSelected(false);
    const cachedSession = sessions.getCachedSession(puzzleId);
    if (cachedSession?.puzzle) { restoreSession(puzzleId, cachedSession); return; }
    if (beginPersistedPuzzle(puzzleId)) return;
    const definition = getPuzzleDefinition(puzzleId);
    beginGeneration({
      puzzleId,
      seed: makeRandomSeed(),
      width: definition.defaultWidth,
      height: definition.defaultHeight,
      difficulty: puzzleId === "sudoku" ? defaultSudokuDifficulty : difficulty,
      requireUniqueSolution,
      sudokuVariation: puzzleId === "sudoku" ? defaultSudokuVariation : undefined,
      solitaireVariation: puzzleId === "klondike-solitaire" ? solitaireVariation : undefined,
    });
  };

  const selectSiteView = (view: Exclude<AppView, "catalog">, behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    setIsHomeSelected(true);
    setAppRoute(view === "changelog" ? { kind: "updates" } : { kind: "about" }, behavior);
  };

  const selectNotFound = (nextRoute: Extract<AppRoute, { kind: "not-found" }>, behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    setIsHomeSelected(true);
    setAppRoute(nextRoute, behavior);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const nextRoute = parseAppRoute(window.location.pathname);
      if (nextRoute.kind === "puzzle") {
        selectPuzzle(nextRoute.puzzleId, { pushHistory: false });
      } else if (nextRoute.kind === "home") {
        selectHome({ pushHistory: false });
      } else if (nextRoute.kind === "not-found") {
        selectNotFound(nextRoute, { pushHistory: false });
      } else {
        selectSiteView(nextRoute.kind === "updates" ? "changelog" : "about", { pushHistory: false });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedPuzzleId, hasSelectedPuzzle, isHomeSelected, puzzle]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => generation.handleGenerationMessage(event, handleGeneratedPuzzle, (error) => {
      sessions.pendingRestorePuzzleId.current = null;
      setStatusMessage(error);
      restoreScrollPosition();
    });
    generation.worker.addEventListener("message", handleMessage);

    const persisted = loadPersistedPuzzleSessions();
    if (persisted) sessions.persistedSessionCache.current = persisted.sessions;

    if (initialRoute.kind === "puzzle") {
      selectPuzzle(initialRoute.puzzleId, { pushHistory: false });
    } else if (initialRoute.kind === "home") {
      markHomeNavigation();
    }

    return () => generation.worker.removeEventListener("message", handleMessage);
  }, [generation.worker]);

  useEffect(() => {
    const shouldRecover = shouldRecoverMissingPuzzleSurface({ hasSelectedPuzzle, isHomeSelected, isGenerating: generation.isGenerating, hasPuzzle: Boolean(puzzle), selectedPuzzleIsGeneratable });
    if (!shouldRecover) return;
    beginGeneration(makeMissingPuzzleGenerationOptions({ selectedPuzzleId, selectedDefinition, seed, difficulty, requireUniqueSolution, sudokuVariation, solitaireVariation, makeSeed: makeRandomSeed }));
  }, [hasSelectedPuzzle, isHomeSelected, generation.isGenerating, puzzle, selectedPuzzleId, selectedPuzzleIsGeneratable, sudokuVariation]);

  useEffect(() => {
    if (!hasSelectedPuzzle || generation.isGenerating || isHomeSelected || !puzzle) return;
    saveCurrentSession();
  }, [hasSelectedPuzzle, isHomeSelected, generation.isGenerating, selectedPuzzleId, seed, width, height, difficulty, requireUniqueSolution, sudokuVariation, puzzle, solitaire.cardStacks, solitaire.selectedCard, solitaire.solitaireStats, solitaire.solitaireUndoStack, solitaire.solitaireRedoStack, grid.gridCells, grid.selectedGridCell, statusMessage]);

  const generate = () => beginGeneration({}, { preserveScroll: true });
  const randomize = () => beginGeneration({ seed: makeRandomSeed() }, { preserveScroll: true });

  const resetCurrentPuzzle = () => {
    if (!puzzle) return;
    rememberScrollPosition();
    const readyMessage = generation.makeReadyMessage(puzzle);
    if (puzzle.kind === "cards") {
      solitaire.restoreSolitaireSnapshot({ cardStacks: puzzle.stacks, selectedCard: null, solitaireStats: initialSolitaireStats, solitaireUndoStack: [], solitaireRedoStack: [], statusMessage: readyMessage });
    } else {
      grid.prepareGeneratedGrid(puzzle);
      setStatusMessage(readyMessage);
    }
    restoreScrollPosition();
  };

  const commitGenerationSettings = ({ seed: nextSeed, width: nextWidth, height: nextHeight, difficulty: nextDifficulty, requireUniqueSolution: nextRequireUniqueSolution, sudokuVariation: nextSudokuVariation, solitaireVariation: nextSolitaireVariation, imageId: nextImageId }: Partial<Pick<PuzzleGenerationRequest, "seed" | "width" | "height" | "difficulty" | "requireUniqueSolution" | "sudokuVariation" | "solitaireVariation" | "imageId">> = {}) => {
    const definition = getPuzzleDefinition(selectedPuzzleId);
    const normalizedSeed = (typeof nextSeed === "string" ? nextSeed.trim() : seed.trim()) || puzzle?.seed || makeRandomSeed();
    const generationWidth = Number.isFinite(nextWidth) ? Number(nextWidth) : width || definition.defaultWidth;
    const generationHeight = Number.isFinite(nextHeight) ? Number(nextHeight) : height || definition.defaultHeight;
    const generationDifficulty = nextDifficulty ?? difficulty;
    const generationRequireUniqueSolution = typeof nextRequireUniqueSolution === "boolean" ? nextRequireUniqueSolution : requireUniqueSolution;
    const generationSudokuVariation = normalizeSudokuVariation(nextSudokuVariation ?? puzzle?.sudokuVariation ?? sudokuVariation);
    const currentGrid = puzzle?.kind === "grid" ? puzzle : null;
    const currentSolitaireVariation = puzzle?.kind === "cards" ? puzzle.solitaireVariation : undefined;
    const generationSolitaireVariation = normalizeSolitaireVariation(nextSolitaireVariation ?? currentSolitaireVariation ?? solitaireVariation);
    const currentJigsawAsset = puzzle?.kind === "tiles" ? puzzle.asset : null;
    const generationImageId = nextImageId ?? currentJigsawAsset?.id;
    const settingsAreCurrent = puzzle?.puzzleId === selectedPuzzleId && puzzle.seed === normalizedSeed && (!currentGrid || (currentGrid.width === generationWidth && currentGrid.height === generationHeight)) && (selectedPuzzleId !== "sudoku" || (puzzle.difficulty === generationDifficulty && normalizeSudokuVariation(puzzle.sudokuVariation) === generationSudokuVariation)) && (selectedPuzzleId !== "nonogram" || (puzzle.difficulty === generationDifficulty && Boolean(puzzle.uniqueSolution) === generationRequireUniqueSolution)) && (selectedPuzzleId !== "klondike-solitaire" || solitaireVariationsEqual(currentSolitaireVariation, generationSolitaireVariation)) && (selectedPuzzleId !== "jigsaw" || (puzzle.width === generationWidth && puzzle.height === generationHeight && currentJigsawAsset?.id === generationImageId));

    if (normalizedSeed !== seed) setSeed(normalizedSeed);
    if (generationWidth !== width) setWidth(generationWidth);
    if (generationHeight !== height) setHeight(generationHeight);
    if (generationDifficulty !== difficulty) setDifficulty(generationDifficulty);
    if (generationRequireUniqueSolution !== requireUniqueSolution) setRequireUniqueSolution(generationRequireUniqueSolution);
    if (selectedPuzzleId === "sudoku") setSudokuVariation(generationSudokuVariation);
    if (selectedPuzzleId === "klondike-solitaire") setSolitaireVariation(generationSolitaireVariation);
    if (settingsAreCurrent) return;
    beginGeneration({ seed: normalizedSeed, width: generationWidth, height: generationHeight, difficulty: generationDifficulty, requireUniqueSolution: generationRequireUniqueSolution, sudokuVariation: selectedPuzzleId === "sudoku" ? generationSudokuVariation : undefined, solitaireVariation: selectedPuzzleId === "klondike-solitaire" ? generationSolitaireVariation : undefined, imageId: selectedPuzzleId === "jigsaw" ? generationImageId : undefined }, { preserveScroll: true });
  };

  const handleDifficultyChange = (nextDifficulty: PuzzleDifficulty) => {
    if (selectedPuzzleId === "sudoku") { beginGeneration({ puzzleId: "sudoku", seed, width: 9, height: 9, difficulty: nextDifficulty, sudokuVariation }, { preserveScroll: true }); return; }
    if (selectedPuzzleId === "nonogram") { commitGenerationSettings({ difficulty: nextDifficulty }); return; }
    setDifficulty(nextDifficulty);
  };
  const handleSudokuVariationChange = (nextSudokuVariation: SudokuVariation) => selectedPuzzleId === "sudoku" ? commitGenerationSettings({ sudokuVariation: nextSudokuVariation }) : setSudokuVariation(nextSudokuVariation);
  const handleUniqueSolutionChange = (nextRequireUniqueSolution: boolean) => selectedPuzzleId === "nonogram" ? commitGenerationSettings({ requireUniqueSolution: nextRequireUniqueSolution }) : setRequireUniqueSolution(nextRequireUniqueSolution);
  const handleCheck = () => { if (!puzzle) return; puzzle.kind === "cards" ? solitaire.checkSolitaire() : grid.checkGrid(puzzle, setStatusMessage); };

  const puzzleNavigation = activeView === "catalog" ? <PuzzleCatalog isCollapsed={isCatalogCollapsed} isHomeSelected={isHomeSelected || !hasSelectedPuzzle} selectedPuzzleId={selectedPuzzleId} onCollapseToggle={() => setIsCatalogCollapsed((current) => !current)} onHomeSelect={() => selectHome()} onSelectPuzzle={(puzzleId) => selectPuzzle(puzzleId)} /> : null;

  let content;
  if (route.kind === "not-found") {
    content = <NotFoundView pathname={route.pathname} onHomeSelect={() => selectHome()} />;
  } else if (activeView === "changelog") {
    content = <ChangelogView />;
  } else if (activeView === "about") {
    content = <AboutView />;
  } else {
    content = (
      <section class={`catalog-layout ${isCatalogCollapsed ? "catalog-collapsed" : ""}`}>
        {isHomeSelected || !hasSelectedPuzzle ? <StartView readyPuzzles={readyPuzzles} previewPuzzles={previewPuzzles} onSelectPuzzle={(puzzleId) => selectPuzzle(puzzleId)} /> : (
          <PuzzleWorkspace
            selectedDefinition={selectedDefinition}
            selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
            seed={seed}
            width={width}
            height={height}
            difficulty={difficulty}
            requireUniqueSolution={requireUniqueSolution}
            sudokuVariation={puzzle?.puzzleId === "sudoku" ? normalizeSudokuVariation(puzzle.sudokuVariation) : sudokuVariation}
            puzzle={puzzle}
            solitaireVariation={puzzle?.kind === "cards" ? puzzle.solitaireVariation : solitaireVariation}
            cardStacks={solitaire.cardStacks}
            selectedCard={solitaire.selectedCard}
            solitaireStats={solitaire.solitaireStats}
            gridCells={grid.gridCells}
            selectedGridCell={grid.selectedGridCell}
            statusMessage={statusMessage}
            isGenerating={generation.isGenerating || (!puzzle && selectedPuzzleIsGeneratable && !isHomeSelected)}
            onSeedChange={setSeed}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
            onSettingsCommit={commitGenerationSettings}
            onDifficultyChange={handleDifficultyChange}
            onSudokuVariationChange={handleSudokuVariationChange}
            onUniqueSolutionChange={handleUniqueSolutionChange}
            onGenerate={generate}
            onRandomize={randomize}
            onReset={resetCurrentPuzzle}
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
    );
  }

  return (
    <AppShell activeView={activeView} headerControls={puzzleNavigation} onHomeSelect={() => selectHome()} onViewSelect={(view) => selectSiteView(view)}>
      {content}
    </AppShell>
  );
};
