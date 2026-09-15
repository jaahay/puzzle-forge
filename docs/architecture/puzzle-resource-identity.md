# Puzzle Resource Identity

Puzzle Forge treats a concrete generated puzzle as a typed resource whose URL declares the canonical inputs required to regenerate it.

## Canonical resource shape

Puzzle resources live under the puzzle type namespace:

```text
/sudoku/<generation-id>
/nonogram/<generation-id>
/jigsaw/<generation-id>
```

The same generation id may validly appear under multiple puzzle namespaces. `/sudoku/abc` and `/nonogram/abc` are distinct resources because the puzzle type is part of the resource identity.

Generic `/p/<id>` puzzle URLs are not part of the resource model. A typed URL must never load a different puzzle type than the namespace names.

## Generation identity

The generation id is not merely a random seed. It is the canonical encoding of the complete generation request needed by that puzzle type, excluding the puzzle type itself because the URL path already supplies it.

Depending on the puzzle, generation identity may include:

- random seed;
- width and height;
- difficulty;
- uniqueness requirements;
- puzzle variation;
- image/artwork selection;
- daily/custom provenance or other generation inputs that materially affect the generated puzzle.

The generation id is an opaque resource identifier to callers. Its internal encoding may evolve independently of UI labels.

## Human-readable aliases

Curated aliases provide memorable display URLs for selected canonical resources, for example:

```text
/sudoku/Happy2026!
```

An alias is not a second generation-identity scheme. It is a type-scoped name that maps to one canonical generation id. `/sudoku/Happy2026!` and `/nonogram/Happy2026!` may therefore intentionally name different resources.

Resource-segment resolution checks the bundled alias registry first and otherwise falls through to ordinary canonical generation-id decoding. Alias recognition is based on registry membership, not punctuation or any reserved string shape.

The canonical typed resource remains the persistence identity. Opening an alias and opening its canonical generation-id URL therefore regenerate the same baseline and address the same local session. Mutable player state is never encoded in an alias.

When a registered alias is opened intentionally, canonical restoration may update the app's internal resource identity while preserving the alias in the visible browser URL. Explicit navigation to another concrete resource uses that new resource's ordinary canonical URL.

## Materialization and navigation

`/<puzzle-type>` is the puzzle-type entry surface. Once the app commits a concrete generation identity and materializes the puzzle, the browser URL should update automatically to `/<puzzle-type>/<generation-id>`.

History semantics:

- initial automatic materialization from `/<puzzle-type>` should normally use `history.replaceState`, so the transient entry surface does not become a useless Back destination;
- an explicit action that chooses another concrete puzzle, such as New, Today, or loading a different generation identity, should normally use `history.pushState`, so Back can return to the previous puzzle resource;
- refreshing a typed resource URL regenerates that resource from its generation identity;
- when the current typed URL is a registered alias for the same canonical resource being restored, replacement should preserve the visible alias instead of exposing the opaque generation id.

## Session persistence

URLs describe puzzle resources, not player sessions. A puzzle URL must not contain guesses, current moves, selected cells/cards, Undo/Redo history, completion state, or other mutable play state.

Local session persistence is keyed by the typed puzzle resource identity, conceptually:

```text
sudoku/<generation-id>
sudoku/<another-generation-id>
nonogram/<generation-id>
```

This permits multiple resumable puzzles of the same type at the same time.

When opening a resource with persisted session data:

1. resolve any registered human-readable alias to its canonical generation id;
2. decode the canonical generation id into the canonical generation request;
3. regenerate the puzzle baseline through the normal puzzle generator;
4. compare the regenerated baseline with the persisted session's baseline fingerprint/checksum;
5. restore mutable progress only when the persisted progress is compatible with the regenerated baseline.

The generated baseline itself does not need to be duplicated into local storage when it can be regenerated from the resource identity.

Storage should persist the intended session state as a unit. If ordinary browser storage cannot hold an acceptable session representation, that is an implementation defect to address rather than a reason to silently discard portions of the session.

### Retention policy

Puzzle Forge retains at most **8 persisted resource sessions globally**, including the currently active resource.

- The active resource is always protected from routine retention pruning.
- Inactive sessions are retained by descending `updatedAt`; canonical resource key provides a deterministic tie-breaker.
- Pruning removes an entire inactive session rather than truncating Undo/Redo or other progress to make it fit.
- Successful pruning removes both the session payload and its metadata reference.
- A pruned resource URL remains valid. Reopening it regenerates the pristine puzzle baseline normally; only that device's former mutable progress is absent.

The cap is deliberately modest rather than quota-driven. Current full-history compact grid sessions are on the order of tens of kilobytes, while a deliberately pessimistic full-history Solitaire session can approach roughly half a megabyte. Eight retained resources therefore keeps persistence bounded with useful room for a Recent-puzzles surface without depending on a particular browser quota.

## Generator evolution

Puzzle Forge does not currently guarantee that a generation id will produce identical output forever. The product is too early to impose generator-version compatibility machinery by default.

If compatibility becomes necessary later, generation-id decoding may introduce explicit versioning while treating identifiers that lack a version field as the original/legacy generation schema. That allows old unversioned URLs to retain their original interpretation without requiring version syntax before it is useful.

## Separation of concerns

The intended ownership is:

```text
URL path
  -> puzzle type + requested resource segment
  -> optional human-readable alias resolution
  -> canonical generation id
  -> generation request
  -> normal puzzle generator
  -> immutable puzzle baseline

local storage
  -> typed canonical puzzle resource identity
  -> baseline fingerprint/checksum
  -> mutable player progress and history
```

This keeps routing, generation, and session persistence related by a stable resource identity without conflating puzzle definition with player state.
