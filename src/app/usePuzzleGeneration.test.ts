import { describe, expect, it } from "vitest";
import { shouldAcceptGenerationResponse } from "./usePuzzleGeneration";

describe("generation response ownership", () => {
  it("accepts only the response for the active request", () => {
    expect(shouldAcceptGenerationResponse("request-2", "request-2")).toBe(true);
    expect(shouldAcceptGenerationResponse("request-2", "request-1")).toBe(false);
  });

  it("rejects every late response after the active request is cancelled", () => {
    expect(shouldAcceptGenerationResponse(null, "request-2")).toBe(false);
  });
});
