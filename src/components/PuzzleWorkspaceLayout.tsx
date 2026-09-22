import { createContext, type ComponentChildren, type JSX } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";

export type PuzzleWorkspaceDisplayMode = {
  isExpanded: boolean;
  isBrowserFullscreen: boolean;
  fullscreenAvailable: boolean;
  enterExpanded: () => void;
  exitExpanded: () => Promise<void>;
  toggleBrowserFullscreen: () => Promise<void>;
};

const defaultDisplayMode: PuzzleWorkspaceDisplayMode = {
  isExpanded: false,
  isBrowserFullscreen: false,
  fullscreenAvailable: false,
  enterExpanded: () => undefined,
  exitExpanded: async () => undefined,
  toggleBrowserFullscreen: async () => undefined,
};

const PuzzleWorkspaceDisplayModeContext = createContext<PuzzleWorkspaceDisplayMode>(defaultDisplayMode);

export const usePuzzleWorkspaceDisplayMode = () => useContext(PuzzleWorkspaceDisplayModeContext);

type PuzzleWorkspaceLayoutProps = {
  className?: string;
  header?: ComponentChildren;
  crown?: ComponentChildren;
  status?: ComponentChildren;
  play?: ComponentChildren;
  board?: ComponentChildren;
  gameplay?: ComponentChildren;
  help?: ComponentChildren;
  generation?: ComponentChildren;
  enableImmersive?: boolean;
  immersiveEntry?: "workspace" | "descendant";
  playColumnMax?: number;
};

export const PuzzleWorkspaceLayout = ({
  className = "",
  header,
  crown,
  status,
  play,
  board,
  gameplay,
  help,
  generation,
  enableImmersive = false,
  immersiveEntry = "workspace",
  playColumnMax,
}: PuzzleWorkspaceLayoutProps) => {
  const workspaceRef = useRef<HTMLElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const fullscreenAvailable = typeof document !== "undefined" && document.fullscreenEnabled;
  const workspaceStyle = playColumnMax
    ? ({ "--play-column-max": `${playColumnMax}px` } as JSX.CSSProperties)
    : undefined;

  useEffect(() => {
    if (!enableImmersive || typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(document.fullscreenElement === workspaceRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [enableImmersive]);

  useEffect(() => {
    if (!isExpanded || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.fullscreenElement) return;
      setIsExpanded(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  const exitExpanded = async () => {
    if (typeof document !== "undefined" && document.fullscreenElement === workspaceRef.current) {
      await document.exitFullscreen();
    }
    setIsExpanded(false);
  };

  const enterExpanded = () => setIsExpanded(true);

  const toggleBrowserFullscreen = async () => {
    const workspace = workspaceRef.current;
    if (!workspace || typeof document === "undefined") return;

    if (document.fullscreenElement === workspace) {
      await document.exitFullscreen();
      return;
    }

    setIsExpanded(true);
    await workspace.requestFullscreen();
  };

  const modeClass = `${isExpanded ? "is-immersive" : ""} ${isBrowserFullscreen ? "is-browser-fullscreen" : ""}`;
  const displayMode: PuzzleWorkspaceDisplayMode = {
    isExpanded,
    isBrowserFullscreen,
    fullscreenAvailable,
    enterExpanded,
    exitExpanded,
    toggleBrowserFullscreen,
  };

  return (
    <PuzzleWorkspaceDisplayModeContext.Provider value={displayMode}>
      <section
      class={`workspace-panel puzzle-workspace-layout ${className} ${modeClass}`.trim()}
      aria-label="Selected puzzle workspace"
      ref={workspaceRef}
      style={workspaceStyle}
    >
      {enableImmersive && (isExpanded || immersiveEntry === "workspace") ? (
        <div class="puzzle-workspace-display-tools" aria-label="Puzzle display controls">
          {isExpanded ? (
            <>
              {fullscreenAvailable ? (
                <button type="button" onClick={() => void toggleBrowserFullscreen()}>
                  {isBrowserFullscreen ? "Exit fullscreen" : "Fullscreen"}
                </button>
              ) : null}
              <button type="button" onClick={() => void exitExpanded()}>Exit expanded</button>
            </>
          ) : (
            <button type="button" onClick={enterExpanded}>Expand workspace</button>
          )}
        </div>
      ) : null}

      {header ? <header class="workspace-layout-header">{header}</header> : null}

      {status ? <section class="workspace-layout-status" aria-label="Puzzle status">{status}</section> : null}

      {crown || play || board ? (
        <div class={`workspace-layout-play-surface${crown ? " has-crown" : ""}`}>
          {crown ? <header class="workspace-layout-header workspace-layout-crown">{crown}</header> : null}
          {play ?? (board ? <section class="workspace-layout-board" aria-label="Puzzle board">{board}</section> : null)}
        </div>
      ) : null}

      {!play && gameplay ? <section class="workspace-layout-gameplay" aria-label="Gameplay controls">{gameplay}</section> : null}

      {help ? <section class="workspace-layout-help" aria-label="Puzzle help">{help}</section> : null}

      {generation ? <section class="workspace-layout-generation" aria-label="Generation controls">{generation}</section> : null}
      </section>
    </PuzzleWorkspaceDisplayModeContext.Provider>
  );
};
