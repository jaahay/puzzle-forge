export type ChangelogEntry = {
  date: string;
  label: string;
  title: string;
  body: string;
};

export const changelogEntries: ChangelogEntry[] = [
  {
    date: "2026-06-19",
    label: "June 19, 2026",
    title: "App shell polish",
    body:
      "Moved Puzzle Forge into a compact top bar, simplified the first-run puzzle picker, and grouped games into ready, preview, and coming-soon states.",
  },
  {
    date: "2026-06-16",
    label: "June 16, 2026",
    title: "Catalog shell hardening",
    body:
      "Added document metadata, a generated favicon, footer links, and an updates surface so the project explains itself outside the puzzle workspace.",
  },
  {
    date: "2026-06-14",
    label: "June 14, 2026",
    title: "Playable puzzle interactions",
    body:
      "Refined the catalog into a multi-puzzle destination with typed grid inputs, seeded generation, solitaire card moves, peg jumps, answer checks, and worker-backed puzzle generation.",
  },
];
