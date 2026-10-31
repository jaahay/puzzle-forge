import type { JSX } from "preact";
import { memo } from "preact/compat";
import type { JigsawGeneratedPuzzle, JigsawPhysicalEdition, JigsawPiece } from "../catalog/types";
import type { JigsawPositionedVisualIsland, JigsawVisualIslandGeometry } from "../games/jigsaw/visualIslands";
import type { JigsawPieceAppearance } from "../games/jigsaw/playerPreferences";
import type { JigsawWorldLayout } from "../games/jigsaw/placement";
import { getJigsawIslandStackOrder, getPieceHitTargetProps } from "./JigsawPreviewModel";

type PiecePointerEvent = JSX.TargetedPointerEvent<HTMLButtonElement>;
export type IslandPointerActions = {
  beginDrag: (event: PiecePointerEvent, tile: JigsawPiece) => void;
  moveDrag: (event: PiecePointerEvent) => void;
  finishDrag: (event: PiecePointerEvent, tile: JigsawPiece) => void;
  cancelDrag: (event: PiecePointerEvent) => void;
};

/** Physical island surfaces stay independent of camera and workspace controls. */
const JigsawIslandSurface = ({
  island, puzzle, showEdgeSeams, isSolved,
}: {
  island: JigsawVisualIslandGeometry;
  puzzle: JigsawGeneratedPuzzle;
  showEdgeSeams: boolean;
  isSolved: boolean;
}) => {
  const clipId = `island-${puzzle.id}-${island.key}-${island.clipRevision}`.replace(/[^a-zA-Z0-9_-]/g, "-");
  const finishId = `${clipId}-finish`;
  const glossId = `${clipId}-gloss`;
  const textureId = `${clipId}-texture`;
  const fiberId = `${clipId}-fiber`;
  return (
    <svg class="jigsaw-island-visual" viewBox={`0 0 ${island.widthCells * 100} ${island.heightCells * 100}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              {/* Keep artwork clipping local to each cached piece outline;
                  assembled membership must not make its image depend on a composite clip. */}
              {island.members.map(({ piece, outline }, index) => (
                <clipPath key={piece.id} id={`${clipId}-piece-${index}`} clipPathUnits="userSpaceOnUse">
                  <path d={outline} transform={`translate(${(piece.column - island.minColumn) * 100} ${(piece.row - island.minRow) * 100})`} />
                </clipPath>
              ))}
              {/* The composite coating is cosmetic; it never clips the artwork itself. */}
              <clipPath id={`${clipId}-coating`} clipPathUnits="userSpaceOnUse">
                {island.members.map(({ piece, outline }) => (
                  <path key={piece.id} d={outline}
                    transform={`translate(${(piece.column - island.minColumn) * 100} ${(piece.row - island.minRow) * 100})`} />
                ))}
              </clipPath>
              <linearGradient id={finishId} x1="0%" y1="0%" x2="95%" y2="100%">
                <stop offset="0%" stop-color="#fffdf1" stop-opacity="0.20" />
                <stop offset="55%" stop-color="#fffdf1" stop-opacity="0" />
                <stop offset="100%" stop-color="#121825" stop-opacity="0.12" />
              </linearGradient>
              <linearGradient id={glossId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="17%" stop-color="#fffefa" stop-opacity="0" />
                <stop offset="40%" stop-color="#fffefa" stop-opacity="0.03" />
                <stop offset="52%" stop-color="#fffefa" stop-opacity="0.34" />
                <stop offset="64%" stop-color="#fffefa" stop-opacity="0.035" />
                <stop offset="84%" stop-color="#fffefa" stop-opacity="0" />
              </linearGradient>
              <pattern id={textureId} width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M0 0 H6 M0 3 H6" stroke="#fffdf3" stroke-opacity="0.28" stroke-width="0.5" />
                <path d="M0 0 V6 M3 0 V6" stroke="#17202b" stroke-opacity="0.20" stroke-width="0.45" />
              </pattern>
              <pattern id={fiberId} width="13" height="11" patternUnits="userSpaceOnUse">
                <path d="M1 3 L5 2 M8 8 L12 7 M3 10 L7 9 M10 1 L12 2" stroke="#352b25" stroke-opacity="0.36" stroke-width="0.42" />
              </pattern>
            </defs>
            <g class="jigsaw-island-sidewall" transform="translate(0.85 2.05)">
              {island.members.map(({ piece, outline }) => (
                <path key={piece.id} d={outline}
                  transform={`translate(${(piece.column - island.minColumn) * 100} ${(piece.row - island.minRow) * 100})`} />
              ))}
            </g>
            <g class="jigsaw-island-artwork">
              {island.members.map(({ piece }, index) => (
                <g key={piece.id} clip-path={`url(#${clipId}-piece-${index})`}>
                  <image
                    class="tile-puzzle-piece-image"
                    href={puzzle.asset.files.puzzle}
                    x={-island.minColumn * 100}
                    y={-island.minRow * 100}
                    width={puzzle.width * 100}
                    height={puzzle.height * 100}
                    preserveAspectRatio="none"
                  />
                </g>
              ))}
            </g>
            <g class="jigsaw-island-coating" clip-path={`url(#${clipId}-coating)`}>
                <rect
                  class="jigsaw-material-finish"
                  x={-48}
                  y={-48}
                  width={island.widthCells * 100 + 96}
                  height={island.heightCells * 100 + 96}
                  fill={`url(#${finishId})`}
                />
                <rect
                  class="jigsaw-material-gloss"
                  x={-48}
                  y={-48}
                  width={island.widthCells * 100 + 96}
                  height={island.heightCells * 100 + 96}
                  fill={`url(#${glossId})`}
                />
                <rect class="jigsaw-material-texture" x={-48} y={-48}
                  width={island.widthCells * 100 + 96} height={island.heightCells * 100 + 96}
                  fill={`url(#${textureId})`} />
                <rect class="jigsaw-material-fibers" x={-48} y={-48}
                  width={island.widthCells * 100 + 96} height={island.heightCells * 100 + 96}
                  fill={`url(#${fiberId})`} />
            </g>
            {!isSolved ? island.cuts.filter((cut) => cut.kind === "exterior").map((cut) => (
              <path key={`edge:${cut.key}`} class="jigsaw-material-edge"
                d={cut.d} transform={`translate(${cut.offsetX} ${cut.offsetY})`} />
            )) : null}
            {!isSolved ? island.cuts.map((cut) => (
              <path
                key={cut.key}
                class={`tile-puzzle-piece-outline ${cut.kind}`}
                d={cut.d}
                transform={`translate(${cut.offsetX} ${cut.offsetY})`}
              />
            )) : null}
            {showEdgeSeams && !isSolved ? island.cuts.map((cut) => (
              <path
                key={`guide:${cut.key}`}
                class={`tile-puzzle-edge-seam ${cut.kind}`}
                d={cut.d}
                transform={`translate(${cut.offsetX} ${cut.offsetY})`}
              />
            )) : null}
          </svg>
  );
};

