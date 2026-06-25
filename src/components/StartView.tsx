import { puzzleIcons } from "../catalog/puzzleIcons";
import type { PuzzleDefinition, PuzzleId } from "../catalog/types";

type StartViewProps = {
  readyPuzzles: PuzzleDefinition[];
  previewPuzzles: PuzzleDefinition[];
  plannedPuzzles: PuzzleDefinition[];
  onSelectPuzzle: (puzzleId: PuzzleId) => void;
};

type StartPuzzleButtonProps = {
  definition: PuzzleDefinition;
  label?: string;
  onSelectPuzzle: (puzzleId: PuzzleId) => void;
};

const StartPuzzleButton = ({ definition, label, onSelectPuzzle }: StartPuzzleButtonProps) => (
  <button class="start-puzzle-card" key={definition.id} type="button" onClick={() => onSelectPuzzle(definition.id)}>
    <span class="start-puzzle-card-icon" aria-hidden="true">{puzzleIcons[definition.id]}</span>
    {label ? <span class={`status ${definition.status}`}>{label}</span> : null}
    <strong>{definition.title}</strong>
    <span>{definition.tagline}</span>
  </button>
);

export const StartView = ({ readyPuzzles, previewPuzzles, plannedPuzzles, onSelectPuzzle }: StartViewProps) => (
  <section class="start-layout" aria-labelledby="puzzle-start-title">
    <div class="puzzle-start-panel">
      <h1 id="puzzle-start-title">Choose a puzzle</h1>
      <p class="hero-copy">Seeded generators and playable puzzle workspaces.</p>

      <section class="start-section" aria-label="Ready puzzles">
        <p class="start-section-label">Ready</p>
        <div class="start-card-grid">
          {readyPuzzles.map((definition) => (
            <StartPuzzleButton definition={definition} key={definition.id} onSelectPuzzle={onSelectPuzzle} />
          ))}
        </div>
      </section>

      {previewPuzzles.length > 0 ? (
        <section class="start-section" aria-label="Preview puzzles">
          <p class="start-section-label">Preview</p>
          <div class="start-card-grid compact">
            {previewPuzzles.map((definition) => (
              <StartPuzzleButton definition={definition} key={definition.id} label="Preview" onSelectPuzzle={onSelectPuzzle} />
            ))}
          </div>
        </section>
      ) : null}

      <div class="coming-soon-list" aria-label="Coming soon puzzles">
        <span>Coming soon</span>
        {plannedPuzzles.map((definition) => (
          <button key={definition.id} type="button" disabled>
            {puzzleIcons[definition.id]} {definition.title}
          </button>
        ))}
      </div>
    </div>
  </section>
);
