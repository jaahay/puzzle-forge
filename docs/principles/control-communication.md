# Control Communication

Puzzle Forge controls should support effortless play through clarity, familiarity, appropriate emphasis, and minimal interference with the puzzle surface.

## Principles

### Purpose

The puzzle is the primary experience. A control succeeds when players can recognize its purpose, understand its consequences, and operate it without unnecessary interpretation.

### Presentation

Choose text, icons, or both according to the meaning of an action, its familiarity, frequency, consequences, and surrounding context. Favor explicit labels when interpretation is uncertain. Use icon-only controls when their meaning is established and the compact presentation improves the experience.

### Composition

Keep the active puzzle central. Give frequently needed actions convenient access and disclose secondary configuration when requested. Do not substitute cryptic controls for thoughtful prioritization.

### Consistency

Shared actions should retain recognizable meaning, terminology, behavior, and visual identity across puzzle families. Puzzle-specific layouts may differ to support their mechanics and interaction requirements.

### Interaction

Controls must communicate their availability, current state, and consequences. Provide meaningful accessible names, keyboard and touch operation, visible feedback, and appropriate safeguards for progress-affecting actions.

### Judgment

Optimize for the whole experience rather than the consistency of isolated elements. Evaluate proposed designs at realistic screen sizes and with actual player tasks. Prefer the simplest implementation that produces an understandable, cohesive result.

### Application

Use these principles to make contextual design decisions, not to impose a universal ratio of icons to labels:

- Conventional, frequently used actions may work well as compact icon-only controls; unfamiliar or consequential actions generally benefit from visible words.
- Keep the meaning of current-puzzle actions distinct from actions that create or configure a different puzzle.
- Reduce unnecessary permanent controls before shortening labels to reclaim space.
- A tooltip can clarify an icon but cannot provide the only discoverable explanation of an essential action on touch devices.
- Match visible wording, accessible naming, interaction state, and actual behavior. Preserve useful differences between puzzle families while making shared actions familiar.

---

## Research and rationale

**Research snapshot — November 9, 2026.** This ChatGPT synthesis draws on public design and accessibility guidance and source-level observations of Puzzle Forge's buttons, navigation, toolbars, configuration, and completion controls. It records evidence, limitations, and questions for future evaluation. It is not a user study or a binding interface specification; reassess application-specific observations as the product evolves.

### Central finding

Neither icon-only nor text-only is a sound default for every control. Players need reliable meaning, while the board needs space and attention. Icons can speed recognition of familiar operations and improve scanning; text is often necessary to disambiguate unfamiliar, consequential, or similar-looking actions. Icon-plus-text can use both strengths, but adds weight where an icon would already be understood.

The design problem includes **which controls remain visible**, their grouping, state, and context—not merely whether their labels are pictorial or verbal.

### External evidence and its limits

