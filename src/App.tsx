import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleAvailability } from "./catalog/puzzleAvailability";
import { getPuzzleDefinition, isGeneratable } from "./catalog/puzzleCatalog";
import type { GeneratedPuzzle, PuzzleId } from "./catalog/types";
import { AboutView } from "./components/AboutView";
import { AppShell } from "./components/AppShell";
import { ChangelogView } from "./components/ChangelogView";
import { NotFoundView } from "./components/NotFoundView";
import { PuzzleCatalog } from "./components/PuzzleCatalog";
import { PuzzleWorkspace } from "./components/PuzzleWorkspace";
import { StartView } from "./components/StartView";
import { getDailyPuzzleSeed } from "./games/shared/daily";
import { isImageBackedPuzzleId } from "./games/imageAssets";
import { defaultSolitaireVariation, normalizeSolitaireVariation } from "./games/solitaire/variation";
import { defaultSudokuVariation, normalizeSudokuVariation } from "./games/sudoku/variation";
import {
  generatedPuzzleMatchesIdentity,
  getGeneratedPuzzleRuntimeSettings,
  type GenerationRuntimeSettings,
} from "./app/generationIdentity";
import { resolveGenerationIdentity, type GenerationSettings } from "./app/generationSettings";
import { getInitialSelectedPuzzleId, markPuzzleNavigation } from "./app/homeNavigation";
import { defaultPuzzleDifficulty, makeRandomSeed } from "./app/runtime";
import { getCurrentAppRoute, parseAppRoute, pushAppRoute, type AppRoute } from "./app/routes";
import { initialSolitaireStats, loadPersistedPuzzleSessions } from "./app/session";
import { useGridController } from "./app/useGridController";
import { useNextPuzzleDrafts } from "./app/useNextPuzzleDrafts";
import { makeInitialPuzzleGenerationOptions, makeMissingPuzzleGenerationOptions, shouldRecoverMissingPuzzleSurface, usePuzzleGeneration, type BeginGenerationOptions } from "./app/usePuzzleGeneration";
import { buildRuntimeSession, usePuzzleSessions } from "./app/usePuzzleSessions";
import { useSolitaireController } from "./app/useSolitaireController";
import type { AppView } from "./site/views";

const initialStatusMessage = "Pick a puzzle to start.";
type GenerationBehavior = { preserveScroll?: boolean };
type NavigationBehavior = { pushHistory?: boolean };

