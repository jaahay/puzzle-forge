import { render } from "preact";
import { App } from "./App";
import "./styles.css";
import "./site/solitaire.css";
import "./site/sudoku.css";
import "./site/nonogram.css";
import "./site/word-guess.css";
import "./site/base.css";
import "./site/tabs.css";
import "./site/views.css";
import "./site/footer.css";
import "./site/mobile-workspace.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("App root element was not found.");
}

render(<App />, root);
