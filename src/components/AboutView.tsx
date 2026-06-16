export const AboutView = () => (
  <section class="site-view about-view" id="about" aria-labelledby="about-title">
    <p class="site-kicker">about</p>
    <h2 id="about-title">A small forge for deterministic puzzle experiments.</h2>
    <p class="view-copy">
      Puzzle Forge is a catalog-first workbench for generating and playing seeded puzzle instances. It favors explicit
      puzzle definitions, repeatable seeds, and lightweight interactions that make each puzzle family easier to inspect.
    </p>

    <div class="about-grid">
      <article>
        <h3>What it does</h3>
        <p>
          Generate Sudoku, Solitaire, Nonogram, Word Guess, Peg Solitaire, and other puzzle prototypes from one shared
          interface.
        </p>
      </article>
      <article>
        <h3>How it behaves</h3>
        <p>
          Puzzle generation runs in a Web Worker so the catalog remains responsive while seeded boards, deals, and grids
          are produced.
        </p>
      </article>
      <article>
        <h3>Where it is headed</h3>
        <p>
          The catalog is meant to stay extensible: new puzzle definitions, interaction models, and checkers can join
          without turning the app shell into a tangle.
        </p>
      </article>
    </div>
  </section>
);
