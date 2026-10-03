# Workspace Framework

Puzzle Forge treats each puzzle screen as a shared workspace with puzzle-specific content.

The workspace owns layout. The puzzle owns mechanics.

## Target slots

```text
Header
Status
Board
Gameplay
Generation
```

## Workspace owns

- section order;
- spacing;
- responsive stacking;
- mobile behavior;
- shared button styling;
- stable generation states;
- scroll preservation;
- accessibility landmarks;
- common status and validation display.

## Puzzle modules own

- board rendering;
- current puzzle facts;
- gameplay controls;
- generation controls;
- validation behavior;
- optional variants;
- optional solver or hint behavior.

## Refactor path

1. Introduce `PuzzleWorkspaceLayout` as a slot wrapper.
2. Move current workspace sections into slots without changing behavior.
3. Extract shared controls: seed, difficulty, generation buttons, validation status.
4. Split puzzle-specific sections into smaller components.
5. Move toward capability-driven puzzle definitions.

## Requirements

The framework should support grid, card, tile, word, graph, path, and region puzzles.

It should also support variants, daily puzzles, seed sharing, persistence, and mobile layouts.
