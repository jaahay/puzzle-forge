export type JigsawEdgeExplorationPoint = {
  x: number;
  y: number;
};

export type JigsawEdgeExplorationProbe = {
  id: string;
  label: string;
  scope: "connector" | "seam";
  disposition: "carry-forward" | "collapse" | "defer";
  sourceProbeIds: readonly string[];
  comparisonGroup?: string;
  rationale: string;
  points: readonly JigsawEdgeExplorationPoint[];
};

const point = (x: number, y: number): JigsawEdgeExplorationPoint => ({ x, y });

export const jigsawEdgeExplorationProbes: readonly JigsawEdgeExplorationProbe[] = [
  {
    id: "compound-lock",
    label: "Compound lock",
    scope: "connector",
    disposition: "carry-forward",
    sourceProbeIds: ["paired-lock", "mixed-lock"],
    rationale:
      "Two different lock events read as one coherent compound structure; separate paired/mixed family labels would overstate the distinction.",
    points: [
      point(-1, 0), point(-0.82, 0), point(-0.7, 0.32), point(-0.55, 0.65),
      point(-0.4, 0.32), point(-0.3, 0), point(-0.18, 0), point(-0.1, 0.18),
      point(-0.1, 0.42), point(-0.26, 0.5), point(-0.26, 0.72), point(-0.14, 0.92),
      point(0, 0.98), point(0.14, 0.92), point(0.26, 0.72), point(0.26, 0.5),
      point(0.1, 0.42), point(0.1, 0.18), point(0.18, 0), point(1, 0),
    ],
  },
  {
    id: "opposed-dual-lock",
    label: "Opposed dual lock",
    scope: "connector",
    disposition: "carry-forward",
    sourceProbeIds: ["opposed-dual-lock"],
    rationale:
      "Two complete lock events on opposite sides remain visually distinct from Serpentine and directly test local polarity inside one seam.",
    points: [
      point(-1, 0), point(-0.82, 0), point(-0.74, 0.18), point(-0.74, 0.42),
      point(-0.88, 0.5), point(-0.88, 0.7), point(-0.68, 0.88), point(-0.52, 0.92),
      point(-0.36, 0.88), point(-0.16, 0.7), point(-0.16, 0.5), point(-0.3, 0.42),
      point(-0.3, 0.18), point(-0.22, 0), point(0.12, 0), point(0.2, -0.18),
      point(0.2, -0.42), point(0.06, -0.5), point(0.06, -0.7), point(0.26, -0.88),
      point(0.42, -0.92), point(0.58, -0.88), point(0.78, -0.7), point(0.78, -0.5),
      point(0.64, -0.42), point(0.64, -0.18), point(0.72, 0), point(1, 0),
    ],
  },
  {
    id: "notched-head",
    label: "Notched head",
    scope: "connector",
    disposition: "carry-forward",
    sourceProbeIds: ["notched-head", "nested-lock"],
    rationale:
      "A singular cleft remains a readable structural clue; the attempted nested lock collapses into this same simple-open-seam silhouette.",
    points: [
      point(-1, 0), point(-0.34, 0), point(-0.24, 0.2), point(-0.24, 0.48),
      point(-0.5, 0.58), point(-0.5, 0.82), point(-0.3, 1.02), point(-0.12, 1.1),
      point(0, 0.78), point(0.12, 1.1), point(0.3, 1.02), point(0.5, 0.82),
      point(0.5, 0.58), point(0.24, 0.48), point(0.24, 0.2), point(0.34, 0),
      point(1, 0),
    ],
  },
  {
    id: "connectorless-wave",
    label: "Connectorless wave",
    scope: "seam",
    disposition: "carry-forward",
    sourceProbeIds: ["connector-cardinality"],
    rationale:
      "A full shared interior seam can remain shape-rich without a local interlocking event, making zero connector cardinality worth a controlled play probe.",
    points: [
      point(-1, 0), point(-0.72, 0.22), point(-0.48, 0.42), point(-0.24, 0),
      point(0, -0.38), point(0.24, 0), point(0.48, 0.32), point(0.72, 0),
      point(1, 0),
    ],
  },
  {
    id: "asymmetric-catch",
    label: "Asymmetric catch",
    scope: "connector",
    disposition: "collapse",
    sourceProbeIds: ["asymmetric-catch"],
    comparisonGroup: "scoop-adjacent",
    rationale:
      "The open-seam realization reads as a Scoop variant rather than a new irreducible construction.",
    points: [
      point(-1, 0), point(-0.72, 0), point(-0.56, 0.18), point(-0.48, 0.46),
      point(-0.22, 0.82), point(0.1, 0.96), point(0.36, 0.88), point(0.5, 0.68),
      point(0.48, 0.5), point(0.18, 0.44), point(-0.08, 0.34), point(0.1, 0.22),
      point(0.42, 0.12), point(0.62, 0.02), point(1, 0),
    ],
  },
  {
    id: "hook-catch",
    label: "Hook catch",
    scope: "connector",
    disposition: "collapse",
    sourceProbeIds: ["hook-catch"],
    comparisonGroup: "scoop-adjacent",
    rationale:
      "Longitudinal backtracking is visible, but the safe open-seam result occupies the same perceptual neighborhood as Asymmetric catch and Scoop.",
    points: [
      point(-1, 0), point(-0.72, 0), point(-0.58, 0.22), point(-0.5, 0.58),
      point(-0.18, 0.92), point(0.24, 0.96), point(0.48, 0.78), point(0.5, 0.58),
      point(0.22, 0.54), point(-0.1, 0.48), point(-0.28, 0.34), point(-0.14, 0.22),
      point(0.16, 0.16), point(0.46, 0.1), point(0.66, 0.02), point(1, 0),
    ],
  },
  {
    id: "nested-lock",
    label: "Nested lock",
    scope: "connector",
    disposition: "defer",
    sourceProbeIds: ["nested-lock"],
    comparisonGroup: "notched-head",
    rationale:
      "On one simple open boundary, visible nesting becomes a notch; true containment likely requires enclosed or branching geometry and therefore crosses toward topology.",
    points: [
      point(-1, 0), point(-0.34, 0), point(-0.24, 0.2), point(-0.24, 0.5),
      point(-0.52, 0.6), point(-0.52, 0.82), point(-0.32, 1), point(-0.16, 1.08),
      point(-0.07, 0.88), point(0, 0.68), point(0.07, 0.88), point(0.16, 1.08),
      point(0.32, 1), point(0.52, 0.82), point(0.52, 0.6), point(0.24, 0.5),
      point(0.24, 0.2), point(0.34, 0), point(1, 0),
    ],
  },
];

