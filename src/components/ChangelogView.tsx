import { changelogEntries } from "../site/changelog";

export const ChangelogView = () => (
  <section class="site-view site-changelog" id="changelog" aria-labelledby="changelog-title">
    <p class="site-kicker">changelog</p>
    <h2 id="changelog-title">Recent forge notes</h2>
    <p class="view-copy">
      A concise product-facing record of changes that affect how Puzzle Forge presents, generates, or explains puzzles.
    </p>

    {changelogEntries.map((entry) => (
      <article key={entry.date}>
        <time datetime={entry.date}>{entry.label}</time>
        <h3>{entry.title}</h3>
        <p>{entry.body}</p>
      </article>
    ))}
  </section>
);
