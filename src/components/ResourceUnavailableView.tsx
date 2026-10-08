type ResourceUnavailableViewProps = {
  message: string;
  puzzleTitle: string;
  onStartNew: () => void;
  onHome: () => void;
};

export const ResourceUnavailableView = ({
  message,
  puzzleTitle,
  onStartNew,
  onHome,
}: ResourceUnavailableViewProps) => (
  <section class="start-layout" aria-labelledby="resource-unavailable-title">
    <div class="puzzle-start-panel">
      <p class="start-section-label">Unavailable</p>
      <h1 id="resource-unavailable-title">Puzzle unavailable</h1>
      <p class="hero-copy" aria-live="polite">{message}</p>
      <div class="puzzle-actions">
        <button type="button" onClick={onStartNew}>Start a new {puzzleTitle}</button>
        <button type="button" onClick={onHome}>Home</button>
      </div>
    </div>
  </section>
);
