import type { ComponentChildren } from "preact";

type PuzzleWorkspaceLayoutProps = {
  className?: string;
  header?: ComponentChildren;
  status?: ComponentChildren;
  board?: ComponentChildren;
  gameplay?: ComponentChildren;
  generation?: ComponentChildren;
};

export const PuzzleWorkspaceLayout = ({
  className = "",
  header,
  status,
  board,
  gameplay,
  generation,
}: PuzzleWorkspaceLayoutProps) => (
  <section class={`workspace-panel puzzle-workspace-layout ${className}`.trim()} aria-label="Selected puzzle workspace">
    {header ? <header class="workspace-layout-header">{header}</header> : null}

    {status ? <section class="workspace-layout-status" aria-label="Puzzle status">{status}</section> : null}

    {board ? <section class="workspace-layout-board" aria-label="Puzzle board">{board}</section> : null}

    {gameplay ? <section class="workspace-layout-gameplay" aria-label="Gameplay controls">{gameplay}</section> : null}

    {generation ? <section class="workspace-layout-generation" aria-label="Generation controls">{generation}</section> : null}
  </section>
);
