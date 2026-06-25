import type { ComponentChildren } from "preact";
import type { AppView } from "../site/views";

type AppShellProps = {
  activeView: AppView;
  children: ComponentChildren;
  onHomeSelect: () => void;
};

const viewLinks: { href: string; label: string; view?: AppView; external?: boolean }[] = [
  { href: "https://github.com/jaahay/puzzle-forge", label: "Source", external: true },
  { href: "#changelog", label: "Updates", view: "changelog" },
  { href: "#about", label: "About", view: "about" },
];

export const AppShell = ({ activeView, children, onHomeSelect }: AppShellProps) => (
  <main class="app-shell">
    <header class="app-header" aria-label="Puzzle Forge navigation">
      <button class="app-brand" type="button" aria-label="Puzzle Forge home" aria-current={activeView === "catalog" ? "page" : undefined} onClick={onHomeSelect}>
        <span class="app-brand-mark" aria-hidden="true">
          ◧
        </span>
        <span>Puzzle Forge</span>
      </button>

      <nav class="app-nav" aria-label="Puzzle Forge pages">
        {viewLinks.map((link) => (
          <a
            href={link.href}
            aria-current={link.view && activeView === link.view ? "page" : undefined}
            key={link.label}
            rel={link.external ? "noreferrer" : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>

    {children}
  </main>
);
