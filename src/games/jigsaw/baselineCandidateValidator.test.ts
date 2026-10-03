import { describe, expect, it } from "vitest";
import { compileJigsawBaselineProduction } from "./baselineProductionCompiler";
import {
  baselineMirror,
  baselinePrimitive,
  baselineSequence,
} from "./baselineProduction";
import { validateJigsawBaselineCandidate } from "./baselineCandidateValidator";

const trace = () =>
  compileJigsawBaselineProduction(
    baselineSequence(
      baselinePrimitive("deflect"),
      baselinePrimitive("course"),
      baselineMirror(baselinePrimitive("deflect")),
    ),
  );

describe("Jigsaw baseline candidate validator", () => {
  it("accepts a structurally faithful normalized candidate", () => {
    expect(
      validateJigsawBaselineCandidate(trace(), [
        { x: 0, y: 0 },
        { x: 1 / 3, y: 1 },
        { x: 2 / 3, y: 1 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({ valid: true });
  });

  it("requires exact normalized endpoints and one segment per instruction", () => {
    expect(
      validateJigsawBaselineCandidate(trace(), [
        { x: 0, y: 0 },
        { x: 0.5, y: 1 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "point-count-mismatch",
    });

    expect(
      validateJigsawBaselineCandidate(trace(), [
        { x: 0.01, y: 0 },
        { x: 1 / 3, y: 1 },
        { x: 2 / 3, y: 1 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "start-anchor-mismatch",
    });

    expect(
      validateJigsawBaselineCandidate(trace(), [
        { x: 0, y: 0 },
        { x: 1 / 3, y: 1 },
        { x: 2 / 3, y: 1 },
        { x: 0.99, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "end-anchor-mismatch",
    });
  });

  it("rejects non-finite, out-of-bounds, and backwards geometry", () => {
    expect(
      validateJigsawBaselineCandidate(trace(), [
        { x: 0, y: 0 },
        { x: 1 / 3, y: Number.NaN },
        { x: 2 / 3, y: 1 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "non-finite-coordinate",
    });

    expect(
      validateJigsawBaselineCandidate(trace(), [
        { x: 0, y: 0 },
        { x: 1 / 3, y: 1.1 },
        { x: 2 / 3, y: 1.1 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "depth-out-of-bounds",
    });

    expect(
      validateJigsawBaselineCandidate(trace(), [
        { x: 0, y: 0 },
        { x: 0.6, y: 1 },
        { x: 0.5, y: 1 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "non-monotonic-traversal",
      instructionIndex: 1,
    });
  });

  it("checks identity, course, cross, and deflect semantics directly", () => {
    expect(
      validateJigsawBaselineCandidate(
        compileJigsawBaselineProduction(baselinePrimitive("identity")),
        [
          { x: 0, y: 0 },
          { x: 1, y: 0.2 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "end-anchor-mismatch",
    });

    expect(
      validateJigsawBaselineCandidate(
        compileJigsawBaselineProduction(baselinePrimitive("course")),
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "course-on-baseline",
      instructionIndex: 0,
    });

    expect(
      validateJigsawBaselineCandidate(
        compileJigsawBaselineProduction(baselinePrimitive("cross")),
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "cross-misses-baseline",
      instructionIndex: 0,
    });

    expect(
      validateJigsawBaselineCandidate(
        compileJigsawBaselineProduction(baselinePrimitive("deflect")),
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "deflect-does-not-deflect",
      instructionIndex: 0,
    });
  });

  it("rejects a deflect that performs a baseline crossing", () => {
    const instructions = [
      {
        primitive: "deflect" as const,
        normalDirection: 1 as const,
        traversalDirection: 1 as const,
      },
      {
        primitive: "deflect" as const,
        normalDirection: 1 as const,
        traversalDirection: 1 as const,
      },
    ];

    expect(
      validateJigsawBaselineCandidate(instructions, [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: -0.5 },
      ]),
    ).toEqual({
      valid: false,
      reason: "end-anchor-mismatch",
    });
  });
});
