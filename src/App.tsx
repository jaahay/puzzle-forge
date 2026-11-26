import { createCrosswordProgress, isCrosswordComplete, restoreCrosswordProgress, type CrosswordProgress } from "./games/crossword/progress";
import { createWordSearchProgress, isWordSearchComplete, selectWordSearchEndpoints, type WordSearchProgress } from "./games/wordSearch/progress";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleAvailability } from "./catalog/puzzleAvailability";
import { planAbandonmentAction, type IdentifiedWorkspaceProgress, type PendingAbandonmentAction, type WorkspaceProgressReport } from "./app/abandonmentPolicy";
import { getPuzzleDefinition, isGeneratable } from "./catalog/puzzleCatalog";
import type { GeneratedPuzzle, PuzzleId } from "./catalog/types";
import { AboutView } from "./components/AboutView";
import { AppShell } from "./components/AppShell";
import { AbandonmentDialog } from "./components/AbandonmentDialog";
import { ChangelogView } from "./components/ChangelogView";
import { NotFoundView } from "./components/NotFoundView";
import { PuzzleCatalog } from "./components/PuzzleCatalog";
import { ResourceUnavailableView } from "./components/ResourceUnavailableView";
import { PuzzleWorkspace } from "./components/PuzzleWorkspace";
import { PuzzleShareProvider } from "./components/PuzzleShare";
import { getCurrentPuzzleIdentity } from "./components/CurrentPuzzleIdentity";
import { formatPuzzleShareProgress, getPuzzleShareResource } from "./app/puzzleShare";
import { StartView } from "./components/StartView";
import { getLocalDateStamp } from "./games/shared/daily";
import { isImageBackedPuzzleId } from "./games/imageAssets";
import { defaultJigsawBoundaryMode } from "./games/jigsaw/boundaryContours";
import { defaultJigsawCutStyle } from "./games/jigsaw/cutStyle";
import { defaultJigsawSpecialPiecesMode } from "./games/jigsaw/specialPieces";
import { defaultSolitaireVariation, normalizeSolitaireVariation } from "./games/solitaire/variation";
import { defaultSudokuVariation } from "./games/sudoku/variation";
import {
  generatedPuzzleMatchesIdentity,
  getGeneratedPuzzleRuntimeSettings,
  type GenerationIdentity,
  type GenerationRuntimeSettings,
} from "./app/generationIdentity";
import { resolveGenerationIdentity, type GenerationSettings } from "./app/generationSettings";
import { cloneImageTileActionRuntime, type ImageTileActionRuntime } from "./games/imageTiles/history";
import { cloneJigsawActionRuntime, type JigsawActionRuntime } from "./games/jigsaw/history";
import { getInitialSelectedPuzzleId, markPuzzleNavigation } from "./app/homeNavigation";
import { encodeGenerationId, resolvePuzzleResourceSegment } from "./app/puzzleResourceIdentity";
import { defaultPuzzleDifficulty, makeRandomSeed } from "./app/runtime";
import { getCurrentAppRoute, parseAppRoute, pushAppRoute, replaceAppRoute, type AppRoute } from "./app/routes";
import { initialSolitaireStats, loadPersistedPuzzleSessions, type PuzzleSession } from "./app/session";
import { isInstalledAppContext, resolveStartupRoute } from "./app/startupNavigation";
import { useGridController } from "./app/useGridController";
import { randomizeNextPuzzleArtwork, useNextPuzzleDrafts } from "./app/useNextPuzzleDrafts";
import { makeInitialPuzzleGenerationOptions, makeMissingPuzzleGenerationOptions, shouldRecoverMissingPuzzleSurface, usePuzzleGeneration, type BeginGenerationOptions } from "./app/usePuzzleGeneration";
import { buildFreshSessionForGeneratedPuzzle, buildRuntimeSession, usePuzzleSessions } from "./app/usePuzzleSessions";
import { useSolitaireController } from "./app/useSolitaireController";
import type { AppView } from "./site/views";

const initialStatusMessage = "Pick a puzzle to start.";
type ResourceHistoryBehavior = "push" | "replace";
type GenerationBehavior = {
  preserveScroll?: boolean;
  resourceHistory?: ResourceHistoryBehavior;
};
type NavigationBehavior = { pushHistory?: boolean };
type PendingGenerationResource = {
  identity: GenerationIdentity;
  route: Extract<AppRoute, { kind: "resource" }>;
  history: ResourceHistoryBehavior;
  fallback: { route: AppRoute; session: PuzzleSession } | null;
};

const makeInitialGenerationDefaults = (): GenerationRuntimeSettings => ({
  seed: makeRandomSeed(),
  width: 9,
  height: 9,
  difficulty: defaultPuzzleDifficulty,
  requireUniqueSolution: true,
  sudokuVariation: defaultSudokuVariation,
  solitaireVariation: defaultSolitaireVariation,
  jigsawCutStyle: defaultJigsawCutStyle,
  jigsawBoundaryMode: defaultJigsawBoundaryMode,
  jigsawSpecialPiecesMode: defaultJigsawSpecialPiecesMode,
});

const viewForRoute = (route: AppRoute): AppView | null => {
  if (route.kind === "updates") return "changelog";
  if (route.kind === "about") return "about";
  if (route.kind === "not-found") return null;
  return "catalog";
};

const generatedBaselinesMatch = (left: GeneratedPuzzle, right: GeneratedPuzzle) =>
  left.puzzleId === right.puzzleId &&
  left.seed === right.seed &&
  left.width === right.width &&
  left.height === right.height &&
  left.checksum === right.checksum;

