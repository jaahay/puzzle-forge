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

type JigsawCssVariableTarget = {
  style: {
    setProperty: (property: string, value: string) => void;
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

export const applyJigsawDragOffset = (
  targets: readonly JigsawCssVariableTarget[],
  dragX: number,
  dragY: number,
) => {
  for (const target of targets) {
    target.style.setProperty("--jigsaw-drag-x", `${dragX}px`);
    target.style.setProperty("--jigsaw-drag-y", `${dragY}px`);
  }
};

export const resetJigsawDragOffset = (
  targets: readonly JigsawCssVariableTarget[],
) => applyJigsawDragOffset(targets, 0, 0);