type IslandVisualProps = {
  island: JigsawPositionedVisualIsland;
  puzzle: JigsawGeneratedPuzzle;
  layout: JigsawWorldLayout;
  active: boolean;
  raised: boolean;
  anchored: boolean;
  showEdgeSeams: boolean;
  appearance: JigsawPieceAppearance;
  physicalEdition: JigsawPhysicalEdition;
  isSolved: boolean;
  islandElements: { current: Map<string, HTMLDivElement> };
  pointerActions: { current: IslandPointerActions | null };
};

/** Memoized by immutable membership and individual pose; camera changes do not re-render artwork. */
export const JigsawIslandVisual = memo(({
  island, puzzle, layout, active, raised, anchored, showEdgeSeams, appearance, physicalEdition, isSolved,
  islandElements, pointerActions,
}: IslandVisualProps) => {
  const islandStyle = {
    width: `${layout.pieceWidth * island.widthCells}px`,
    height: `${layout.pieceHeight * island.heightCells}px`,
    "--jigsaw-piece-x": `${island.worldX}px`,
    "--jigsaw-piece-y": `${island.worldY}px`,
    zIndex: getJigsawIslandStackOrder(island, puzzle.tiles.length, active, raised, anchored),
  } as JSX.CSSProperties;
  return (
    <div
      class={`jigsaw-island ${anchored ? "anchored" : island.members.length > 1 ? "joined" : "loose"} ${active ? "dragging" : ""}`}
      data-piece-appearance={appearance}
      data-physical-edition={physicalEdition}
      ref={(element) => {
        if (element) islandElements.current.set(island.key, element);
        else islandElements.current.delete(island.key);
      }}
      style={islandStyle}
    >
      <JigsawIslandSurface key={island.clipRevision} island={island} puzzle={puzzle} showEdgeSeams={showEdgeSeams} isSolved={isSolved} />
      {island.members.map(({ piece, outline, span }) => (
        <button
          class={`tile-puzzle-piece ${anchored ? "anchored" : island.members.length > 1 ? "joined" : "loose"} ${active ? "dragging" : ""}`}
          key={piece.id}
          style={{
            width: `${layout.pieceWidth * span.width}px`,
            height: `${layout.pieceHeight * span.height}px`,
            "--jigsaw-piece-x": `${(piece.column - island.minColumn) * layout.pieceWidth}px`,
            "--jigsaw-piece-y": `${(piece.row - island.minRow) * layout.pieceHeight}px`,
          } as JSX.CSSProperties}
          onPointerDown={(event) => pointerActions.current?.beginDrag(event, piece)}
          onPointerMove={(event) => pointerActions.current?.moveDrag(event)}
          onPointerUp={(event) => pointerActions.current?.finishDrag(event, piece)}
          onPointerCancel={(event) => pointerActions.current?.cancelDrag(event)}
          type="button"
          tabIndex={-1}
          aria-label={`Piece ${piece.solvedIndex + 1}, ${anchored ? "anchored to frame" : island.members.length > 1 ? "joined" : "loose"}`}
        >
          <svg class="tile-puzzle-piece-hit-visual" viewBox={`0 0 ${span.width * 100} ${span.height * 100}`} preserveAspectRatio="none">
            <path class="tile-puzzle-piece-hit-target" d={outline} {...getPieceHitTargetProps()} />
          </svg>
        </button>
      ))}
    </div>
  );
});

