import { createContext, type ComponentChildren, type JSX } from "preact";
import { useContext, useEffect, useRef, useState } from "preact/hooks";
import { isPuzzleModalOpen } from "../interactions/keyboardOwnership";

export type PuzzleWorkspaceDisplayMode = {
  isExpanded: boolean;
  isBrowserFullscreen: boolean;
  fullscreenAvailable: boolean;
  transitionPending: boolean;
  toggleBrowserFullscreen: () => Promise<void>;
  toggleExpanded: () => Promise<void>;
};

const defaultDisplayMode: PuzzleWorkspaceDisplayMode = {
  isExpanded: false,
  isBrowserFullscreen: false,
  fullscreenAvailable: false,
  transitionPending: false,
  toggleBrowserFullscreen: async () => undefined,
  toggleExpanded: async () => undefined,
};

const PuzzleWorkspaceDisplayModeContext = createContext<PuzzleWorkspaceDisplayMode | null>(null);

// Inspect the actual browser owner, rather than optimistically toggling local
// state. Never exit fullscreen belonging to another element.
export const attemptWorkspaceFullscreen = async (
  workspace: Element,
  fullscreenDocument: Pick<Document, "fullscreenElement" | "exitFullscreen">,
): Promise<boolean> => {
  try {
    if (fullscreenDocument.fullscreenElement === workspace) {
      await fullscreenDocument.exitFullscreen();
    } else if (fullscreenDocument.fullscreenElement) {
      return false;
    } else {
      await workspace.requestFullscreen();
    }
    return true;
  } catch {
    return false;
  }
};

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
    <path d="M5 10h5V5" />
    <path d="m10 10-6-6" />
    <path d="M19 14h-5v5" />
    <path d="m14 14 6 6" />
  </svg>
);

export const usePuzzleWorkspaceDisplayMode = () => useContext(PuzzleWorkspaceDisplayModeContext) ?? defaultDisplayMode;

// The crown owns these controls in every puzzle, including Jigsaw. Keep the
// expand/restore button mounted across mode changes so focus stays on it.
export const PuzzleWorkspaceDisplayControls = () => {
  const mode = useContext(PuzzleWorkspaceDisplayModeContext);
  if (!mode) return null;
  const label = mode.isExpanded ? "Exit expanded workspace" : "Expand workspace";
  const fullscreenLabel = mode.isBrowserFullscreen ? "Exit fullscreen" : "Enter fullscreen";
  return (
    <div class="puzzle-workspace-display-tools" role="group" aria-label="Workspace display">
      <button type="button" class="workspace-expand-action" aria-label={label} title={label}
        aria-disabled={mode.transitionPending || undefined}
        onClick={() => void mode.toggleExpanded()}>
        {mode.isExpanded ? <ExitExpandedIcon /> : <ExpandWorkspaceIcon />}
      </button>
      {mode.isExpanded && mode.fullscreenAvailable ? (
        <button type="button" class="workspace-fullscreen-action" aria-label={fullscreenLabel} title={fullscreenLabel}
          aria-disabled={mode.transitionPending || undefined}
          onClick={() => void mode.toggleBrowserFullscreen()}>
          {mode.isBrowserFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
        </button>
      ) : null}
    </div>
  );
};

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
  playColumnMax,
}: PuzzleWorkspaceLayoutProps) => {
  const workspaceRef = useRef<HTMLElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [transitionPending, setTransitionPending] = useState(false);
  const transitionRef = useRef(false);
  const [displayError, setDisplayError] = useState("");
  const fullscreenAvailable = typeof document !== "undefined" &&
    document.fullscreenEnabled && typeof document.exitFullscreen === "function" &&
    typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.requestFullscreen === "function";
  const workspaceStyle = playColumnMax
    ? ({ "--play-column-max": `${playColumnMax}px` } as JSX.CSSProperties)
    : undefined;

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(document.fullscreenElement === workspaceRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!isExpanded || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || event.ctrlKey || event.metaKey || event.altKey ||
          document.fullscreenElement || transitionRef.current) return;
      // Puzzle gestures, dialogs and menus own Escape before display mode.
      if (event.defaultPrevented || isPuzzleModalOpen() || workspaceRef.current?.querySelector(
        '.new-puzzle-options[open], .jigsaw-tools-toggle[aria-expanded="true"]',
      )) return;
      event.preventDefault();
      if (document.activeElement?.matches(".workspace-fullscreen-action")) {
        workspaceRef.current?.querySelector<HTMLElement>(".workspace-expand-action")?.focus();
      }
      setDisplayError("");
      setIsExpanded(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  const runFullscreenTransition = async (onSuccess?: () => void) => {
    const workspace = workspaceRef.current;
    if (!workspace || transitionRef.current) return;
    transitionRef.current = true;
    setTransitionPending(true);
    setDisplayError("");
    try {
      if (await attemptWorkspaceFullscreen(workspace, document)) onSuccess?.();
      else {
        // A rejected native transition must not close or reset expanded play.
        setDisplayError("Fullscreen could not be changed. You can keep playing or try again.");
      }
    } finally {
      transitionRef.current = false;
      setTransitionPending(false);
    }
  };

  const toggleExpanded = async () => {
    if (transitionRef.current) return;
    setDisplayError("");
    if (!isExpanded) {
      setIsExpanded(true);
      return;
    }
    if (document.fullscreenElement === workspaceRef.current) {
      await runFullscreenTransition(() => setIsExpanded(false));
    } else {
      setIsExpanded(false);
    }
  };

  const toggleBrowserFullscreen = async () => {
    const workspace = workspaceRef.current;
    if (!workspace || !fullscreenAvailable || !isExpanded || transitionRef.current) return;
    await runFullscreenTransition();
  };

  const modeClass = `${isExpanded ? "is-immersive" : ""} ${isBrowserFullscreen ? "is-browser-fullscreen" : ""}`;
  const displayMode: PuzzleWorkspaceDisplayMode = {
    isExpanded,
    isBrowserFullscreen,
    fullscreenAvailable,
    transitionPending,
    toggleBrowserFullscreen,
    toggleExpanded,
  };

  return (
    <PuzzleWorkspaceDisplayModeContext.Provider value={displayMode}>
      <section
      class={`workspace-panel puzzle-workspace-layout ${className} ${modeClass}`.trim()}
      aria-label="Selected puzzle workspace"
      ref={workspaceRef}
      style={workspaceStyle}
    >
      {header ? <header class="workspace-layout-header">{header}</header> : null}

      {status ? <section class="workspace-layout-status" aria-label="Puzzle status">{status}</section> : null}

      {crown || isExpanded ? (
        <header class="workspace-layout-header workspace-layout-crown">
          {crown ?? <PuzzleWorkspaceDisplayControls />}
          {displayError ? <p class="workspace-display-error" role="status">{displayError}</p> : null}
        </header>
      ) : null}

      {play || board ? (
        <div class="workspace-layout-play-surface">
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
