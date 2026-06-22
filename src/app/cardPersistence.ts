import type { CardStack, PlayingCard } from "../catalog/types";
import type { CardSelection } from "../interactions/cardRules";
import { solitaireHistoryLimit } from "./sessionConstants";
import type { SolitaireHistoryEntry, SolitaireStats } from "./session";

export type PersistedCardRef = string | { code: string; faceDown: true };

export type PersistedCardStack = {
  id: string;
  cards: PersistedCardRef[];
  faceDownCount?: number;
};

export type PersistedSolitaireHistoryEntry = {
  cardStacks: PersistedCardStack[];
  selectedCard: CardSelection | null;
  solitaireStats: SolitaireStats;
  statusMessage: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export const cloneCardStack = (stack: CardStack): CardStack => ({ ...stack, cards: stack.cards.map((card) => ({ ...card })) });

export const cloneSolitaireHistoryEntry = (entry: SolitaireHistoryEntry): SolitaireHistoryEntry => ({
  cardStacks: entry.cardStacks.map(cloneCardStack),
  selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
  solitaireStats: { ...entry.solitaireStats },
  statusMessage: entry.statusMessage,
});

export const trimSolitaireHistory = (entries: SolitaireHistoryEntry[] = []) => entries.slice(-solitaireHistoryLimit).map(cloneSolitaireHistoryEntry);

export const isPersistedCardRef = (value: unknown): value is PersistedCardRef =>
  typeof value === "string" || (isRecord(value) && typeof value.code === "string" && value.faceDown === true);

export const isPersistedCardStack = (value: unknown): value is PersistedCardStack =>
  isRecord(value) &&
  typeof value.id === "string" &&
  Array.isArray(value.cards) &&
  value.cards.every(isPersistedCardRef) &&
  (value.faceDownCount === undefined || typeof value.faceDownCount === "number");

export const isPersistedSolitaireHistoryEntry = (value: unknown, isSolitaireStats: (candidate: unknown) => candidate is SolitaireStats): value is PersistedSolitaireHistoryEntry =>
  isRecord(value) &&
  Array.isArray(value.cardStacks) &&
  value.cardStacks.every(isPersistedCardStack) &&
  (value.selectedCard === null || (isRecord(value.selectedCard) && typeof value.selectedCard.stackId === "string" && typeof value.selectedCard.cardIndex === "number")) &&
  isSolitaireStats(value.solitaireStats) &&
  typeof value.statusMessage === "string";

export const buildPersistedCardRef = (card: PlayingCard): PersistedCardRef => (card.faceUp ? card.code : { code: card.code, faceDown: true });

export const clonePersistedCardRef = (card: PersistedCardRef): PersistedCardRef => (typeof card === "string" ? card : { ...card });

export const buildPersistedCardStack = (stack: CardStack): PersistedCardStack => ({
  id: stack.id,
  cards: stack.cards.map(buildPersistedCardRef),
  ...(typeof stack.faceDownCount === "number" ? { faceDownCount: stack.faceDownCount } : {}),
});

export const clonePersistedCardStack = (stack: PersistedCardStack): PersistedCardStack => ({
  ...stack,
  cards: stack.cards.map(clonePersistedCardRef),
});

export const buildPersistedSolitaireHistoryEntry = (entry: SolitaireHistoryEntry): PersistedSolitaireHistoryEntry => ({
  cardStacks: entry.cardStacks.map(buildPersistedCardStack),
  selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
  solitaireStats: { ...entry.solitaireStats },
  statusMessage: entry.statusMessage,
});

export const clonePersistedSolitaireHistoryEntry = (entry: PersistedSolitaireHistoryEntry): PersistedSolitaireHistoryEntry => ({
  cardStacks: entry.cardStacks.map(clonePersistedCardStack),
  selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
  solitaireStats: { ...entry.solitaireStats },
  statusMessage: entry.statusMessage,
});

export const trimPersistedSolitaireHistory = (entries: PersistedSolitaireHistoryEntry[] = []) => entries.slice(-solitaireHistoryLimit).map(clonePersistedSolitaireHistoryEntry);

export const buildPersistedSolitaireHistory = (entries: SolitaireHistoryEntry[] = []) => trimSolitaireHistory(entries).map(buildPersistedSolitaireHistoryEntry);

const buildCardCatalog = (stacks: CardStack[]) => new Map(stacks.flatMap((stack) => stack.cards.map((card) => [card.code, card] as const)));
const buildStackCatalog = (stacks: CardStack[]) => new Map(stacks.map((stack) => [stack.id, stack] as const));
const persistedCardRefCode = (card: PersistedCardRef) => (typeof card === "string" ? card : card.code);

const restorePersistedCardRef = (card: PersistedCardRef, cardsByCode: Map<string, PlayingCard>): PlayingCard | null => {
  const original = cardsByCode.get(persistedCardRefCode(card));
  if (!original) return null;
  return { ...original, faceUp: typeof card === "string" };
};

const restorePersistedCardStack = (stack: PersistedCardStack, originalStack: CardStack, cardsByCode: Map<string, PlayingCard>): CardStack | null => {
  const cards: PlayingCard[] = [];
  for (const persistedCard of stack.cards) {
    const card = restorePersistedCardRef(persistedCard, cardsByCode);
    if (!card) return null;
    cards.push(card);
  }

  return {
    ...originalStack,
    cards,
    faceDownCount: stack.faceDownCount ?? cards.filter((card) => !card.faceUp).length,
  };
};

export const restorePersistedCardStacks = (stacks: PersistedCardStack[], puzzleStacks: CardStack[]): CardStack[] | null => {
  const stacksById = buildStackCatalog(puzzleStacks);
  const cardsByCode = buildCardCatalog(puzzleStacks);
  const usedCardCodes = new Set<string>();

  if (stacks.length !== puzzleStacks.length) return null;

  const restoredStacks: CardStack[] = [];
  for (const stack of stacks) {
    const originalStack = stacksById.get(stack.id);
    if (!originalStack) return null;

    for (const card of stack.cards) {
      const code = persistedCardRefCode(card);
      if (usedCardCodes.has(code)) return null;
      usedCardCodes.add(code);
    }

    const restoredStack = restorePersistedCardStack(stack, originalStack, cardsByCode);
    if (!restoredStack) return null;
    restoredStacks.push(restoredStack);
  }

  return usedCardCodes.size === cardsByCode.size ? restoredStacks : null;
};

export const restorePersistedSolitaireHistoryEntry = (entry: PersistedSolitaireHistoryEntry, puzzleStacks: CardStack[]): SolitaireHistoryEntry | null => {
  const restoredStacks = restorePersistedCardStacks(entry.cardStacks, puzzleStacks);
  if (!restoredStacks) return null;

  return {
    cardStacks: restoredStacks,
    selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
    solitaireStats: { ...entry.solitaireStats },
    statusMessage: entry.statusMessage,
  };
};

export const restorePersistedSolitaireHistory = (entries: PersistedSolitaireHistoryEntry[], puzzleStacks: CardStack[]): SolitaireHistoryEntry[] | null => {
  const restoredEntries: SolitaireHistoryEntry[] = [];
  for (const entry of trimPersistedSolitaireHistory(entries)) {
    const restoredEntry = restorePersistedSolitaireHistoryEntry(entry, puzzleStacks);
    if (!restoredEntry) return null;
    restoredEntries.push(restoredEntry);
  }

  return restoredEntries;
};
