import type { ComponentChildren } from "preact";
import type { CardStack, PlayingCard, SolitaireVariation } from "../catalog/types";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import {
  canMoveToFoundation,
  canMoveToTableau,
  canSelectFromStack,
  getVisibleWasteStartIndex,
  isSelectedCard,
  type CardSelection,
} from "../interactions/cardRules";

type SolitaireStats = {
  moveCount: number;
  drawCount: number;
  recycleCount: number;
  autoMoveCount: number;
};

type LastCardClick = {
  stackId: string;
  cardIndex: number;
  clickedAt: number;
};

type TargetState = "valid" | "invalid" | null;

type CardStackProps = {
  stack: CardStack;
  stacks: CardStack[];
  selectedCard: CardSelection | null;
  variation: SolitaireVariation;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onCardDoubleClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
};

const repeatedCardClickThresholdMs = 260;
let lastCardClick: LastCardClick | null = null;

const getNow = () => (typeof performance === "undefined" ? Date.now() : performance.now());
const suitFromCode = (card: PlayingCard) => card.code.slice(-1);
const rankFromCode = (card: PlayingCard) => card.code.slice(0, -1);

const getFoundationPlaceholder = (stack: CardStack) => stack.title.match(/[♣♦♥♠]/u)?.[0] ?? "A";

const getStackCountLabel = (stack: CardStack) => {
  if (stack.role === "stock" || stack.role === "waste") {
    return `${stack.cards.length}`;
  }

  if (stack.role === "foundation") {
    return `${stack.cards.length}/13`;
  }

  const faceDownCount = stack.cards.filter((card) => !card.faceUp).length;
  return faceDownCount > 0 ? `${stack.cards.length}, ${faceDownCount} hidden` : `${stack.cards.length}`;
};

const getRenderedCards = (stack: CardStack, variation: SolitaireVariation) => {
  if (stack.role === "waste") {
    const firstRenderedIndex = getVisibleWasteStartIndex(stack, variation);
    return {
      cards: stack.cards.slice(firstRenderedIndex),
      firstRenderedIndex,
    };
  }

  if (stack.role === "stock" || stack.role === "foundation") {
    return {
      cards: stack.cards.slice(-1),
      firstRenderedIndex: Math.max(stack.cards.length - 1, 0),
    };
  }

  return {
    cards: stack.cards,
    firstRenderedIndex: 0,
  };
};

const getSelectedMove = (stacks: CardStack[], selectedCard: CardSelection | null) => {
  if (!selectedCard) {
    return null;
  }

  const sourceStack = stacks.find((stack) => stack.id === selectedCard.stackId);
  const card = sourceStack?.cards[selectedCard.cardIndex];

  if (!sourceStack || !card) {
    return null;
  }

  return {
    card,
    sourceStack,
    cardCount: sourceStack.role === "tableau" ? sourceStack.cards.length - selectedCard.cardIndex : 1,
  };
};

const getTargetState = (stack: CardStack, stacks: CardStack[], selectedCard: CardSelection | null): TargetState => {
  const selectedMove = getSelectedMove(stacks, selectedCard);

  if (!selectedMove || stack.id === selectedMove.sourceStack.id || stack.role === "stock" || stack.role === "waste") {
    return null;
  }

  if (stack.role === "foundation") {
    return selectedMove.cardCount === 1 && canMoveToFoundation(selectedMove.card, stack) ? "valid" : "invalid";
  }

  if (stack.role === "tableau") {
    return canMoveToTableau(selectedMove.card, stack) ? "valid" : "invalid";
  }

  return null;
};

const renderPlayingCard = (
  card: PlayingCard,
  stack: CardStack,
  index: number,
  selectedCard: CardSelection | null,
  variation: SolitaireVariation,
  targetState: TargetState,
  onCardClick: (stack: CardStack, cardIndex: number) => void,
  onCardDoubleClick: (stack: CardStack, cardIndex: number) => void,
) => {
  const selected = isSelectedCard(selectedCard, stack, index);
  const rank = rankFromCode(card);
  const suit = suitFromCode(card);
  const canInteract = card.faceUp && canSelectFromStack(stack, index, variation);

  return (
    <button
      aria-label={card.faceUp ? card.label : "Face-down card"}
      class={`playing-card ${card.faceUp ? card.color : "back"} ${card.faceUp ? "face-up" : "face-down"} ${selected ? "selected-card" : ""} ${canInteract ? "playable-card" : "locked-card"} ${targetState === "valid" ? "valid-target-card" : ""} ${targetState === "invalid" ? "invalid-target-card" : ""}`}
      disabled={!card.faceUp && stack.role !== "stock"}
      key={`${stack.id}-${index}-${card.code}`}
      onClick={(event) => {
        const clickedAt = getNow();
        const isRepeatedCardClick =
          !selected &&
          lastCardClick?.stackId === stack.id &&
          lastCardClick.cardIndex === index &&
          clickedAt - lastCardClick.clickedAt <= repeatedCardClickThresholdMs;

        if (event.detail >= 2 || isRepeatedCardClick) {
          lastCardClick = null;
          onCardDoubleClick(stack, index);
          return;
        }

        lastCardClick = { stackId: stack.id, cardIndex: index, clickedAt };
        onCardClick(stack, index);
      }}
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
    </button>
  );
};

