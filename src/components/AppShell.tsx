import type { ComponentChildren } from "preact";
import type { AppView } from "../site/views";

type AppShellProps = {
  activeView: AppView;
  children: ComponentChildren;
  headerControls?: ComponentChildren;
  onHomeSelect: () => void;
};

export const AppShell = ({ activeView, children, headerControls, onHomeSelect }: AppShellProps) => (
  <main class="app-shell">
    <header class="app-header" aria-label="Puzzle Forge navigation">
      <button class="app-brand" type="button" aria-label="Puzzle Forge home" aria-current={activeView === "catalog" ? "page" : undefined} onClick={onHomeSelect}>
        <span class="app-brand-mark" aria-hidden="true">
          ◧
        </span>
        <span>Puzzle Forge</span>
      </button>

      {headerControls}
    </header>

    {children}
  </main>
);
