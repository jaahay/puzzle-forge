import { render } from "preact";
import { App } from "./App";
import "./styles.css";
import "./site/solitaire.css";
import "./site/sudoku.css";
import "./site/base.css";
import "./site/tabs.css";
import "./site/views.css";
import "./site/footer.css";

const root = document.getElementById("app");

if (root) {
  render(<App />, root);
}
