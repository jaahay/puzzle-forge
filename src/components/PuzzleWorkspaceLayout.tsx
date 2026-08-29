import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

type PuzzleWorkspaceLayoutProps = {
  className?: string;
  header?: ComponentChildren;
  status?: ComponentChildren;
  board?: ComponentChildren;
  gameplay?: ComponentChildren;
  help?: ComponentChildren;
  generation?: ComponentChildren;
  enableImmersive?: boolean;
};

export const PuzzleWorkspaceLayout = ({
  className = "",
  header,
  status,
  board,
  gameplay,
  help,
  generation,
  enableImmersive = false,
}: PuzzleWorkspaceLayoutProps) => {
  const workspaceRef = useRef<HTMLElement>(null);
  const [isImmersive, setIsImmersive] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const fullscreenAvailable = typeof document !== "undefined" && document.fullscreenEnabled;

  useEffect(() => {
    if (!enableImmersive || typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(document.fullscreenElement === workspaceRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [enableImmersive]);

  useEffect(() => {
    if (!isImmersive || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.fullscreenElement) return;
      setIsImmersive(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImmersive]);

  const exitImmersive = async () => {
    if (typeof document !== "undefined" && document.fullscreenElement === workspaceRef.current) {
      await document.exitFullscreen();
    }
    setIsImmersive(false);
  };

  const toggleBrowserFullscreen = async () => {
    const workspace = workspaceRef.current;
    if (!workspace || typeof document === "undefined") return;

    if (document.fullscreenElement === workspace) {
      await document.exitFullscreen();
      return;
    }

    setIsImmersive(true);
    await workspace.requestFullscreen();
  };

  const modeClass = `${isImmersive ? "is-immersive" : ""} ${isBrowserFullscreen ? "is-browser-fullscreen" : ""}`;

  return (
    <section
      class={`workspace-panel puzzle-workspace-layout ${className} ${modeClass}`.trim()}
      aria-label="Selected puzzle workspace"
      ref={workspaceRef}
    >
      {enableImmersive ? (
        <div class="puzzle-workspace-display-tools" aria-label="Puzzle display controls">
          {isImmersive ? (
            <>
              {fullscreenAvailable ? (
                <button type="button" onClick={() => void toggleBrowserFullscreen()}>
                  {isBrowserFullscreen ? "Exit fullscreen" : "Fullscreen"}
                </button>
              ) : null}
              <button type="button" onClick={() => void exitImmersive()}>Exit immersive</button>
            </>
          ) : (
            <button type="button" onClick={() => setIsImmersive(true)}>Immersive</button>
          )}
        </div>
      ) : null}

      {header ? <header class="workspace-layout-header">{header}</header> : null}

      {status ? <section class="workspace-layout-status" aria-label="Puzzle status">{status}</section> : null}

      {board ? <section class="workspace-layout-board" aria-label="Puzzle board">{board}</section> : null}

      {gameplay ? <section class="workspace-layout-gameplay" aria-label="Gameplay controls">{gameplay}</section> : null}

      {help ? <section class="workspace-layout-help" aria-label="Puzzle help">{help}</section> : null}

      {generation ? <section class="workspace-layout-generation" aria-label="Generation controls">{generation}</section> : null}
    </section>
  );
};
