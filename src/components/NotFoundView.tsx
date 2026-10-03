type NotFoundViewProps = {
  pathname: string;
  onHomeSelect: () => void;
};

export const NotFoundView = ({ pathname, onHomeSelect }: NotFoundViewProps) => (
  <section class="start-layout" aria-labelledby="not-found-title">
    <div class="puzzle-start-panel">
      <p class="start-section-label">404</p>
      <h1 id="not-found-title">Page not found</h1>
      <p class="hero-copy">
        Puzzle Forge does not have a page at <code>{pathname}</code>.
      </p>
      <div class="puzzle-actions">
        <button type="button" onClick={onHomeSelect}>Return home</button>
      </div>
    </div>
  </section>
);
