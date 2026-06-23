import { useEffect, useMemo, useState } from "preact/hooks";
import { getPuzzleAvailability } from "./catalog/puzzleAvailability";
import { getPuzzleDefinition, isGeneratable } from "./catalog/puzzleCatalog";
import type { GeneratedPuzzle, PuzzleDifficulty, PuzzleGenerationRequest, PuzzleId } from "./catalog/types";
import { AboutView } from "./components/AboutView";
import { AppShell } from "./components/AppShell";
import { ChangelogView } from "./components/ChangelogView";
import { PuzzleCatalog } from "./components/PuzzleCatalog";
import { PuzzleWorkspace } from "./components/PuzzleWorkspace";
import { StartView } from "./components/StartView";
import { defaultSudokuDifficulty, getActiveView, makeRandomSeed } from "./app/runtime";
import { useGridController } from "./app/useGridController";
import { usePuzzleGeneration, type BeginGenerationOptions } from "./app/usePuzzleGeneration";
import { buildRuntimeSession, usePuzzleSessions } from "./app/usePuzzleSessions";
import { useSolitaireController } from "./app/useSolitaireController";
import type { AppView } from "./site/views";

const initialStatusMessage = "Pick a puzzle to start.";

export const App = () => {
  const [activeView, setActiveView] = useState<AppView>(getActiveView);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<PuzzleId>("sudoku");
  const [seed, setSeed] = useState(makeRandomSeed);
  const [width, setWidth] = useState(9);
  const [height, setHeight] = useState(9);
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>(defaultSudokuDifficulty);
  const [requireUniqueSolution, setRequireUniqueSolution] = useState(true);
  const [puzzle, setPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage);
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(true);
  const [hasSelectedPuzzle, setHasSelectedPuzzle] = useState(false);

  const generation = usePuzzleGeneration();
  const sessions = usePuzzleSessions();
  const grid = useGridController();
  const solitaire = useSolitaireController({ statusMessage, onStatusMessage: setStatusMessage });
  const { readyPuzzles, previewPuzzles, plannedPuzzles } = useMemo(() => getPuzzleAvailability(), []);
  const selectedDefinition = getPuzzleDefinition(selectedPuzzleId);
  const selectedPuzzleIsGeneratable = isGeneratable(selectedDefinition);

  const restoreSession = (puzzleId: PuzzleId, session: ReturnType<typeof buildRuntimeSession>) => {
    setHasSelectedPuzzle(true);
    setIsCatalogCollapsed(true);
    setSelectedPuzzleId(puzzleId);
    setSeed(session.seed);
    setWidth(session.width);
    setHeight(session.height);
    setDifficulty(session.difficulty);
    setRequireUniqueSolution(session.requireUniqueSolution);
    setPuzzle(session.puzzle);
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

  const beginGeneration = (options: BeginGenerationOptions = {}) => {
    const result = generation.beginGeneration(
      {
        selectedPuzzleId,
        seed,
        width,
        height,
        difficulty,
        requireUniqueSolution,
      },
      options,
    );

    setHasSelectedPuzzle(true);
    setIsCatalogCollapsed(true);

    if (result.kind === "planned") {
      const definition = getPuzzleDefinition(result.puzzleId);
      setSelectedPuzzleId(result.puzzleId);
      setWidth(definition.defaultWidth);
      setHeight(definition.defaultHeight);
      resetRuntimePuzzleState();
      setStatusMessage(`${result.title} is planned for a future generator.`);
      return;
    }

    const { request, title } = result;
    setSelectedPuzzleId(request.puzzleId);
    setSeed(request.seed);
    setWidth(request.width);
    setHeight(request.height);
    setDifficulty(request.difficulty ?? difficulty);
    setRequireUniqueSolution(Boolean(request.requireUniqueSolution));
    resetRuntimePuzzleState();
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
    if (!hasSelectedPuzzle || generation.isGenerating) {
      return;
    }

    saveCurrentSession();
  }, [
    hasSelectedPuzzle,
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

  const selectPuzzle = (puzzleId: PuzzleId) => {
    if (puzzleId === selectedPuzzleId && hasSelectedPuzzle) {
      return;
    }

    if (hasSelectedPuzzle) {
      saveCurrentSession();
    }

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
    });
  };

  const generate = () => {
    beginGeneration();
  };

  const randomize = () => {
    beginGeneration({ seed: makeRandomSeed() });
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
    const generationSolitaireVariation = nextSolitaireVariation ?? currentSolitaireVariation;
    const settingsAreCurrent =
      puzzle?.puzzleId === selectedPuzzleId &&
      puzzle.seed === normalizedSeed &&
      (!currentGrid || (currentGrid.width === generationWidth && currentGrid.height === generationHeight)) &&
      (selectedPuzzleId !== "sudoku" || puzzle.difficulty === generationDifficulty) &&
      (selectedPuzzleId !== "nonogram" || (puzzle.difficulty === generationDifficulty && Boolean(puzzle.uniqueSolution) === generationRequireUniqueSolution)) &&
      (selectedPuzzleId !== "klondike-solitaire" || nextSolitaireVariation === undefined);

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

    if (settingsAreCurrent) {
      return;
    }

    beginGeneration({
      seed: normalizedSeed,
      width: generationWidth,
      height: generationHeight,
      difficulty: generationDifficulty,
      requireUniqueSolution: generationRequireUniqueSolution,
      solitaireVariation: generationSolitaireVariation,
    });
  };

  const handleDifficultyChange = (nextDifficulty: PuzzleDifficulty) => {
    if (selectedPuzzleId === "sudoku") {
      beginGeneration({ puzzleId: "sudoku", seed, width: 9, height: 9, difficulty: nextDifficulty });
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
    <AppShell activeView={activeView}>
      {activeView === "catalog" ? (
        hasSelectedPuzzle ? (
          <section class={`catalog-layout ${isCatalogCollapsed ? "catalog-collapsed" : ""}`}>
            <PuzzleCatalog
              isCollapsed={isCatalogCollapsed}
              selectedPuzzleId={selectedPuzzleId}
              onCollapseToggle={() => setIsCatalogCollapsed((current) => !current)}
              onSelectPuzzle={selectPuzzle}
            />

            <PuzzleWorkspace
              selectedDefinition={selectedDefinition}
              selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
              seed={seed}
              width={width}
              height={height}
              difficulty={difficulty}
              requireUniqueSolution={requireUniqueSolution}
              puzzle={puzzle}
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
          </section>
        ) : (
          <StartView
            readyPuzzles={readyPuzzles}
            previewPuzzles={previewPuzzles}
            plannedPuzzles={plannedPuzzles}
            onSelectPuzzle={selectPuzzle}
          />
        )
      ) : activeView === "changelog" ? (
        <ChangelogView />
      ) : (
        <AboutView />
      )}
    </AppShell>
  );
};
