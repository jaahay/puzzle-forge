# Control Communication

Puzzle Forge controls should support effortless play through clarity, familiarity, appropriate emphasis, and minimal interference with the puzzle surface.

## Principles

### Purpose

The puzzle is the primary experience. A control succeeds when players can recognize its purpose, understand its consequences, and operate it without unnecessary interpretation.

### Presentation

Choose text, icons, or both according to the meaning of an action, its familiarity, frequency, consequences, and surrounding context. Favor explicit labels when interpretation is uncertain. Use icon-only controls when their meaning is established and the compact presentation improves the experience.

### Composition

Keep the active puzzle central. Give frequently needed actions convenient access and disclose secondary configuration when requested. Do not substitute cryptic controls for thoughtful prioritization.

### Workspace information

Keep the puzzle surface operational. Show clues, meaningful state, action labels, validation and recovery information when they inform play. Put rules, strategies and optional explanations behind discoverable, accessible disclosure. Remove narration that merely repeats an obvious state or another presentation of the same event. Transient feedback should not displace the surface being manipulated. As puzzles mature, familiar play should require less reading, not less clarity.

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

For implementation-level responsibilities, cross-reference [Shared Puzzle Controls](../architecture/shared-controls.md) and [Puzzle Workspace Layout](../ui/puzzle-workspace-layout.md). These records describe design intent, not an alternative authority to current code and observed behavior.

---

## Research and rationale

**Research snapshot — November 9, 2026.** This ChatGPT synthesis draws on public design and accessibility guidance and source-level observations of Puzzle Forge's buttons, navigation, toolbars, configuration, and completion controls. It records evidence, limitations, and questions for future evaluation. It is not a user study or a binding interface specification; reassess application-specific observations as the product evolves. Later implementation cross-checks are distinguished from the original snapshot below.

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

### Puzzle Forge source-level observations, revisited

The observations originated in a source review on November 9, 2026, not in player testing. The follow-ups below cross-check the implementation on the [PR #358 branch](https://github.com/jaahay/puzzle-forge/pull/358) in November 2026; an open PR is not yet production behavior. Neither historical findings nor current source inspection establish usability without actual interaction testing.

1. **New-puzzle entry points (historical inconsistency addressed).** The November 9 implementation used a die for Jigsaw's random New action and a picture-stack icon for options, unlike other puzzles' labeled New control. On [PR #358](https://github.com/jaahay/puzzle-forge/pull/358), [NewPuzzleCommand](../../src/components/NewPuzzleCommand.tsx) uses **New** plus a disclosure chevron for every puzzle family, including Jigsaw. The options still have labeled Random, Today, and seed actions; the Random icon remains useful *inside* that labeled panel. Consistent controls resolve the ambiguity of the old icon pair, but their spacing and recognition still merit viewport QA.
2. **Undo/Redo are defensible icon-only controls.** [PuzzleHistoryActions](../../src/components/PuzzleHistoryActions.tsx) uses conventional curved arrows, accessible names, shortcut hints, and stable positions. The semantics transfer naturally across puzzle families where history is supported.
3. **Jigsaw's camera and tools remain specialized.** [TilePuzzlePreview](../../src/components/TilePuzzlePreview.tsx) uses compact zoom, fit, and expand controls around the board, while less frequent options such as edge guides, restaging, and appearance use text in Tools. On the cross-checked branch, changing-label actions such as **Show/Hide edge guides** and **Lock/Unlock panning** do not carry `aria-pressed`; **Snap and lock to frame** retains a stable label with `aria-pressed`. This addresses the snapshot's semantic concern at source level, not an exhaustive assistive-technology test.
4. **Solitaire auto-foundation (historical ambiguity addressed).** The original implementation used “♣→” without a visible action label. [SolitaireWorkspace](../../src/components/SolitaireWorkspace.tsx) now says **Move to foundations** and supplies a title explaining that it moves currently legal cards. Clarity is improved, but the real mobile layout and whether players can predict the action remain subjects for QA.
5. **Text still carries core gameplay meaning.** [SudokuWorkspace](../../src/components/SudokuWorkspace.tsx) uses explicit Check and Reset actions; [WordGuessGame](../../src/components/WordGuessGame.tsx) uses Submit, Reset, and Share. There is no reason to turn every puzzle-specific verb into a new pictogram for visual uniformity.
6. **The workspace already has shared semantic components.** [CurrentPuzzleIdentity](../../src/components/CurrentPuzzleIdentity.tsx), [PuzzleTerminalDock](../../src/components/PuzzleTerminalDock.tsx), and [PuzzleWorkspaceLayout](../../src/components/PuzzleWorkspaceLayout.tsx) provide reusable presentation concepts. The opportunity is to refine these decisions, not create a universal control framework before observing actual needs.

These observations distinguish historical issues from their later implementation changes. They are **not** proof that the old controls were unusable, or that subsequent designs have been validated for all users and devices.

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

Use the smallest coherent change that improves understanding. The early candidates identified in this snapshot—the shared New-puzzle entry point and completion actions—were subsequently addressed through [PR #356](https://github.com/jaahay/puzzle-forge/pull/356), [PR #357](https://github.com/jaahay/puzzle-forge/pull/357), and the proposed follow-up [PR #358](https://github.com/jaahay/puzzle-forge/pull/358). This is an implementation history, **not** a requirement to follow every recommendation in the snapshot.

Preserve the board's prominence, distinguish current-puzzle actions from creating another puzzle, and resolve actual accessibility or comprehension issues without a sweeping icon-library rewrite. The research does **not** certify a final icon set, a particular Jigsaw toolbar composition, or a mobile layout. Current code, real-device QA, and reasoned product judgment can legitimately supersede its initial hypotheses.