| Source | Relevant guidance or observation | Limit on interpretation |
| --- | --- | --- |
| [Nielsen Norman Group — Icon Usability](https://www.nngroup.com/articles/icon-usability/) | Many icons are ambiguous without visible labels; familiar icons can work well in compact toolbars. | General usability guidance, not measurements of Puzzle Forge players. |
| [IBM Carbon — Button usage](https://carbondesignsystem.com/components/button/usage/) | Use icon-only buttons sparingly, especially for standardized icons or constrained toolbars; provide explanatory tooltips. Carbon discusses prior research on icon recognition. | Design-system recommendations do not prove that any particular Puzzle Forge icon is recognized. |
| [Apple — Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) | Buttons may contain an icon, label, or both; choose the content that communicates purpose most clearly. Emphasize likely actions and distinguish destructive ones. | Platform guidance needs adaptation to a cross-device web application. |
| [Baymard — Icons in account dashboards](https://baymard.com/research-articles/use-icons-in-the-account-dashboard) | Icons paired with text improved scanning of account destinations; visible labels resolved uncertainty about symbols. | Account navigation is different from frequent gameplay controls; the result does not justify icons everywhere. |
| [WAI-ARIA — Button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/) | A toggle using aria-pressed should keep a stable accessible label; a button whose label changes to describe the opposite action can instead be an ordinary action button. | Applies to the control's semantics, not necessarily its visual styling. |
| [WCAG 2.2 — Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name) | When visible text labels a control, its accessible name must include that text. | An accessible name alone does not make an ambiguous icon self-explanatory to sighted players. |
| [WCAG 2.2 — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) and [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) | Pointer targets generally need at least 24×24 CSS pixels or qualifying spacing/exception; essential graphical cues and states generally need 3:1 contrast. | Compliance minima are not ergonomic ideals. Larger touch targets may be preferable. Apple's 44×44-point guidance uses platform points, not CSS pixels. |

These references provide practical direction, not an experimental ranking among three button styles. Context, prior familiarity, device, visual density, and the action's consequences all matter.

### Puzzle Forge source-level observations

The following observations come from reading the implementation on 2026-11-09, not from directly observing players or measuring interaction outcomes.

1. **New-puzzle entry points differ.** [NewPuzzleCommand](../../src/components/NewPuzzleCommand.tsx) has a compact presentation used by Jigsaw: a die means generate a random puzzle and a picture-stack symbol opens options. Its less compact presentation says “New.” The menu itself uses explicit labels such as Random, Today, and Restart this puzzle. The symbols may be visually consistent without communicating these exact meanings on first encounter.
2. **Undo/Redo are defensible icon-only controls.** [PuzzleHistoryActions](../../src/components/PuzzleHistoryActions.tsx) uses conventional curved arrows, accessible names, shortcut hints, and stable positions. The semantics transfer naturally across puzzle families where history is supported.
3. **Jigsaw's camera and tools deserve different treatments.** [TilePuzzlePreview](../../src/components/TilePuzzlePreview.tsx) uses compact zoom/fit/expand controls around the board, while less frequent options such as edge guides, restaging, and appearance already have text inside Tools. It also includes state-changing labels alongside aria-pressed for some toggles; those deserve a semantic review against the WAI-ARIA button pattern.
4. **Solitaire exposes a specialized pictogram.** [SolitaireWorkspace](../../src/components/SolitaireWorkspace.tsx) uses “♣→” for its auto-foundation command, with a fuller accessible label. The symbol's exact consequence is difficult to infer without a visible label.
5. **Text still carries core gameplay meaning.** [SudokuWorkspace](../../src/components/SudokuWorkspace.tsx) uses explicit Check and Reset actions; [WordGuessGame](../../src/components/WordGuessGame.tsx) uses Submit, Reset, and Share. There is no reason to turn every puzzle-specific verb into a new pictogram for visual uniformity.
6. **The workspace already has shared semantic components.** [CurrentPuzzleIdentity](../../src/components/CurrentPuzzleIdentity.tsx), [PuzzleTerminalDock](../../src/components/PuzzleTerminalDock.tsx), and [PuzzleWorkspaceLayout](../../src/components/PuzzleWorkspaceLayout.tsx) provide reusable presentation concepts. The opportunity is to refine these decisions, not create a universal control framework before observing actual needs.

These are candidates for review, **not** a conclusion that the controls are unusable or that any specific redesign is already validated.

### Interpretation by control role

| Role | Likely treatment | Why |
| --- | --- | --- |
| Familiar, frequent operations (Undo, Redo, zoom, fullscreen) | Compact icon or symbol, with meaningful accessible name and clarification as needed | Recognition can be immediate, and space near the board is valuable. |
| Primary or consequential commands (New puzzle, Restart puzzle) | Visible text, optionally supported by an icon | Precise intent and potential effects on progress matter. |
| Puzzle-specific commands (auto-foundation, Submit, Check, restage) | Short text first; icon only if unmistakable in context | A conventional symbol often does not exist. |
| Modes and settings (appearance, edge guides, pan lock) | Labeled selection or toggle with consistent state semantics | The player must understand both the setting and its current value. |
| Navigation and catalog choices | Explicit destination name; selective complementary iconography | Recognition and scanning matter more than extreme compactness. |
| Less-used controls | Discoverable contextual panel or disclosure | Often the best solution is to reduce permanent chrome, not abbreviate it. |

These are hypotheses to test, not mandated widget mappings. A puzzle's interaction model may justify a different arrangement without changing the meaning of shared commands.

### UX questions worth testing

- Can a first-time mobile player distinguish a new random puzzle from opening its options, restaging pieces, or restarting the current puzzle?
- Do compact Jigsaw controls allow players to return quickly to the board, or require repeated tooltip hunting?
- Can players identify Solitaire's auto-foundation action and predict the outcome before clicking?
- Are Undo/Redo, Check, Restart, and New presented in ways that remain distinct at completion?
- Are the same actions recognizable in Sudoku, Solitaire, Word Guess, and Jigsaw without requiring identical toolbar layouts?
- Does a control that appears understandable with a mouse remain understandable by touch, keyboard, and assistive technology?

A sensible small study would compare a restrained icon-first presentation against selectively labeled controls on realistic screens. Observe unprompted interpretation, hesitation, mistaken actions, touch accuracy, control discovery, and repeated use—not just personal preference or nominal button count. Include mobile portrait/landscape, desktop, ordinary play, completion, and keyboard operation.

### Implementation implications, not commitments

Use the smallest coherent change that improves understanding. Likely early candidates are the shared New-puzzle entry point and completion actions, followed by specialized puzzle commands. Preserve the board's prominence; keep action semantics distinct; resolve contradictory accessible state or wording; and avoid a sweeping component or icon-library rewrite solely to comply with a document.

The research supports the design principles but does **not** certify a final icon set, a specific Jigsaw toolbar composition, or a particular mobile layout. Those require evaluation in the application.
