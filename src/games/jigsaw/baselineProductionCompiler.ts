import type {
  JigsawBaselinePrimitive,
  JigsawBaselineProduction,
} from "./baselineProduction";

export type JigsawBaselineInstruction = {
  primitive: JigsawBaselinePrimitive;
  normalDirection: -1 | 1;
  traversalDirection: -1 | 1;
};

type CompileContext = Pick<
  JigsawBaselineInstruction,
  "normalDirection" | "traversalDirection"
>;

const flipDirection = (direction: -1 | 1): -1 | 1 =>
  direction === 1 ? -1 : 1;

const compileProduction = (
  production: JigsawBaselineProduction,
  context: CompileContext,
): JigsawBaselineInstruction[] => {
  switch (production.kind) {
    case "primitive":
      return [{
        primitive: production.primitive,
        normalDirection: context.normalDirection,
        traversalDirection: context.traversalDirection,
      }];
    case "sequence": {
      const terms = context.traversalDirection === 1
        ? production.terms
        : [...production.terms].reverse();

      return terms.flatMap((term) => compileProduction(term, context));
    }
    case "repeat":
      return Array.from(
        { length: production.count },
        () => compileProduction(production.term, context),
      ).flat();
    case "oppose":
      return compileProduction(production.term, {
        normalDirection: flipDirection(context.normalDirection),
        traversalDirection: context.traversalDirection,
      });
    case "mirror":
      return compileProduction(production.term, {
        normalDirection: context.normalDirection,
        traversalDirection: flipDirection(context.traversalDirection),
      });
  }
};

/**
 * Compile a structural BaselineProduction into an executable semantic trace.
 *
 * The trace deliberately stops before geometry. Each primitive retains the
 * normal-side and local traversal reflections contributed by enclosing
 * oppose/mirror combinators, while a mirrored sequence is emitted in reflected
 * traversal order. A future geometry compiler can therefore execute arbitrary
 * productions without depending on the named BaselineGrammar catalog.
 */
export const compileJigsawBaselineProduction = (
  production: JigsawBaselineProduction,
): readonly JigsawBaselineInstruction[] =>
  compileProduction(production, {
    normalDirection: 1,
    traversalDirection: 1,
  });
