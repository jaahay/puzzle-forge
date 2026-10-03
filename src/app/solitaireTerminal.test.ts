import { describe, expect, it } from "vitest";
import type { CardStack, PlayingCard } from "../catalog/types";
import { getSolitaireFoundationCardCount, isSolitaireSolved } from "./solitaireTerminal";

const card: PlayingCard = {
  suit: "clubs",
  rank: "ace",
  code: "A♣",
  color: "black",
  label: "Ace of Clubs",
  faceUp: true,
};

const stack = (id: string, role: CardStack["role"], count: number): CardStack => ({
  id,
  title: id,
  role,
  cards: Array.from({ length: count }, () => ({ ...card })),
});

describe("Solitaire terminal state", () => {
  it("counts only foundation cards", () => {
    const stacks = [stack("foundation-1", "foundation", 13), stack("tableau-1", "tableau", 20)];
    expect(getSolitaireFoundationCardCount(stacks)).toBe(13);
  });

  it("is solved only when all 52 cards are on foundations", () => {
    expect(isSolitaireSolved(null)).toBe(false);
    expect(isSolitaireSolved([stack("foundation-1", "foundation", 51)])).toBe(false);
    expect(
      isSolitaireSolved([
        stack("foundation-1", "foundation", 13),
        stack("foundation-2", "foundation", 13),
        stack("foundation-3", "foundation", 13),
        stack("foundation-4", "foundation", 13),
      ]),
    ).toBe(true);
  });
});
