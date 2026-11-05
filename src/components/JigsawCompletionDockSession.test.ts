import { describe, expect, it } from "vitest";
import {
  dismissJigsawCompletionDockSession,
  reconcileJigsawCompletionDockSession,
} from "./JigsawCompletionDockSession";

describe("Jigsaw completion dock lifetime", () => {
  it("keeps dismissal for one completion, then restores the dock after undo and re-solve", () => {
    let session = reconcileJigsawCompletionDockSession(null, "puzzle:0", false);
    session = reconcileJigsawCompletionDockSession(session, "puzzle:0", true);
    session = dismissJigsawCompletionDockSession(session);
    expect(reconcileJigsawCompletionDockSession(session, "puzzle:0", true).dismissed).toBe(true);

    session = reconcileJigsawCompletionDockSession(session, "puzzle:0", false);
    expect(session.dismissed).toBe(false);
    session = reconcileJigsawCompletionDockSession(session, "puzzle:0", true);
    expect(session.dismissed).toBe(false);
  });

  it("does not carry dismissal into a new puzzle or an explicit replay", () => {
    const previous = dismissJigsawCompletionDockSession(
      reconcileJigsawCompletionDockSession(null, "puzzle:0", true),
    );
    expect(reconcileJigsawCompletionDockSession(previous, "puzzle:1", true).dismissed).toBe(false);
    expect(reconcileJigsawCompletionDockSession(previous, "another:0", true).dismissed).toBe(false);
  });

  it("preserves dismissal across ordinary rerenders of a solved puzzle", () => {
    const dismissed = dismissJigsawCompletionDockSession(
      reconcileJigsawCompletionDockSession(null, "puzzle:0", true),
    );
    expect(reconcileJigsawCompletionDockSession(dismissed, "puzzle:0", true)).toBe(dismissed);
  });
});
