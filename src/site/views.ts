export type AppView = "catalog" | "changelog" | "about";

export const viewFromHash = (hash: string): AppView => {
  if (hash === "#changelog") {
    return "changelog";
  }

  if (hash === "#about") {
    return "about";
  }

  return "catalog";
};
