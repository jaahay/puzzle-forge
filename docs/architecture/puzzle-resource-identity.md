# Puzzle Resource Identity

Puzzle Forge treats a concrete generated puzzle as a typed resource. Every playable resource converges on one canonical generation identity, even when the browser exposes a more meaningful human-facing locator.

## Resource model

Four URL forms have distinct jobs:

```text
/sudoku/<compact-generation-id>        canonical machine locator
/sudoku/Happy2026!                     curated alias
/sudoku/daily/2026-09-15               stable Daily locator
/sudoku/today                          changing selector
```

The first three can name one exact concrete puzzle. `today` is deliberately different: it is a convenience selector that resolves using the user's local date and canonicalizes to the corresponding dated Daily locator.

All of these forms ultimately resolve to the same internal shape:

```text
PuzzleResourceIdentity = puzzle type + canonical generation id
```

Only that canonical identity keys persistence. Aliases, Daily locators, and selectors never become parallel session identities.

Generic `/p/<id>` URLs are not part of the resource model. Puzzle type remains in the route namespace, so the same generation id may validly identify distinct resources under different puzzle types.

## Canonical generation identity

A generation id is not merely a random seed. It canonically encodes every generation input materially consumed by that puzzle type, excluding the puzzle type itself because the path already supplies it.

Depending on the puzzle, generation identity may include:

- random seed;
- width and height;
- difficulty;
- uniqueness requirements;
- puzzle variation;
- image/artwork selection;
- Solitaire rules;
- Daily provenance and date;
- future inputs that materially affect generation.

Mutable player state is never part of generation identity.

### Compact wire format

Canonical generation ids use a compact, self-contained, versioned byte representation encoded with Base64URL. The current wire version is `1`.

The payload contains:

1. a wire-format version byte;
2. the normalized seed as length-prefixed UTF-8;
3. compact provenance bytes;
4. a puzzle-specific compact payload containing only material identity fields.

Small enumerations and flags are encoded as bytes rather than JSON field names and repeated textual values. Puzzle type is intentionally not repeated in the token.

For example, Sudoku packs difficulty and ruleset into one byte after the common identity fields. Other families encode their own material dimensions, flags, artwork identity, or Solitaire variation as required.

The decoder is canonical rather than merely permissive: after decoding and validating an identity, it re-encodes the identity and requires the result to equal the requested token. Alternate byte spellings therefore do not become additional canonical IDs for the same resource.

Generated random seeds contain 96 bits of entropy and are represented as 16 URL-safe characters. User-supplied textual seeds are allowed up to 64 characters. The 64-character value is an input bound, not the generated seed length or a reduction of the random seed space.

The compact ID remains self-contained. Regenerating an ordinary canonical URL requires no database, short-link service, alias registry, or network lookup.

## Curated aliases

Curated aliases provide memorable names for selected exact resources:

```text
/sudoku/Happy2026!
```

Aliases are type-scoped registry entries that map directly to canonical compact generation ids. The same alias text may intentionally mean different things under different puzzle namespaces.

Alias recognition is based on exact registry membership, not punctuation or string shape. The path segments `daily` and `today` are reserved by the Daily routing contract and must not be added as curated aliases.

Opening an alias and opening its canonical compact-ID URL regenerate the same baseline and address the same local persisted session. When an alias is opened intentionally, canonical restoration preserves the visible alias while the app operates internally on canonical resource identity.

## Daily resources

Daily provenance is part of canonical generation identity, but Daily also has a meaningful human-facing series identity:

```text
/<puzzle>/daily/YYYY-MM-DD
```

A dated Daily locator is stable. Given the same puzzle type, date, and material Daily profile, it resolves deterministically to one canonical generation identity and therefore one compact generation id.

The default Daily profile uses that puzzle type's ordinary generation defaults. When a puzzle family has material settings that differ from those defaults, the Daily locator may carry a sparse query string. Query parameters are qualifications of the Daily resource, not a second general-purpose generation codec.

Examples:

```text
/sudoku/daily/2026-09-15
/sudoku/daily/2026-09-15?difficulty=hard&variation=diagonal
/nonogram/daily/2026-09-15?size=10x10&difficulty=hard&unique=false
```

The app need not advertise the query grammar as a primary feature. It exists so settings-relative Today behavior remains lossless and shareable when the selected profile differs from defaults.

### Daily query canonicalization

Only material settings for the requested puzzle family are accepted. Unknown keys, duplicate keys, invalid values, and out-of-range values are rejected.

The current qualifier vocabulary is:

