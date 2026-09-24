import { describe, expect, it } from "vitest";
import type { NextPuzzleDraft } from "../app/generationSettings";
import { applyNextPuzzleDraftSettings } from "../app/useNextPuzzleDrafts";
import { defaultJigsawImageAsset, jigsawImageAssets } from "../games/jigsaw/imageAssets";
import {
  getJigsawGridAdaptation,
  getJigsawSizePresetForDimensions,
  jigsawCustomSizeSelection,
  resolveJigsawSizeDimensions,
} from "../games/jigsaw/size";
import { defaultSolitaireVariation } from "../games/solitaire/variation";
import { makeJigsawImageSelectionSettings } from "./JigsawNewPuzzleControl";

const makeJigsawDraft = (overrides: Partial<NextPuzzleDraft> = {}): NextPuzzleDraft => ({
  width: 8,
  height: 8,
  difficulty: "Medium",
  requireUniqueSolution: true,
  sudokuVariation: "classic",
  solitaireVariation: defaultSolitaireVariation,
  imageId: defaultJigsawImageAsset.id,
  jigsawSizeSelection: jigsawCustomSizeSelection,
  ...overrides,
});

describe("Jigsaw image library", () => {
  it("preserves explicit custom dimensions across image changes", () => {
    expect(makeJigsawImageSelectionSettings(defaultJigsawImageAsset, jigsawCustomSizeSelection)).toEqual({
      imageId: defaultJigsawImageAsset.id,
    });
  });

  it("carries an active size preset across image changes with aspect-aware dimensions", () => {
    const portrait = jigsawImageAssets.find((asset) => asset.id === "snowy-gorge");
    expect(portrait).toBeDefined();

    expect(makeJigsawImageSelectionSettings(portrait!, "Extra large")).toEqual({
      imageId: "snowy-gorge",
      width: 6,
      height: 17,
    });
  });

  it("keeps manual Custom intent when its dimensions happen to equal a named preset", () => {
    const snowyGorge = jigsawImageAssets.find((asset) => asset.id === "snowy-gorge");
    expect(snowyGorge).toBeDefined();
    expect(getJigsawSizePresetForDimensions(snowyGorge!, 6, 17)).toBe("Extra large");

    const customDraft = makeJigsawDraft({
      width: 6,
      height: 17,
      imageId: snowyGorge!.id,
      jigsawSizeSelection: jigsawCustomSizeSelection,
    });
    const changedArtwork = applyNextPuzzleDraftSettings(
      customDraft,
      makeJigsawImageSelectionSettings(defaultJigsawImageAsset, customDraft.jigsawSizeSelection!),
    );

    expect(changedArtwork).toMatchObject({
      imageId: defaultJigsawImageAsset.id,
      width: 6,
      height: 17,
      jigsawSizeSelection: "Custom",
    });
  });

  it("keeps Adapt grid in Custom mode even when the result equals a named preset", () => {
    const snowyGorge = jigsawImageAssets.find((asset) => asset.id === "snowy-gorge");
    expect(snowyGorge).toBeDefined();
    const adaptation = getJigsawGridAdaptation(snowyGorge!, 10, 10);
    expect(adaptation).toEqual({ width: 6, height: 17, pieceCount: 102 });
    expect(getJigsawSizePresetForDimensions(snowyGorge!, 6, 17)).toBe("Extra large");

    const adaptedDraft = applyNextPuzzleDraftSettings(
      makeJigsawDraft({
        width: 10,
        height: 10,
        imageId: snowyGorge!.id,
        jigsawSizeSelection: jigsawCustomSizeSelection,
      }),
      {
        width: adaptation!.width,
        height: adaptation!.height,
        jigsawSizeSelection: jigsawCustomSizeSelection,
      },
    );

    expect(adaptedDraft).toMatchObject({
      width: 6,
      height: 17,
      jigsawSizeSelection: "Custom",
    });
  });

  it("continues to adapt named size presets when artwork changes", () => {
    const snowyGorge = jigsawImageAssets.find((asset) => asset.id === "snowy-gorge");
    expect(snowyGorge).toBeDefined();
    const initial = resolveJigsawSizeDimensions(defaultJigsawImageAsset, "Extra large");
    const presetDraft = makeJigsawDraft({
      width: initial.width,
      height: initial.height,
      jigsawSizeSelection: "Extra large",
    });

    const changedArtwork = applyNextPuzzleDraftSettings(
      presetDraft,
      makeJigsawImageSelectionSettings(snowyGorge!, presetDraft.jigsawSizeSelection!),
    );

    expect(changedArtwork).toMatchObject({
      imageId: "snowy-gorge",
      width: 6,
      height: 17,
      jigsawSizeSelection: "Extra large",
    });
  });

  it("exposes the twelve bundled images with unique ids and same-origin derivatives", () => {
    const imageIds = jigsawImageAssets.map((asset) => asset.id);

    expect(jigsawImageAssets).toHaveLength(12);
    expect(new Set(imageIds).size).toBe(imageIds.length);
    expect(
      jigsawImageAssets.every(
        (asset) =>
          asset.files.puzzle === `/jigsaw/${asset.id}/puzzle.webp` &&
          asset.files.preview === `/jigsaw/${asset.id}/preview.webp` &&
          asset.files.thumbnail === `/jigsaw/${asset.id}/thumbnail.webp`,
      ),
    ).toBe(true);
    expect(jigsawImageAssets.every((asset) => asset.credit.sourceRecordUrl?.startsWith("https://www.metmuseum.org/"))).toBe(true);
  });
});
