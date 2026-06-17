import type { CardStack, PlayingCard } from "../catalog/types";
import { canSelectFromStack, getTopCard, isSelectedCard, type CardSelection } from "../interactions/cardRules";

type SolitaireStats = {
  moveCount: number;
  drawCount: number;
  recycleCount: number;
  autoMoveCount: number;
};

type CardStackProps = {
  stack: CardStack;
  selectedCard: CardSelection | null;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
};

const suitFromCode = (card: PlayingCard) => card.code.slice(-1);
const rankFromCode = (card: PlayingCard) => card.code.slice(0, -1);

const getFoundationPlaceholder = (stack: CardStack) => stack.title.match(/[♣♦♥♠]/u)?.[0] ?? "A";

const getStackCountLabel = (stack: CardStack) => {
  if (stack.role === "stock") {
    return `${stack.cards.length} stock`;
  }

  if (stack.role === "waste") {
    return `${stack.cards.length} waste`;
  }

  if (stack.role === "foundation") {
    return `${stack.cards.length}/13`;
  }

  const faceDownCount = stack.cards.filter((card) => !card.faceUp).length;
  return `${stack.cards.length} cards${faceDownCount > 0 ? `, ${faceDownCount} hidden` : ""}`;
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
  const rank = rankFromCode(card);
  const suit = suitFromCode(card);

  return (
    <button
      aria-label={card.faceUp ? `${card.label}${selectable ? ", movable" : ""}` : "Face-down card"}
      class={`playing-card ${card.faceUp ? card.color : "back"} ${selected ? "selected-card" : ""}`}
      disabled={!card.faceUp && stack.role !== "stock"}
      key={`${stack.id}-${index}-${card.code}`}
      onClick={() => onCardClick(stack, index)}
      type="button"
    >
      {card.faceUp ? (
        <>
          <span class="card-corner card-corner-top">
            <span>{rank}</span>
            <span>{suit}</span>
          </span>
          <span class="card-center-suit" aria-hidden="true">
            {suit}
          </span>
          <span class="card-corner card-corner-bottom" aria-hidden="true">
            <span>{rank}</span>
            <span>{suit}</span>
          </span>
        </>
      ) : (
        <span class="card-back-mark">PF</span>
      )}
      {selectable ? <span class="card-action-hint">move</span> : null}
    </button>
  );
};

const renderCardStack = ({ stack, selectedCard, onCardClick, onStackClick }: CardStackProps) => {
  const cardsToRender = stack.role === "stock" ? stack.cards.slice(-1) : stack.cards;
  const firstRenderedIndex = stack.role === "stock" ? Math.max(stack.cards.length - 1, 0) : 0;
  const hasSelection = selectedCard !== null;
  const placeholderLabel =
    stack.role === "foundation" ? getFoundationPlaceholder(stack) : stack.role === "stock" ? "↻" : stack.role === "tableau" ? "K" : "";

  return (
    <div class={`card-stack ${stack.role}`} key={stack.id}>
      <div class="card-stack-heading">
        <strong>{stack.title}</strong>
        <span>{getStackCountLabel(stack)}</span>
      </div>
      <div class="playing-card-list">
        {cardsToRender.length > 0 ? (
          cardsToRender.map((card, index) =>
            renderPlayingCard(card, stack, firstRenderedIndex + index, selectedCard, onCardClick),
          )
        ) : (
          <button
            class={`playing-card placeholder ${hasSelection ? "drop-target" : ""}`}
            aria-label={`${stack.title} is empty${hasSelection ? "; legal cards may be dropped here" : ""}`}
            onClick={() => onStackClick(stack)}
            type="button"
          >
            <span>{placeholderLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};

type CardPuzzlePreviewProps = {
  stacks: CardStack[];
  selectedCard: CardSelection | null;
  stats: SolitaireStats;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
};

export const CardPuzzlePreview = ({ stacks, selectedCard, stats, onCardClick, onStackClick }: CardPuzzlePreviewProps) => {
  const stockAndWaste = stacks.filter((stack) => stack.role === "stock" || stack.role === "waste");
  const foundations = stacks.filter((stack) => stack.role === "foundation");
  const tableau = stacks.filter((stack) => stack.role === "tableau");
  const foundationCardCount = foundations.reduce((total, stack) => total + stack.cards.length, 0);
  const hiddenTableauCardCount = tableau.reduce(
    (total, stack) => total + stack.cards.filter((card) => !card.faceUp).length,
    0,
  );
  const wasteTopCard = getTopCard(stockAndWaste.find((stack) => stack.role === "waste") ?? { cards: [], id: "waste", role: "waste", title: "Waste" });
  const renderStack = (stack: CardStack) => renderCardStack({ stack, selectedCard, onCardClick, onStackClick });

  return (
    <div class="cards-layout">
      <div class="solitaire-summary" aria-label="Solitaire progress summary">
        <span>{foundationCardCount}/52 foundation</span>
        <span>{hiddenTableauCardCount} hidden tableau</span>
        <span>{wasteTopCard ? `${wasteTopCard.code} on waste` : "Waste empty"}</span>
        <span>{stats.moveCount} moves</span>
        <span>{stats.drawCount} draws</span>
        <span>{stats.recycleCount} recycle(s)</span>
        <span>{stats.autoMoveCount} auto</span>
      </div>
      <div class="card-board-top-row">
        <div class="card-row stock-row">{stockAndWaste.map(renderStack)}</div>
        <div class="card-row foundation-row">{foundations.map(renderStack)}</div>
      </div>
      <div class="card-row tableau-row">{tableau.map(renderStack)}</div>
    </div>
  );
};
