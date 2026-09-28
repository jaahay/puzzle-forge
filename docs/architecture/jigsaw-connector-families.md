# Jigsaw Connector Family Design

This document is the visual and geometric reference for Puzzle Forge's ordinary Jigsaw connector families.

Its primary purpose is identification: given a rendered seam, a contributor should be able to answer **which family is this?** without reading the path generator. It also records the design intent behind each family so future tuning preserves genuinely different silhouettes instead of collapsing the catalog back into variations of the same rounded bump.

The implementation lives in:

- `src/games/jigsaw/edgeProfiles.ts` — family names, descriptions, and selection weights.
- `src/games/jigsaw/edgePaths.ts` — canonical geometry, seeded variation, rendering mode, and safety envelope.

The numeric ranges below are a tuning snapshot, not a compatibility or versioning contract.

## Rollout model

For the initial rollout, a generated Jigsaw chooses **one ordinary connector family for the entire puzzle**.

Individual seams still vary by seed:

- width/span;
- depth/height;
- left/right placement;
- lean;
- family-specific character;
- handedness for directional families;
- tab/blank polarity.

This gives each puzzle a coherent cut personality while making the differences between families obvious from game to game.

Rare one-off anomalies are a separate future direction in #190. Non-grid/special piece topology belongs to #191.

## How to identify a family

Ignore whether the seam is a tab or a blank. Polarity flips the same family inward or outward.

Also ignore exact size and placement. A family can be wide or narrow within its tuning range and may sit left or right of the edge midpoint.

Instead, identify the family by its **structural cue**:

| Family | Fastest recognition cue |
| --- | --- |
| Classic bulb | Familiar smooth single rounded knob |
| Mushroom | Narrow neck under a broad overhanging cap |
| Keyhole | Thin stem opening into a compact round head |
| Dovetail | Straight-sided trapezoidal flare |
| T-lock | Narrow stem ending in a horizontal crossbar |
| Bottle | Long neck flowing into an offset rounded body |
| Hook | Sideways curl / hooked return |
| Teardrop | Asymmetric rounded body with a pointed tip |
| Double lobe | Two visible rounded humps |
| Crescent | Broad sweep interrupted by a deep inward scoop |
| S-lock | Serpentine seam that crosses the edge baseline |
| Lightning | Sharp directional zig-zag |
| Castle | Rectilinear stepped / crenellated profile |
| Arrowhead | Narrow stem flaring into a pointed head |

A useful rule of thumb:

- **Classic bulb** is the baseline conventional jigsaw connector.
- **Mushroom, keyhole, dovetail, T-lock, and arrowhead** are primarily identified by the relationship between a narrow root and a wider head.
- **Bottle, hook, teardrop, crescent, S-lock, and lightning** are directional and may mirror left/right.
- **Double lobe** is identified by multiplicity: two rounded crowns.
- **Castle** is identified by steps rather than a single crown.

## Graphical atlas

The atlas below is generated from the same canonical geometry used by the renderer, rather than redrawn by hand.

![High-fidelity Jigsaw connector family atlas](./assets/jigsaw-connector-family-atlas.svg)

Each family shows:

- **TAB** — one representative outward seam;
- **BLANK** — the exact same seeded family specimen with inverse polarity;
- **LEFT / CENTER / RIGHT** — seeded specimens selected to show the family under visibly different legal placements along the edge.

The dashed horizontal line is the nominal uncut edge. It is especially useful for recognizing families such as S-lock that deliberately cross the baseline.

The atlas is a high-fidelity **design snapshot**, not a compatibility contract. If family geometry is tuned, regenerate the atlas from the current connector definitions rather than hand-editing its paths.

[Open the atlas directly](./assets/jigsaw-connector-family-atlas.svg)

## Geometry conventions

All ordinary seams begin from a canonical two-dimensional path.

The model is intentionally not restricted to a height function such as `y = f(x)`. A connector may:

- backtrack along the edge axis;
- create a true neck or overhang;
- cross the nominal baseline;
- contain rectilinear steps;
- lean or sweep to one side.

