import type { PuzzleId } from "../catalog/types";
import { resolvePuzzleResourceSegment } from "./puzzleResourceIdentity";
import { puzzleIds } from "./sessionConstants";

export type AppRoute =
  | { kind: "home" }
  | { kind: "puzzle"; puzzleId: PuzzleId }
  | { kind: "resource"; puzzleId: PuzzleId; generationId: string }
  | { kind: "updates" }
  | { kind: "about" }
  | { kind: "not-found"; pathname: string };

const puzzleIdSet = new Set<string>(puzzleIds);

export const parseAppRoute = (pathname: string): AppRoute => {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/") return { kind: "home" };
  if (normalizedPath === "/updates") return { kind: "updates" };
  if (normalizedPath === "/about") return { kind: "about" };

  const segments = normalizedPath.slice(1).split("/").filter(Boolean);
  if (segments.length === 1 && puzzleIdSet.has(segments[0])) {
    return { kind: "puzzle", puzzleId: segments[0] as PuzzleId };
  }

  if (segments.length === 2 && puzzleIdSet.has(segments[0]) && segments[1]) {
    return {
      kind: "resource",
      puzzleId: segments[0] as PuzzleId,
      generationId: decodeURIComponent(segments[1]),
    };
  }

  return { kind: "not-found", pathname: normalizedPath };
};

export const appRoutePath = (route: AppRoute): string => {
  switch (route.kind) {
    case "home":
      return "/";
    case "puzzle":
      return `/${route.puzzleId}`;
    case "resource":
      return `/${route.puzzleId}/${encodeURIComponent(route.generationId)}`;
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
    : parseAppRoute(window.location.pathname);

export const shouldPreserveResourceAliasPath = (
  currentPathname: string,
  nextRoute: AppRoute,
) => {
  if (nextRoute.kind !== "resource") return false;
  const currentRoute = parseAppRoute(currentPathname);
  if (currentRoute.kind !== "resource" || currentRoute.puzzleId !== nextRoute.puzzleId) return false;

  const resolved = resolvePuzzleResourceSegment(
    currentRoute.puzzleId,
    currentRoute.generationId,
  );
  return (
    resolved.ok &&
    resolved.alias !== undefined &&
    resolved.canonicalResource.generationId === nextRoute.generationId
  );
};

const currentBrowserPath = () => window.location.pathname;

export const pushAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const nextPath = appRoutePath(route);
  if (currentBrowserPath() === nextPath && !window.location.hash) return;
  window.history.pushState(null, "", nextPath);
};

export const replaceAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const currentPath = currentBrowserPath();
  if (shouldPreserveResourceAliasPath(currentPath, route)) {
    if (window.location.hash) window.history.replaceState(null, "", currentPath);
    return;
  }
  const nextPath = appRoutePath(route);
  if (currentPath === nextPath && !window.location.hash) return;
  window.history.replaceState(null, "", nextPath);
};