export const jigsawEdgeCarryForwardProbeIds = [
  "compound-lock",
  "opposed-dual-lock",
  "notched-head",
  "connectorless-wave",
] as const;

export type JigsawEdgeExplorationValidation =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "anchor-mismatch"
        | "non-finite-coordinate"
        | "bounds"
        | "self-intersection";
    };

const epsilon = 1e-9;

const cross = (
  start: JigsawEdgeExplorationPoint,
  end: JigsawEdgeExplorationPoint,
  candidate: JigsawEdgeExplorationPoint,
) =>
  (end.x - start.x) * (candidate.y - start.y) -
  (end.y - start.y) * (candidate.x - start.x);

const segmentsProperlyIntersect = (
  firstStart: JigsawEdgeExplorationPoint,
  firstEnd: JigsawEdgeExplorationPoint,
  secondStart: JigsawEdgeExplorationPoint,
  secondEnd: JigsawEdgeExplorationPoint,
) => {
  const firstA = cross(firstStart, firstEnd, secondStart);
  const firstB = cross(firstStart, firstEnd, secondEnd);
  const secondA = cross(secondStart, secondEnd, firstStart);
  const secondB = cross(secondStart, secondEnd, firstEnd);

  return (
    ((firstA > epsilon && firstB < -epsilon) ||
      (firstA < -epsilon && firstB > epsilon)) &&
    ((secondA > epsilon && secondB < -epsilon) ||
      (secondA < -epsilon && secondB > epsilon))
  );
};

export const validateJigsawEdgeExplorationProbe = (
  probe: JigsawEdgeExplorationProbe,
): JigsawEdgeExplorationValidation => {
  const first = probe.points[0];
  const last = probe.points.at(-1);
  if (
    !first ||
    !last ||
    Math.abs(first.x + 1) > epsilon ||
    Math.abs(first.y) > epsilon ||
    Math.abs(last.x - 1) > epsilon ||
    Math.abs(last.y) > epsilon
  ) {
    return { valid: false, reason: "anchor-mismatch" };
  }

  if (
    probe.points.some(
      (candidate) =>
        !Number.isFinite(candidate.x) || !Number.isFinite(candidate.y),
    )
  ) {
    return { valid: false, reason: "non-finite-coordinate" };
  }

  if (
    probe.points.some(
      (candidate) =>
        candidate.x < -1.05 ||
        candidate.x > 1.05 ||
        candidate.y < -1.2 ||
        candidate.y > 1.2,
    )
  ) {
    return { valid: false, reason: "bounds" };
  }

  const segmentCount = probe.points.length - 1;
  for (let firstIndex = 0; firstIndex < segmentCount; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 2;
      secondIndex < segmentCount;
      secondIndex += 1
    ) {
      if (
        segmentsProperlyIntersect(
          probe.points[firstIndex]!,
          probe.points[firstIndex + 1]!,
          probe.points[secondIndex]!,
          probe.points[secondIndex + 1]!,
        )
      ) {
        return { valid: false, reason: "self-intersection" };
      }
    }
  }

  return { valid: true };
};

export const getJigsawEdgeCarryForwardProbes = () =>
  jigsawEdgeExplorationProbes.filter(
    (probe) => probe.disposition === "carry-forward",
  );