| Puzzle family | Material Daily qualifiers |
| --- | --- |
| Sudoku | `difficulty`, `variation` |
| Nonogram | `size`, `difficulty`, `unique` |
| Word Guess, Logic Grid | `size` |
| Jigsaw, Tile Swap, Sliding Puzzle | `size`, `image` |
| Klondike Solitaire | `draw`, `redeals`, `waste`, `solvable` |
| Futoshiki | `difficulty` |
| KenKen, Minesweeper, Slitherlink | `size`, `difficulty`, `unique` once generatable |
| Peg Solitaire | none |

Defaults are omitted from generated Daily URLs. Parameters are emitted in one stable order. Alternate input order or explicit default values may resolve to the same resource, but browser restoration normalizes the visible URL to the canonical sparse spelling.

This query vocabulary is deliberately narrow. Puzzle Forge does not expose generic `seed`, arbitrary settings-as-path, or open-ended configuration parameters through Daily routing.

## Today selector

`/<puzzle>/today` is a selector, not an immutable resource identity.

It resolves using the user's local calendar date plus any valid Daily profile qualifiers, then canonicalizes the browser URL to the stable dated form:

```text
/sudoku/today
        ↓
/sudoku/daily/2026-09-15
```

The existing Today UI action produces the same Daily provenance and material generation identity, so it naturally lands on the dated Daily URL after the generated resource is committed.

A bookmarked `/today` URL intentionally changes meaning as the local date changes. A bookmarked `/daily/YYYY-MM-DD` URL does not.

## Browser locator versus internal route

Daily and Today are resolved at the routing boundary. They do not create separate internal resource types.

Conceptually:

```text
requested browser URL
  ├─ curated alias --------------------┐
  ├─ dated Daily locator --------------┤
  ├─ Today selector -> dated Daily ----┤
  └─ compact canonical id -------------┘
                                      ↓
                          canonical PuzzleResourceIdentity
                                      ↓
                          ordinary generation/session flow
```

The central application controller and persistence layer therefore continue to operate on canonical resource routes only.

Visible URL behavior is intentional:

- a directly opened canonical compact-ID URL may remain canonical;
- a directly opened curated alias remains visible while restoring that same resource;
- a canonical dated Daily locator remains visible while restoring that same resource;
- a non-canonical Daily query spelling is normalized;
- `/today` is replaced by its dated Daily locator;
- explicit navigation to another resource uses the appropriate locator for the newly selected resource.

## Materialization and navigation

`/<puzzle-type>` is the puzzle-type entry surface. Once the app commits a concrete generation identity and materializes the puzzle, it updates the browser URL to the appropriate locator.

History semantics:

- initial automatic materialization from `/<puzzle-type>` normally uses `history.replaceState`, so the transient entry surface does not become a useless Back destination;
- an explicit action that chooses another concrete puzzle, such as New, Today, or loading a different seed, normally uses `history.pushState`, so Back can return to the previous puzzle resource;
- refreshing any accepted stable locator regenerates the same canonical resource before local progress with a matching baseline fingerprint is overlaid.

## Session persistence

URLs describe puzzle resources, not player sessions. Guesses, moves, selected cells/cards, Undo/Redo history, completion state, and other mutable play state remain local session data.

Persistence is keyed only by typed canonical resource identity:

```text
sudoku/<compact-generation-id>
sudoku/<another-compact-generation-id>
nonogram/<compact-generation-id>
```

Thus an alias, a dated Daily locator, and the compact canonical URL for one puzzle all address the same persisted session.

Resource restoration is:

1. resolve any browser-facing locator to canonical resource identity;
2. decode the canonical compact generation id;
3. regenerate the immutable puzzle baseline;
4. compare its checksum/fingerprint with persisted session metadata;
5. overlay mutable progress only when the fingerprint matches.

The generated baseline itself is not duplicated in storage when it can be regenerated from canonical identity.

Storage persists the intended session state as a unit. If ordinary browser storage cannot hold an acceptable session representation, that is an implementation defect rather than a reason to silently discard portions of a session.

### Retention policy

Puzzle Forge retains at most **8 persisted resource sessions globally**, including the active resource.

- The active resource is protected from routine pruning.
- Inactive sessions are retained by descending `updatedAt`; canonical resource key provides the deterministic tie-breaker.
- Pruning removes an entire inactive session rather than truncating Undo/Redo or other progress.
- Successful pruning removes both session payload and metadata reference.
- A pruned resource URL remains valid and regenerates the pristine baseline; only that device's former mutable progress is absent.

## Separation of concerns

The intended ownership is:

```text
browser locator
  -> typed route semantics
  -> canonical compact resource identity
  -> generation request
  -> normal puzzle generator
  -> immutable puzzle baseline

local storage
  -> typed canonical resource identity
  -> baseline fingerprint/checksum
  -> mutable player progress and history
```

This keeps routing, generation, human-facing naming, and session persistence related by one resource identity without conflating any of them with player state.
