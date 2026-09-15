import type { PuzzleDifficulty } from "../catalog/types";
import type { AppView } from "../site/views";
import { viewFromHash } from "../site/views";

export const maxPuzzleSeedLength = 64;
const randomSeedByteLength = 12;

const encodeBase64UrlBytes = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const makeRequestId = () => Math.random().toString(36).slice(2);

export const makeRandomSeed = () => {
  const bytes = new Uint8Array(randomSeedByteLength);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return encodeBase64UrlBytes(bytes);
};

export const getActiveView = (): AppView => (typeof window === "undefined" ? "catalog" : viewFromHash(window.location.hash));

export const defaultPuzzleDifficulty: PuzzleDifficulty = "Medium";

export const pluralize = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;
