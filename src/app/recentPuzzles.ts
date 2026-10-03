import { getPuzzleDefinition } from "../catalog/puzzleCatalog";
import type { PuzzleId } from "../catalog/types";
import { getPuzzleImageAsset, isImageBackedPuzzleId } from "../games/imageAssets";
import { formatDailyDateStamp } from "../games/shared/daily";
import { sudokuVariationLabels } from "../games/sudoku/variation";
import { decodeGenerationId, makePuzzleResourceKey, type PuzzleResourceKey } from "./puzzleResourceIdentity";
import type { PersistedPuzzleSession, PersistedPuzzleSessions } from "./sessionPersistence";

export type RecentPuzzleEntry = {
  resourceKey: PuzzleResourceKey;
  puzzleId: PuzzleId;
  generationId: string;
  title: string;
  summary: string;
  updatedAt: string;
  completedAt?: string;
  isActive: boolean;
};

const formatSolitaireSummary = (session: ReturnType<typeof decodeGenerationId> & { ok: true }) => {
  const { solitaireVariation } = session.identity;
  const drawLabel = solitaireVariation.drawMode === "draw-3" ? "Draw 3" : "Draw 1";
  const redealLabel = solitaireVariation.redeals === "unlimited"
    ? "Unlimited redeals"
    : `${solitaireVariation.redeals} redeal${solitaireVariation.redeals === 1 ? "" : "s"}`;
  return `${drawLabel} · ${redealLabel}`;
};

const formatIdentitySummary = (puzzleId: PuzzleId, generationId: string) => {
  const decoded = decodeGenerationId(puzzleId, generationId);
  if (!decoded.ok) return null;
  const { identity } = decoded;
  const parts: string[] = [];

  if (identity.provenance?.source === "daily") {
    parts.push(`Daily ${formatDailyDateStamp(identity.provenance.dateStamp)}`);
  }

  switch (puzzleId) {
    case "sudoku":
      parts.push(sudokuVariationLabels[identity.sudokuVariation], identity.difficulty);
      break;
    case "nonogram":
      parts.push(`${identity.width}×${identity.height}`, identity.difficulty);
      if (identity.requireUniqueSolution) parts.push("Unique");
      break;
    case "word-guess":
    case "logic-grid":
      parts.push(`${identity.width}×${identity.height}`);
      break;
    case "jigsaw":
    case "tile-swap":
    case "sliding-puzzle":
      if (isImageBackedPuzzleId(puzzleId)) {
        parts.push(getPuzzleImageAsset(identity.imageId, puzzleId).title, `${identity.width}×${identity.height}`);
      }
      break;
    case "klondike-solitaire":
      parts.push(formatSolitaireSummary(decoded));
      break;
    case "futoshiki":
      parts.push(`${identity.width}×${identity.height}`, identity.difficulty);
      break;
    case "peg-solitaire":
      break;
    case "kenken":
    case "minesweeper":
    case "slitherlink":
      parts.push(`${identity.width}×${identity.height}`, identity.difficulty);
      break;
  }

  return parts.join(" · ");
};

const toRecentPuzzleEntry = (
  resourceKey: PuzzleResourceKey,
  session: PersistedPuzzleSession,
  activeResourceKey: PuzzleResourceKey,
): RecentPuzzleEntry | null => {
  if (makePuzzleResourceKey(session.puzzleId, session.generationId) !== resourceKey) return null;
  const summary = formatIdentitySummary(session.puzzleId, session.generationId);
  if (summary === null) return null;

  return {
    resourceKey,
    puzzleId: session.puzzleId,
    generationId: session.generationId,
    title: getPuzzleDefinition(session.puzzleId).title,
    summary,
    updatedAt: session.updatedAt,
    ...(session.completedAt ? { completedAt: session.completedAt } : {}),
    isActive: resourceKey === activeResourceKey,
  };
};

export const getRecentPuzzleEntries = (persisted: PersistedPuzzleSessions | null): RecentPuzzleEntry[] => {
  if (!persisted) return [];

  return (Object.entries(persisted.sessions) as Array<[PuzzleResourceKey, PersistedPuzzleSession | undefined]>)
    .flatMap(([resourceKey, session]) => {
      if (!session) return [];
      const entry = toRecentPuzzleEntry(resourceKey, session, persisted.activeResourceKey);
      return entry ? [entry] : [];
    })
    .sort((left, right) => {
      const recency = right.updatedAt.localeCompare(left.updatedAt);
      return recency !== 0 ? recency : left.resourceKey.localeCompare(right.resourceKey);
    });
};