The neighboring piece receives the exact reversed/complementary seam.

### Span

The current catalog uses a large portion of the available edge. Typical family span ranges are roughly 62–90% of one side.

The connector is not required to be centered. Its legal center interval is derived from its actual seeded horizontal extent plus a family-specific corner buffer.

### Height

Broad geometry should not become visually stumpy. Every ordinary family is expected to retain a substantial vertical-to-horizontal proportion.

The per-family `depth` range is a **scale parameter**, not necessarily the exact rendered maximum: each family's normalized anchors may peak above or below `1.0`, and S-lock uses both positive and negative depth. The global safety envelope permits rendered geometry up to 32% of a piece side, while each family keeps a smaller topology-specific scale range chosen to keep complete pieces non-self-intersecting.

### Smooth versus angular rendering

Organic families render with cubic Bézier curves:

- Classic bulb
- Mushroom
- Keyhole
- Bottle
- Hook
- Teardrop
- Double lobe
- Crescent
- S-lock

Mechanical/angular families deliberately retain straight segments:

- Dovetail
- T-lock
- Lightning
- Castle
- Arrowhead

This distinction is part of the family identity, not merely a renderer implementation detail.

## Family catalog

### 1. Classic bulb

**Identity:** the familiar conventional jigsaw knob.

**Look for:** one smooth, symmetric rounded crown with gently rising shoulders. There is no dramatic neck, crossbar, scoop, or secondary lobe.

**Why it exists:** it is the visual baseline against which the more unusual families should read as meaningfully different.

**Current tuning:**

- span: 64–82%;
- depth scale: 18–26%;
- corner buffer: 7%;
- smooth: yes;
- directional mirror: no.

**Do not let it become:** Mushroom-lite. The shoulders should transition continuously into the crown rather than pinching into an obvious neck.

---

### 2. Mushroom

**Identity:** broad cap over a visibly narrower throat.

**Look for:** the seam narrows first, then widens again into an overhanging rounded cap. The undercut is the defining feature.

**Why it is distinct from Keyhole:** Mushroom's head is broad and cap-like, with wide overhangs. Keyhole has a more compact, rounded head on a thinner stem.

**Current tuning:**

- span: 72–88%;
- depth scale: 20–26%;
- corner buffer: 6%;
- smooth: yes;
- directional mirror: no.

**Do not let it become:** a wide Classic bulb. If the neck/undercut is not obvious at play scale, it has lost its identity.

---

### 3. Keyhole

**Identity:** thin stem leading into a compact round head.

**Look for:** a comparatively narrow shaft, a sudden transition into a near-circular crown, and then a return through the same narrow throat.

**Why it is distinct from Mushroom:** the head feels like a discrete round chamber rather than a broad cap.

**Current tuning:**

- span: 62–78%;
- depth scale: 20–27%;
- corner buffer: 7%;
- smooth: yes;
- directional mirror: no.

**Do not let it become:** a generic lollipop. The transition between stem and head should retain a true geometric neck.

---

### 4. Dovetail

**Identity:** mechanical trapezoidal flare.

**Look for:** straight lines widening from a narrow root into a broad, flat-topped or nearly flat-topped lock.

**Why it is distinct:** it reads as joinery rather than an organic knob.

**Current tuning:**

- span: 66–84%;
- depth scale: 22–28%;
- corner buffer: 7%;
- smooth: no;
- directional mirror: no.

**Safety note:** very deep all-blank Dovetails can collide across a piece corner, so its depth ceiling is intentionally topology-specific.

---

### 5. T-lock

**Identity:** stem plus crossbar.

**Look for:** a narrow vertical stem that reaches a conspicuously wider horizontal rectangular crown.

**Why it is distinct from Dovetail:** Dovetail flares continuously; T-lock changes width abruptly into a crossbar.

**Current tuning:**

- span: 64–82%;
- depth scale: 20–27%;
- corner buffer: 7%;
- smooth: no;
- directional mirror: no.

