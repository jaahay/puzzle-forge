import { describe, expect, it } from "vitest";
import { isNonogramLineFeasible } from "./solve";

describe("Nonogram positive and negative clue feasibility", () => {
  it("accepts player deductions consistent with a clue arrangement", () => {
    expect(isNonogramLineFeasible(5, [2], [1], [0, 3])).toBe(true);
    expect(isNonogramLineFeasible(5, [2], [], [0, 1, 2])).toBe(true);
  });

  it("detects impossible known-empty markings even without filled squares", () => {
    expect(isNonogramLineFeasible(3, [1], [], [0, 1, 2])).toBe(false);
    expect(isNonogramLineFeasible(3, [2], [], [1])).toBe(false);
  });

  it("rejects contradictory and out-of-range positive or negative markings", () => {
    expect(isNonogramLineFeasible(4, [1], [2], [2])).toBe(false);
    expect(isNonogramLineFeasible(4, [1], [], [-1])).toBe(false);
    expect(isNonogramLineFeasible(4, [1], [], [4])).toBe(false);
    expect(isNonogramLineFeasible(4, [1], [5])).toBe(false);
  });
});
