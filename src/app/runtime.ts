import type { PuzzleDifficulty } from "../catalog/types";
import type { AppView } from "../site/views";
import { viewFromHash } from "../site/views";

export const makeRequestId = () => Math.random().toString(36).slice(2);

export const makeRandomSeed = () => `random-${Date.now().toString(36)}-${makeRequestId().slice(0, 6)}`;

export const getActiveView = (): AppView => (typeof window === "undefined" ? "catalog" : viewFromHash(window.location.hash));

export const defaultSudokuDifficulty: PuzzleDifficulty = "Medium";

export const pluralize = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
