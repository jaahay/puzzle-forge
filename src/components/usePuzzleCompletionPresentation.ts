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
  const activePointers = useRef(new Set<number>());
  const pendingSettlement = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const clearPresentationTimers = () => {
    clearSettleTimer();
    clearCompletionFallbackTimer();
  };

  const interactionsAreSettled = () => activeKeys.current.size === 0 && activePointers.current.size === 0;

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
      activePointers.current.clear();
      return;
    }

    const currentTrackedKeys = trackedKeySignature ? trackedKeySignature.split("\u0000") : [];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || !isTrackedCompletionKey(event.key, currentTrackedKeys)) {
        return;
      }

      activeKeys.current.add(event.code || event.key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isTrackedCompletionKey(event.key, currentTrackedKeys)) {
        return;
      }

      activeKeys.current.delete(event.code || event.key);
      beginCelebrationWhenSettled();
    };

    const handlePointerDown = (event: PointerEvent) => {
      activePointers.current.add(event.pointerId);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      activePointers.current.delete(event.pointerId);
      beginCelebrationWhenSettled();
    };

    const settleAbandonedInteraction = () => {
      activeKeys.current.clear();
      activePointers.current.clear();
      beginCelebrationWhenSettled();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        settleAbandonedInteraction();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointerup", handlePointerEnd, true);
    window.addEventListener("pointercancel", handlePointerEnd, true);
    window.addEventListener("blur", settleAbandonedInteraction);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerEnd, true);
      window.removeEventListener("pointercancel", handlePointerEnd, true);
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
      setPhase("playing");
    } else if (!previous.enabled || identityChanged) {
      cancelPendingPresentation();
      setPhase(solved ? "completed" : "playing");
    } else if (!solved) {
      cancelPendingPresentation();
      setPhase("playing");
    } else if (shouldStartCompletionPresentation(previous, current)) {
      cancelPendingPresentation();
      pendingSettlement.current = true;
      setPhase("settling");
      beginCelebrationWhenSettled();
    }

    baseline.current = current;
  }, [enabled, identity, solved, settleDelayMs, completionFallbackMs]);

  useEffect(
    () => () => {
      cancelPendingPresentation();
      activeKeys.current.clear();
      activePointers.current.clear();
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
