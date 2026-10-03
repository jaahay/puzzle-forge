import type { PuzzleId } from "../catalog/types";
import { getLocalDateStamp } from "../games/shared/daily";
import {
  makeDailyResourceLocatorPath,
  resolveDailyResource,
} from "./dailyResource";
import {
  decodeGenerationId,
  resolvePuzzleResourceSegment,
} from "./puzzleResourceIdentity";
import { puzzleIds } from "./sessionConstants";

export type AppRoute =
  | { kind: "home" }
  | { kind: "puzzle"; puzzleId: PuzzleId }
  | { kind: "resource"; puzzleId: PuzzleId; generationId: string }
  | { kind: "updates" }
  | { kind: "about" }
  | { kind: "not-found"; pathname: string };

const puzzleIdSet = new Set<string>(puzzleIds);

const splitPath = (pathname: string) => {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  return {
    normalizedPath,
    segments: normalizedPath.slice(1).split("/").filter(Boolean),
  };
};

export const parseAppRoute = (
  pathname: string,
  search?: string,
  todayDateStamp = getLocalDateStamp(),
): AppRoute => {
  const { normalizedPath, segments } = splitPath(pathname);
  const activeSearch = search ?? (typeof window === "undefined" ? "" : window.location.search);

  if (normalizedPath === "/") return { kind: "home" };
  if (normalizedPath === "/updates") return { kind: "updates" };
  if (normalizedPath === "/about") return { kind: "about" };

  if (segments.length === 1 && puzzleIdSet.has(segments[0])) {
    return { kind: "puzzle", puzzleId: segments[0] as PuzzleId };
  }

  if (segments.length >= 2 && puzzleIdSet.has(segments[0])) {
    const puzzleId = segments[0] as PuzzleId;

    if (segments.length === 2 && segments[1] === "today") {
      const resolved = resolveDailyResource(puzzleId, todayDateStamp, activeSearch);
      return resolved.ok
        ? { kind: "resource", ...resolved.canonicalResource }
        : { kind: "not-found", pathname: normalizedPath };
    }

    if (segments.length === 3 && segments[1] === "daily") {
      const resolved = resolveDailyResource(puzzleId, segments[2], activeSearch);
      return resolved.ok
        ? { kind: "resource", ...resolved.canonicalResource }
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
    case "updates":
      return "/updates";
    case "about":
      return "/about";
    case "not-found":
      return route.pathname;
  }
};

const preferredBrowserPath = (route: AppRoute) => {
  if (route.kind !== "resource") return appRoutePath(route);
  const decoded = decodeGenerationId(route.puzzleId, route.generationId);
  if (!decoded.ok) return appRoutePath(route);
  return makeDailyResourceLocatorPath(decoded.identity) ?? appRoutePath(route);
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
  const { segments } = splitPath(currentPathname);
  if (segments.length < 2 || !puzzleIdSet.has(segments[0]) || segments[0] !== nextRoute.puzzleId) return false;

  if (segments.length === 2 && segments[1] === "today") return false;

  if (segments.length === 3 && segments[1] === "daily") {
    const resolved = resolveDailyResource(nextRoute.puzzleId, segments[2], currentSearch);
    if (!resolved.ok || resolved.canonicalResource.generationId !== nextRoute.generationId) return false;
    const canonicalLocator = makeDailyResourceLocatorPath(resolved.identity);
    return canonicalLocator === `${currentPathname}${currentSearch}`;
  }

  if (segments.length === 2 && currentSearch === "") {
    const resolved = resolvePuzzleResourceSegment(nextRoute.puzzleId, decodeURIComponent(segments[1]));
    return (
      resolved.ok &&
      resolved.alias !== undefined &&
      resolved.canonicalResource.generationId === nextRoute.generationId
    );
  }

  return false;
};

const currentBrowserUrl = () => `${window.location.pathname}${window.location.search}`;

export const pushAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const nextPath = preferredBrowserPath(route);
  if (currentBrowserUrl() === nextPath && !window.location.hash) return;
  window.history.pushState(null, "", nextPath);
};

export const replaceAppRoute = (route: AppRoute) => {
  if (typeof window === "undefined") return;
  const currentPath = window.location.pathname;
  const currentSearch = window.location.search;
  const currentUrl = `${currentPath}${currentSearch}`;
  const canonicalPath = appRoutePath(route);

  if (currentUrl === canonicalPath && !window.location.hash) return;
  if (shouldPreserveResourceLocatorPath(currentPath, currentSearch, route)) {
    if (window.location.hash) window.history.replaceState(null, "", currentUrl);
    return;
  }

  const nextPath = preferredBrowserPath(route);
  if (currentUrl === nextPath && !window.location.hash) return;
  window.history.replaceState(null, "", nextPath);
};
