# Shared Puzzle Controls

Puzzle Forge should avoid each puzzle inventing its own controls.

Common controls should become small reusable components with consistent labels, placement, disabled states, and copy behavior.

## Candidate shared controls

- `SeedControl`
- `CopySeedButton`
- `DifficultySelect`
- `SizeControl`
- `GenerationActions`
- `GameplayToolbar`
- `ValidationMessage`
- `StatusStrip`
- `VariantSummary`
- `VariantControls`

## Seed

Seed is generation metadata, not top-level status.

Use a compact copy affordance beside the seed value. Prefer a small icon button over a full text button once the icon system exists.

## Generation actions

Generation buttons should keep stable labels while work is running.

Prefer:

```text
Use seed
Random
```

Do not morph labels to `Generating...`. Disable the button and show generation state in a stable status area instead.

## Gameplay actions

Gameplay controls belong closest to the board.

Examples:

- Check
- Submit
- Undo
- Redo
- Draw
- Auto foundation
- Hint

## Variant controls

Variant controls describe the next puzzle identity unless they can safely apply to the current puzzle.

Examples:

- Solitaire draw mode
- Solitaire redeal limit
- Solitaire waste rule
- future Sudoku constraints

Keep variant controls with generation/configuration unless the variant can be changed without regenerating.