const renderCardStack = ({ stack, stacks, selectedCard, variation, onCardClick, onCardDoubleClick, onStackClick }: CardStackProps) => {
  const { cards: cardsToRender, firstRenderedIndex } = getRenderedCards(stack, variation);
  const targetState = getTargetState(stack, stacks, selectedCard);
  const placeholderLabel =
    stack.role === "foundation" ? getFoundationPlaceholder(stack) : stack.role === "stock" ? "↻" : stack.role === "tableau" ? "K" : "";
  const topCardIndex = stack.cards.length - 1;

  return (
    <div
      aria-label={`${stack.title}: ${getStackCountLabel(stack)}`}
      class={`card-stack ${stack.role} ${targetState === "valid" ? "valid-target" : ""} ${targetState === "invalid" ? "invalid-target" : ""}`}
      key={stack.id}
    >
      <div class="playing-card-list">
        {cardsToRender.length > 0 ? (
          cardsToRender.map((card, index) => {
            const renderedCardIndex = firstRenderedIndex + index;
            const renderedTargetState = renderedCardIndex === topCardIndex ? targetState : null;

            return renderPlayingCard(card, stack, renderedCardIndex, selectedCard, variation, renderedTargetState, onCardClick, onCardDoubleClick);
          })
        ) : (
          <button
            class={`playing-card placeholder ${targetState === "valid" ? "drop-target valid-target-card" : ""} ${targetState === "invalid" ? "invalid-target-card" : ""}`}
            aria-label={`${stack.title} is empty${targetState === "valid" ? "; valid target" : targetState === "invalid" ? "; invalid target" : ""}`}
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
  toolbar?: ComponentChildren;
  variation?: SolitaireVariation;
  onCardClick: (stack: CardStack, cardIndex: number) => void;
  onCardDoubleClick: (stack: CardStack, cardIndex: number) => void;
  onStackClick: (stack: CardStack) => void;
};

export const CardPuzzlePreview = ({ stacks, selectedCard, stats, toolbar, variation = defaultSolitaireVariation, onCardClick, onCardDoubleClick, onStackClick }: CardPuzzlePreviewProps) => {
  const stockAndWaste = stacks.filter((stack) => stack.role === "stock" || stack.role === "waste");
  const foundations = stacks.filter((stack) => stack.role === "foundation");
  const tableau = stacks.filter((stack) => stack.role === "tableau");
  const foundationCardCount = foundations.reduce((total, stack) => total + stack.cards.length, 0);
  const hiddenTableauCardCount = tableau.reduce(
    (total, stack) => total + stack.cards.filter((card) => !card.faceUp).length,
    0,
  );
  const renderStack = (stack: CardStack) => renderCardStack({ stack, stacks, selectedCard, variation, onCardClick, onCardDoubleClick, onStackClick });

  return (
    <div class="cards-layout">
      <div class="solitaire-summary" aria-label="Solitaire progress summary">
        {toolbar ? <div class="solitaire-toolbar">{toolbar}</div> : null}
        <div class="solitaire-summary-metrics">
          <span aria-label={`${foundationCardCount} of 52 cards on foundations`}>♣ {foundationCardCount}/52</span>
          <span aria-label={`${hiddenTableauCardCount} hidden tableau cards`}>◐ {hiddenTableauCardCount}</span>
          <span aria-label={`${stats.moveCount} moves`}>↻ {stats.moveCount}</span>
        </div>
      </div>
      <div class="card-board-top-row">
        <div class="card-row stock-row">{stockAndWaste.map(renderStack)}</div>
        <div class="card-row foundation-row">{foundations.map(renderStack)}</div>
      </div>
      <div class="card-row tableau-row">{tableau.map(renderStack)}</div>
    </div>
  );
};
