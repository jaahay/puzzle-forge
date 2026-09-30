import type { AppRoute } from "./routes";
import type { PersistedPuzzleSessions } from "./session";

export const resolveStartupRoute = (
  initialRoute: AppRoute,
  persisted: PersistedPuzzleSessions | null,
): AppRoute => {
  if (initialRoute.kind !== "puzzle" || !persisted) return initialRoute;

  const activeSession = persisted.sessions[persisted.activeResourceKey];
  if (!activeSession || activeSession.puzzleId !== initialRoute.puzzleId) return initialRoute;

  return {
    kind: "resource",
    puzzleId: activeSession.puzzleId,
    generationId: activeSession.generationId,
  };
};
