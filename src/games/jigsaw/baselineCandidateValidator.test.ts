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

const instruction = (
  primitive: "identity" | "deflect" | "cross" | "course",
  normalDirection: -1 | 1 = 1,
  traversalDirection: -1 | 1 = 1,
) => ({
  primitive,
  normalDirection,
  traversalDirection,
} as const);

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

  it("allows vertical structural events while keeping course longitudinal", () => {
    expect(
      validateJigsawBaselineCandidate(
        [
          instruction("deflect"),
          instruction("course"),
          instruction("deflect", 1, -1),
        ],
        [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 0.75, y: 1 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({ valid: true });

    expect(
      validateJigsawBaselineCandidate(
        [
          instruction("deflect"),
          instruction("course"),
          instruction("deflect", 1, -1),
        ],
        [
          { x: 0, y: 0 },
          { x: 0.5, y: 1 },
          { x: 0.5, y: 1 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "course-does-not-progress",
      instructionIndex: 1,
    });
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

  it("diagnoses identity deformation inside an otherwise anchored path", () => {
    expect(
      validateJigsawBaselineCandidate(
        [
          instruction("deflect"),
          instruction("identity"),
          instruction("deflect", 1, -1),
        ],
        [
          { x: 0, y: 0 },
          { x: 1 / 3, y: 0.5 },
          { x: 2 / 3, y: 0.5 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "identity-deforms-baseline",
      instructionIndex: 1,
    });
  });

  it("diagnoses course, cross, and deflect violations at their instruction", () => {
    expect(
      validateJigsawBaselineCandidate(
        [instruction("course")],
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
      validateJigsawBaselineCandidate(trace(), [
        { x: 0, y: 0 },
        { x: 1 / 3, y: 0.5 },
        { x: 2 / 3, y: 0.7 },
        { x: 1, y: 0 },
      ]),
    ).toEqual({
      valid: false,
      reason: "course-changes-offset",
      instructionIndex: 1,
    });

    expect(
      validateJigsawBaselineCandidate(
        [
          instruction("deflect"),
          instruction("cross"),
          instruction("deflect", 1, -1),
        ],
        [
          { x: 0, y: 0 },
          { x: 1 / 3, y: 0.5 },
          { x: 2 / 3, y: 0.2 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "cross-misses-baseline",
      instructionIndex: 1,
    });

    expect(
      validateJigsawBaselineCandidate(
        [
          instruction("deflect"),
          instruction("course"),
          instruction("deflect", 1, -1),
        ],
        [
          { x: 0, y: 0 },
          { x: 1 / 3, y: 0 },
          { x: 2 / 3, y: 0.5 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "deflect-does-not-deflect",
      instructionIndex: 0,
    });

    expect(
      validateJigsawBaselineCandidate(
        [
          instruction("deflect"),
          instruction("deflect"),
          instruction("deflect", 1, -1),
        ],
        [
          { x: 0, y: 0 },
          { x: 1 / 3, y: 0.5 },
          { x: 2 / 3, y: -0.5 },
          { x: 1, y: 0 },
        ],
      ),
    ).toEqual({
      valid: false,
      reason: "deflect-crosses-baseline",
      instructionIndex: 1,
    });
  });
});
