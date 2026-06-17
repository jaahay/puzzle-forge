import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleDefinition, isGeneratable } from "./catalog/puzzleCatalog";
import type {
  CardStack,
  GeneratedPuzzle,
  GridGeneratedPuzzle,
  PuzzleCell,
  PuzzleGenerationRequest,
  PuzzleGenerationResponse,
  PuzzleId,
} from "./catalog/types";
import { AboutView } from "./components/AboutView";
import { AppShell } from "./components/AppShell";
import { ChangelogView } from "./components/ChangelogView";
import { PuzzleCatalog } from "./components/PuzzleCatalog";
import { PuzzleWorkspace } from "./components/PuzzleWorkspace";
import {
  canMoveToFoundation,
  canMoveToTableau,
  canSelectFromStack,
  cloneStack,
  revealTopTableauCard,
  type CardSelection,
} from "./interactions/cardRules";
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
import { viewFromHash } from "./site/views";

const makeRequestId = () => Math.random().toString(36).slice(2);
const makeRandomSeed = () => `random-${Date.now().toString(36)}-${makeRequestId().slice(0, 6)}`;
const getActiveView = (): AppView => (typeof window === "undefined" ? "catalog" : viewFromHash(window.location.hash));

export const App = () => {
  const [activeView, setActiveView] = useState<AppView>(getActiveView);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<PuzzleId>("sudoku");
  const [seed, setSeed] = useState("daily-catalog");
  const [width, setWidth] = useState(9);
  const [height, setHeight] = useState(9);
  const [puzzle, setPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [cardStacks, setCardStacks] = useState<CardStack[] | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardSelection | null>(null);
  const [gridCells, setGridCells] = useState<PuzzleCell[] | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<GridCellSelection | null>(null);
  const [statusMessage, setStatusMessage] = useState("Choose a puzzle and generate a board.");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCatalogCollapsed, setIsCatalogCollapsed] = useState(false);
  const activeRequestId = useRef<string | null>(null);
  const worker = useMemo(
    () => new Worker(new URL("./workers/puzzleWorker.ts", import.meta.url), { type: "module" }),
    [],
  );
  const selectedDefinition = getPuzzleDefinition(selectedPuzzleId);
  const selectedPuzzleIsGeneratable = isGeneratable(selectedDefinition);

  const clearCardInteraction = () => {
    setSelectedCard(null);
  };

  const clearGridInteraction = () => {
    setSelectedGridCell(null);
  };

  const updateCardStacks = (updater: (stacks: CardStack[]) => { stacks: CardStack[]; message: string }) => {
    setCardStacks((currentStacks) => {
      if (!currentStacks) {
        return currentStacks;
      }

      const { stacks, message } = updater(currentStacks.map(cloneStack));
      const foundationCardCount = stacks
        .filter((stack) => stack.role === "foundation")
        .reduce((total, stack) => total + stack.cards.length, 0);

      setStatusMessage(foundationCardCount === 52 ? "Solved. All cards are on foundations." : message);

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

        return { stacks: nextStacks, message: `Drew ${drawnCard.label} to waste.` };
      }

      if (waste.cards.length === 0) {
        return { stacks, message: "Stock and waste are both empty." };
      }

      const recycledCards = waste.cards.map((card) => ({ ...card, faceUp: false })).reverse();
      const nextStacks = [...stacks];
      nextStacks[stockIndex] = { ...stock, cards: recycledCards, faceDownCount: recycledCards.length };
      nextStacks[wasteIndex] = { ...waste, cards: [] };

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

      return { stacks: nextStacks, message: `Moved ${movingCard.code} to ${targetStack.title}.` };
    });

    clearCardInteraction();

    return didMove;
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
      setStatusMessage("Select a face-up waste card, foundation card, or tableau run.");
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

    updateGridCells((cells) => {
      const index = getCellIndex(cells, cell);
      const current = cells[index];

      if (!current) {
        return { cells, message: "Cell no longer exists." };
      }

      cells[index] = {
        ...current,
        value: nextValue,
        tone: nextValue ? "answer" : "empty",
        ariaLabel: `${nextValue || "Empty"} cell at row ${current.row + 1}, column ${current.column + 1}`,
      };

      return { cells, message: nextValue ? `Entered ${nextValue}.` : "Cleared cell." };
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

    if (puzzle.puzzleId === "nonogram") {
      toggleNonogramCell(cell);
      return;
    }

    if (puzzle.puzzleId === "peg-solitaire") {
      handlePegSolitaireCellClick(cell);
      return;
    }
  };

  const checkWordGuess = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]) => {
    const solutionWord = currentPuzzle.answerKey?.join("") ?? "";

    if (!solutionWord) {
      return { cells, message: "No checker is available for this word puzzle." };
    }

    let completeGuessCount = 0;
    let solved = false;
    const nextCells = cells.map(cloneGridCell);

    for (let row = 0; row < currentPuzzle.height; row += 1) {
      const rowCells = nextCells.filter((candidate) => candidate.row === row).sort((left, right) => left.column - right.column);
      const guess = rowCells.map((candidate) => candidate.value).join("");
      const hasAnyLetter = rowCells.some((candidate) => candidate.value);
      const isComplete = rowCells.every((candidate) => candidate.value);

      if (!hasAnyLetter) {
        continue;
      }

      if (!isComplete) {
        return { cells: nextCells, message: `Row ${row + 1} is incomplete.` };
      }

      completeGuessCount += 1;
      solved = solved || guess === solutionWord;

      for (const rowCell of rowCells) {
        const expected = solutionWord[rowCell.column] ?? "";
        const exact = rowCell.value === expected;
        const present = !exact && solutionWord.includes(rowCell.value);
        rowCell.tone = exact ? "answer" : present ? "hint" : "empty";
      }
    }

    if (completeGuessCount === 0) {
      return { cells: nextCells, message: "Enter a complete five-letter guess, then check it." };
    }

    if (solved) {
      return { cells: nextCells, message: `Solved. The word is ${solutionWord}.` };
    }

    if (completeGuessCount >= currentPuzzle.height) {
      return { cells: nextCells, message: "No match in the available attempts." };
    }

    return { cells: nextCells, message: `Not solved yet. ${currentPuzzle.height - completeGuessCount} attempt(s) remain.` };
  };

  const checkGridAnswer = (currentPuzzle: GridGeneratedPuzzle, cells: PuzzleCell[]) => {
    if (currentPuzzle.puzzleId === "word-guess") {
      return checkWordGuess(currentPuzzle, cells);
    }

    const answerKey = currentPuzzle.answerKey;

    if (!answerKey?.length) {
      return { cells, message: `${currentPuzzle.title} does not expose a checker yet.` };
    }

    let emptyCount = 0;
    let incorrectCount = 0;

    const nextCells = cells.map((cell, index): PuzzleCell => {
      if (cell.tone === "disabled" || cell.locked) {
        return cell;
      }

      const expected = answerKey[index] ?? "";
      const actual = cell.value;
      const isEmpty = actual === "";
      const isCorrect = actual === expected;

      if (isEmpty && expected !== "") {
        emptyCount += 1;
      } else if (!isCorrect) {
        incorrectCount += 1;
      }

      if (currentPuzzle.puzzleId === "nonogram") {
        return {
          ...cell,
          tone: isCorrect ? (actual === "■" ? "accent" : "empty") : "hint",
        };
      }

      return {
        ...cell,
        tone: isEmpty ? "empty" : isCorrect ? "answer" : "hint",
      };
    });

    if (emptyCount === 0 && incorrectCount === 0) {
      return { cells: nextCells, message: `Solved. ${currentPuzzle.title} is correct.` };
    }

    return {
      cells: nextCells,
      message: `Not solved: ${emptyCount} empty cell(s), ${incorrectCount} incorrect cell(s).`,
    };
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
          ? "Solved. All cards are on foundations."
          : `Not solved: ${foundationCardCount}/52 cards are on foundations.`,
      );
      return;
    }

    if (puzzle.puzzleId === "peg-solitaire") {
      const pegCount = gridCells?.filter((cell) => cell.value === "●").length ?? 0;
      setStatusMessage(pegCount === 1 ? "Solved. One peg remains." : `Not solved: ${pegCount} pegs remain.`);
      return;
    }

    if (!gridCells) {
      return;
    }

    updateGridCells((cells) => checkGridAnswer(puzzle, cells));
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncActiveView = () => setActiveView(getActiveView());

    syncActiveView();
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
    setCardStacks(null);
    setGridCells(null);
    setSelectedCard(null);
    setSelectedGridCell(null);
    setStatusMessage(
      isGeneratable(definition)
        ? `${definition.title} is ready to generate.`
        : `${definition.title} is planned for a future generator.`,
    );
  };

  const generate = (seedOverride?: string) => {
    if (!selectedPuzzleIsGeneratable) {
      setStatusMessage(`${selectedDefinition.title} is planned, not generatable yet.`);
      return;
    }

    const requestId = makeRequestId();
    const request: PuzzleGenerationRequest = {
      requestId,
      puzzleId: selectedPuzzleId,
      seed: seedOverride ?? seed,
      width,
      height,
    };

    activeRequestId.current = requestId;
    setIsGenerating(true);
    setSelectedCard(null);
    setSelectedGridCell(null);
    setStatusMessage(`Generating ${selectedDefinition.title}...`);
    worker.postMessage(request);
  };

  const randomize = () => {
    const randomSeed = makeRandomSeed();
    setSeed(randomSeed);
    generate(randomSeed);
  };

  useEffect(() => {
    generate();
    // Generate the first catalog entry when the worker is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell activeView={activeView}>
      {activeView === "catalog" ? (
        <section class={`catalog-layout ${isCatalogCollapsed ? "catalog-collapsed" : ""}`}>
          <PuzzleCatalog
            isCollapsed={isCatalogCollapsed}
            selectedPuzzleId={selectedPuzzleId}
            selectedPuzzleTitle={selectedDefinition.title}
            onCollapseToggle={() => setIsCatalogCollapsed((current) => !current)}
            onSelectPuzzle={selectPuzzle}
          />

          <PuzzleWorkspace
            selectedDefinition={selectedDefinition}
            selectedPuzzleIsGeneratable={selectedPuzzleIsGeneratable}
            seed={seed}
            width={width}
            height={height}
            puzzle={puzzle}
            cardStacks={cardStacks}
            selectedCard={selectedCard}
            gridCells={gridCells}
            selectedGridCell={selectedGridCell}
            statusMessage={statusMessage}
            isGenerating={isGenerating}
            onSeedChange={setSeed}
            onWidthChange={setWidth}
            onHeightChange={setHeight}
            onGenerate={() => generate()}
            onRandomize={randomize}
            onCheck={handleCheck}
            onCardClick={handleCardClick}
            onStackClick={handleStackClick}
            onCellClick={handleGridCellClick}
            onCellInput={handleGridCellInput}
          />
        </section>
      ) : activeView === "changelog" ? (
        <ChangelogView />
      ) : (
        <AboutView />
      )}
    </AppShell>
  );
};
