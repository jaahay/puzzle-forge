import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultJigsawPlayerPreferences,
  loadJigsawPlayerPreferences,
  saveJigsawPlayerPreferences,
} from "./playerPreferences";

afterEach(() => vi.unstubAllGlobals());

describe("Jigsaw player preferences", () => {
  const stubStorage = (value: string | null = null) => {
    const entries = new Map<string, string>();
    if (value !== null) entries.set("puzzle-forge.jigsaw-player-preferences", value);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => entries.get(key) ?? null,
        setItem: (key: string, data: string) => { entries.set(key, data); },
      },
    });
    return entries;
  };

  it("keeps sensible defaults without storage and tolerates malformed data", () => {
    vi.stubGlobal("window", undefined);
    expect(loadJigsawPlayerPreferences()).toEqual(defaultJigsawPlayerPreferences);
    stubStorage("{invalid");
    expect(loadJigsawPlayerPreferences()).toEqual(defaultJigsawPlayerPreferences);
    stubStorage('{"snapToFrame":"yes","showEdgeSeams":true,"showPreview":0}');
    expect(loadJigsawPlayerPreferences()).toEqual({
      showPreview: false, showEdgeSeams: true, snapToFrame: false,
    });
  });

  it("retains every visual/assistance toggle across puzzle instances and reloads", () => {
    stubStorage();
    const settings = { showPreview: true, showEdgeSeams: true, snapToFrame: true };
    saveJigsawPlayerPreferences(settings);
    expect(loadJigsawPlayerPreferences()).toEqual(settings);
    saveJigsawPlayerPreferences({ ...settings, snapToFrame: false });
    expect(loadJigsawPlayerPreferences()).toEqual({ ...settings, snapToFrame: false });
  });

  it("remains usable when storage is inaccessible", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => { throw new Error("denied"); },
        setItem: () => { throw new Error("denied"); },
      },
    });
    expect(loadJigsawPlayerPreferences()).toEqual(defaultJigsawPlayerPreferences);
    expect(() => saveJigsawPlayerPreferences(defaultJigsawPlayerPreferences)).not.toThrow();
  });
});