export const App = () => {
  const initialPersistedSessions = useMemo(loadPersistedPuzzleSessions, []);
  const initialRoute = useMemo(
    () => resolveStartupRoute(
      getCurrentAppRoute(),
      initialPersistedSessions,
      {
        resumeActiveSession: isInstalledAppContext(),
      },
    ),
    [initialPersistedSessions],
  );
  const storedPuzzleId = useMemo(
    () => getInitialSelectedPuzzleId("sudoku", initialPersistedSessions),
    [initialPersistedSessions],
  );
  const initialSelectedPuzzleId =
    initialRoute.kind === "puzzle" ||
    initialRoute.kind === "resource" ||
    initialRoute.kind === "unavailable-resource"
      ? initialRoute.puzzleId
      : storedPuzzleId;
  const shouldStartOnPuzzleSurface =
    initialRoute.kind === "puzzle" ||
    initialRoute.kind === "resource" ||
    initialRoute.kind === "unavailable-resource";
  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<PuzzleId>(initialSelectedPuzzleId);
  const [generationDefaults, setGenerationDefaults] = useState<GenerationRuntimeSettings>(makeInitialGenerationDefaults);
  const [puzzle, setPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage);
  const [crosswordProgress, setCrosswordProgress] = useState<CrosswordProgress | null>(null);
  const crosswordProgressRef = useRef<CrosswordProgress | null>(null);
  const updateCrosswordProgress = (progress: CrosswordProgress | null) => {
    crosswordProgressRef.current = progress;
    setCrosswordProgress(progress);
  };
  const [wordSearchProgress, setWordSearchProgress] = useState<WordSearchProgress | null>(null);
  const wordSearchProgressRef = useRef<WordSearchProgress | null>(null);
  const updateWordSearchProgress = (progress: WordSearchProgress | null) => {
    wordSearchProgressRef.current = progress;
    setWordSearchProgress(progress);
  };
  const imageTileRuntimeRef = useRef<{ puzzleInstanceId: string; runtime: ImageTileActionRuntime } | null>(null);
  const jigsawRuntimeRef = useRef<{ puzzleInstanceId: string; runtime: JigsawActionRuntime } | null>(null);
  const [puzzleLinkError, setPuzzleLinkError] = useState<string | null>(null);
  const [generationFailureNotice, setGenerationFailureNotice] = useState<string | null>(null);
  const [pendingAbandonment, setPendingAbandonment] = useState<PendingAbandonmentAction | null>(null);
  const workspaceProgressRef = useRef<IdentifiedWorkspaceProgress | null>(null);
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(true);
  const [hasSelectedPuzzle, setHasSelectedPuzzle] = useState(shouldStartOnPuzzleSurface);
  const [isHomeSelected, setIsHomeSelected] = useState(!shouldStartOnPuzzleSurface);
  const pendingScrollRestore = useRef<{ x: number; y: number } | null>(null);
  const pendingGenerationResourceRef = useRef<PendingGenerationResource | null>(null);
  const generatedPuzzleHandlerRef = useRef<(generatedPuzzle: GeneratedPuzzle) => void>(() => undefined);
  const generationErrorHandlerRef = useRef<(message: string) => void>(() => undefined);
  const routeNavigationHandlerRef = useRef<(route: AppRoute) => void>(() => undefined);
  const saveCurrentSessionRef = useRef<() => void>(() => undefined);
  const {
    seed,
    width,
    height,
    difficulty,
    requireUniqueSolution,
    sudokuVariation,
    solitaireVariation,
    jigsawCutStyle,
    jigsawBoundaryMode,
    jigsawSpecialPiecesMode,
    wordSearchTheme,
  } = generationDefaults;
  const activeSolitaireVariation = puzzle?.kind === "cards" ? puzzle.solitaireVariation : solitaireVariation;

  const updateGenerationDefaults = (settings: Partial<GenerationRuntimeSettings>) => {
    setGenerationDefaults((current) => ({ ...current, ...settings }));
  };

  const generation = usePuzzleGeneration(message => generationErrorHandlerRef.current(message));
  const sessions = usePuzzleSessions(initialPersistedSessions);
  const grid = useGridController();
  const solitaire = useSolitaireController({ onStatusMessage: setStatusMessage, solitaireVariation: activeSolitaireVariation });
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
    pendingGenerationResourceRef.current = null;
    setGenerationFailureNotice(null);
    generation.cancelGeneration();
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
    setPendingAbandonment(null);
    if (behavior.pushHistory !== false) pushAppRoute(nextRoute);
    setRoute(nextRoute);
  };

  const replaceCurrentRoute = (nextRoute: AppRoute) => {
    setPendingAbandonment(null);
    replaceAppRoute(nextRoute);
    setRoute(nextRoute);
  };

  const commitResourceRoute = (
    nextRoute: Extract<AppRoute, { kind: "resource" }>,
    history: ResourceHistoryBehavior,
  ) => {
    if (history === "push") {
      setAppRoute(nextRoute);
      return;
    }
    replaceCurrentRoute(nextRoute);
  };

  const restoreSession = (
    session: ReturnType<typeof buildRuntimeSession>,
    nextRoute: AppRoute = { kind: "puzzle", puzzleId: session.puzzle.puzzleId },
    routeHistory: ResourceHistoryBehavior = "replace",
  ) => {
    const restoredPuzzle = session.puzzle;
    const puzzleId = restoredPuzzle.puzzleId;
    cancelPendingGeneration();
    setPuzzleLinkError(null);
    markPuzzleNavigation(puzzleId);
    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    setSelectedPuzzleId(puzzleId);
    setGenerationDefaults((current) => getGeneratedPuzzleRuntimeSettings(restoredPuzzle, current));
    setPuzzle(restoredPuzzle);
    updateCrosswordProgress(session.progress.kind === "crossword" ? session.progress : null);
    updateWordSearchProgress(session.progress.kind === "word-search" ? session.progress : null);
    imageTileRuntimeRef.current = session.progress.kind === "tiles" && session.progress.imageTileRuntime
      ? {
          puzzleInstanceId: restoredPuzzle.id,
          runtime: cloneImageTileActionRuntime(session.progress.imageTileRuntime),
        }
      : null;
    jigsawRuntimeRef.current = session.progress.kind === "tiles" && session.progress.jigsawRuntime
      ? {
          puzzleInstanceId: restoredPuzzle.id,
          runtime: cloneJigsawActionRuntime(session.progress.jigsawRuntime),
        }
      : null;
    if (nextRoute.kind === "resource") commitResourceRoute(nextRoute, routeHistory);
    else replaceCurrentRoute(nextRoute);

    if (session.progress.kind === "cards") {
      solitaire.restoreSolitaireSnapshot({
        cardStacks: session.progress.cardStacks,
        selectedCard: session.progress.selectedCard,
        solitaireStats: session.progress.solitaireStats,
        solitaireUndoStack: session.progress.undoStack,
        solitaireRedoStack: session.progress.redoStack,
      });
    } else {
      solitaire.resetSolitaire();
    }
    setStatusMessage("");

    grid.restoreGridSnapshot(
      session.progress.kind === "grid"
        ? {
            gridCells: session.progress.cells,
            selectedGridCell: session.progress.selectedCell,
            gridHistory: {
              undoStack: session.progress.undoStack ?? [],
              redoStack: session.progress.redoStack ?? [],
            },
          }
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
        gridHistory: grid.gridHistory,
        crosswordProgress: crosswordProgressRef.current,
        wordSearchProgress: wordSearchProgressRef.current,
        imageTileRuntime:
          puzzle.kind === "tiles" && puzzle.puzzleId !== "jigsaw" &&
          imageTileRuntimeRef.current?.puzzleInstanceId === puzzle.id
            ? imageTileRuntimeRef.current.runtime
            : null,
        jigsawRuntime:
          puzzle.puzzleId === "jigsaw" && jigsawRuntimeRef.current?.puzzleInstanceId === puzzle.id
            ? jigsawRuntimeRef.current.runtime
            : null,
      })
    : null;

  // While a different resource is loading, its route may not describe the mounted board.
  // Never persist that outgoing board under the incoming resource's identity.
  const routeMatchesSession = (currentRoute: AppRoute, session: PuzzleSession) => {
    if (currentRoute.kind !== "resource") return false;
    const resolved = resolvePuzzleResourceSegment(currentRoute.puzzleId, currentRoute.generationId);
    return resolved.ok && generatedPuzzleMatchesIdentity(session.puzzle, resolved.identity);
  };

  const saveCurrentSession = () => {
    const session = makeCurrentSession();
    if (!session || route.kind !== "resource" || !routeMatchesSession(route, session)) return;
    sessions.saveSession({ puzzleId: route.puzzleId, generationId: route.generationId }, session);
  };
  saveCurrentSessionRef.current = () => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
  };

  const resetRuntimePuzzleState = () => {
    setPuzzle(null);
    updateCrosswordProgress(null);
    updateWordSearchProgress(null);
    imageTileRuntimeRef.current = null;
    jigsawRuntimeRef.current = null;
    solitaire.resetSolitaire();
    grid.resetGrid();
  };

  const beginGeneration = (options: BeginGenerationOptions = {}, behavior: GenerationBehavior = {}) => {
    setGenerationFailureNotice(null);
    // The outgoing session must be stable before worker dispatch pauses autosaving.
    const currentSession = hasSelectedPuzzle && !isHomeSelected ? makeCurrentSession() : null;
    const fallback = pendingGenerationResourceRef.current?.fallback ??
      (currentSession ? {
        session: currentSession,
        route: routeMatchesSession(route, currentSession)
          ? route
          : { kind: "puzzle" as const, puzzleId: currentSession.puzzle.puzzleId },
      } : null);
    if (!generation.hasActiveRequest() && currentSession &&
        route.kind === "resource" && routeMatchesSession(route, currentSession)) {
      sessions.saveSession({ puzzleId: route.puzzleId, generationId: route.generationId }, currentSession);
    }
    if (behavior.preserveScroll) rememberScrollPosition();
    setPuzzleLinkError(null);
    const requestedPuzzleId = options.puzzleId ?? selectedPuzzleId;
    const { puzzleId: _ignoredPuzzleId, ...settings } = options;
    const identity = resolveGenerationIdentity({
      puzzleId: requestedPuzzleId,
      currentPuzzle: puzzle,
      runtimeSettings: generationDefaults,
      settings,
      makeSeed: makeRandomSeed,
    });
    const result = generation.beginGeneration(
      {
        selectedPuzzleId,
        seed,
        width,
        height,
        difficulty,
        requireUniqueSolution,
        sudokuVariation,
      },
      {
        puzzleId: identity.puzzleId,
        seed: identity.seed,
        width: identity.width,
        height: identity.height,
        difficulty: identity.difficulty,
        wordSearchTheme: identity.wordSearchTheme,
        requireUniqueSolution: identity.requireUniqueSolution,
        sudokuVariation: identity.puzzleId === "sudoku" ? identity.sudokuVariation : undefined,
        solitaireVariation: identity.puzzleId === "klondike-solitaire" ? identity.solitaireVariation : undefined,
        imageId: isImageBackedPuzzleId(identity.puzzleId) ? identity.imageId : undefined,
        jigsawCutStyle: identity.puzzleId === "jigsaw" ? identity.jigsawCutStyle : undefined,
        jigsawBoundaryMode: identity.puzzleId === "jigsaw" ? identity.jigsawBoundaryMode : undefined,
        jigsawSpecialPiecesMode:
          identity.puzzleId === "jigsaw" ? identity.jigsawSpecialPiecesMode : undefined,
        provenance: identity.provenance,
      },
    );

    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    markPuzzleNavigation(requestedPuzzleId);
    if (result.kind === "planned") {
      pendingGenerationResourceRef.current = null;
      const definition = getPuzzleDefinition(result.puzzleId);
      setSelectedPuzzleId(result.puzzleId);
      updateGenerationDefaults({ width: definition.defaultWidth, height: definition.defaultHeight });
      resetRuntimePuzzleState();
      setStatusMessage(`${result.title} is planned for a future generator.`);
      restoreScrollPosition();
      return;
    }

    const { request, title } = result;
    pendingGenerationResourceRef.current = {
      identity,
      route: {
        kind: "resource",
        puzzleId: identity.puzzleId,
        generationId: encodeGenerationId(identity),
      },
      history: behavior.resourceHistory ?? "replace",
      fallback,
    };
    setSelectedPuzzleId(request.puzzleId);
    setGenerationDefaults({
      seed: identity.seed,
      width: identity.width,
      height: identity.height,
      difficulty: identity.difficulty,
      wordSearchTheme: identity.wordSearchTheme,
      requireUniqueSolution: identity.requireUniqueSolution,
      sudokuVariation: identity.sudokuVariation,
      solitaireVariation: identity.solitaireVariation,
      jigsawCutStyle: identity.jigsawCutStyle,
      jigsawBoundaryMode: identity.jigsawBoundaryMode,
      jigsawSpecialPiecesMode: identity.jigsawSpecialPiecesMode,
    });
    if (puzzle?.puzzleId !== request.puzzleId) resetRuntimePuzzleState();
    setStatusMessage(`Generating ${title}...`);
  };

  const recoverGenerationFailure = (message: string) => {
    const fallback = pendingGenerationResourceRef.current?.fallback;
    pendingGenerationResourceRef.current = null;
    if (fallback) {
      restoreSession(fallback.session, fallback.route);
      setGenerationFailureNotice(`Could not create the requested puzzle. Your previous puzzle has been restored. ${message}`);
      setStatusMessage(`Could not generate the requested puzzle. ${message}`);
      return;
    }
    resetRuntimePuzzleState();
    setPuzzleLinkError(`Could not generate puzzle. ${message}`);
    setStatusMessage(message);
    restoreScrollPosition();
  };
  generationErrorHandlerRef.current = recoverGenerationFailure;

  const handleGeneratedPuzzle = (generatedPuzzle: GeneratedPuzzle) => {
    const pendingResource = pendingGenerationResourceRef.current;
    setPuzzleLinkError(null);

    if (
      !pendingResource ||
      pendingResource.identity.puzzleId !== generatedPuzzle.puzzleId ||
      !generatedPuzzleMatchesIdentity(generatedPuzzle, pendingResource.identity)
    ) {
      const message = "Generated puzzle did not match its requested resource identity.";
      recoverGenerationFailure(message);
      return;
    }

    pendingGenerationResourceRef.current = null;
    const resource = {
      puzzleId: pendingResource.route.puzzleId,
      generationId: pendingResource.route.generationId,
    };
    const cachedSession = sessions.getCachedSession(resource);
    if (cachedSession && generatedBaselinesMatch(cachedSession.puzzle, generatedPuzzle)) {
      restoreSession(cachedSession, pendingResource.route, pendingResource.history);
      return;
    }

    const persistedSession = sessions.restorePersistedSession(resource, generatedPuzzle);
    if (persistedSession) {
      restoreSession(persistedSession, pendingResource.route, pendingResource.history);
      return;
    }

    restoreSession(
      buildFreshSessionForGeneratedPuzzle(generatedPuzzle),
      pendingResource.route,
      pendingResource.history,
    );
  };
  generatedPuzzleHandlerRef.current = handleGeneratedPuzzle;

  const selectHome = (behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
    setPuzzleLinkError(null);
    setAppRoute({ kind: "home" }, behavior);
    setIsHomeSelected(true);
  };

  const startFreshPuzzle = (
    puzzleId: PuzzleId,
    behavior: NavigationBehavior = {},
  ) => {
    const nextRoute: AppRoute = { kind: "puzzle", puzzleId };
    setAppRoute(nextRoute, behavior);
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
    markPuzzleNavigation(puzzleId);
    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    setSelectedPuzzleId(puzzleId);
    setPuzzleLinkError(null);

    beginGeneration(
      makeInitialPuzzleGenerationOptions({
        puzzleId,
        makeSeed: makeRandomSeed,
        rememberedDraft: getRememberedNextPuzzleDraft(puzzleId),
      }),
      { resourceHistory: "replace" },
    );
  };

  const selectPuzzle = (
    puzzleId: PuzzleId,
    behavior: NavigationBehavior = {},
  ) => {
    if (puzzleId === selectedPuzzleId && hasSelectedPuzzle && !isHomeSelected && puzzle) {
      setPuzzleLinkError(null);
      return;
    }

    const preferredResource = sessions.getPreferredResource(puzzleId);
    if (preferredResource) {
      selectResource({ kind: "resource", ...preferredResource }, behavior);
      return;
    }

    startFreshPuzzle(puzzleId, behavior);
  };

  const presentUnavailableResource = (
    puzzleId: PuzzleId,
    nextRoute: Extract<AppRoute, { kind: "resource" | "unavailable-resource" }>,
    behavior: NavigationBehavior = {},
  ) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
    setAppRoute(nextRoute, behavior);
    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    setSelectedPuzzleId(puzzleId);
    markPuzzleNavigation(puzzleId);
    const message = "This puzzle is no longer available.";
    resetRuntimePuzzleState();
    setPuzzleLinkError(message);
    setStatusMessage(message);
  };

  const selectResource = (
    resourceRoute: Extract<AppRoute, { kind: "resource" }>,
    behavior: NavigationBehavior = {},
  ) => {
    const decoded = resolvePuzzleResourceSegment(resourceRoute.puzzleId, resourceRoute.generationId);
    if (!decoded.ok) {
      presentUnavailableResource(resourceRoute.puzzleId, resourceRoute, behavior);
      return;
    }

    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
    setAppRoute(resourceRoute, behavior);
    setHasSelectedPuzzle(true);
    setIsHomeSelected(false);
    setSelectedPuzzleId(resourceRoute.puzzleId);
    markPuzzleNavigation(resourceRoute.puzzleId);

    const identity = decoded.identity;
    setPuzzleLinkError(null);
    setGenerationDefaults({
      seed: identity.seed,
      width: identity.width,
      height: identity.height,
      difficulty: identity.difficulty,
      wordSearchTheme: identity.wordSearchTheme,
      requireUniqueSolution: identity.requireUniqueSolution,
      sudokuVariation: identity.sudokuVariation,
      solitaireVariation: identity.solitaireVariation,
      jigsawCutStyle: identity.jigsawCutStyle,
      jigsawBoundaryMode: identity.jigsawBoundaryMode,
      jigsawSpecialPiecesMode: identity.jigsawSpecialPiecesMode,
    });
    beginGeneration(
      {
        puzzleId: identity.puzzleId,
        seed: identity.seed,
        width: identity.width,
        height: identity.height,
        difficulty: identity.difficulty,
        wordSearchTheme: identity.wordSearchTheme,
        requireUniqueSolution: identity.requireUniqueSolution,
        sudokuVariation: identity.sudokuVariation,
        solitaireVariation: identity.solitaireVariation,
        imageId: identity.imageId,
        jigsawCutStyle: identity.puzzleId === "jigsaw" ? identity.jigsawCutStyle : undefined,
        jigsawBoundaryMode: identity.puzzleId === "jigsaw" ? identity.jigsawBoundaryMode : undefined,
        jigsawSpecialPiecesMode:
          identity.puzzleId === "jigsaw" ? identity.jigsawSpecialPiecesMode : undefined,
        provenance: identity.provenance,
      },
      { resourceHistory: "replace" },
    );
  };

  const selectSiteView = (view: Exclude<AppView, "catalog">, behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
    setPuzzleLinkError(null);
    setIsHomeSelected(true);
    setAppRoute(view === "changelog" ? { kind: "updates" } : { kind: "about" }, behavior);
  };

  const selectUnavailableResource = (
    nextRoute: Extract<AppRoute, { kind: "unavailable-resource" }>,
    behavior: NavigationBehavior = {},
  ) => {
    presentUnavailableResource(nextRoute.puzzleId, nextRoute, behavior);
  };

  const selectNotFound = (nextRoute: Extract<AppRoute, { kind: "not-found" }>, behavior: NavigationBehavior = {}) => {
    if (hasSelectedPuzzle && !isHomeSelected) saveCurrentSession();
    cancelPendingGeneration();
    setPuzzleLinkError(null);
    setIsHomeSelected(true);
    setAppRoute(nextRoute, behavior);
  };

  routeNavigationHandlerRef.current = (nextRoute) => {
    setPendingAbandonment(null);
    if (nextRoute.kind === "puzzle") {
      selectPuzzle(nextRoute.puzzleId, { pushHistory: false });
    } else if (nextRoute.kind === "resource") {
      selectResource(nextRoute, { pushHistory: false });
    } else if (nextRoute.kind === "unavailable-resource") {
      selectUnavailableResource(nextRoute, { pushHistory: false });
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
    const saveCurrentSession = () => saveCurrentSessionRef.current();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveCurrentSession();
    };
    window.addEventListener("pagehide", saveCurrentSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", saveCurrentSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => generation.handleGenerationMessage(
      event,
      (generatedPuzzle) => generatedPuzzleHandlerRef.current(generatedPuzzle),
      (error) => generationErrorHandlerRef.current(error),
    );
    generation.worker.addEventListener("message", handleMessage);

    if (initialRoute.kind === "puzzle") {
      selectPuzzle(initialRoute.puzzleId, { pushHistory: false });
    } else if (initialRoute.kind === "resource") {
      selectResource(initialRoute, { pushHistory: false });
    } else if (initialRoute.kind === "unavailable-resource") {
      selectUnavailableResource(initialRoute, { pushHistory: false });
    }

    return () => generation.worker.removeEventListener("message", handleMessage);
  }, [generation.worker]);

  useEffect(() => {
    if (puzzleLinkError) return;
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
      jigsawCutStyle,
      jigsawBoundaryMode,
      jigsawSpecialPiecesMode,
      wordSearchTheme,
      makeSeed: makeRandomSeed,
    }), { resourceHistory: "replace" });
  }, [hasSelectedPuzzle, isHomeSelected, generation.isGenerating, puzzle, puzzleLinkError, selectedPuzzleId, selectedPuzzleIsGeneratable, selectedDefinition, seed, width, height, difficulty, requireUniqueSolution, sudokuVariation, solitaireVariation, jigsawCutStyle, jigsawBoundaryMode, jigsawSpecialPiecesMode, wordSearchTheme]);

  useEffect(() => {
    if (!hasSelectedPuzzle || generation.isGenerating || isHomeSelected || !puzzle) return;
    saveCurrentSession();
  }, [hasSelectedPuzzle, isHomeSelected, generation.isGenerating, selectedPuzzleId, puzzle, solitaire.cardStacks, solitaire.selectedCard, solitaire.solitaireStats, solitaire.solitaireUndoStack, solitaire.solitaireRedoStack, grid.gridCells, grid.selectedGridCell, grid.gridHistory, statusMessage]);

  const resetCurrentPuzzle = () => {
    if (!puzzle || generation.hasActiveRequest()) return;
    rememberScrollPosition();
    if (puzzle.kind === "cards") {
      solitaire.restoreSolitaireSnapshot({ cardStacks: puzzle.stacks, selectedCard: null, solitaireStats: initialSolitaireStats, solitaireUndoStack: [], solitaireRedoStack: [] });
    } else if (puzzle.kind === "grid") {
      grid.resetCurrentGrid(puzzle, "", setStatusMessage);
    } else if (puzzle.kind === "crossword") {
      updateCrosswordProgress(createCrosswordProgress(puzzle));
      saveCurrentSessionRef.current();
    } else if (puzzle.kind === "word-search") {
      updateWordSearchProgress(createWordSearchProgress(puzzle));
      saveCurrentSessionRef.current();
    } else if (puzzle.puzzleId === "jigsaw") {
      jigsawRuntimeRef.current = null;
    } else {
      grid.prepareGeneratedGrid(puzzle);
    }
    setStatusMessage("");
    restoreScrollPosition();
  };

  const reportWorkspaceProgress = (puzzleInstanceId: string, report: WorkspaceProgressReport) => {
    if (generation.hasActiveRequest()) return;
    workspaceProgressRef.current = { puzzleInstanceId, ...report };
  };

  const requestDestructiveAction = (action: "new" | "reset", proceed: () => void, targetIdentity?: GenerationIdentity) => {
    if (generation.hasActiveRequest()) return;
    const assembly = puzzle?.kind === "tiles" && puzzle.puzzleId === "jigsaw" &&
      jigsawRuntimeRef.current?.puzzleInstanceId === puzzle.id
      ? jigsawRuntimeRef.current.runtime.snapshot.assembly
      : null;
    const pending = planAbandonmentAction(puzzle, {
      gridCells: grid.gridCells,
      cardStacks: solitaire.cardStacks,
      solitaireStats: solitaire.solitaireStats,
      jigsawAssembly: assembly,
      workspaceProgress: puzzle?.kind === "crossword" ? {
        puzzleInstanceId: puzzle.id,
        hasProgress: Boolean(crosswordProgressRef.current && /[A-Z]/.test(crosswordProgressRef.current.letters)),
        terminal: Boolean(crosswordProgressRef.current && isCrosswordComplete(puzzle, crosswordProgressRef.current)),
      } : puzzle?.kind === "word-search" ? {
        puzzleInstanceId: puzzle.id,
        hasProgress: Boolean(wordSearchProgressRef.current?.found.length),
        terminal: Boolean(wordSearchProgressRef.current && isWordSearchComplete(puzzle, wordSearchProgressRef.current)),
      } : workspaceProgressRef.current,
    }, action, proceed, targetIdentity);
    if (pending) setPendingAbandonment(pending);
  };

  const requestResetCurrentPuzzle = (afterReset?: () => void) =>
    requestDestructiveAction("reset", () => {
      resetCurrentPuzzle();
      afterReset?.();
      workspaceProgressRef.current = null;
    });

  const commitGenerationSettings = (
    settings: GenerationSettings = {},
    behavior: GenerationBehavior = { preserveScroll: true, resourceHistory: "push" },
  ) => {
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
      wordSearchTheme: identity.wordSearchTheme,
      requireUniqueSolution: identity.requireUniqueSolution,
      sudokuVariation: identity.sudokuVariation,
      solitaireVariation: identity.solitaireVariation,
      jigsawCutStyle: identity.jigsawCutStyle,
      jigsawBoundaryMode: identity.jigsawBoundaryMode,
      jigsawSpecialPiecesMode: identity.jigsawSpecialPiecesMode,
    });
    if (settingsAreCurrent) return;

    beginGeneration({
      seed: identity.seed,
      width: identity.width,
      height: identity.height,
      difficulty: identity.difficulty,
      wordSearchTheme: identity.wordSearchTheme,
      requireUniqueSolution: identity.requireUniqueSolution,
      sudokuVariation: selectedPuzzleId === "sudoku" ? identity.sudokuVariation : undefined,
      solitaireVariation: selectedPuzzleId === "klondike-solitaire" ? identity.solitaireVariation : undefined,
      imageId: isImageBackedPuzzleId(selectedPuzzleId) ? identity.imageId : undefined,
      jigsawCutStyle: selectedPuzzleId === "jigsaw" ? identity.jigsawCutStyle : undefined,
      jigsawBoundaryMode: selectedPuzzleId === "jigsaw" ? identity.jigsawBoundaryMode : undefined,
      jigsawSpecialPiecesMode:
        selectedPuzzleId === "jigsaw" ? identity.jigsawSpecialPiecesMode : undefined,
      provenance: identity.provenance,
    }, behavior);
  };

  const requestNewSettings = (settings: GenerationSettings, afterStart?: () => void) => {
    const identity = resolveGenerationIdentity({
      puzzleId: selectedPuzzleId,
      currentPuzzle: puzzle,
      runtimeSettings: generationDefaults,
      settings,
      makeSeed: makeRandomSeed,
    });
    requestDestructiveAction("new", () => {
      rememberNextPuzzleDraft();
      commitGenerationSettings(settings);
      afterStart?.();
    }, identity);
  };

  const createNewPuzzle = (behavior: GenerationBehavior) => {
    const randomizedDraft = randomizeNextPuzzleArtwork(selectedPuzzleId, nextPuzzleDraft);
    updateNextPuzzleDraft(randomizedDraft);
    commitGenerationSettings({ ...randomizedDraft, seed: makeRandomSeed() }, behavior);
  };

  const generateNextPuzzle = (afterStart?: () => void) => requestDestructiveAction("new", () => {
    createNewPuzzle({ preserveScroll: true, resourceHistory: "push" });
    afterStart?.();
  });

  const recoverUnavailablePuzzle = () => {
    replaceCurrentRoute({ kind: "puzzle", puzzleId: selectedPuzzleId });
    createNewPuzzle({ resourceHistory: "replace" });
  };

  const loadSeededPuzzle = (afterStart?: () => void) => {
    const nextSeed = seedLoadInput.trim();
    if (!nextSeed) return;
    requestNewSettings({ ...nextPuzzleDraft, seed: nextSeed }, afterStart);
  };

  const loadToday = (afterStart?: () => void) => requestNewSettings({
    ...nextPuzzleDraft,
    provenance: { source: "daily", dateStamp: getLocalDateStamp() },
  }, afterStart);

  const handleCheck = () => { if (!puzzle || generation.hasActiveRequest()) return; puzzle.kind === "cards" ? solitaire.checkSolitaire() : grid.checkGrid(puzzle, setStatusMessage); };
  const workspaceIsGenerating = generation.isGenerating || (!puzzle && selectedPuzzleIsGeneratable && !isHomeSelected && !puzzleLinkError);
  const workspaceCore = {
    crosswordProgress: puzzle?.kind === "crossword" && crosswordProgress?.baselineChecksum === puzzle.checksum ? crosswordProgress : null,
    onCrosswordProgressChange: (puzzleInstanceId: string, proposed: CrosswordProgress) => {
      if (generation.hasActiveRequest() || puzzle?.kind !== "crossword" || puzzle.id !== puzzleInstanceId) return false;
      const current = crosswordProgressRef.current;
      if (!current || isCrosswordComplete(puzzle, current)) return false;
      const next = restoreCrosswordProgress(puzzle, proposed);
      if (!next || next.letters === current.letters) return false;
      updateCrosswordProgress(next);
      saveCurrentSessionRef.current();
      return true;
    },
    wordSearchProgress: puzzle?.kind === "word-search" && wordSearchProgress?.baselineChecksum === puzzle.checksum ? wordSearchProgress : null,
    onWordSearchSelection: (puzzleInstanceId: string, start: number, end: number) => {
      if (generation.hasActiveRequest() || puzzle?.kind !== "word-search" || puzzle.id !== puzzleInstanceId) return false;
      const current = wordSearchProgressRef.current;
      if (!current || current.baselineChecksum !== puzzle.checksum || isWordSearchComplete(puzzle, current)) return false;
      const next = selectWordSearchEndpoints(puzzle, current, start, end);
      if (next === current) return false;
      updateWordSearchProgress(next);
      saveCurrentSessionRef.current();
      return true;
    },
    imageTileRuntime: puzzle?.kind === "tiles" && puzzle.puzzleId !== "jigsaw" &&
      imageTileRuntimeRef.current?.puzzleInstanceId === puzzle.id
        ? imageTileRuntimeRef.current.runtime
        : null,
    onImageTileRuntimeChange: (puzzleInstanceId: string, runtime: ImageTileActionRuntime) => {
      if (generation.hasActiveRequest() || puzzle?.id !== puzzleInstanceId ||
          puzzle.kind !== "tiles" || puzzle.puzzleId === "jigsaw") return;
      imageTileRuntimeRef.current = {
        puzzleInstanceId,
        runtime: cloneImageTileActionRuntime(runtime),
      };
      // Commit the latest completed intention immediately; navigation/pagehide need
      // the same synchronous snapshot, not a stale render of the child workspace.
      saveCurrentSessionRef.current();
    },
    selectedDefinition,
    selectedPuzzleIsGeneratable,
    seed,
    puzzle,
    statusMessage,
    onStatusMessageChange: setStatusMessage,
    isGenerating: workspaceIsGenerating,
    onReset: requestResetCurrentPuzzle,
    onRuntimeProgressChange: reportWorkspaceProgress,
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
    canUndoGrid: grid.canUndoGrid,
    canRedoGrid: grid.canRedoGrid,
    canUndoGridNow: grid.canUndoGridNow,
    canRedoGridNow: grid.canRedoGridNow,
    onUndoGrid: () => { if (!generation.hasActiveRequest()) grid.undoGridAction(puzzle, setStatusMessage); },
    onRedoGrid: () => { if (!generation.hasActiveRequest()) grid.redoGridAction(puzzle, setStatusMessage); },
    onCommitGridHistory: () => { if (!generation.hasActiveRequest()) grid.commitGridHistory(); },
    onCheck: handleCheck,
    onCellClick: (cell: Parameters<typeof grid.handleGridCellClick>[1]) => {
      if (!generation.hasActiveRequest()) grid.handleGridCellClick(puzzle, cell, setStatusMessage);
    },
    onCellInput: (cell: Parameters<typeof grid.handleGridCellInput>[1], value: string) => {
      if (!generation.hasActiveRequest()) grid.handleGridCellInput(puzzle, cell, value, setStatusMessage);
    },
  };
  const workspaceJigsaw = {
    jigsawRuntime:
      puzzle?.kind === "tiles" && puzzle.puzzleId === "jigsaw" &&
      jigsawRuntimeRef.current?.puzzleInstanceId === puzzle.id
        ? jigsawRuntimeRef.current.runtime
        : null,
    onJigsawRuntimeChange: (puzzleInstanceId: string, runtime: JigsawActionRuntime) => {
      if (generation.hasActiveRequest() || puzzle?.kind !== "tiles" ||
          puzzle.puzzleId !== "jigsaw" || puzzle.id !== puzzleInstanceId) return;
      jigsawRuntimeRef.current = { puzzleInstanceId, runtime };
      saveCurrentSessionRef.current();
    },
  };
  const workspaceSolitaire = {
    cardStacks: solitaire.cardStacks,
    selectedCard: solitaire.selectedCard,
    solitaireStats: solitaire.solitaireStats,
    onAutoMoveToFoundations: () => { if (!generation.hasActiveRequest()) solitaire.autoMoveToFoundations(); },
    onUndoSolitaire: () => { if (!generation.hasActiveRequest()) solitaire.undoSolitaireMove(); },
    onRedoSolitaire: () => { if (!generation.hasActiveRequest()) solitaire.redoSolitaireMove(); },
    canUndoSolitaire: solitaire.solitaireUndoStack.length > 0,
    canRedoSolitaire: solitaire.solitaireRedoStack.length > 0,
    canUndoSolitaireNow: solitaire.canUndoSolitaireNow,
    canRedoSolitaireNow: solitaire.canRedoSolitaireNow,
    onCardClick: (...args: Parameters<typeof solitaire.handleCardClick>) => {
      if (!generation.hasActiveRequest()) solitaire.handleCardClick(...args);
    },
    onCardDoubleClick: (...args: Parameters<typeof solitaire.moveSingleCardToFoundation>) => {
      if (!generation.hasActiveRequest()) solitaire.moveSingleCardToFoundation(...args);
    },
    onStackClick: (...args: Parameters<typeof solitaire.handleStackClick>) => {
      if (!generation.hasActiveRequest()) solitaire.handleStackClick(...args);
    },
  };

  const shareResource = useMemo(() => {
    if (workspaceIsGenerating || !puzzle || typeof window === "undefined") return null;
    const resource = getPuzzleShareResource(route, puzzle, window.location.origin);
    if (!resource) return null;
    const identity = getCurrentPuzzleIdentity(puzzle, getLocalDateStamp());
    return {
      ...resource,
      title: identity.puzzleLabel,
      description: [
        resource.description,
        ...identity.details,
        puzzle.kind === "grid" && puzzle.puzzleId !== "word-guess" &&
          !identity.details.includes(`${puzzle.width}×${puzzle.height}`) ? `${puzzle.width}×${puzzle.height}` : null,
        puzzle.kind === "word-search" ? `${puzzle.width}×${puzzle.height}` : null,
        identity.difficultyLabel,
      ].filter(Boolean).join(" · "),
    };
  }, [route, puzzle, workspaceIsGenerating]);
  const getShareProgress = () => puzzle ? formatPuzzleShareProgress(puzzle, {
    gridCells: grid.gridCells,
    cardStacks: solitaire.cardStacks,
    solitaireStats: solitaire.solitaireStats,
    crosswordProgress: crosswordProgressRef.current,
    wordSearchProgress: wordSearchProgressRef.current,
    jigsawRuntime: jigsawRuntimeRef.current?.puzzleInstanceId === puzzle.id
      ? jigsawRuntimeRef.current.runtime : null,
    imageTileRuntime: imageTileRuntimeRef.current?.puzzleInstanceId === puzzle.id
      ? imageTileRuntimeRef.current.runtime : null,
  }) : null;

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
        {isHomeSelected || !hasSelectedPuzzle ? <StartView readyPuzzles={readyPuzzles} previewPuzzles={previewPuzzles} onSelectPuzzle={(puzzleId) => selectPuzzle(puzzleId)} /> : puzzleLinkError ? (
          <ResourceUnavailableView
            message={puzzleLinkError}
            puzzleTitle={selectedDefinition.title}
            onStartNew={recoverUnavailablePuzzle}
            onHome={() => {
              cancelPendingGeneration();
              setPuzzleLinkError(null);
              replaceCurrentRoute({ kind: "home" });
              setIsHomeSelected(true);
            }}
          />
        ) : (
          <PuzzleShareProvider resource={shareResource} getProgress={getShareProgress}>
            <PuzzleWorkspace
              core={workspaceCore}
              prospective={workspaceProspective}
              grid={workspaceGrid}
              solitaire={workspaceSolitaire}
              jigsaw={workspaceJigsaw}
            />
          </PuzzleShareProvider>
        )}
      </section>
    );
  }

  return (
    <AppShell activeView={activeView} headerControls={puzzleNavigation} onHomeSelect={() => selectHome()} onViewSelect={(view) => selectSiteView(view)}>
      {content}
      {generationFailureNotice && !puzzleLinkError ? (
        <div class="generation-failure-notice" role="alert">
          <span>{generationFailureNotice}</span>
          <button type="button" onClick={() => setGenerationFailureNotice(null)}>Dismiss</button>
        </div>
      ) : null}
      {pendingAbandonment ? (
        <AbandonmentDialog
          action={pendingAbandonment.action}
          onCancel={() => setPendingAbandonment(null)}
          onConfirm={() => {
            const pending = pendingAbandonment;
            setPendingAbandonment(null);
            if (puzzle?.id === pending.puzzleInstanceId) pending.proceed();
          }}
        />
      ) : null}
    </AppShell>
  );
};
