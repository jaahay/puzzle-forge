import type { PuzzleResourceKey } from "./puzzleResourceIdentity";

export const persistedPuzzleSessionLimit = 8;

const persistenceMetadataStorageKey = "puzzle-forge.sessions";
const persistenceSessionStorageKeyPrefix = "puzzle-forge.session.";

type PersistedPuzzleSessionMetadata = {
  activeResourceKey: PuzzleResourceKey;
  savedResourceKeys: PuzzleResourceKey[];
  updatedAt: string;
};

type PersistedSessionRecency = {
  resourceKey: PuzzleResourceKey;
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const sessionStorageKey = (resourceKey: PuzzleResourceKey) =>
  `${persistenceSessionStorageKeyPrefix}${resourceKey}`;

const readPersistedMetadata = (): PersistedPuzzleSessionMetadata | null => {
  if (typeof window === "undefined") return null;
  const rawMetadata = window.localStorage.getItem(persistenceMetadataStorageKey);
  if (!rawMetadata) return null;

  try {
    const metadata: unknown = JSON.parse(rawMetadata);
    if (
      !isRecord(metadata) ||
      typeof metadata.activeResourceKey !== "string" ||
      !Array.isArray(metadata.savedResourceKeys) ||
      !metadata.savedResourceKeys.every((resourceKey) => typeof resourceKey === "string") ||
      typeof metadata.updatedAt !== "string"
    ) return null;

    return {
      activeResourceKey: metadata.activeResourceKey as PuzzleResourceKey,
      savedResourceKeys: metadata.savedResourceKeys as PuzzleResourceKey[],
      updatedAt: metadata.updatedAt,
    };
  } catch {
    return null;
  }
};

const readPersistedSessionRecency = (resourceKey: PuzzleResourceKey): PersistedSessionRecency | null => {
  const rawSession = window.localStorage.getItem(sessionStorageKey(resourceKey));
  if (!rawSession) return null;

  try {
    const session: unknown = JSON.parse(rawSession);
    if (!isRecord(session) || typeof session.updatedAt !== "string") return null;
    return { resourceKey, updatedAt: session.updatedAt };
  } catch {
    return null;
  }
};

const compareSessionRecency = (left: PersistedSessionRecency, right: PersistedSessionRecency) => {
  const updatedAtOrder = right.updatedAt.localeCompare(left.updatedAt);
  return updatedAtOrder !== 0 ? updatedAtOrder : left.resourceKey.localeCompare(right.resourceKey);
};

const selectRetainedResourceKeys = (
  savedResourceKeys: PuzzleResourceKey[],
  protectedResourceKeys: PuzzleResourceKey[],
  limit: number,
) => {
  const candidates = [...new Set(savedResourceKeys)]
    .map(readPersistedSessionRecency)
    .filter((candidate): candidate is PersistedSessionRecency => candidate !== null);
  const candidatesByKey = new Map(candidates.map((candidate) => [candidate.resourceKey, candidate] as const));
  const protectedCandidates = [...new Set(protectedResourceKeys)]
    .map((resourceKey) => candidatesByKey.get(resourceKey))
    .filter((candidate): candidate is PersistedSessionRecency => candidate !== undefined);
  const protectedKeySet = new Set(protectedCandidates.map(({ resourceKey }) => resourceKey));
  const remainingCandidates = candidates
    .filter(({ resourceKey }) => !protectedKeySet.has(resourceKey))
    .sort(compareSessionRecency);
  const remainingSlots = Math.max(0, limit - protectedCandidates.length);

  return [
    ...protectedCandidates,
    ...remainingCandidates.slice(0, remainingSlots),
  ].map(({ resourceKey }) => resourceKey);
};

const removeUnretainedSessionPayloads = (
  savedResourceKeys: PuzzleResourceKey[],
  retainedResourceKeys: PuzzleResourceKey[],
) => {
  const retained = new Set(retainedResourceKeys);
  for (const resourceKey of new Set(savedResourceKeys)) {
    if (!retained.has(resourceKey)) {
      window.localStorage.removeItem(sessionStorageKey(resourceKey));
    }
  }
};

export const preparePuzzleSessionRetention = (nextActiveResourceKey: PuzzleResourceKey) => {
  if (typeof window === "undefined") return;
  const metadata = readPersistedMetadata();
  if (!metadata) return;

  const nextActiveAlreadyPersisted =
    metadata.savedResourceKeys.includes(nextActiveResourceKey) &&
    readPersistedSessionRecency(nextActiveResourceKey) !== null;
  const existingSessionLimit = Math.max(0, persistedPuzzleSessionLimit - (nextActiveAlreadyPersisted ? 0 : 1));
  const retainedResourceKeys = selectRetainedResourceKeys(
    metadata.savedResourceKeys,
    [metadata.activeResourceKey, nextActiveResourceKey],
    existingSessionLimit,
  );

  // Pre-prune payloads to leave room for the pending active save. Metadata is
  // intentionally left untouched until that save succeeds, so a storage error
  // can still fall back to the previously active persisted session.
  removeUnretainedSessionPayloads(metadata.savedResourceKeys, retainedResourceKeys);
};

export const finalizePuzzleSessionRetention = (activeResourceKey: PuzzleResourceKey) => {
  if (typeof window === "undefined") return;
  const metadata = readPersistedMetadata();
  if (!metadata || readPersistedSessionRecency(activeResourceKey) === null) return;

  const retainedResourceKeys = selectRetainedResourceKeys(
    metadata.savedResourceKeys,
    [activeResourceKey],
    persistedPuzzleSessionLimit,
  );
  removeUnretainedSessionPayloads(metadata.savedResourceKeys, retainedResourceKeys);

  window.localStorage.setItem(persistenceMetadataStorageKey, JSON.stringify({
    ...metadata,
    activeResourceKey,
    savedResourceKeys: retainedResourceKeys,
  } satisfies PersistedPuzzleSessionMetadata));
};
