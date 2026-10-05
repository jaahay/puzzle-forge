export const normalizeWordGuessNativeInput = (
  value: string,
  maxLength: number,
) =>
  value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, Math.max(0, maxLength));
