import type { PuzzleId } from "../catalog/types";
import type { AppRoute } from "./routes";
import type { PersistedPuzzleSession, PersistedPuzzleSessions } from "./session";

type InstalledAppEnvironment = {
  displayModeStandalone?: boolean;
  navigatorStandalone?: boolean;
};

export const isInstalledAppContext = (
  environment: InstalledAppEnvironment = {},
) => {
  const displayModeStandalone = environment.displayModeStandalone ??
    (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches
    );
  const navigatorStandalone = environment.navigatorStandalone ??
    (
      typeof navigator !== "undefined" &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );

  return displayModeStandalone || navigatorStandalone;
};

const persistedSessionTimestamp = (session: PersistedPuzzleSession) => {
  const timestamp = Date.parse(session.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
};

export const getMostRecentPersistedPuzzleSession = (
  puzzleId: PuzzleId,
  persisted: PersistedPuzzleSessions | null,
): PersistedPuzzleSession | null => {
  if (!persisted) return null;

  const activeSession = persisted.sessions[persisted.activeResourceKey];
  if (activeSession?.puzzleId === puzzleId) return activeSession;

  let mostRecent: PersistedPuzzleSession | null = null;
  for (const session of Object.values(persisted.sessions)) {
    if (!session || session.puzzleId !== puzzleId) continue;
    if (!mostRecent || persistedSessionTimestamp(session) > persistedSessionTimestamp(mostRecent)) {
      mostRecent = session;
    }
  }
  return mostRecent;
};

export const resolveStartupRoute = (
  initialRoute: AppRoute,
  persisted: PersistedPuzzleSessions | null,
  options: { resumeActiveSession?: boolean } = {},
): AppRoute => {
  if (initialRoute.kind === "home" && options.resumeActiveSession) {
    const activeSession = persisted?.sessions[persisted.activeResourceKey];
    if (activeSession && !activeSession.completedAt) {
      return {
        kind: "resource",
        puzzleId: activeSession.puzzleId,
        generationId: activeSession.generationId,
      };
    }
    return initialRoute;
  }

  if (initialRoute.kind !== "puzzle") return initialRoute;

  const session = getMostRecentPersistedPuzzleSession(initialRoute.puzzleId, persisted);
  if (!session) return initialRoute;

  return {
    kind: "resource",
    puzzleId: session.puzzleId,
    generationId: session.generationId,
  };
};
