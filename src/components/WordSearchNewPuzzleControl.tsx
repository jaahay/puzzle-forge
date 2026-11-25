import type { PuzzleDifficulty } from "../catalog/types";
import { getWordSearchTheme, wordSearchThemeIds, type WordSearchTheme } from "../games/wordSearch/themes";
import { NewPuzzleCommand } from "./NewPuzzleCommand";

const difficulties: readonly PuzzleDifficulty[] = ["Easy", "Medium", "Hard", "Expert"];

type Props = {
  currentSeed: string;
  difficulty: PuzzleDifficulty;
  theme: WordSearchTheme;
  seedLoadInput: string;
  disabled: boolean;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onThemeChange: (theme: WordSearchTheme) => void;
  onSeedLoadInputChange: (seed: string) => void;
  onNewPuzzle: (afterStart?: () => void) => void;
  onToday: (afterStart?: () => void) => void;
  onLoadSeed: (afterStart?: () => void) => void;
};

export const WordSearchNewPuzzleControl = (props: Props) => (
  <NewPuzzleCommand
    puzzleTitle="Word Search"
    currentSeed={props.currentSeed}
    configurationSummary={`${getWordSearchTheme(props.theme).title} · ${props.difficulty}`}
    seedLoadInput={props.seedLoadInput}
    disabled={props.disabled}
    onSeedLoadInputChange={props.onSeedLoadInputChange}
    onNewPuzzle={props.onNewPuzzle}
    onToday={props.onToday}
    onLoadSeed={props.onLoadSeed}
    info={<>
      <p>Find the supplied words in straight lines. Words may appear diagonally or backwards on higher difficulties. Harder boards also contain more similar letter sequences.</p>
      <p>Theme and difficulty configure the next puzzle only. Today uses the selected profile and local date.</p>
    </>}
    settings={<>
      <label>
        <span>Theme</span>
        <select value={props.theme} disabled={props.disabled} onChange={event => {
          const theme = wordSearchThemeIds.find(id => id === event.currentTarget.value);
          if (theme) props.onThemeChange(theme);
        }}>
          {wordSearchThemeIds.map(id => <option key={id} value={id}>{getWordSearchTheme(id).title}</option>)}
        </select>
      </label>
      <div class="new-puzzle-segmented new-puzzle-difficulty-options" role="group" aria-label="Difficulty">
        {difficulties.map(difficulty => (
          <button key={difficulty} type="button" class={difficulty === props.difficulty ? "selected" : undefined}
            aria-pressed={difficulty === props.difficulty} disabled={props.disabled}
            onClick={() => props.onDifficultyChange(difficulty)}>{difficulty}</button>
        ))}
      </div>
    </>}
  />
);
