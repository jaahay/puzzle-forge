import type { PuzzleId } from "../catalog/types";
import { puzzleIds } from "./sessionConstants";

export type AppRoute =
  | { kind: "home" }
  | { kind: "puzzle"; puzzleId: PuzzleId; puzzleReference?: string }
  | { kind: "updates" }
  | { kind: "about" }
  | { kind: "not-found"; pathname: string };

const puzzleIdSet = new Set<string>(puzzleIds);

export const parseAppRoute = (pathname: string, search = ""): AppRoute => {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/") return { kind: "home" };
  if (normalizedPath === "/updates") return { kind: "updates" };
  if (normalizedPath === "/about") return { kind: "about" };

  const segment = normalizedPath.slice(1);
  if (!segment.includes("/") && puzzleIdSet.has(segment)) {
    const puzzleReference = new URLSearchParams(search).get("ref")?.trim();
    return {
      kind: "puzzle",
      puzzleId: segment as PuzzleId,
      ...(puzzleReference ? { puzzleReference } : {}),
    };
  }

  return { kind: "not-found", pathname: normalizedPath };
};

export const appRoutePath = (route: AppRoute): string => {
  switch (route.kind) {
    case "home":
      return "/";
    case "puzzle": {
      const path = `/${route.puzzleId}`;
      return route.puzzleReference ? `${path}?ref=${encodeURIComponent(route.puzzleReference)}` : path;
    }
    case "updates":
      return "/updates";
    case "about":
      return "/about";
    case "not-found":
      return route.pathname;
  }
};

export const getCurrentAppRoute = (): AppRoute =>
  typeof window === "undefined"
    ? { kind: "home" }
    : parseAppRoute(window.location.pathname, window.location.search);

const currentBrowserPath = () => `${window.location.pathname}${window.location.search}`;

export const pushAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const nextPath = appRoutePath(route);
  if (currentBrowserPath() === nextPath && !window.location.hash) return;
  window.history.pushState(null, "", nextPath);
};

export const replaceAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const nextPath = appRoutePath(route);
  if (currentBrowserPath() === nextPath && !window.location.hash) return;
  window.history.replaceState(null, "", nextPath);
};