**Do not let it become:** a stepped Castle. T-lock should remain one stem and one dominant bar.

---

### 6. Bottle

**Identity:** narrow neck flowing into an offset rounded body.

**Look for:** a long neck and a fuller body that leans or bulges more strongly to one side.

**Why it is distinct:** its silhouette is organic but clearly directional.

**Current tuning:**

- span: 70–88%;
- depth scale: 20–27%;
- corner buffer: 6%;
- smooth: yes;
- directional mirror: yes.

**Do not let it become:** a symmetric Keyhole. Some imbalance between the two sides is essential.

---

### 7. Hook

**Identity:** sideways curl.

**Look for:** the seam rises, sweeps sideways, curls back inward, and then escapes toward the edge. It should have a visibly hooked or curled gesture rather than a single crown.

**Why it is distinct:** it is the strongest organic directional family.

**Current tuning:**

- span: 64–80%;
- depth scale: 18–23%;
- corner buffer: 10%;
- smooth: yes;
- directional mirror: yes.

**Safety note:** Hook's curl reaches laterally as well as vertically, so it uses more corner room and a lower depth ceiling than most broad families.

**Do not let it become:** merely a leaning bulb. The curl/return is the identifier.

---

### 8. Teardrop

**Identity:** rounded asymmetric body terminating in a point.

**Look for:** one side swells into a rounded body while the crown converges toward an offset pointed tip.

**Why it is distinct:** the point is organic rather than angular; it should feel like a droplet, leaf, or flame.

**Current tuning:**

- span: 68–86%;
- depth scale: 19–26%;
- corner buffer: 6%;
- smooth: yes;
- directional mirror: yes.

**Do not let it become:** Arrowhead. Teardrop's shoulders/body remain curved.

---

### 9. Double lobe

**Identity:** two rounded crowns.

**Look for:** two distinct humps separated by a central saddle.

**Why it is distinct:** it is the only ordinary family whose primary cue is a repeated crown.

**Current tuning:**

- span: 74–90%;
- depth scale: 20–27%;
- corner buffer: 5%;
- smooth: yes;
- directional mirror: no.

**Do not let it become:** one broad crown with surface wiggle. The two lobes should remain individually legible.

---

### 10. Crescent

**Identity:** broad outward sweep with a pronounced inward bite.

**Look for:** a large rounded bulge followed by a scoop that cuts back toward the edge before the seam returns.

**Why it is distinct:** the concave scoop is as important as the outward crown.

**Current tuning:**

- span: 74–90%;
- depth scale: 20–27%;
- corner buffer: 5%;
- smooth: yes;
- directional mirror: yes.

**Do not let it become:** an asymmetric bulb. The inward scoop must remain unmistakable.

---

### 11. S-lock

**Identity:** baseline-crossing serpentine seam.

**Look for:** part of the connector protrudes to one side of the nominal edge and another part crosses through to the opposite side, producing an S-like interlock.

**Why it is distinct:** this is the clearest demonstration that connector geometry is truly two-dimensional and not a one-sided bump function.

**Current tuning:**

- span: 76–90%;
- depth scale: 24–30%;
- corner buffer: 5%;
- smooth: yes;
- directional mirror: yes.

**Important:** because S-lock crosses the baseline, its visual height is split across both sides of the nominal edge rather than represented by one outward crown.

---

### 12. Lightning

**Identity:** sharp zig-zag bolt.

**Look for:** abrupt diagonal changes, offsets, and a strongly directional angular path.

**Why it is distinct:** it has neither a rounded crown nor a mechanical rectangular lock; it reads as a jagged stroke.

**Current tuning:**

- span: 68–86%;
- depth scale: 20–27%;
- corner buffer: 6%;
- smooth: no;
- directional mirror: yes.

**Do not let it become:** Arrowhead. Lightning should remain multi-turn and zig-zagged rather than converging on one dominant point.

---

### 13. Castle

**Identity:** stepped crenellation.

**Look for:** horizontal shelves and vertical rises resembling battlements or a blocky skyline.

