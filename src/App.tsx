import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleDefinition, isGeneratable } from "./catalog/puzzleCatalog";
import type {
  CardStack,
  GeneratedPuzzle,
  GridGeneratedPuzzle,
  PlayingCard,
  PuzzleCell,
  PuzzleGenerationRequest,
  PuzzleGenerationResponse,
  PuzzleId,
} from "./catalog/types";
import { AppShell } from "./components/AppShell";
import { PuzzleCatalog } from "./components/PuzzleCatalog";
import {
  canMoveToFoundation,
  canMoveToTableau,
  canSelectFromStack,
  cloneStack,
  isSelectedCard,
  revealTopTableauCard,
  type CardSelection,
} from "./interactions/cardRules";
import {
  cloneGridCell,
  getCellIndex,
  getGridCell,
  getGridInputMode,
  isSelectedGridCell,
  normalizeCellInput,
  prepareGridCells,
  type GridCellSelection,
} from "./interactions/gridRules";

const makeRequestId = () => Math.random().toString(36).slice(2);
const makeRandomSeed = () => `random-${Date.now().toString(36)}-${makeRequestId().slice(0, 6)}`;

type CardStackProps = {
  stack: CardStack;
  selectedCard: CardSelection | null;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
};

const renderPlayingCard = (
  card: PlayingCard,
  stack: CardStack,
  index: number,
  selectedCard: CardSelection | null,
  onCardClick: (stack: CardStack, cardIndex: number) => void,
) => {
  const selected = isSelectedCard(selectedCard, stack, index);
  const selectable = canSelectFromStack(stack, index);

  return (
    <button
      aria-label={card.faceUp ? card.label : "Face-down card"}
      class={`playing-card ${card.faceUp ? card.color : "back"} ${selected ? "selected-card" : ""}`}
      disabled={!card.faceUp && stack.role !== "stock"}
      key={`${stack.id}-${index}-${card.code}`}
      onClick={() => onCardClick(stack, index)}
      type="button"
    >
      <span>{card.faceUp ? card.code : ""}</span>
      {selectable ? <span class="card-action-hint">move</span> : null}
    </button>
  );
};

const renderCardStack = ({ stack, selectedCard, onCardClick, onStackClick }: CardStackProps) => {
  const cardsToRender = stack.role === "stock" ? stack.cards.slice(-1) : stack.cards;
  const firstRenderedIndex = stack.role === "stock" ? Math.max(stack.cards.length - 1, 0) : 0;
  const countLabel = stack.role === "stock" && stack.cards.length > 0 ? `${stack.cards.length} cards` : null;
  const hasSelection = selectedCard !== null;

  return (
    <div class={`card-stack ${stack.role}`} key={stack.id}>
      <div class="card-stack-heading">
        <strong>{stack.title}</strong>
        {countLabel ? <span>{countLabel}</span> : null}
      </div>
      <div class="playing-card-list">
        {cardsToRender.length > 0 ? (
          cardsToRender.map((card, index) =>
            renderPlayingCard(card, stack, firstRenderedIndex + index, selectedCard, onCardClick),
          )
        ) : (
          <button
            class={`playing-card placeholder ${hasSelection ? "drop-target" : ""}`}
            aria-label={`${stack.title} is empty`}
            onClick={() => onStackClick(stack)}
            type="button"
          >
            {stack.role === "foundation" ? "A" : stack.role === "stock" ? "↻" : ""}
          </button>
        )}
      </div>
    </div>
  );
};

type CardPuzzlePreviewProps = {
  stacks: CardStack[];
  selectedCard: CardSelection | null;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
};

const CardPuzzlePreview = ({ stacks, selectedCard, onCardClick, onStackClick }: CardPuzzlePreviewProps) => {
  const stockAndWaste = stacks.filter((stack) => stack.role === "stock" || stack.role === "waste");
  const foundations = stacks.filter((stack) => stack.role === "foundation");
  const tableau = stacks.filter((stack) => stack.role === "tableau");
  const renderStack = (stack: CardStack) => renderCardStack({ stack, selectedCard, onCardClick, onStackClick });

  return (
    <div class="cards-layout">
      <div class="card-row stock-row">{stockAndWaste.map(renderStack)}</div>
      <div class="card-row foundation-row">{foundations.map(renderStack)}</div>
      <div class="card-row tableau-row">{tableau.map(renderStack)}</div>
    </div>
  );
};

