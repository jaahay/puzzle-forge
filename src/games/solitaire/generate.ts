import type { CardColor, CardRank, CardStack, CardSuit, PlayingCard } from "../../catalog/types";
import { createRandom, makeChecksumFromParts, normalizeSeed } from "../shared";

const suits = ["clubs", "diamonds", "hearts", "spades"] as const satisfies readonly CardSuit[];
const ranks = [
  "ace",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "jack",
  "queen",
  "king",
] as const satisfies readonly CardRank[];

const suitSymbols: Record<CardSuit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

const rankLabels: Record<CardRank, string> = {
  ace: "A",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  jack: "J",
  queen: "Q",
  king: "K",
};

const cardColor = (suit: CardSuit): CardColor => (suit === "diamonds" || suit === "hearts" ? "red" : "black");

const createDeck = (): PlayingCard[] =>
  suits.flatMap((suit) =>
    ranks.map((rank) => ({
      suit,
      rank,
      code: `${rankLabels[rank]}${suitSymbols[suit]}`,
      color: cardColor(suit),
      label: `${rankLabels[rank]} of ${suit}`,
      faceUp: false,
    })),
  );

const shuffle = (deck: PlayingCard[], seed: string) => {
  const random = createRandom(`${seed}:klondike-solitaire`);
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const cloneCard = (card: PlayingCard, faceUp: boolean): PlayingCard => ({
  ...card,
  faceUp,
});

export const generateSolitaire = ({ seed }: { seed: string }) => {
  const normalizedSeed = normalizeSeed(seed);
  const deck = shuffle(createDeck(), normalizedSeed);
  const tableau: CardStack[] = [];
  let cursor = 0;

  for (let column = 0; column < 7; column += 1) {
    const cards: PlayingCard[] = [];

    for (let depth = 0; depth <= column; depth += 1) {
      cards.push(cloneCard(deck[cursor], depth === column));
      cursor += 1;
    }

    tableau.push({
      id: `tableau-${column + 1}`,
      title: `Tableau ${column + 1}`,
      role: "tableau",
      cards,
    });
  }

  const stockCards = deck.slice(cursor).map((card) => cloneCard(card, false));
  const stacks: CardStack[] = [
    {
      id: "stock",
      title: "Stock",
      role: "stock",
      cards: stockCards,
      faceDownCount: stockCards.length,
    },
    {
      id: "waste",
      title: "Waste",
      role: "waste",
      cards: [],
    },
    ...suits.map<CardStack>((suit) => ({
      id: `foundation-${suit}`,
      title: `${suitSymbols[suit]} Foundation`,
      role: "foundation",
      cards: [],
    })),
    ...tableau,
  ];

  const checksum = makeChecksumFromParts(
    stacks.flatMap((stack) => [stack.id, ...stack.cards.map((card) => `${card.code}:${card.faceUp ? "up" : "down"}`)]),
  );

  return {
    kind: "cards" as const,
    id: `klondike-solitaire-${checksum}`,
    puzzleId: "klondike-solitaire" as const,
    title: "Klondike Solitaire Deal",
    seed: normalizedSeed,
    width: 7,
    height: 7,
    stacks,
    checksum,
    createdAt: new Date().toISOString(),
    notes: [
      "A deterministic 52-card Klondike deal generated from the seed.",
      "Tableau columns are dealt one through seven cards with the bottom card face up.",
      "Foundations, stock, and waste are modeled so future work can add move validation and scoring.",
    ],
  };
};
