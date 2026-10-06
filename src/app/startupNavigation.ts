import type { PuzzleId } from "../catalog/types";
import type { AppRoute } from "./routes";
import { getMostRecentPersistedPuzzleSession, type PersistedPuzzleSessions } from "./session";

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

export const resolvePuzzleNavigationRoute = (
  puzzleId: PuzzleId,
  persisted: PersistedPuzzleSessions | null,
): AppRoute => {
  const session = getMostRecentPersistedPuzzleSession(puzzleId, persisted);
  if (!session) return { kind: "puzzle", puzzleId };

  return {
    kind: "resource",
    puzzleId: session.puzzleId,
    generationId: session.generationId,
  };
};

export const resolveStartupRoute = (
  initialRoute: AppRoute,
  persisted: PersistedPuzzleSessions | null,
  options: { resumeActiveSession?: boolean } = {},
): AppRoute => {
  if (initialRoute.kind === "home" && options.resumeActiveSession) {
    const activeSession = persisted?.sessions[persisted.activeResourceKey];
    if (activeSession) {
      return {
        kind: "resource",
        puzzleId: activeSession.puzzleId,
        generationId: activeSession.generationId,
      };
    }
    return initialRoute;
  }

  if (initialRoute.kind !== "puzzle") return initialRoute;
  return resolvePuzzleNavigationRoute(initialRoute.puzzleId, persisted);
};