import type { ComponentChildren } from "preact";

type AppShellProps = {
  children: ComponentChildren;
};

export const AppShell = ({ children }: AppShellProps) => (
  <main class="app-shell">
    <section class="hero-panel">
      <p class="eyebrow">puzzles catalog</p>
      <h1>One home for Sudoku, Solitaire, Nonogram, Word Guess, and whatever comes next.</h1>
      <p class="hero-copy">
        Browse the catalog, pick a puzzle family, and generate deterministic boards and deals in a Web Worker so the
        interface stays responsive.
      </p>
    </section>

    {children}
  </main>
);