const makeInitialGenerationDefaults = (): GenerationRuntimeSettings => ({
  seed: makeRandomSeed(),
  width: 9,
  height: 9,
  difficulty: defaultPuzzleDifficulty,
  requireUniqueSolution: true,
  sudokuVariation: defaultSudokuVariation,
  solitaireVariation: defaultSolitaireVariation,
});

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
  const [generationDefaults, setGenerationDefaults] = useState<GenerationRuntimeSettings>(makeInitialGenerationDefaults);
  const [puzzle, setPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage);
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(true);
  const [hasSelectedPuzzle, setHasSelectedPuzzle] = useState(shouldStartOnPuzzleSurface);
  const [isHomeSelected, setIsHomeSelected] = useState(!shouldStartOnPuzzleSurface);
  const pendingScrollRestore = useRef<{ x: number; y: number } | null>(null);
  const generatedPuzzleHandlerRef = useRef<(generatedPuzzle: GeneratedPuzzle) => void>(() => undefined);
  const routeNavigationHandlerRef = useRef<(route: AppRoute) => void>(() => undefined);
  const saveCurrentSessionRef = useRef<() => void>(() => undefined);
  const { seed, width, height, difficulty, requireUniqueSolution, sudokuVariation, solitaireVariation } = generationDefaults;
  const activeSolitaireVariation = puzzle?.kind === "cards" ? puzzle.solitaireVariation : solitaireVariation;

  const updateGenerationDefaults = (settings: Partial<GenerationRuntimeSettings>) => {
    setGenerationDefaults((current) => ({ ...current, ...settings }));
  };

  const generation = usePuzzleGeneration();
  const sessions = usePuzzleSessions();
  const grid = useGridController();
  const solitaire = useSolitaireController({ statusMessage, onStatusMessage: setStatusMessage, solitaireVariation: activeSolitaireVariation });
  const {
    nextPuzzleDraft,
    seedLoadInput,
    getRememberedNextPuzzleDraft,
    updateNextPuzzleDraft,
    updateSeedLoadInput,
    rememberNextPuzzleDraft,
  } = useNextPuzzleDrafts({ selectedPuzzleId, puzzle, runtimeSettings: generationDefaults });
  const { readyPuzzles, previewPuzzles } = useMemo(() => getPuzzleAvailability(), []);
  const selectedDefinition = getPuzzleDefinition(selectedPuzzleId);
  const selectedPuzzleIsGeneratable = isGeneratable(selectedDefinition);
  const activeView = viewForRoute(route);

  const cancelPendingGeneration = () => {
    generation.cancelGeneration();
    sessions.cancelPersistedRestore();
  };

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

  const restoreSession = (session: ReturnType<typeof buildRuntimeSession>) => {
    const restoredPuzzle = session.puzzle;
    const puzzleId = restoredPuzzle.puzzleId;
    cancelPendingGeneration();
    markPuzzleNavigation(puzzleId);
    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    setSelectedPuzzleId(puzzleId);
    setGenerationDefaults((current) => getGeneratedPuzzleRuntimeSettings(restoredPuzzle, current));
    setPuzzle(restoredPuzzle);

    if (session.progress.kind === "cards") {
      solitaire.restoreSolitaireSnapshot({
        cardStacks: session.progress.cardStacks,
        selectedCard: session.progress.selectedCard,
        solitaireStats: session.progress.solitaireStats,
        solitaireUndoStack: session.progress.undoStack,
        solitaireRedoStack: session.progress.redoStack,
        statusMessage: session.statusMessage,
      });
    } else {
      solitaire.resetSolitaire();
      setStatusMessage(session.statusMessage);
    }

    grid.restoreGridSnapshot(
      session.progress.kind === "grid"
        ? { gridCells: session.progress.cells, selectedGridCell: session.progress.selectedCell }
        : { gridCells: null, selectedGridCell: null },
    );
    restoreScrollPosition();
  };

  const makeCurrentSession = () => puzzle
    ? buildRuntimeSession({
        puzzle,
        cardStacks: solitaire.cardStacks,
        selectedCard: solitaire.selectedCard,
        solitaireStats: solitaire.solitaireStats,
        solitaireUndoStack: solitaire.solitaireUndoStack,
        solitaireRedoStack: solitaire.solitaireRedoStack,
        gridCells: grid.gridCells,
        selectedGridCell: grid.selectedGridCell,
        statusMessage,
      })
    : null;

  const saveCurrentSession = () => {
    const session = makeCurrentSession();
    if (session) sessions.saveSession(session.puzzle.puzzleId, session);
  };
  saveCurrentSessionRef.current = () => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
  };

  const resetRuntimePuzzleState = () => { setPuzzle(null); solitaire.resetSolitaire(); grid.resetGrid(); };

  const beginGeneration = (options: BeginGenerationOptions = {}, behavior: GenerationBehavior = {}) => {
    if (behavior.preserveScroll) rememberScrollPosition();
    const requestedPuzzleId = options.puzzleId ?? selectedPuzzleId;
    let requestOptions = options;
    if (requestedPuzzleId === "klondike-solitaire") {
      requestOptions = { ...options, solitaireVariation: normalizeSolitaireVariation(options.solitaireVariation ?? solitaireVariation) };
    } else if (requestedPuzzleId === "sudoku") {
      requestOptions = { ...options, sudokuVariation: normalizeSudokuVariation(options.sudokuVariation ?? sudokuVariation) };
    } else if (isImageBackedPuzzleId(requestedPuzzleId)) {
      const currentImageAsset = puzzle?.kind === "tiles" && puzzle.puzzleId === requestedPuzzleId && puzzle.asset.kind === "image"
        ? puzzle.asset
        : null;
      requestOptions = {
        ...options,
        imageId: options.imageId ?? currentImageAsset?.id,
      };
    }
    const result = generation.beginGeneration({ selectedPuzzleId, seed, width, height, difficulty, requireUniqueSolution, sudokuVariation }, requestOptions);

    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    markPuzzleNavigation(requestedPuzzleId);
    if (result.kind === "planned") {
      const definition = getPuzzleDefinition(result.puzzleId);
      setSelectedPuzzleId(result.puzzleId);
      updateGenerationDefaults({ width: definition.defaultWidth, height: definition.defaultHeight });
      resetRuntimePuzzleState();
      setStatusMessage(`${result.title} is planned for a future generator.`);
      restoreScrollPosition();
      return;
    }

    const { request, title } = result;
    setSelectedPuzzleId(request.puzzleId);
    setGenerationDefaults((current) => ({
      seed: request.seed,
      width: request.width,
      height: request.height,
      difficulty: request.difficulty ?? current.difficulty,
      requireUniqueSolution: request.requireUniqueSolution ?? current.requireUniqueSolution,
      sudokuVariation: request.puzzleId === "sudoku" ? normalizeSudokuVariation(request.sudokuVariation) : current.sudokuVariation,
      solitaireVariation: request.puzzleId === "klondike-solitaire" ? normalizeSolitaireVariation(request.solitaireVariation) : current.solitaireVariation,
    }));
    if (puzzle?.puzzleId !== request.puzzleId) resetRuntimePuzzleState();
    setStatusMessage(`Generating ${title}...`);
  };

  const beginPersistedPuzzle = (puzzleId: PuzzleId) => {
    const persistedSession = sessions.beginPersistedRestore(puzzleId);
    if (!persistedSession) return false;
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
    if (restoredSession) { restoreSession(restoredSession); return; }
    const readyMessage = generation.makeReadyMessage(generatedPuzzle);
    setPuzzle(generatedPuzzle);
    setGenerationDefaults((current) => getGeneratedPuzzleRuntimeSettings(generatedPuzzle, current));
    if (generatedPuzzle.kind === "cards") {
      solitaire.restoreSolitaireSnapshot({
        cardStacks: generatedPuzzle.stacks,
        selectedCard: null,
        solitaireStats: initialSolitaireStats,
        solitaireUndoStack: [],
        solitaireRedoStack: [],
        statusMessage: readyMessage,
      });
    } else {
      solitaire.resetSolitaire();
      setStatusMessage(readyMessage);
    }
    grid.prepareGeneratedGrid(generatedPuzzle);
    restoreScrollPosition();
  };
  generatedPuzzleHandlerRef.current = handleGeneratedPuzzle;

  const selectHome = (behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
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
    if (cachedSession) { restoreSession(cachedSession); return; }
    if (beginPersistedPuzzle(puzzleId)) return;
    beginGeneration(makeInitialPuzzleGenerationOptions({
      puzzleId,
      makeSeed: makeRandomSeed,
      rememberedDraft: getRememberedNextPuzzleDraft(puzzleId),
    }));
  };

  const selectSiteView = (view: Exclude<AppView, "catalog">, behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
    setIsHomeSelected(true);
    setAppRoute(view === "changelog" ? { kind: "updates" } : { kind: "about" }, behavior);
  };

  const selectNotFound = (nextRoute: Extract<AppRoute, { kind: "not-found" }>, behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
    setIsHomeSelected(true);
    setAppRoute(nextRoute, behavior);
  };

  routeNavigationHandlerRef.current = (nextRoute) => {
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => routeNavigationHandlerRef.current(parseAppRoute(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePageHide = () => saveCurrentSessionRef.current();
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => generation.handleGenerationMessage(
      event,
      (generatedPuzzle) => generatedPuzzleHandlerRef.current(generatedPuzzle),
      (error) => {
        sessions.cancelPersistedRestore();
        setStatusMessage(error);
        restoreScrollPosition();
      },
    );
    generation.worker.addEventListener("message", handleMessage);

    const persisted = loadPersistedPuzzleSessions();
    if (persisted) sessions.initializePersistedSessions(persisted.sessions);

    if (initialRoute.kind === "puzzle") {
      selectPuzzle(initialRoute.puzzleId, { pushHistory: false });
    }

    return () => generation.worker.removeEventListener("message", handleMessage);
  }, [generation.worker]);

  useEffect(() => {
    const shouldRecover = shouldRecoverMissingPuzzleSurface({
      hasSelectedPuzzle,
      isHomeSelected,
      isGenerating: generation.isGenerating,
      hasActiveGenerationRequest: generation.hasActiveRequest(),
      hasPuzzle: Boolean(puzzle),
      selectedPuzzleIsGeneratable,
    });
    if (!shouldRecover) return;
    beginGeneration(makeMissingPuzzleGenerationOptions({
      selectedPuzzleId,
      selectedDefinition,
      seed,
      width,
      height,
      difficulty,
      requireUniqueSolution,
      sudokuVariation,
      solitaireVariation,
      makeSeed: makeRandomSeed,
    }));
  }, [hasSelectedPuzzle, isHomeSelected, generation.isGenerating, puzzle, selectedPuzzleId, selectedPuzzleIsGeneratable, selectedDefinition, seed, width, height, difficulty, requireUniqueSolution, sudokuVariation, solitaireVariation]);

  useEffect(() => {
    if (!hasSelectedPuzzle || generation.isGenerating || isHomeSelected || !puzzle) return;
    saveCurrentSession();
  }, [hasSelectedPuzzle, isHomeSelected, generation.isGenerating, selectedPuzzleId, puzzle, solitaire.cardStacks, solitaire.selectedCard, solitaire.solitaireStats, solitaire.solitaireUndoStack, solitaire.solitaireRedoStack, grid.gridCells, grid.selectedGridCell, statusMessage]);

  const generate = () => beginGeneration({}, { preserveScroll: true });

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

  const commitGenerationSettings = (settings: GenerationSettings = {}) => {
    const identity = resolveGenerationIdentity({
      puzzleId: selectedPuzzleId,
      currentPuzzle: puzzle,
      runtimeSettings: generationDefaults,
      settings,
      makeSeed: makeRandomSeed,
    });
    const settingsAreCurrent = generatedPuzzleMatchesIdentity(puzzle, identity);

    setGenerationDefaults({
      seed: identity.seed,
      width: identity.width,
      height: identity.height,
      difficulty: identity.difficulty,
      requireUniqueSolution: identity.requireUniqueSolution,
      sudokuVariation: identity.sudokuVariation,
      solitaireVariation: identity.solitaireVariation,
    });
    if (settingsAreCurrent) return;

    beginGeneration({
      seed: identity.seed,
      width: identity.width,
      height: identity.height,
      difficulty: identity.difficulty,
      requireUniqueSolution: identity.requireUniqueSolution,
      sudokuVariation: selectedPuzzleId === "sudoku" ? identity.sudokuVariation : undefined,
      solitaireVariation: selectedPuzzleId === "klondike-solitaire" ? identity.solitaireVariation : undefined,
      imageId: isImageBackedPuzzleId(selectedPuzzleId) ? identity.imageId : undefined,
    }, { preserveScroll: true });
  };

  const generateNextPuzzle = () => {
    rememberNextPuzzleDraft();
    commitGenerationSettings({ ...nextPuzzleDraft, seed: makeRandomSeed() });
  };

  const loadSeededPuzzle = () => {
    const nextSeed = seedLoadInput.trim();
    if (!nextSeed) return;
    rememberNextPuzzleDraft();
    commitGenerationSettings({ ...nextPuzzleDraft, seed: nextSeed });
  };

  const loadToday = () => {
    rememberNextPuzzleDraft();
    commitGenerationSettings({ ...nextPuzzleDraft, seed: getDailyPuzzleSeed(selectedPuzzleId) });
  };

  const commitRememberedGenerationSettings = (settings: GenerationSettings = {}) => {
    updateNextPuzzleDraft(settings);
    commitGenerationSettings(settings);
  };

  const handleCheck = () => { if (!puzzle) return; puzzle.kind === "cards" ? solitaire.checkSolitaire() : grid.checkGrid(puzzle, setStatusMessage); };
  const workspaceIsGenerating = generation.isGenerating || (!puzzle && selectedPuzzleIsGeneratable && !isHomeSelected);
  const workspaceCore = {
    selectedDefinition,
    selectedPuzzleIsGeneratable,
    seed,
    puzzle,
    statusMessage,
    isGenerating: workspaceIsGenerating,
    onReset: resetCurrentPuzzle,
  };
  const workspaceProspective = {
    nextPuzzleDraft,
    seedLoadInput,
    onNextPuzzleDraftChange: updateNextPuzzleDraft,
    onSeedLoadInputChange: updateSeedLoadInput,
    onNewPuzzle: generateNextPuzzle,
    onToday: loadToday,
    onLoadSeed: loadSeededPuzzle,
  };
  const workspaceGrid = {
    gridCells: grid.gridCells,
    selectedGridCell: grid.selectedGridCell,
    gridCheckFeedbackTone: grid.checkFeedbackTone,
    onCheck: handleCheck,
    onCellClick: (cell: Parameters<typeof grid.handleGridCellClick>[1]) => grid.handleGridCellClick(puzzle, cell, setStatusMessage),
    onCellInput: (cell: Parameters<typeof grid.handleGridCellInput>[1], value: string) => grid.handleGridCellInput(puzzle, cell, value, setStatusMessage),
  };
  const workspaceSolitaire = {
    cardStacks: solitaire.cardStacks,
    selectedCard: solitaire.selectedCard,
    solitaireStats: solitaire.solitaireStats,
    onAutoMoveToFoundations: solitaire.autoMoveToFoundations,
    onUndoSolitaire: solitaire.undoSolitaireMove,
    onRedoSolitaire: solitaire.redoSolitaireMove,
    canUndoSolitaire: solitaire.solitaireUndoStack.length > 0,
    canRedoSolitaire: solitaire.solitaireRedoStack.length > 0,
    onCardClick: solitaire.handleCardClick,
    onCardDoubleClick: solitaire.moveSingleCardToFoundation,
    onStackClick: solitaire.handleStackClick,
  };
  const workspaceImmediate = {
    width,
    height,
    onSeedChange: (nextSeed: string) => updateGenerationDefaults({ seed: nextSeed }),
    onWidthChange: (nextWidth: number) => updateGenerationDefaults({ width: nextWidth }),
    onHeightChange: (nextHeight: number) => updateGenerationDefaults({ height: nextHeight }),
    onSettingsCommit: commitRememberedGenerationSettings,
    onGenerate: generate,
    onToday: loadToday,
    onRandomize: generateNextPuzzle,
  };

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
            core={workspaceCore}
            prospective={workspaceProspective}
            grid={workspaceGrid}
            solitaire={workspaceSolitaire}
            immediate={workspaceImmediate}
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
