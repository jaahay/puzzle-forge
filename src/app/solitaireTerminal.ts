import type { CardStack } from "../catalog/types";

export const getSolitaireFoundationCardCount = (stacks: CardStack[] | null): number =>
  stacks
    ?.filter((stack) => stack.role === "foundation")
    .reduce((total, stack) => total + stack.cards.length, 0) ?? 0;

export const isSolitaireSolved = (stacks: CardStack[] | null): boolean =>
  getSolitaireFoundationCardCount(stacks) === 52;
