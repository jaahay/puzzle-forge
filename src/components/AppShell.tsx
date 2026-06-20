import type { ComponentChildren } from "preact";
import type { AppView } from "../site/views";

type AppShellProps = {
  activeView: AppView;
  children: ComponentChildren;
};

const viewLinks: { href: `#${AppView}`; label: string; view: AppView }[] = [
  { href: "#changelog", label: "Updates", view: "changelog" },
  { href: "#about", label: "About", view: "about" },
];

export const AppShell = ({ activeView, children }: AppShellProps) => (
  <main class="app-shell">
    <header class="app-header" aria-label="Puzzle Workbench navigation">
      <a class="app-brand" href="#catalog" aria-current={activeView === "catalog" ? "page" : undefined}>
        <span class="app-brand-mark" aria-hidden="true">
          ◧
        </span>
        <span>Puzzle Workbench</span>
      </a>

      <nav class="app-nav" aria-label="Puzzle Workbench pages">
        {viewLinks.map((link) => (
          <a href={link.href} aria-current={activeView === link.view ? "page" : undefined} key={link.view}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>

    {children}
  </main>
);
