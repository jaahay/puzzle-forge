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

## Materialization and navigation

`/<puzzle-type>` is the puzzle-type entry surface. Once the app commits a concrete generation identity and materializes the puzzle, the browser URL should update automatically to `/<puzzle-type>/<generation-id>`.

History semantics:

- initial automatic materialization from `/<puzzle-type>` should normally use `history.replaceState`, so the transient entry surface does not become a useless Back destination;
- an explicit action that chooses another concrete puzzle, such as New, Today, or loading a different generation identity, should normally use `history.pushState`, so Back can return to the previous puzzle resource;
- refreshing a typed resource URL regenerates that resource from its generation identity.

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

1. decode the generation id into the canonical generation request;
2. regenerate the puzzle baseline through the normal puzzle generator;
3. compare the regenerated baseline with the persisted session's baseline fingerprint/checksum;
4. restore mutable progress only when the persisted progress is compatible with the regenerated baseline.

The generated baseline itself does not need to be duplicated into local storage when it can be regenerated from the resource identity.

Storage should persist the intended session state as a unit. If ordinary browser storage cannot hold an acceptable session representation, that is an implementation defect to address rather than a reason to silently discard portions of the session.

## Generator evolution

Puzzle Forge does not currently guarantee that a generation id will produce identical output forever. The product is too early to impose generator-version compatibility machinery by default.

If compatibility becomes necessary later, generation-id decoding may introduce explicit versioning while treating identifiers that lack a version field as the original/legacy generation schema. That allows old unversioned URLs to retain their original interpretation without requiring version syntax before it is useful.

## Separation of concerns

The intended ownership is:

```text
URL path
  -> puzzle type + canonical generation id
  -> generation request
  -> normal puzzle generator
  -> immutable puzzle baseline

local storage
  -> typed puzzle resource identity
  -> baseline fingerprint/checksum
  -> mutable player progress and history
```

This keeps routing, generation, and session persistence related by a stable resource identity without conflating puzzle definition with player state.
