import type { CardStack, PlayingCard } from "../catalog/types";
import { canSelectFromStack, isSelectedCard, type CardSelection } from "../interactions/cardRules";

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

export const CardPuzzlePreview = ({ stacks, selectedCard, onCardClick, onStackClick }: CardPuzzlePreviewProps) => {
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
