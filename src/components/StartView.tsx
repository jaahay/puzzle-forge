import { getRecentPuzzleEntries, type RecentPuzzleEntry } from "../app/recentPuzzles";
import { pushAppRoute } from "../app/routes";
import { loadPersistedPuzzleSessions } from "../app/session";
import { puzzleIcons } from "../catalog/puzzleIcons";
import type { PuzzleDefinition, PuzzleId } from "../catalog/types";

type StartViewProps = {
  readyPuzzles: PuzzleDefinition[];
  previewPuzzles: PuzzleDefinition[];
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

const formatLastPlayed = (updatedAt: string) => {
  const value = new Date(updatedAt);
  if (Number.isNaN(value.getTime())) return "Recently played";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
};

const resumeRecentPuzzle = ({ puzzleId, generationId }: RecentPuzzleEntry) => {
  if (typeof window === "undefined") return;
  pushAppRoute({ kind: "resource", puzzleId, generationId });
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const RecentPuzzleButton = ({ entry }: { entry: RecentPuzzleEntry }) => (
  <button
    class="recent-puzzle-card"
    type="button"
    onClick={() => resumeRecentPuzzle(entry)}
    aria-label={`Resume ${entry.title}${entry.summary ? `, ${entry.summary}` : ""}`}
  >
    <span class="recent-puzzle-icon" aria-hidden="true">{puzzleIcons[entry.puzzleId]}</span>
    <span class="recent-puzzle-copy">
      <span class="recent-puzzle-title-row">
        <strong>{entry.title}</strong>
        {entry.isActive ? <span class="recent-puzzle-state">Current</span> : null}
        {entry.completedAt ? <span class="recent-puzzle-state completed">Completed</span> : null}
      </span>
      {entry.summary ? <span class="recent-puzzle-summary">{entry.summary}</span> : null}
      <time class="recent-puzzle-time" dateTime={entry.updatedAt}>Last played {formatLastPlayed(entry.updatedAt)}</time>
    </span>
    <span class="recent-puzzle-action" aria-hidden="true">Resume</span>
  </button>
);

export const StartView = ({ readyPuzzles, previewPuzzles, onSelectPuzzle }: StartViewProps) => {
  const recentPuzzles = getRecentPuzzleEntries(loadPersistedPuzzleSessions());

  return (
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

        {recentPuzzles.length > 0 ? (
          <section class="start-section" aria-label="Recent puzzles">
            <p class="start-section-label">Recent</p>
            <div class="recent-puzzle-list">
              {recentPuzzles.map((entry) => <RecentPuzzleButton entry={entry} key={entry.resourceKey} />)}
            </div>
          </section>
        ) : null}

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
      </div>
    </section>
  );
};
