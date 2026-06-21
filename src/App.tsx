import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleAvailability } from "./catalog/puzzleAvailability";
import { getPuzzleDefinition, isGeneratable } from "./catalog/puzzleCatalog";
import type { CardStack, GeneratedPuzzle, PuzzleCell, PuzzleDifficulty, PuzzleGenerationRequest, PuzzleGenerationResponse, PuzzleId } from "./catalog/types";
import { AboutView } from "./components/AboutView";
import { AppShell } from "./components/AppShell";
import { ChangelogView } from "./components/ChangelogView";
import { PuzzleCatalog } from "./components/PuzzleCatalog";
import { PuzzleWorkspace } from "./components/PuzzleWorkspace";
import { StartView } from "./components/StartView";
import { defaultSudokuDifficulty, getActiveView, makeRandomSeed, makeRequestId } from "./app/runtime";
import { initialSolitaireStats, type PuzzleSession, type PuzzleSessionCache, type SolitaireStats } from "./app/session";
import {
  canMoveToFoundation,
  canMoveToTableau,
  canSelectFromStack,
  cloneStack,
  findFoundationIndexForCard,
  getTopCard,
  isTableauRun,
  revealTopTableauCard,
  type CardSelection,
} from "./interactions/cardRules";
import { checkGridAnswer } from "./interactions/gridChecking";
import {
  cloneGridCell,
  getCellIndex,
  getGridCell,
  getGridInputMode,
  normalizeCellInput,
  prepareGridCells,
  type GridCellSelection,
} from "./interactions/gridRules";
import type { AppView } from "./site/views";

