export type ChangelogEntry = {
  date: string;
  label: string;
  title: string;
  body: string;
};

export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-06-16",
    label: "June 16, 2026",
    title: "Catalog shell hardening",
    body:
      "Added richer document metadata, a whimsical generated favicon, persistent footer links, and a concise changelog surface so the project explains itself outside the puzzle workspace.",
  },
  {
    date: "2026-06-14",
    label: "June 14, 2026",
    title: "Playable puzzle interactions",
    body:
      "Refined the catalog into a multi-puzzle destination with typed grid inputs, seeded generation, solitaire card moves, peg jumps, answer checks, and worker-backed puzzle generation.",
  },
];
