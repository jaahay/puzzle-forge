export const AboutView = () => (
  <section class="site-changelog about-view" id="about" aria-labelledby="about-title">
    <p class="site-kicker">about</p>
    <h2 id="about-title">Puzzle Forge generates repeatable boards, deals, and grids from seeds.</h2>
    <p>
      Choose a puzzle, tune the seed when repeatability matters, and play the generated instance in a shared workbench
      surface. The app is small on purpose: each puzzle family gets its own rules while sharing one lightweight shell.
    </p>

    <article>
      <h3>What it does</h3>
      <p>Generate and play Sudoku, Nonogram, Word Guess, and preview puzzle experiments from one interface.</p>
    </article>
    <article>
      <h3>Why seeds matter</h3>
      <p>Seeds make boards and deals shareable, replayable, and easier to inspect while the generators evolve.</p>
    </article>
    <article>
      <h3>How it stays responsive</h3>
      <p>Puzzle generation runs in a Web Worker so larger boards and fresh deals do not block the game surface.</p>
    </article>
  </section>
);
