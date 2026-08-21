import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";

export type CompletionPresentationPhase = "playing" | "settling" | "celebrating" | "completed";

type CompletionBaseline = {
  enabled: boolean;
  identity: string;
  solved: boolean;
};

type UsePuzzleCompletionPresentationOptions = {
  enabled: boolean;
  identity: string;
  solved: boolean;
  trackedKeys?: readonly string[];
  settleDelayMs?: number;
  completionFallbackMs?: number;
};

export const DEFAULT_COMPLETION_SETTLE_DELAY_MS = 120;
export const DEFAULT_COMPLETION_FALLBACK_MS = 900;

export const shouldStartCompletionPresentation = (
  previous: CompletionBaseline,
  current: CompletionBaseline,
) =>
  previous.enabled &&
  current.enabled &&
  previous.identity === current.identity &&
  !previous.solved &&
  current.solved;

export const shouldStageCompletionPresentation = (
  previous: CompletionBaseline,
  current: CompletionBaseline,
  hasCausativeInput: boolean,
) => hasCausativeInput && shouldStartCompletionPresentation(previous, current);

export const isTrackedCompletionKey = (key: string, trackedKeys: readonly string[]) =>
  trackedKeys.includes(key);

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const usePuzzleCompletionPresentation = ({
  enabled,
  identity,
  solved,
  trackedKeys = [],
  settleDelayMs = DEFAULT_COMPLETION_SETTLE_DELAY_MS,
  completionFallbackMs = DEFAULT_COMPLETION_FALLBACK_MS,
}: UsePuzzleCompletionPresentationOptions) => {
  const [phase, setPhase] = useState<CompletionPresentationPhase>(enabled && solved ? "completed" : "playing");
  const baseline = useRef<CompletionBaseline>({ enabled, identity, solved });
  const activeKeys = useRef(new Set<string>());
  const hasCausativeInput = useRef(false);
  const pendingSettlement = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const causativeInputTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedKeySignature = trackedKeys.join("\u0000");

  const clearSettleTimer = () => {
    if (settleTimer.current !== null) {
      clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
  };

  const clearCompletionFallbackTimer = () => {
    if (completionFallbackTimer.current !== null) {
      clearTimeout(completionFallbackTimer.current);
      completionFallbackTimer.current = null;
    }
  };

  const clearCausativeInputTimer = () => {
    if (causativeInputTimer.current !== null) {
      clearTimeout(causativeInputTimer.current);
      causativeInputTimer.current = null;
    }
  };

  const clearPresentationTimers = () => {
    clearSettleTimer();
    clearCompletionFallbackTimer();
  };

  const clearCausativeInput = () => {
    hasCausativeInput.current = false;
    clearCausativeInputTimer();
  };

  const markCausativeInput = () => {
    hasCausativeInput.current = true;
    clearCausativeInputTimer();
    causativeInputTimer.current = setTimeout(() => {
      causativeInputTimer.current = null;

      if (!pendingSettlement.current) {
        hasCausativeInput.current = false;
      }
    }, 0);
  };

  const interactionsAreSettled = () => activeKeys.current.size === 0;

  const beginCelebrationWhenSettled = () => {
    if (!pendingSettlement.current || !interactionsAreSettled() || settleTimer.current !== null) {
      return;
    }

    settleTimer.current = setTimeout(() => {
      settleTimer.current = null;

      if (!pendingSettlement.current) {
        return;
      }

      pendingSettlement.current = false;
      clearCompletionFallbackTimer();

      if (prefersReducedMotion()) {
        setPhase("completed");
        return;
      }

      setPhase("celebrating");
      completionFallbackTimer.current = setTimeout(() => {
        completionFallbackTimer.current = null;
        setPhase("completed");
      }, completionFallbackMs);
    }, settleDelayMs);
  };

  const cancelPendingPresentation = () => {
    pendingSettlement.current = false;
    clearPresentationTimers();
  };

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") {
      activeKeys.current.clear();
      clearCausativeInput();
      return;
    }

    const currentTrackedKeys = trackedKeySignature ? trackedKeySignature.split("\u0000") : [];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || !isTrackedCompletionKey(event.key, currentTrackedKeys)) {
        return;
      }

      markCausativeInput();
      activeKeys.current.add(event.code || event.key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isTrackedCompletionKey(event.key, currentTrackedKeys)) {
        return;
      }

      activeKeys.current.delete(event.code || event.key);
      beginCelebrationWhenSettled();
    };

    const handleClick = () => {
      markCausativeInput();
    };

    const settleAbandonedInteraction = () => {
      activeKeys.current.clear();

      if (!pendingSettlement.current) {
        clearCausativeInput();
      }

      beginCelebrationWhenSettled();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        settleAbandonedInteraction();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("blur", settleAbandonedInteraction);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("blur", settleAbandonedInteraction);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, trackedKeySignature]);

  useLayoutEffect(() => {
    const previous = baseline.current;
    const current = { enabled, identity, solved };
    const identityChanged = previous.identity !== identity;

    if (!enabled) {
      cancelPendingPresentation();
      clearCausativeInput();
      setPhase("playing");
    } else if (!previous.enabled || identityChanged) {
      cancelPendingPresentation();
      clearCausativeInput();
      setPhase(solved ? "completed" : "playing");
    } else if (!solved) {
      cancelPendingPresentation();
      clearCausativeInput();
      setPhase("playing");
    } else if (shouldStartCompletionPresentation(previous, current)) {
      cancelPendingPresentation();

      if (shouldStageCompletionPresentation(previous, current, hasCausativeInput.current)) {
        clearCausativeInput();
        pendingSettlement.current = true;
        setPhase("settling");
        beginCelebrationWhenSettled();
      } else {
        clearCausativeInput();
        setPhase("completed");
      }
    }

    baseline.current = current;
  }, [enabled, identity, solved, settleDelayMs, completionFallbackMs]);

  useEffect(
    () => () => {
      cancelPendingPresentation();
      clearCausativeInput();
      activeKeys.current.clear();
    },
    [],
  );

  const completePresentation = () => {
    if (phase !== "celebrating") {
      return;
    }

    clearCompletionFallbackTimer();
    setPhase("completed");
  };

  return {
    phase,
    completePresentation,
  };
};