**Why it is distinct:** its identity comes from multiple rectilinear levels rather than a stem-and-head structure.

**Current tuning:**

- span: 70–88%;
- depth scale: 21–27%;
- corner buffer: 6%;
- smooth: no;
- directional mirror: no.

**Do not let it become:** T-lock. Castle needs multiple steps/levels.

---

### 14. Arrowhead

**Identity:** narrow stem flaring into a pointed head.

**Look for:** straight shoulders that widen into an unmistakable triangular point, with clear undercuts where the head meets the stem.

**Why it is distinct:** it combines the narrow-root family with a sharp pointed crown.

**Current tuning:**

- span: 66–84%;
- depth scale: 20–27%;
- corner buffer: 7%;
- smooth: no;
- directional mirror: no.

**Do not let it become:** Teardrop. Arrowhead should remain explicitly straight-edged and geometric.

## Family comparison by structural feature

| Family | Smooth | Undercut / backtrack | Baseline crossing | Directional / mirrorable | Multiple crown features | Strongly rectilinear |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Classic bulb | ✓ |  |  |  |  |  |
| Mushroom | ✓ | ✓ |  |  |  |  |
| Keyhole | ✓ | ✓ |  |  |  |  |
| Dovetail |  | ✓ |  |  |  | ✓ |
| T-lock |  | ✓ |  |  |  | ✓ |
| Bottle | ✓ | ✓ |  | ✓ |  |  |
| Hook | ✓ | ✓ |  | ✓ | ✓ |  |
| Teardrop | ✓ | ✓ |  | ✓ |  |  |
| Double lobe | ✓ | ✓ |  |  | ✓ |  |
| Crescent | ✓ | ✓ |  | ✓ |  |  |
| S-lock | ✓ | ✓ | ✓ | ✓ | ✓ |  |
| Lightning |  | ✓ |  | ✓ | ✓ | ✓ |
| Castle |  |  |  |  | ✓ | ✓ |
| Arrowhead |  | ✓ |  |  |  | ✓ |

## Seeded variation versus family identity

Seeded variation should make repeated seams within one puzzle feel handmade/generative, but it must not obscure which family the puzzle uses.

Variation is healthy when it changes:

- overall size;
- depth;
- position along the edge;
- lean;
- handedness;
- relative lobe/cap proportions.

Variation is unhealthy when it erases the family's recognition cue.

Examples:

- a Mushroom may have a narrower or wider cap, but it must still have a visible neck and overhang;
- a Hook may curl left or right, but it must still curl;
- a Double lobe may have unequal humps, but both lobes must remain legible;
- a Castle may vary step heights, but it must remain stepped;
- an S-lock may change handedness and amplitude, but it must still cross the baseline.

## Safety invariants

Expressiveness is bounded by piece validity.

The generator and tests enforce:

- boundary edges remain flat;
- reciprocal neighboring seams match exactly;
- individual seams do not self-intersect;
- complete piece outlines do not self-intersect;
- complete-piece safety is exercised across all-tab, all-blank, and alternating polarity patterns;
- generated one-family boards remain valid;
- geometry remains inside the declared visual/hit-test envelope;
- every family retains a substantial vertical-to-horizontal proportion.

Family-specific limits are intentional. A topology such as Hook can become unsafe from lateral curl before another family with the same nominal depth does. Safety should therefore be tuned per family rather than by forcing all families into one identical numeric range.

## Future directions

The ordinary catalog should remain coherent rather than absorbing every unusual idea.

### Rare anomalies — #190

Examples:

- a single bizarre connector in an otherwise conventional-family puzzle;
- an intentionally oversized or surprising local interlock;
- special geometry whose product value depends on rarity.

### Non-grid topology — #191

Examples:

- a literal circular center piece;
- neighboring pieces that collectively encircle that circle;
- pieces with other than four nominal sides;
- arbitrary neighbor counts;
- special piece graphs not representable as a rectangular four-edge cell.

Those ideas may share rendering primitives with the ordinary connector system, but they are not additional ordinary connector families.
