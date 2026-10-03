import { changelogEntries } from "../site/changelog";

export const ChangelogView = () => (
  <section class="site-view site-changelog" id="changelog" aria-labelledby="changelog-title">
    <p class="site-kicker">updates</p>
    <h2 id="changelog-title">What changed</h2>
    <p class="view-copy">Changes to games, generation, and the interface.</p>

    {changelogEntries.map((entry) => (
      <article key={entry.date}>
        <time datetime={entry.date}>{entry.label}</time>
        <h3>{entry.title}</h3>
        <p>{entry.body}</p>
      </article>
    ))}
  </section>
);
