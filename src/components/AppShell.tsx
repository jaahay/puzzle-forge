import type { ComponentChildren } from "preact";
import type { AppView } from "../site/views";

type AppShellProps = {
  activeView: AppView;
  children: ComponentChildren;
};

const viewLinks: { href: `#${AppView}`; label: string; view: AppView }[] = [
  { href: "#catalog", label: "Catalog", view: "catalog" },
  { href: "#changelog", label: "Changelog", view: "changelog" },
  { href: "#about", label: "About", view: "about" },
];

export const AppShell = ({ activeView, children }: AppShellProps) => (
  <main class="app-shell">
    <section class="hero-panel">
      <p class="eyebrow">puzzles catalog</p>
      <h1>One home for Sudoku, Solitaire, Nonogram, Word Guess, and whatever comes next.</h1>
      <p class="hero-copy">
        Browse the catalog, inspect product notes, and generate deterministic boards and deals in a Web Worker so the
        interface stays responsive.
      </p>

      <nav class="app-tabs" aria-label="Puzzle Forge views">
        {viewLinks.map((link) => (
          <a href={link.href} aria-current={activeView === link.view ? "page" : undefined} key={link.view}>
            {link.label}
          </a>
        ))}
      </nav>
    </section>

    {children}
  </main>
);
