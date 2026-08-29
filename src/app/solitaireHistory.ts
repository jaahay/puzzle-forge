import type { CardStack } from "../catalog/types";
import { cloneStack, type CardSelection } from "../interactions/cardRules";
import type { SolitaireHistoryEntry, SolitaireStats } from "./session";

export const cloneSolitaireHistoryEntry = (entry: SolitaireHistoryEntry): SolitaireHistoryEntry => ({
  cardStacks: entry.cardStacks.map(cloneStack),
  selectedCard: entry.selectedCard ? { ...entry.selectedCard } : null,
  solitaireStats: { ...entry.solitaireStats },
  statusMessage: entry.statusMessage,
});

export const makeSolitaireHistoryEntry = (
  stacks: CardStack[],
  selected: CardSelection | null,
  stats: SolitaireStats,
  message: string,
): SolitaireHistoryEntry => ({
  cardStacks: stacks.map(cloneStack),
  selectedCard: selected ? { ...selected } : null,
  solitaireStats: { ...stats },
  statusMessage: message,
});
