import type { ComponentChildren } from "preact";
import type { AppView } from "../site/views";

type AppShellProps = {
  activeView: AppView;
  children: ComponentChildren;
  headerControls?: ComponentChildren;
  onHomeSelect: () => void;
  onViewSelect: (view: Exclude<AppView, "catalog">) => void;
};

export const AppShell = ({ activeView, children, headerControls, onHomeSelect, onViewSelect }: AppShellProps) => (
  <main class="app-shell">
    <header class="app-header" aria-label="Puzzle Forge navigation">
      <button class="app-brand" type="button" aria-label="Puzzle Forge home" aria-current={activeView === "catalog" ? "page" : undefined} onClick={onHomeSelect}>
        <span class="app-brand-mark" aria-hidden="true">
          ◧
        </span>
        <span>Puzzle Forge</span>
      </button>

      <div class="app-header-controls">{headerControls}</div>

      <nav class="app-nav" aria-label="Site links">
        <a href="https://github.com/jaahay/puzzle-forge">Source</a>
        <a
          href="/updates"
          aria-current={activeView === "changelog" ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            onViewSelect("changelog");
          }}
        >
          Updates
        </a>
        <a
          href="/about"
          aria-current={activeView === "about" ? "page" : undefined}
          onClick={(event) => {
            event.preventDefault();
            onViewSelect("about");
          }}
        >
          About
        </a>
      </nav>
    </header>

    {children}
  </main>
);
