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
import "./site/app-shell.css";
import "./site/footer.css";
import "./site/mobile-workspace.css";
import "./site/control-polish.css";

const root = document.getElementById("app");

if (!root) {
  throw new Error("App root element was not found.");
}

render(<App />, root);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("Puzzle Forge service worker registration failed.", error);
    });
  });
}