type SolitaireHistoryEntry = {
  cardStacks: CardStack[];
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  statusMessage: string;
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
  const [cardStacks, setCardStacks] = useState<CardStack[] | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSelection | null>(null);
  const [solitaireStats, setSolitaireStats] = useState<SolitaireStats>(initialSolitaireStats);
  const [solitaireUndoStack, setSolitaireUndoStack] = useState<SolitaireHistoryEntry[]>([]);
  const [solitaireRedoStack, setSolitaireRedoStack] = useState<SolitaireHistoryEntry[]>([]);
  const [gridCells, setGridCells] = useState<PuzzleCell[] | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<GridCellSelection | null>(null);
  const [statusMessage, setStatusMessage] = useState("Pick a puzzle to start.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(true);
  const [hasSelectedPuzzle, setHasSelectedPuzzle] = useState(false);
  const activeRequestId = useRef<string | null>(null);
  const sessionCache = useRef<PuzzleSessionCache>({});
  const worker = useMemo(
    () => new Worker(new URL("./workers/puzzleWorker.ts", import.meta.url), { type: "module" }),
    [],
  );
  const { readyPuzzles, previewPuzzles, plannedPuzzles } = useMemo(() => getPuzzleAvailability(), []);
  const selectedDefinition = getPuzzleDefinition(selectedPuzzleId);
  const selectedPuzzleIsGeneratable = isGeneratable(selectedDefinition);

  const resetSolitaireStats = () => {
    setSolitaireStats(initialSolitaireStats);
  };

  const clearCardInteraction = () => {
    setSelectedCard(null);
  };

  const clearGridInteraction = () => {
    setSelectedGridCell(null);
  };

  const makeSolitaireHistoryEntry = (stacks: CardStack[], selected: CardSelection | null, stats: SolitaireStats, message: string): SolitaireHistoryEntry => ({
    cardStacks: stacks.map(cloneStack),
    selectedCard: selected ? { ...selected } : null,
    solitaireStats: { ...stats },
    statusMessage: message,
  });

  const restoreSolitaireHistoryEntry = (entry: SolitaireHistoryEntry) => {
    setCardStacks(entry.cardStacks.map(cloneStack));
    setSelectedCard(entry.selectedCard ? { ...entry.selectedCard } : null);
    setSolitaireStats({ ...entry.solitaireStats });
    setStatusMessage(entry.statusMessage);
  };

  const clearSolitaireHistory = () => {
    setSolitaireUndoStack([]);
    setSolitaireRedoStack([]);
  };

  const undoSolitaireMove = () => {
    if (!cardStacks || solitaireUndoStack.length === 0) {
      setStatusMessage("No Solitaire moves to undo.");
      return;
    }

    const previous = solitaireUndoStack[solitaireUndoStack.length - 1];
    const current = makeSolitaireHistoryEntry(cardStacks, selectedCard, solitaireStats, statusMessage);
    setSolitaireUndoStack((entries) => entries.slice(0, -1));
    setSolitaireRedoStack((entries) => [...entries, current]);
    restoreSolitaireHistoryEntry(previous);
  };

  const redoSolitaireMove = () => {
    if (!cardStacks || solitaireRedoStack.length === 0) {
      setStatusMessage("No Solitaire moves to redo.");
      return;
    }

    const next = solitaireRedoStack[solitaireRedoStack.length - 1];
    const current = makeSolitaireHistoryEntry(cardStacks, selectedCard, solitaireStats, statusMessage);
    setSolitaireRedoStack((entries) => entries.slice(0, -1));
    setSolitaireUndoStack((entries) => [...entries, current]);
    restoreSolitaireHistoryEntry(next);
  };

  const saveCurrentSession = () => {
    sessionCache.current[selectedPuzzleId] = {
      seed,
      width,
      height,
      difficulty,
      requireUniqueSolution,
      puzzle,
      cardStacks: cardStacks?.map(cloneStack) ?? null,
      selectedCard: selectedCard ? { ...selectedCard } : null,
      solitaireStats: { ...solitaireStats },
      gridCells: gridCells?.map(cloneGridCell) ?? null,
      selectedGridCell: selectedGridCell ? { ...selectedGridCell } : null,
      statusMessage,
    };
  };

  const restoreSession = (puzzleId: PuzzleId, session: PuzzleSession) => {
    setHasSelectedPuzzle(true);
    setIsCatalogCollapsed(true);
    setSelectedPuzzleId(puzzleId);
    setSeed(session.seed);
    setWidth(session.width);
    setHeight(session.height);
    setDifficulty(session.difficulty);
    setRequireUniqueSolution(session.requireUniqueSolution);
    setPuzzle(session.puzzle);
    setCardStacks(session.cardStacks?.map(cloneStack) ?? null);
    setSelectedCard(session.selectedCard ? { ...session.selectedCard } : null);
    setSolitaireStats({ ...session.solitaireStats });
    setGridCells(session.gridCells?.map(cloneGridCell) ?? null);
    setSelectedGridCell(session.selectedGridCell ? { ...session.selectedGridCell } : null);
    setStatusMessage(session.statusMessage);
    clearSolitaireHistory();
    setIsGenerating(false);
  };

  const beginGeneration = ({
    puzzleId = selectedPuzzleId,
    seed: generationSeed = seed,
    width: generationWidth = width,
    height: generationHeight = height,
    difficulty: generationDifficulty = difficulty,
    requireUniqueSolution: generationRequireUniqueSolution = requireUniqueSolution,
  }: Partial<Omit<PuzzleGenerationRequest, "requestId">> = {}) => {
    const definition = getPuzzleDefinition(puzzleId);

    setHasSelectedPuzzle(true);
    setIsCatalogCollapsed(true);

    if (!isGeneratable(definition)) {
      setSelectedPuzzleId(puzzleId);
      setWidth(definition.defaultWidth);
      setHeight(definition.defaultHeight);
      setPuzzle(null);
      setCardStacks(null);
      setGridCells(null);
      setSelectedCard(null);
      setSelectedGridCell(null);
      resetSolitaireStats();
      setStatusMessage(`${definition.title} is planned for a future generator.`);
      return;
    }

    const requestId = makeRequestId();
    const request: PuzzleGenerationRequest = {
      requestId,
      puzzleId,
      seed: generationSeed,
      width: generationWidth,
      height: generationHeight,
      difficulty: generationDifficulty,
      requireUniqueSolution: generationRequireUniqueSolution,
    };

    activeRequestId.current = requestId;
    setSelectedPuzzleId(puzzleId);
    setSeed(generationSeed);
    setWidth(generationWidth);
    setHeight(generationHeight);
    setDifficulty(generationDifficulty);
    setRequireUniqueSolution(generationRequireUniqueSolution);
    setIsGenerating(true);
    setPuzzle(null);
    setCardStacks(null);
    setGridCells(null);
    setSelectedCard(null);
    setSelectedGridCell(null);
    resetSolitaireStats();
    clearSolitaireHistory();
    setStatusMessage(`Generating ${definition.title}...`);
    worker.postMessage(request);
  };

  const updateCardStacks = (updater: (stacks: CardStack[]) => { stacks: CardStack[]; message: string }) => {
    setCardStacks((currentStacks) => {
      if (!currentStacks) {
        return currentStacks;
      }

      const workingStacks = currentStacks.map(cloneStack);
      const historyEntry = makeSolitaireHistoryEntry(currentStacks, selectedCard, solitaireStats, statusMessage);
      const { stacks, message } = updater(workingStacks);
      const didChange = stacks !== workingStacks;
      const foundationCardCount = stacks
        .filter((stack) => stack.role === "foundation")
        .reduce((total, stack) => total + stack.cards.length, 0);
      const nextMessage = foundationCardCount === 52 ? "Solved. All cards are on foundations." : message;

      if (didChange) {
        setSolitaireUndoStack((entries) => [...entries, historyEntry].slice(-120));
        setSolitaireRedoStack([]);
      }

      setStatusMessage(nextMessage);

      return stacks;
    });
  };

  const updateGridCells = (updater: (cells: PuzzleCell[]) => { cells: PuzzleCell[]; message: string }) => {
    setGridCells((currentCells) => {
      if (!currentCells) {
        return currentCells;
      }

      const { cells, message } = updater(currentCells.map(cloneGridCell));
      setStatusMessage(message);
      return cells;
    });
  };

  const drawFromStock = () => {
    clearCardInteraction();
    updateCardStacks((stacks) => {
      const stockIndex = stacks.findIndex((stack) => stack.role === "stock");
      const wasteIndex = stacks.findIndex((stack) => stack.role === "waste");
      const stock = stacks[stockIndex];
      const waste = stacks[wasteIndex];

      if (!stock || !waste) {
        return { stacks, message: "Solitaire stock or waste stack is missing." };
      }

      if (stock.cards.length > 0) {
        const drawnCard = stock.cards[stock.cards.length - 1];
        const nextStacks = [...stacks];
        nextStacks[stockIndex] = { ...stock, cards: stock.cards.slice(0, -1), faceDownCount: stock.cards.length - 1 };
        nextStacks[wasteIndex] = { ...waste, cards: [...waste.cards, { ...drawnCard, faceUp: true }] };
        setSolitaireStats((current) => ({ ...current, drawCount: current.drawCount + 1, moveCount: current.moveCount + 1 }));

        return { stacks: nextStacks, message: `Drew ${drawnCard.label} to waste.` };
      }

      if (waste.cards.length === 0) {
        return { stacks, message: "Stock and waste are both empty." };
      }

      const recycledCards = waste.cards.map((card) => ({ ...card, faceUp: false })).reverse();
      const nextStacks = [...stacks];
      nextStacks[stockIndex] = { ...stock, cards: recycledCards, faceDownCount: recycledCards.length };
      nextStacks[wasteIndex] = { ...waste, cards: [] };
      setSolitaireStats((current) => ({ ...current, recycleCount: current.recycleCount + 1, moveCount: current.moveCount + 1 }));

      return { stacks: nextStacks, message: "Recycled waste back into the stock." };
    });
  };

  const moveSelectedCardToStack = (targetStackId: string) => {
    if (!selectedCard) {
      return false;
    }

    let didMove = false;

    updateCardStacks((stacks) => {
      const sourceIndex = stacks.findIndex((stack) => stack.id === selectedCard.stackId);
      const targetIndex = stacks.findIndex((stack) => stack.id === targetStackId);
      const source = stacks[sourceIndex];
      const targetStack = stacks[targetIndex];

      if (!source || !targetStack) {
        return { stacks, message: "Selected source or destination stack no longer exists." };
      }

      if (source.id === targetStack.id) {
        return { stacks, message: "Card selection cleared." };
      }

      const movingCards = source.cards.slice(selectedCard.cardIndex);
      const movingCard = movingCards[0];

      if (!movingCard?.faceUp) {
        return { stacks, message: "Only face-up cards can be moved." };
      }

      if ((source.role === "waste" || source.role === "foundation") && selectedCard.cardIndex !== source.cards.length - 1) {
        return { stacks, message: "Only the top waste or foundation card can move." };
      }

      if (source.role === "tableau" && !isTableauRun(source, selectedCard.cardIndex)) {
        return { stacks, message: "Tableau moves must be descending, alternating-color runs." };
      }

      if (targetStack.role === "foundation" && (movingCards.length !== 1 || !canMoveToFoundation(movingCard, targetStack))) {
        return { stacks, message: `${movingCard.code} cannot move to ${targetStack.title}.` };
      }

      if (targetStack.role === "tableau" && !canMoveToTableau(movingCard, targetStack)) {
        return { stacks, message: `${movingCard.code} cannot move to ${targetStack.title}.` };
      }

      if (targetStack.role !== "foundation" && targetStack.role !== "tableau") {
        return { stacks, message: "Cards can move only to foundations or tableau columns." };
      }

      const nextStacks = [...stacks];
      const nextSource = revealTopTableauCard({ ...source, cards: source.cards.slice(0, selectedCard.cardIndex) });
      const nextTarget = { ...targetStack, cards: [...targetStack.cards, ...movingCards] };

      nextStacks[sourceIndex] = nextSource;
      nextStacks[targetIndex] = nextTarget;
      didMove = true;
      setSolitaireStats((current) => ({ ...current, moveCount: current.moveCount + 1 }));

      return { stacks: nextStacks, message: `Moved ${movingCard.code} to ${targetStack.title}.` };
    });

    clearCardInteraction();

    return didMove;
  };

  const moveSingleCardToFoundation = (stack: CardStack, cardIndex: number) => {
    clearCardInteraction();

    updateCardStacks((stacks) => {
      const sourceIndex = stacks.findIndex((candidate) => candidate.id === stack.id);
      const source = stacks[sourceIndex];

      if (!source) {
        return { stacks, message: "Selected source stack no longer exists." };
      }

      if (cardIndex !== source.cards.length - 1) {
        return { stacks, message: "Only a top card can move to a foundation." };
      }

      const movingCard = source.cards[cardIndex];

      if (!movingCard?.faceUp) {
        return { stacks, message: "Only face-up cards can move to foundations." };
      }

      const foundationIndex = findFoundationIndexForCard(movingCard, stacks);
      const foundation = stacks[foundationIndex];

      if (!foundation || !canMoveToFoundation(movingCard, foundation)) {
        return { stacks, message: `${movingCard.code} cannot move to a foundation.` };
      }

      const nextStacks = [...stacks];
      const sourceCards = source.cards.slice(0, -1);
      nextStacks[sourceIndex] = source.role === "tableau" ? revealTopTableauCard({ ...source, cards: sourceCards }) : { ...source, cards: sourceCards };
      nextStacks[foundationIndex] = { ...foundation, cards: [...foundation.cards, movingCard] };
      setSolitaireStats((current) => ({ ...current, moveCount: current.moveCount + 1 }));

      return { stacks: nextStacks, message: `Moved ${movingCard.code} to ${foundation.title}.` };
    });
  };

  const autoMoveToFoundations = () => {
    clearCardInteraction();
    updateCardStacks((stacks) => {
      let nextStacks = stacks;
      let movedCardCount = 0;
      let lastMovedLabel = "";

      while (true) {
        const sourceIndex = nextStacks.findIndex((stack) => {
          const topCard = getTopCard(stack);
          return (
            (stack.role === "waste" || stack.role === "tableau") &&
            Boolean(topCard?.faceUp) &&
            topCard !== undefined &&
            findFoundationIndexForCard(topCard, nextStacks) >= 0
          );
        });

        if (sourceIndex < 0) {
          break;
        }

        const source = nextStacks[sourceIndex];
        const movingCard = getTopCard(source);

        if (!movingCard) {
          break;
        }

        const foundationIndex = findFoundationIndexForCard(movingCard, nextStacks);
        const foundation = nextStacks[foundationIndex];

        if (!foundation) {
          break;
        }

        const sourceCards = source.cards.slice(0, -1);
        const nextSource = source.role === "tableau" ? revealTopTableauCard({ ...source, cards: sourceCards }) : { ...source, cards: sourceCards };
        const nextFoundation = { ...foundation, cards: [...foundation.cards, movingCard] };

        nextStacks = [...nextStacks];
        nextStacks[sourceIndex] = nextSource;
        nextStacks[foundationIndex] = nextFoundation;
        movedCardCount += 1;
        lastMovedLabel = movingCard.code;
      }

      if (movedCardCount === 0) {
        return { stacks, message: "No legal foundation moves are available." };
      }

      setSolitaireStats((current) => ({
        ...current,
        autoMoveCount: current.autoMoveCount + movedCardCount,
        moveCount: current.moveCount + movedCardCount,
      }));

      return {
        stacks: nextStacks,
        message:
          movedCardCount === 1
            ? `Auto-moved ${lastMovedLabel} to a foundation.`
            : `Auto-moved ${movedCardCount} cards to foundations.`,
      };
    });
  };

  const handleStackClick = (stack: CardStack) => {
    if (stack.role === "stock") {
      drawFromStock();
      return;
    }

    if (selectedCard) {
      moveSelectedCardToStack(stack.id);
      return;
    }

    setStatusMessage(`${stack.title} is empty.`);
  };

  const handleCardClick = (stack: CardStack, cardIndex: number) => {
    if (stack.role === "stock") {
      drawFromStock();
      return;
    }

    if (selectedCard && moveSelectedCardToStack(stack.id)) {
      return;
    }

    if (selectedCard?.stackId === stack.id && selectedCard.cardIndex === cardIndex) {
      clearCardInteraction();
      setStatusMessage("Card selection cleared.");
      return;
    }

    if (!canSelectFromStack(stack, cardIndex)) {
      setStatusMessage("Select a face-up waste/foundation top card or a descending alternating tableau run.");
      return;
    }

    const card = stack.cards[cardIndex];
    setSelectedCard({ stackId: stack.id, cardIndex });
    setStatusMessage(
      stack.role === "tableau"
        ? `Selected ${card.code} and ${stack.cards.length - cardIndex - 1} card(s) below it.`
        : `Selected ${card.code}.`,
    );
  };

  const handleGridCellInput = (cell: PuzzleCell, rawValue: string) => {
    if (!puzzle || puzzle.kind !== "grid" || cell.locked) {
      return;
    }

    const inputMode = getGridInputMode(puzzle.puzzleId);
    const nextValue = normalizeCellInput(inputMode, rawValue);

    setSelectedGridCell({ row: cell.row, column: cell.column });
    updateGridCells((cells) => {
      const index = getCellIndex(cells, cell);
      const current = cells[index];

      if (!current) {
        return { cells, message: "Cell no longer exists." };
      }

      cells[index] = {
        ...current,
        value: nextValue,
        tone: puzzle.puzzleId === "sudoku" ? "empty" : nextValue ? "answer" : "empty",
        ariaLabel: `${nextValue || "Empty"} cell at row ${current.row + 1}, column ${current.column + 1}`,
      };

      return { cells, message: puzzle.puzzleId === "sudoku" ? "Sudoku entry updated." : nextValue ? `Set cell to ${nextValue}.` : "Cleared cell." };
    });
  };

  const toggleNonogramCell = (cell: PuzzleCell) => {
    clearGridInteraction();
    updateGridCells((cells) => {
      const index = getCellIndex(cells, cell);
      const current = cells[index];

      if (!current) {
        return { cells, message: "Cell no longer exists." };
      }

      const nextValue = current.value === "■" ? "" : "■";
      cells[index] = {
        ...current,
        value: nextValue,
        tone: nextValue ? "accent" : "empty",
        ariaLabel: `${nextValue ? "Filled" : "Empty"} nonogram cell at row ${current.row + 1}, column ${current.column + 1}`,
      };

      return { cells, message: nextValue ? "Marked filled square." : "Cleared square." };
    });
  };

  const handlePegSolitaireCellClick = (cell: PuzzleCell) => {
    if (cell.tone === "disabled") {
      return;
    }

    if (!selectedGridCell) {
      if (cell.value === "●") {
        setSelectedGridCell({ row: cell.row, column: cell.column });
        setStatusMessage(`Selected peg at row ${cell.row + 1}, column ${cell.column + 1}.`);
      } else {
        setStatusMessage("Select a peg, then jump it into an empty hole two spaces away.");
      }

      return;
    }

    if (selectedGridCell.row === cell.row && selectedGridCell.column === cell.column) {
      clearGridInteraction();
      setStatusMessage("Peg selection cleared.");
      return;
    }

    if (cell.value === "●") {
      setSelectedGridCell({ row: cell.row, column: cell.column });
      setStatusMessage(`Selected peg at row ${cell.row + 1}, column ${cell.column + 1}.`);
      return;
    }

    updateGridCells((cells) => {
      const source = getGridCell(cells, selectedGridCell);
      const destination = getGridCell(cells, cell);

      if (!source || !destination || source.value !== "●" || destination.value !== "○") {
        return { cells, message: "Peg jumps must start on a peg and land in an empty hole." };
      }

      const rowDelta = destination.row - source.row;
      const columnDelta = destination.column - source.column;
      const isOrthogonalJump =
        (Math.abs(rowDelta) === 2 && columnDelta === 0) || (Math.abs(columnDelta) === 2 && rowDelta === 0);

      if (!isOrthogonalJump) {
        return { cells, message: "Peg jumps must move exactly two spaces horizontally or vertically." };
      }

      const middleCell = getGridCell(cells, {
        row: source.row + rowDelta / 2,
        column: source.column + columnDelta / 2,
      });

      if (!middleCell || middleCell.value !== "●") {
        return { cells, message: "A jump must hop over another peg." };
      }

      const nextCells: PuzzleCell[] = cells.map((candidate): PuzzleCell => {
        const isSource = candidate.row === source.row && candidate.column === source.column;
        const isDestination = candidate.row === destination.row && candidate.column === destination.column;
        const isMiddle = candidate.row === middleCell.row && candidate.column === middleCell.column;

        if (isSource || isMiddle) {
          return { ...candidate, value: "○", locked: false, tone: "empty" };
        }

        if (isDestination) {
          return { ...candidate, value: "●", locked: true, tone: "given" };
        }

        return candidate;
      });
      const pegCount = nextCells.filter((candidate) => candidate.value === "●").length;

      return { cells: nextCells, message: pegCount === 1 ? "Solved: one peg remains." : `Jumped peg. ${pegCount} pegs remain.` };
    });

    clearGridInteraction();
  };

  const handleGridCellClick = (cell: PuzzleCell) => {
    if (!puzzle || puzzle.kind !== "grid") {
      return;
    }

    if (puzzle.puzzleId === "sudoku") {
      if (selectedGridCell?.row === cell.row && selectedGridCell.column === cell.column) {
        clearGridInteraction();
        return;
      }

      setSelectedGridCell({ row: cell.row, column: cell.column });
      return;
    }

    if (puzzle.puzzleId === "nonogram") {
      toggleNonogramCell(cell);
      return;
    }

    if (puzzle.puzzleId === "peg-solitaire") {
      handlePegSolitaireCellClick(cell);
      return;
    }
  };

  const handleCheck = () => {
    if (!puzzle) {
      return;
    }

    if (puzzle.kind === "cards") {
      const foundationCardCount = cardStacks
        ?.filter((stack) => stack.role === "foundation")
        .reduce((total, stack) => total + stack.cards.length, 0) ?? 0;
      setStatusMessage(
        foundationCardCount === 52
          ? `Solved in ${solitaireStats.moveCount} move(s). All cards are on foundations.`
          : `Not solved: ${foundationCardCount}/52 cards are on foundations after ${solitaireStats.moveCount} move(s).`,
      );
      return;
    }

    if (puzzle.puzzleId === "peg-solitaire") {
      const pegCount = gridCells?.filter((cell) => cell.value === "●").length ?? 0;
      setStatusMessage(pegCount === 1 ? "Solved. One peg remains." : `Not solved: ${pegCount} pegs remain.`);
      return;
    }

    if (!gridCells || puzzle.kind !== "grid") {
      return;
    }
    
    updateGridCells((cells) => checkGridAnswer(puzzle, cells));
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
      setCardStacks(event.data.puzzle.kind === "cards" ? event.data.puzzle.stacks.map(cloneStack) : null);
      setGridCells(event.data.puzzle.kind === "grid" ? prepareGridCells(event.data.puzzle) : null);
      setSelectedCard(null);
      setSelectedGridCell(null);
      resetSolitaireStats();
      clearSolitaireHistory();
      setStatusMessage(
        event.data.puzzle.puzzleId === "sudoku"
          ? `${event.data.puzzle.difficulty ?? defaultSudokuDifficulty} Sudoku ready.`
          : event.data.puzzle.puzzleId === "nonogram"
            ? event.data.puzzle.uniqueSolution
              ? "Unique Nonogram ready."
              : "Open Nonogram ready. Multiple solutions may be possible."
            : `${event.data.puzzle.title} generated from seed ${event.data.puzzle.seed}.`,
      );
    };

    worker.addEventListener("message", handleMessage);

    return () => {
      worker.removeEventListener("message", handleMessage);
    };
  }, [worker]);

  const selectPuzzle = (puzzleId: PuzzleId) => {
    if (puzzleId === selectedPuzzleId && hasSelectedPuzzle) {
      return;
    }

    if (hasSelectedPuzzle) {
      saveCurrentSession();
    }

    const cachedSession = sessionCache.current[puzzleId];

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
  }: Partial<Pick<PuzzleGenerationRequest, "seed" | "width" | "height" | "difficulty" | "requireUniqueSolution">> = {}) => {
    const definition = getPuzzleDefinition(selectedPuzzleId);
    const generationSeed = typeof nextSeed === "string" ? nextSeed.trim() : seed.trim();
    const fallbackSeed = puzzle?.seed ?? makeRandomSeed();
    const normalizedSeed = generationSeed || fallbackSeed;
    const generationWidth = Number.isFinite(nextWidth) ? Number(nextWidth) : width || definition.defaultWidth;
    const generationHeight = Number.isFinite(nextHeight) ? Number(nextHeight) : height || definition.defaultHeight;
    const generationDifficulty = nextDifficulty ?? difficulty;
    const generationRequireUniqueSolution = typeof nextRequireUniqueSolution === "boolean" ? nextRequireUniqueSolution : requireUniqueSolution;
    const currentGrid = puzzle?.kind === "grid" ? puzzle : null;
    const settingsAreCurrent =
      puzzle?.puzzleId === selectedPuzzleId &&
      puzzle.seed === normalizedSeed &&
      (!currentGrid || (currentGrid.width === generationWidth && currentGrid.height === generationHeight)) &&
      (selectedPuzzleId !== "sudoku" || puzzle.difficulty === generationDifficulty) &&
      (selectedPuzzleId !== "nonogram" || (puzzle.difficulty === generationDifficulty && Boolean(puzzle.uniqueSolution) === generationRequireUniqueSolution));

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
              cardStacks={cardStacks}
              selectedCard={selectedCard}
              solitaireStats={solitaireStats}
              gridCells={gridCells}
              selectedGridCell={selectedGridCell}
              statusMessage={statusMessage}
              isGenerating={isGenerating}
              onSeedChange={setSeed}
              onWidthChange={setWidth}
              onHeightChange={setHeight}
              onSettingsCommit={commitGenerationSettings}
              onDifficultyChange={handleDifficultyChange}
              onUniqueSolutionChange={handleUniqueSolutionChange}
              onGenerate={generate}
              onRandomize={randomize}
              onCheck={handleCheck}
              onAutoMoveToFoundations={autoMoveToFoundations}
              onUndoSolitaire={undoSolitaireMove}
              onRedoSolitaire={redoSolitaireMove}
              canUndoSolitaire={solitaireUndoStack.length > 0}
              canRedoSolitaire={solitaireRedoStack.length > 0}
              onCardClick={handleCardClick}
              onCardDoubleClick={moveSingleCardToFoundation}
              onStackClick={handleStackClick}
              onCellClick={handleGridCellClick}
              onCellInput={handleGridCellInput}
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
