import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { getPuzzleDefinition, isGeneratable, puzzleCatalog } from "./catalog/puzzleCatalog";
import type {
  CardStack,
  GeneratedPuzzle,
  PlayingCard,
  PuzzleGenerationRequest,
  PuzzleGenerationResponse,
  PuzzleId,
} from "./catalog/types";

const makeRequestId = () => Math.random().toString(36).slice(2);

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

type CardSelection = {
  stackId: string;
  cardIndex: number;
};

const cloneCard = (card: PlayingCard): PlayingCard => ({ ...card });

const cloneStack = (stack: CardStack): CardStack => ({
  ...stack,
  cards: stack.cards.map(cloneCard),
});

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

const renderGridPuzzlePreview = (puzzle: GeneratedPuzzle) => {
  if (puzzle.kind !== "grid") {
    return null;
  }

  return (
    <div
      class={`grid ${puzzle.puzzleId}`}
      style={{ gridTemplateColumns: `repeat(${puzzle.width}, minmax(0, 1fr))` }}
    >
      {puzzle.cells.map((cell) => (
        <div aria-label={cell.ariaLabel} class={`cell ${cell.tone}`} key={`${cell.row}-${cell.column}`}>
          {cell.value}
        </div>
      ))}
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
      setSelectedCard(null);
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
    setSelectedCard(null);
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
    setSelectedCard(null);
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

            <button type="button" onClick={generate} disabled={isGenerating || !selectedPuzzleIsGeneratable}>
              {isGenerating ? "Generating..." : "Generate"}
            </button>
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
              ) : (
                renderGridPuzzlePreview(puzzle)
              )}

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
