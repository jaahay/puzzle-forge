import type { PuzzleId } from "../catalog/types";
import type { AppRoute } from "./routes";

type StartupPersistedSession = {
  puzzleId: PuzzleId;
  generationId: string;
};

export type StartupPersistedSessions = {
  activeResourceKey: string;
  sessions: Record<string, StartupPersistedSession | undefined>;
};

export const resolveStartupRoute = (
  initialRoute: AppRoute,
  persisted: StartupPersistedSessions | null,
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
