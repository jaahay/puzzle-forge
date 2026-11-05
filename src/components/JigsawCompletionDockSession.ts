/** Presentation-only lifetime: dismissal belongs to one solved episode. */
export type JigsawCompletionDockSession = Readonly<{
  identity: string;
  solved: boolean;
  dismissed: boolean;
}>;

export const reconcileJigsawCompletionDockSession = (
  previous: JigsawCompletionDockSession | null,
  identity: string,
  solved: boolean,
): JigsawCompletionDockSession =>
  previous?.identity === identity && previous.solved === solved
    ? previous
    : { identity, solved, dismissed: false };

export const dismissJigsawCompletionDockSession = (
  session: JigsawCompletionDockSession,
): JigsawCompletionDockSession =>
  session.dismissed ? session : { ...session, dismissed: true };
