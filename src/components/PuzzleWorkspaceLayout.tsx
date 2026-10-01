import { createContext, type ComponentChildren, type JSX } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";

export type PuzzleWorkspaceDisplayMode = {
  isExpanded: boolean;
  enterExpanded: () => void;
};

const defaultDisplayMode: PuzzleWorkspaceDisplayMode = {
  isExpanded: false,
  enterExpanded: () => undefined,
};

const PuzzleWorkspaceDisplayModeContext = createContext<PuzzleWorkspaceDisplayMode>(defaultDisplayMode);

const ExpandWorkspaceIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 4H4v5" />
    <path d="m4 4 6 6" />
    <path d="M15 20h5v-5" />
    <path d="m20 20-6-6" />
  </svg>
);

const FullscreenIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 3H3v5" />
    <path d="M16 3h5v5" />
    <path d="M21 16v5h-5" />
    <path d="M3 16v5h5" />
  </svg>
);

const ExitFullscreenIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 3v5H3" />
    <path d="M16 3v5h5" />
    <path d="M21 16h-5v5" />
    <path d="M3 16h5v5" />
  </svg>
);

const ExitExpandedIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m7 7 10 10" />
    <path d="M17 7 7 17" />
  </svg>
);

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
    enterExpanded,
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
                <button
                  type="button"
                  onClick={() => void toggleBrowserFullscreen()}
                  aria-label={isBrowserFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  title={isBrowserFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isBrowserFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void exitExpanded()}
                aria-label="Exit expanded workspace"
                title="Exit expanded workspace"
              >
                <ExitExpandedIcon />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enterExpanded}
              aria-label="Expand workspace"
              title="Expand workspace"
            >
              <ExpandWorkspaceIcon />
            </button>
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
