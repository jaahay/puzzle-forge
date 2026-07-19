import type { PuzzleId } from "../catalog/types";
import { puzzleIds } from "./sessionConstants";

export type AppRoute =
  | { kind: "home" }
  | { kind: "puzzle"; puzzleId: PuzzleId }
  | { kind: "updates" }
  | { kind: "about" }
  | { kind: "not-found"; pathname: string };

const puzzleIdSet = new Set<string>(puzzleIds);

export const parseAppRoute = (pathname: string): AppRoute => {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/") return { kind: "home" };
  if (normalizedPath === "/updates") return { kind: "updates" };
  if (normalizedPath === "/about") return { kind: "about" };

  const segment = normalizedPath.slice(1);
  if (!segment.includes("/") && puzzleIdSet.has(segment)) {
    return { kind: "puzzle", puzzleId: segment as PuzzleId };
  }

  return { kind: "not-found", pathname: normalizedPath };
};

export const appRoutePath = (route: AppRoute): string => {
  switch (route.kind) {
    case "home":
      return "/";
    case "puzzle":
      return `/${route.puzzleId}`;
    case "updates":
      return "/updates";
    case "about":
      return "/about";
    case "not-found":
      return route.pathname;
  }
};

export const getCurrentAppRoute = (): AppRoute =>
  typeof window === "undefined" ? { kind: "home" } : parseAppRoute(window.location.pathname);

export const pushAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const nextPath = appRoutePath(route);
  if (window.location.pathname === nextPath && !window.location.hash) return;
  window.history.pushState(null, "", nextPath);
};
