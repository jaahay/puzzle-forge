# Control Communication Principles

Puzzle Forge controls should support effortless play through clarity, familiarity, appropriate emphasis, and minimal interference with the puzzle surface.

## Purpose

The puzzle is the primary experience. A control succeeds when players can recognize its purpose, understand its consequences, and operate it without unnecessary interpretation.

## Presentation

Choose text, icons, or both according to the meaning of an action, its familiarity, frequency, consequences, and surrounding context. Favor explicit labels when interpretation is uncertain. Use icon-only controls when their meaning is established and the compact presentation improves the experience.

## Composition

Keep the active puzzle central. Give frequently needed actions convenient access and disclose secondary configuration when requested. Do not substitute cryptic controls for thoughtful prioritization.

## Consistency

Shared actions should retain recognizable meaning, terminology, behavior, and visual identity across puzzle families. Puzzle-specific layouts may differ to support their mechanics and interaction requirements.

## Interaction

Controls must communicate their availability, current state, and consequences. Provide meaningful accessible names, keyboard and touch operation, visible feedback, and appropriate safeguards for progress-affecting actions.

## Judgment

Optimize for the whole experience rather than the consistency of isolated elements. Evaluate proposed designs at realistic screen sizes and with actual player tasks. Prefer the simplest implementation that produces an understandable, cohesive result.

## Application

Use these principles to make contextual design decisions, not to impose a universal ratio of icons to labels:

- Conventional, frequently used actions may work well as compact icon-only controls; unfamiliar or consequential actions generally benefit from visible words.
- Keep the meaning of current-puzzle actions distinct from actions that create or configure a different puzzle.
- Reduce unnecessary permanent controls before shortening labels to reclaim space.
- A tooltip can clarify an icon but cannot provide the only discoverable explanation of an essential action on touch devices.
- Match visible wording, accessible naming, interaction state, and actual behavior. Preserve useful differences between puzzle families while making shared actions familiar.

[Research and Puzzle Forge observations](../research/control-communication.md) provide the rationale and examples; this document is the enduring design direction.
