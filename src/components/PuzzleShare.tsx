import { createContext, type ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "preact/hooks";
import {
  canUseNativePuzzleShare, copyPuzzleShare, getPuzzleSharePreview, makePuzzleSharePayload, sharePuzzleNatively,
  type PuzzleShareIntent, type PuzzleShareResource,
} from "../app/puzzleShare";

type PublishedProgress = { puzzleInstanceId: string; report: string | null };
type ShareRequest = {
  resource: PuzzleShareResource;
  progress: string | null;
  initialIntent: PuzzleShareIntent;
  trigger: HTMLButtonElement;
  host: Element;
};
type ShareContext = {
  available: boolean;
  openShare: (trigger: HTMLButtonElement, intent: PuzzleShareIntent) => void;
  publishProgress: (progress: PublishedProgress) => () => void;
};

const PuzzleShareContext = createContext<ShareContext | null>(null);

export const usePuzzleShareProgress = (puzzleInstanceId: string, report: string | null) => {
  const publish = useContext(PuzzleShareContext)?.publishProgress;
  // Local gameplay state (such as Word Guess's submitted rows) remains the
  // authority even when browser persistence fails. Do not read saved progress.
  useLayoutEffect(() => publish?.({ puzzleInstanceId, report }), [publish, puzzleInstanceId, report]);
};

export const PuzzleShareButton = ({
  intent = "puzzle", className, disabled = false, tabIndex,
}: { intent?: PuzzleShareIntent; className?: string; disabled?: boolean; tabIndex?: number }) => {
  const share = useContext(PuzzleShareContext);
  if (!share) return null;
  return (
    <button type="button" class={className} disabled={disabled || !share.available} tabIndex={tabIndex}
      onClick={(event) => share.openShare(event.currentTarget, intent)}>{intent === "progress" ? "Share result" : "Share"}</button>
  );
};

export const PuzzleShareProvider = ({
  resource, getProgress, children,
}: {
  resource: PuzzleShareResource | null;
  getProgress: () => string | null;
  children: ComponentChildren;
}) => {
  const published = useRef<PublishedProgress | null>(null);
  const [request, setRequest] = useState<ShareRequest | null>(null);
  const publishProgress = useCallback((progress: PublishedProgress) => {
    published.current = progress;
    return () => {
      if (published.current === progress) published.current = null;
    };
  }, []);
  const activeRequest = request && resource && resource.url === request.resource.url &&
    resource.puzzleInstanceId === request.resource.puzzleInstanceId ? request : null;

  useEffect(() => {
    if (request && !activeRequest) setRequest((current) => current === request ? null : current);
  }, [request, activeRequest]);

  const openShare = (trigger: HTMLButtonElement, intent: PuzzleShareIntent) => {
    if (!resource || activeRequest) return;
    const progress = published.current?.puzzleInstanceId === resource.puzzleInstanceId
      ? published.current.report
      : getProgress();
    setRequest({
      resource, progress,
      initialIntent: intent === "progress" && progress ? "progress" : "puzzle",
      trigger,
      host: document.fullscreenElement ?? document.body,
    });
  };

  return (
    <PuzzleShareContext.Provider value={{ available: resource !== null, openShare, publishProgress }}>
      {children}
      {activeRequest ? createPortal(
        <PuzzleShareDialog request={activeRequest}
          onClose={() => setRequest((current) => current === activeRequest ? null : current)} />,
        activeRequest.host,
      ) : null}
    </PuzzleShareContext.Provider>
  );
};

const PuzzleShareDialog = ({ request, onClose }: { request: ShareRequest; onClose: () => void }) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const disclosure = useRef<HTMLDetailsElement>(null);
  const shareText = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const resultLabel = request.initialIntent === "progress" ? "Include my result" : "Include my progress";
  const [intent, setIntent] = useState<PuzzleShareIntent>(request.initialIntent);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const payload = makePuzzleSharePayload(request.resource, intent, request.progress);
  const preview = getPuzzleSharePreview(request.resource, intent, request.progress);

  useLayoutEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      if (request.trigger.isConnected && !request.trigger.disabled) request.trigger.focus();
    };
  }, [request]);

  const changeIntent = (next: PuzzleShareIntent) => {
    if (busyRef.current) return;
    setIntent(next);
    setFeedback("");
  };

  const copy = async (linkOnly = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const success = await copyPuzzleShare(navigator, linkOnly ? request.resource.url : payload.copyText);
    busyRef.current = false;
    setBusy(false);
    if (success) setFeedback(linkOnly ? "Link copied." : "Message copied.");
    else {
      setFeedback("Could not copy automatically. Select and copy the share text.");
      if (disclosure.current) disclosure.current.open = true;
      shareText.current?.focus();
      if (linkOnly) shareText.current?.setSelectionRange(payload.copyText.length - request.resource.url.length, payload.copyText.length);
      else shareText.current?.select();
    }
  };

  const share = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const outcome = await sharePuzzleNatively(navigator, payload.native);
    busyRef.current = false;
    setBusy(false);
    if (outcome === "handed-off") onClose();
    else if (outcome === "unavailable") setFeedback("Native sharing is unavailable. Copy instead.");
    // A cancelled system share returns to the chooser without changing the clipboard.
  };

  return (
    <dialog class="puzzle-share-dialog" ref={dialog} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => { if (event.key === "Escape") event.stopPropagation(); }}>
      <header class="puzzle-share-heading">
        <h2 id={titleId}>Share puzzle</h2>
        <button type="button" onClick={onClose}>Close</button>
      </header>
      <div class="puzzle-share-identity">
        {preview.artwork ? <img class="puzzle-share-artwork" src={preview.artwork.src} alt={preview.artwork.alt} /> : null}
        <strong>{preview.title}</strong>
        {preview.description ? <span>{preview.description}</span> : null}
        {preview.report ? <div class="puzzle-share-report">{preview.report}</div> : null}
        <span class="puzzle-share-destination">{preview.destination}</span>
      </div>
      {request.progress ? (
        <label class="puzzle-share-include">
          <input type="checkbox" checked={intent === "progress"} disabled={busy}
            onChange={(event) => changeIntent(event.currentTarget.checked ? "progress" : "puzzle")} />
          <span>{resultLabel}</span>
        </label>
      ) : null}
      {intent === "progress" ? <p class="puzzle-share-explanation">Recipients play independently.</p> : null}
      <details ref={disclosure} class="puzzle-share-disclosure">
        <summary>View share text</summary>
        <textarea ref={shareText} class="puzzle-share-preview" aria-label="Share text"
          readOnly rows={intent === "progress" ? 8 : 5} value={payload.copyText} />
        <button type="button" onClick={() => void copy(true)} disabled={busy}>Copy link only</button>
      </details>
      <div class="puzzle-share-feedback" role="status">{feedback}</div>
      <div class="puzzle-share-actions">
        <button type="button" onClick={() => void copy()} disabled={busy}>
          Copy message
        </button>
        {canUseNativePuzzleShare(navigator, payload.native) ? (
          <button type="button" class="puzzle-share-native" onClick={() => void share()} disabled={busy}>Share…</button>
        ) : null}
      </div>
    </dialog>
  );
};
