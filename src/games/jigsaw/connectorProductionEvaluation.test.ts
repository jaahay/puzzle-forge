import { describe, expect, it } from "vitest";
import { jigsawConnectorGrammarIds } from "./connectorGrammar";
import {
  connectorMirror,
  connectorNest,
  connectorOppose,
  connectorPrimitive,
  connectorSequence,
  getCanonicalConnectorProductionSignatures,
  getJigsawConnectorProductionStructure,
  jigsawBaselineExplorationGaps,
  jigsawConnectorCanonicalProductions,
  jigsawConnectorExplorationProbes,
  jigsawSeamExplorationGaps,
} from "./connectorProductionEvaluation";

describe("Jigsaw connector production evaluation", () => {
  it("represents every current connector family with one structural production", () => {
    expect(Object.keys(jigsawConnectorCanonicalProductions).sort()).toEqual(
      [...jigsawConnectorGrammarIds].sort(),
    );

    const signatures = [
      ...getCanonicalConnectorProductionSignatures().values(),
    ];
    expect(new Set(signatures).size).toBe(jigsawConnectorGrammarIds.length);
  });

  it("keeps exploration probes structurally distinct from the current catalog", () => {
    const canonical = new Set(
      getCanonicalConnectorProductionSignatures().values(),
    );
    const probes = jigsawConnectorExplorationProbes.map((probe) =>
      getJigsawConnectorProductionStructure(probe.production),
    );

    expect(new Set(probes).size).toBe(probes.length);
    expect(probes.every((signature) => !canonical.has(signature))).toBe(true);
  });

  it("covers the underexplored ordinary-seam neighborhoods explicitly", () => {
    expect(
      new Set(jigsawConnectorExplorationProbes.map((probe) => probe.axis)),
    ).toEqual(
      new Set([
        "multi-lock",
        "mixed-polarity",
        "asymmetric-catch",
        "nested-lock",
        "singular-notch",
        "longitudinal-reversal",
        "mixed-lock",
      ]),
    );
  });

  it("proves connector composition needs more than sequence and repeat to explore the full space", () => {
    const lobe = connectorPrimitive("lobe");
    const head = connectorPrimitive("head");
    const asymmetric = connectorSequence(
      connectorPrimitive("outer-sweep"),
      connectorPrimitive("scoop"),
      connectorPrimitive("return"),
    );

    expect(getJigsawConnectorProductionStructure(connectorOppose(lobe)))
      .not.toBe(getJigsawConnectorProductionStructure(lobe));
    expect(getJigsawConnectorProductionStructure(connectorMirror(asymmetric)))
      .not.toBe(getJigsawConnectorProductionStructure(asymmetric));
    expect(
      getJigsawConnectorProductionStructure(connectorNest(lobe, head)),
    ).not.toBe(
      getJigsawConnectorProductionStructure(connectorOppose(lobe)),
    );
  });

  it("records seam-cardinality and baseline-language gaps separately from connector structure", () => {
    expect(jigsawSeamExplorationGaps.map((gap) => gap.id)).toEqual([
      "connector-cardinality",
    ]);
    expect(jigsawBaselineExplorationGaps.map((gap) => gap.id)).toEqual([
      "separated-gestures",
      "longitudinal-reversal",
      "scale-hierarchy",
    ]);
  });

  it("does not promote exploratory probes into the production connector catalog", () => {
    const productionIds = new Set<string>(jigsawConnectorGrammarIds);

    for (const probe of jigsawConnectorExplorationProbes) {
      expect(productionIds.has(probe.id)).toBe(false);
    }
  });
});
