import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleDefinition, isGeneratable, puzzleCatalog } from "./catalog/puzzleCatalog";
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

const makeRequestId = () => Math.random().toString(36).slice(2);
const makeRandomSeed = () => `random-${Date.now().toString(36)}-${makeRequestId().slice(0, 6)}`;

const rankValues: Record<PlayingCard["rank"], number> = {
  ace: 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  jack: 11,
  queen: 12,
  king: 13,
};

const digitCycle = ["", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const letterCycle = ["", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

type CardSelection = {
  stackId: string;
  cardIndex: number;
};

type GridCellSelection = {
  row: number;
  column: number;
};

const cloneCard = (card: PlayingCard): PlayingCard => ({ ...card });

const cloneStack = (stack: CardStack): CardStack => ({
  ...stack,
  cards: stack.cards.map(cloneCard),
});

const cloneGridCell = (cell: PuzzleCell): PuzzleCell => ({ ...cell });

const getTopCard = (stack: CardStack) => stack.cards[stack.cards.length - 1];

const revealTopTableauCard = (stack: CardStack) => {
  if (stack.role !== "tableau" || stack.cards.length === 0) {
    return stack;
  }

  const topIndex = stack.cards.length - 1;
  const topCard = stack.cards[topIndex];

  if (topCard.faceUp) {
    return stack;
  }

  return {
    ...stack,
    cards: stack.cards.map((card, index) => (index === topIndex ? { ...card, faceUp: true } : card)),
  };
};

const canMoveToFoundation = (card: PlayingCard, target: CardStack) => {
  const topCard = getTopCard(target);

  if (!topCard) {
    return rankValues[card.rank] === 1;
  }

  return card.suit === topCard.suit && rankValues[card.rank] === rankValues[topCard.rank] + 1;
};

const canMoveToTableau = (card: PlayingCard, target: CardStack) => {
  const topCard = getTopCard(target);

  if (!topCard) {
    return rankValues[card.rank] === 13;
  }

  return topCard.faceUp && card.color !== topCard.color && rankValues[card.rank] === rankValues[topCard.rank] - 1;
};

const canSelectFromStack = (stack: CardStack, cardIndex: number) => {
  const card = stack.cards[cardIndex];

  if (!card?.faceUp) {
    return false;
  }

  if (stack.role === "waste" || stack.role === "foundation") {
    return cardIndex === stack.cards.length - 1;
  }

  return stack.role === "tableau";
};

const isSelectedCard = (selection: CardSelection | null, stack: CardStack, index: number) =>
  selection?.stackId === stack.id && index >= selection.cardIndex;

const isSelectedGridCell = (selection: GridCellSelection | null, cell: PuzzleCell) =>
  selection?.row === cell.row && selection.column === cell.column;

const cycleValue = (values: string[], currentValue: string) => {
  const currentIndex = values.indexOf(currentValue);
  return values[(currentIndex + 1) % values.length] ?? values[0];
};

const getCellIndex = (cells: PuzzleCell[], cell: GridCellSelection) =>
  cells.findIndex((candidate) => candidate.row === cell.row && candidate.column === cell.column);

const getGridCell = (cells: PuzzleCell[], cell: GridCellSelection) => {
  const index = getCellIndex(cells, cell);
  return index >= 0 ? cells[index] : undefined;
};

const prepareGridCells = (puzzle: GridGeneratedPuzzle): PuzzleCell[] =>
  puzzle.cells.map((cell) => {
    if (puzzle.puzzleId === "nonogram") {
      return {
        ...cell,
        value: "",
        locked: false,
        tone: "empty",
        ariaLabel: `Playable nonogram cell at row ${cell.row + 1}, column ${cell.column + 1}`,
      };
    }

    if (!cell.locked && (puzzle.puzzleId === "sudoku" || puzzle.puzzleId === "logic-grid")) {
      return {
        ...cell,
        value: "",
        tone: "empty",
        ariaLabel: `Editable ${puzzle.title} cell at row ${cell.row + 1}, column ${cell.column + 1}`,
      };
    }

    if (!cell.locked && puzzle.puzzleId === "wordle") {
      return {
        ...cell,
        value: "",
        tone: "empty",
        ariaLabel: `Editable Wordle-like cell at row ${cell.row + 1}, column ${cell.column + 1}`,
      };
    }

    return cloneGridCell(cell);
  });

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
};

const GridPuzzlePreview = ({ puzzle, cells, selectedGridCell, onCellClick }: GridPuzzlePreviewProps) => (
  <div
    class={`grid ${puzzle.puzzleId}`}
    style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}
  >
    {cells.map((cell) => {
      const isInteractive = cell.tone !== "disabled" && (puzzle.puzzleId === "peg-solitaire" || !cell.locked);

      return (
        <button
          aria-label={cell.ariaLabel}
          aria-pressed={isSelectedGridCell(selectedGridCell, cell)}
          class={`cell ${cell.tone} ${isInteractive ? "interactive-cell" : ""} ${isSelectedGridCell(selectedGridCell, cell) ? "selected-grid-cell" : ""}`}
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
      const target = stacks[targetIndex];

      if (!source || !target) {
        return { stacks, message: "Selected source or target stack no longer exists." };
      }

      if (source.id === target.id) {
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

      if (target.role === "foundation" && (movingCards.length !== 1 || !canMoveToFoundation(movingCard, target))) {
        return { stacks, message: `${movingCard.code} cannot move to ${target.title}.` };
      }

      if (target.role === "tableau" && !canMoveToTableau(movingCard, target)) {
        return { stacks, message: `${movingCard.code} cannot move to ${target.title}.` };
      }

      if (target.role !== "foundation" && target.role !== "tableau") {
        return { stacks, message: "Cards can move only to foundations or tableau columns." };
      }

      const nextStacks = [...stacks];
      const nextSource = revealTopTableauCard({ ...source, cards: source.cards.slice(0, selectedCard.cardIndex) });
      const nextTarget = { ...target, cards: [...target.cards, ...movingCards] };

      nextStacks[sourceIndex] = nextSource;
      nextStacks[targetIndex] = nextTarget;
      didMove = true;

      return { stacks: nextStacks, message: `Moved ${movingCard.code} to ${target.title}.` };
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

  const cycleNumericGridCell = (cell: PuzzleCell, puzzleLabel: string) => {
    if (cell.locked) {
      setStatusMessage("Given cells are fixed. Choose an open cell.");
      return;
    }

    clearGridInteraction();
    updateGridCells((cells) => {
      const index = getCellIndex(cells, cell);
      const current = cells[index];

      if (!current) {
        return { cells, message: "Cell no longer exists." };
      }

      const nextValue = cycleValue(digitCycle, current.value);
      cells[index] = {
        ...current,
        value: nextValue,
        tone: nextValue ? "answer" : "empty",
        ariaLabel: `${nextValue || "Empty"} ${puzzleLabel} cell at row ${current.row + 1}, column ${current.column + 1}`,
      };

      return { cells, message: nextValue ? `Placed ${nextValue}.` : "Cleared cell." };
    });
  };

  const cycleWordCell = (cell: PuzzleCell) => {
    if (cell.locked) {
      setStatusMessage("Previous guesses are fixed. Edit the open row.");
      return;
    }

    clearGridInteraction();
    updateGridCells((cells) => {
      const index = getCellIndex(cells, cell);
      const current = cells[index];

      if (!current) {
        return { cells, message: "Cell no longer exists." };
      }

      const nextValue = cycleValue(letterCycle, current.value);
      cells[index] = {
        ...current,
        value: nextValue,
        tone: nextValue ? "hint" : "empty",
        ariaLabel: `${nextValue || "Blank"} at row ${current.row + 1}, column ${current.column + 1}`,
      };

      return { cells, message: nextValue ? `Set letter ${nextValue}.` : "Cleared letter." };
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
      const target = getGridCell(cells, cell);

      if (!source || !target || source.value !== "●" || target.value !== "○") {
        return { cells, message: "Peg jumps must start on a peg and land in an empty hole." };
      }

      const rowDelta = target.row - source.row;
      const columnDelta = target.column - source.column;
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

      const nextCells = cells.map((candidate) => {
        const isSource = candidate.row === source.row && candidate.column === source.column;
        const isTarget = candidate.row === target.row && candidate.column === target.column;
        const isMiddle = candidate.row === middleCell.row && candidate.column === middleCell.column;

        if (isSource || isMiddle) {
          return { ...candidate, value: "○", locked: false, tone: "empty" };
        }

        if (isTarget) {
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
      cycleNumericGridCell(cell, "Sudoku");
      return;
    }

    if (puzzle.puzzleId === "logic-grid") {
      cycleNumericGridCell(cell, "logic-grid");
      return;
    }

    if (puzzle.puzzleId === "wordle") {
      cycleWordCell(cell);
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

  const handleFinished = () => {
    if (!puzzle) {
      return;
    }

    const progressCount = puzzle.kind === "grid" ? gridCells?.filter((cell) => !cell.locked && cell.value).length ?? 0 : null;
    setStatusMessage(
      progressCount === null
        ? `${puzzle.title} marked finished.`
        : `${puzzle.title} marked finished with ${progressCount} filled cell(s).`,
    );
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
    <main class="app-shell">
      <section class="hero-panel">
        <p class="eyebrow">puzzles catalog</p>
        <h1>One home for Sudoku, Solitaire, Nonogram, Wordle-like puzzles, and whatever comes next.</h1>
        <p class="hero-copy">
          Browse the catalog, pick a puzzle family, and generate deterministic boards and deals in a Web Worker so
          the interface stays responsive.
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
                />
              ) : null}

              <div class="puzzle-actions">
                <button type="button" onClick={handleFinished}>
                  Finished
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
    </main>
  );
};