type GridPuzzlePreviewProps = {
  puzzle: GridGeneratedPuzzle;
  cells: PuzzleCell[];
  selectedGridCell: GridCellSelection | null;
  onCellClick: (cell: PuzzleCell) => void;
  onCellInput: (cell: PuzzleCell, value: string) => void;
};

const GridPuzzlePreview = ({ puzzle, cells, selectedGridCell, onCellClick, onCellInput }: GridPuzzlePreviewProps) => {
  const inputMode = getGridInputMode(puzzle.puzzleId);

  return (
    <div
      class={`grid ${puzzle.puzzleId}`}
      style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}
    >
      {cells.map((cell) => {
        const isInteractive = cell.tone !== "disabled" && (puzzle.puzzleId === "peg-solitaire" || !cell.locked);
        const cellClass = `cell ${cell.tone} ${isInteractive ? "interactive-cell" : ""} ${isSelectedGridCell(selectedGridCell, cell) ? "selected-grid-cell" : ""}`;

        if (inputMode !== "none") {
          return (
            <input
              aria-label={cell.ariaLabel}
              class={`cell-input ${cellClass}`}
              disabled={!isInteractive}
              inputMode={inputMode === "numeric" ? "numeric" : "text"}
              key={`${cell.row}-${cell.column}`}
              maxLength={1}
              onInput={(event) => onCellInput(cell, event.currentTarget.value)}
              value={cell.value}
            />
          );
        }

        return (
          <button
            aria-label={cell.ariaLabel}
            aria-pressed={isSelectedGridCell(selectedGridCell, cell)}
            class={cellClass}
            disabled={!isInteractive}
            key={`${cell.row}-${cell.column}`}
            onClick={() => onCellClick(cell)}
            type="button"
          >
            {cell.value}
          </button>
        );
      })}
    </div>
  );
};

export const App = () => {
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
    <AppShell>
      <section class={`catalog-layout ${isCatalogCollapsed ? "catalog-collapsed" : ""}`}>
        <PuzzleCatalog
          isCollapsed={isCatalogCollapsed}
          selectedPuzzleId={selectedPuzzleId}
          selectedPuzzleTitle={selectedDefinition.title}
          onCollapseToggle={() => setIsCatalogCollapsed((current) => !current)}
          onSelectPuzzle={selectPuzzle}
        />

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

            <div class="control-actions">
              <button type="button" onClick={() => generate()} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
                {isGenerating ? "Generating..." : "Generate"}
              </button>
              <button type="button" onClick={randomize} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
                Randomize
              </button>
            </div>
          </div>

          <p class="status-line" aria-live="polite">{statusMessage}</p>

          {puzzle ? (
            <section class="puzzle-panel" aria-label="Generated puzzle preview">
              <div class="puzzle-meta">
                <span>{puzzle.kind === "cards" ? "52-card deal" : `${puzzle.width} x ${puzzle.height}`}</span>
                <span>Seed: {puzzle.seed}</span>
                <span>Checksum: {puzzle.checksum}</span>
              </div>

              {puzzle.kind === "cards" && cardStacks ? (
                <CardPuzzlePreview
                  stacks={cardStacks}
                  selectedCard={selectedCard}
                  onCardClick={handleCardClick}
                  onStackClick={handleStackClick}
                />
              ) : puzzle.kind === "grid" && gridCells ? (
                <GridPuzzlePreview
                  puzzle={puzzle}
                  cells={gridCells}
                  selectedGridCell={selectedGridCell}
                  onCellClick={handleGridCellClick}
                  onCellInput={handleGridCellInput}
                />
              ) : null}

              <div class="puzzle-actions">
                <button type="button" onClick={handleCheck}>
                  Check
                </button>
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
    </AppShell>
  );
};
