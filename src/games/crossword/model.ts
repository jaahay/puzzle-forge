export type CrosswordDirection = "across" | "down";

export type CrosswordEntry = {
  number: number;
  direction: CrosswordDirection;
  cells: readonly number[];
};

export type CrosswordTopology = {
  width: number;
  height: number;
  blocks: readonly boolean[];
  numbers: readonly (number | null)[];
  entries: readonly CrosswordEntry[];
};

export type CrosswordClue = {
  answer: string;
  clue: string;
};

export type CrosswordBoard = Omit<CrosswordTopology, "entries"> & {
  format: "mini";
  seed: string;
  solution: string; // Row-major ASCII letters and # for blocks.
  entries: readonly (CrosswordEntry & { clue: string })[];
  checksum: string;
};

// Read maximal runs; number shared Across/Down starts only once.
export const buildCrosswordTopology = (rows: readonly string[]): CrosswordTopology => {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (!width || !height || rows.some(row => row.length !== width || !/^[.#]+$/.test(row))) {
    throw new Error("Malformed crossword layout.");
  }
  const blocks = [...rows.join("")].map(cell => cell === "#");
  const numbers: (number | null)[] = blocks.map(() => null);
  const entries: CrosswordEntry[] = [];
  const coverage = blocks.map(() => 0);
  let number = 0;
  for (let cell = 0; cell < blocks.length; cell++) {
    if (blocks[cell]) continue;
    const across = cell % width === 0 || blocks[cell - 1];
    const down = cell < width || blocks[cell - width];
    if (!across && !down) continue;
    numbers[cell] = ++number;
    for (const direction of ["across", "down"] as const) {
      if (direction === "across" ? !across : !down) continue;
      const step = direction === "across" ? 1 : width;
      const cells: number[] = [];
      for (let i = cell; i < blocks.length && !blocks[i]
          && (direction === "down" || Math.floor(i / width) === Math.floor(cell / width)); i += step) {
        cells.push(i);
        coverage[i]++;
      }
      if (cells.length < 3) throw new Error("Crossword entries must contain at least three letters.");
      entries.push({ number, direction, cells });
    }
  }
  if (!entries.length || blocks.some((block, cell) => !block && coverage[cell] !== 2)) {
    throw new Error("Crossword layout must be fully checked.");
  }

  // Fully checked islands are still disconnected; require one playable region.
  const first = blocks.findIndex(block => !block);
  const seen = new Set([first]);
  const queue = [first];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const i = queue[cursor];
    const neighbors = [i - width, i + width];
    if (i % width > 0) neighbors.push(i - 1);
    if (i % width < width - 1) neighbors.push(i + 1);
    for (const neighbor of neighbors) {
      if (neighbor < 0 || neighbor >= blocks.length || blocks[neighbor] || seen.has(neighbor)) continue;
      seen.add(neighbor);
      queue.push(neighbor);
    }
  }
  if (seen.size !== blocks.filter(block => !block).length) {
    throw new Error("Crossword layout is disconnected.");
  }
  return { width, height, blocks, numbers, entries };
};
