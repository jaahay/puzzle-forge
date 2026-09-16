import type { PuzzleId } from "../catalog/types";
import {
  canonicalizeDailyResourceQuery,
  isDailyResourceDate,
  resolveDailyResource,
} from "./dailyResource";
import { resolvePuzzleResourceSegment } from "./puzzleResourceIdentity";
import { puzzleIds } from "./sessionConstants";

export type AppRoute =
  | { kind: "home" }
  | { kind: "puzzle"; puzzleId: PuzzleId }
  | { kind: "resource"; puzzleId: PuzzleId; generationId: string }
  | { kind: "daily"; puzzleId: PuzzleId; dateStamp: string; query: string }
  | { kind: "today"; puzzleId: PuzzleId; query: string }
  | { kind: "updates" }
  | { kind: "about" }
  | { kind: "not-found"; pathname: string };

const puzzleIdSet = new Set<string>(puzzleIds);
const withQuery = (pathname: string, query: string) => query ? `${pathname}?${query}` : pathname;

export const parseAppRoute = (pathname: string, search = ""): AppRoute => {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/") return { kind: "home" };
  if (normalizedPath === "/updates") return { kind: "updates" };
  if (normalizedPath === "/about") return { kind: "about" };

  const segments = normalizedPath.slice(1).split("/").filter(Boolean);
  if (segments.length === 1 && puzzleIdSet.has(segments[0])) {
    return { kind: "puzzle", puzzleId: segments[0] as PuzzleId };
  }

  if (segments.length >= 2 && puzzleIdSet.has(segments[0])) {
    const puzzleId = segments[0] as PuzzleId;

    if (segments.length === 2 && segments[1] === "today") {
      const parsedQuery = canonicalizeDailyResourceQuery(puzzleId, search);
      return parsedQuery.ok
        ? { kind: "today", puzzleId, query: parsedQuery.query }
        : { kind: "not-found", pathname: normalizedPath };
    }

    if (segments.length === 3 && segments[1] === "daily" && isDailyResourceDate(segments[2])) {
      const parsedQuery = canonicalizeDailyResourceQuery(puzzleId, search);
      return parsedQuery.ok
        ? { kind: "daily", puzzleId, dateStamp: segments[2], query: parsedQuery.query }
        : { kind: "not-found", pathname: normalizedPath };
    }

    if (segments.length === 2 && segments[1] === "daily") {
      return { kind: "not-found", pathname: normalizedPath };
    }

    if (segments.length === 2 && segments[1]) {
      return {
        kind: "resource",
        puzzleId,
        generationId: decodeURIComponent(segments[1]),
      };
    }
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
    case "daily":
      return withQuery(`/${route.puzzleId}/daily/${route.dateStamp}`, route.query);
    case "today":
      return withQuery(`/${route.puzzleId}/today`, route.query);
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

export const shouldPreserveResourceLocatorPath = (
  currentPathname: string,
  currentSearch: string,
  nextRoute: AppRoute,
) => {
  if (nextRoute.kind !== "resource") return false;
  const currentRoute = parseAppRoute(currentPathname, currentSearch);
  if (currentRoute.puzzleId !== nextRoute.puzzleId) return false;

  if (currentRoute.kind === "resource") {
    if (currentSearch) return false;
    const resolved = resolvePuzzleResourceSegment(
      currentRoute.puzzleId,
      currentRoute.generationId,
    );
    return (
      resolved.ok &&
      resolved.alias !== undefined &&
      resolved.canonicalResource.generationId === nextRoute.generationId
    );
  }

  if (currentRoute.kind === "daily") {
    const resolved = resolveDailyResource(
      currentRoute.puzzleId,
      currentRoute.dateStamp,
      currentRoute.query,
    );
    return resolved.ok && resolved.canonicalResource.generationId === nextRoute.generationId;
  }

  return false;
};

const currentBrowserUrl = () => `${window.location.pathname}${window.location.search}`;

export const pushAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const nextPath = appRoutePath(route);
  if (currentBrowserUrl() === nextPath && !window.location.hash) return;
  window.history.pushState(null, "", nextPath);
};

export const replaceAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const currentUrl = `${currentPath}${currentSearch}`;
  if (shouldPreserveResourceLocatorPath(currentPath, currentSearch, route)) {
    if (window.location.hash) window.history.replaceState(null, "", currentUrl);
    return;
  }
  const nextPath = appRoutePath(route);
  if (currentUrl === nextPath && !window.location.hash) return;
  window.history.replaceState(null, "", nextPath);
};
