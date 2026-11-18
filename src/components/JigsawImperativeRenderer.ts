import {
  getJigsawCameraTransform,
  type JigsawCamera,
  type JigsawViewport,
} from "../games/jigsaw/placement";

type JigsawTransformTarget = {
  style: {
    transform: string;
  };
};

type JigsawDragTransformTarget = {
  style: {
    translate: string;
  };
};

export const applyJigsawCameraTransform = (
  target: JigsawTransformTarget,
  camera: JigsawCamera,
  viewport: JigsawViewport,
) => {
  const transform = getJigsawCameraTransform(camera, viewport);
  target.style.transform =
    `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) scale(${transform.scale})`;
};

/**
 * Move just the island's transform. Unlike inherited CSS variables, the
 * independent translate property does not invalidate styles in every clipped
 * SVG descendant. The canonical world transform remains owned by Preact.
 */
export const applyJigsawDragOffset = (
  targets: readonly JigsawDragTransformTarget[],
  dragX: number,
  dragY: number,
) => {
  const translate = `${dragX}px ${dragY}px`;
  for (const target of targets) {
    if (target.style.translate !== translate) target.style.translate = translate;
  }
};

/** Remove the entire temporary transform at rest: even a zero translate
 * establishes a CSS transform context in browsers and can pressure the GPU. */
export const resetJigsawDragOffset = (
  targets: readonly JigsawDragTransformTarget[],
) => {
  for (const target of targets) {
    if (target.style.translate !== "") target.style.translate = "";
  }
};
