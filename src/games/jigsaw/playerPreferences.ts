export type JigsawPlayerPreferences = {
  showPreview: boolean;
  showEdgeSeams: boolean;
  snapToFrame: boolean;
};

const storageKey = "puzzle-forge.jigsaw-player-preferences";

export const defaultJigsawPlayerPreferences: JigsawPlayerPreferences = {
  showPreview: false,
  showEdgeSeams: false,
  snapToFrame: false,
};

export const loadJigsawPlayerPreferences = (): JigsawPlayerPreferences => {
  if (typeof window === "undefined") return { ...defaultJigsawPlayerPreferences };
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { ...defaultJigsawPlayerPreferences };
    const stored: unknown = JSON.parse(raw);
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      return { ...defaultJigsawPlayerPreferences };
    }
    const values = stored as Record<string, unknown>;
    return {
      showPreview: typeof values.showPreview === "boolean" ? values.showPreview : false,
      showEdgeSeams: typeof values.showEdgeSeams === "boolean" ? values.showEdgeSeams : false,
      snapToFrame: typeof values.snapToFrame === "boolean" ? values.snapToFrame : false,
    };
  } catch {
    return { ...defaultJigsawPlayerPreferences };
  }
};

export const saveJigsawPlayerPreferences = (preferences: JigsawPlayerPreferences): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // Gameplay stays available when browser storage is blocked or full.
  }
};
