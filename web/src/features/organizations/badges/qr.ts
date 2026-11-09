/**
 * qr.ts
 * -----------------------------------------------------------------------------
 * Small, dependency-free QR code generator for member badges.
 *
 *   qrMatrix("https://…")  → boolean[][] (true = dark module)
 *   qrSvgPath(matrix)      → SVG path data for <QrCode/>
 *
 * Byte mode, error-correction level M, versions 1–10 (up to 213 bytes),
 * automatic mask selection. Written from the QR Code specification
 * (ISO/IEC 18004).
 * -----------------------------------------------------------------------------
 */

/* Error-correction level M: [ecCodewordsPerBlock, [blocks, dataCodewordsPerBlock][]] */
const EC_M: Record<number, [number, [number, number][]]> = {
  1: [10, [[1, 16]]],
  2: [16, [[1, 28]]],
  3: [26, [[1, 44]]],
  4: [18, [[2, 32]]],
  5: [24, [[2, 43]]],
  6: [16, [[4, 27]]],
  7: [18, [[4, 31]]],
  8: [22, [[2, 38], [2, 39]]],
  9: [22, [[3, 36], [2, 37]]],
  10: [26, [[4, 43], [1, 44]]],
};

const ALIGN: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

/* ------------------------------------------------------------- GF(256) */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const gmul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly; // leading coefficient 1
}

function rsRemainder(data: number[], degree: number): number[] {
  const gen = rsGenerator(degree);
  const rem = new Array(degree).fill(0);
  for (const b of data) {
    const factor = b ^ rem[0];
    rem.shift();
    rem.push(0);
    for (let i = 0; i < degree; i++) rem[i] ^= gmul(gen[i + 1], factor);
  }
  return rem;
}

/* ------------------------------------------------------------ encoding */

function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function capacity(version: number): number {
  return EC_M[version][1].reduce((sum, [n, d]) => sum + n * d, 0);
}

function encodeData(bytes: number[], version: number): number[] {
  const bits: number[] = [];
  const put = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  put(0b0100, 4); // byte mode
  put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  const capBits = capacity(version) * 8;
  put(0, Math.min(4, capBits - bits.length)); // terminator
  while (bits.length % 8) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let pad = 0xec; out.length < capacity(version); pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

function interleave(data: number[], version: number): number[] {
  const [ecLen, groups] = EC_M[version];
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let k = 0;
  for (const [count, len] of groups) {
    for (let i = 0; i < count; i++) {
      const block = data.slice(k, k + len);
      k += len;
      blocks.push(block);
      ecBlocks.push(rsRemainder(block, ecLen));
    }
  }
  const out: number[] = [];
  const maxLen = Math.max(...blocks.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) for (const b of blocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < ecLen; i++) for (const b of ecBlocks) out.push(b[i]);
  return out;
}

/* ---------------------------------------------------------- the matrix */

type Grid = { size: number; dark: boolean[][]; fixed: boolean[][] };

function newGrid(version: number): Grid {
  const size = version * 4 + 17;
  return {
    size,
    dark: Array.from({ length: size }, () => new Array(size).fill(false)),
    fixed: Array.from({ length: size }, () => new Array(size).fill(false)),
  };
}

function set(g: Grid, x: number, y: number, dark: boolean) {
  g.dark[y][x] = dark;
  g.fixed[y][x] = true;
}

function drawFunctionPatterns(g: Grid, version: number) {
  const { size } = g;
  // Timing
  for (let i = 0; i < size; i++) {
    set(g, 6, i, i % 2 === 0);
    set(g, i, 6, i % 2 === 0);
  }
  // Finders + separators
  for (const [cx, cy] of [
    [3, 3],
    [size - 4, 3],
    [3, size - 4],
  ]) {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(g, x, y, d !== 2 && d !== 4);
      }
  }
  // Alignment
  const pos = ALIGN[version];
  for (let i = 0; i < pos.length; i++)
    for (let j = 0; j < pos.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) set(g, pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  // Reserve format areas (filled later) + dark module
  drawFormat(g, 0);
  // Version info
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = ((bits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(g, a, b, dark);
      set(g, b, a, dark);
    }
  }
}

function drawFormat(g: Grid, mask: number) {
  const { size } = g;
  const data = (0b00 << 3) | mask; // level M = 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412;
  const bit = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) set(g, 8, i, bit(i));
  set(g, 8, 7, bit(6));
  set(g, 8, 8, bit(7));
  set(g, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) set(g, 14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) set(g, size - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) set(g, 8, size - 15 + i, bit(i));
  set(g, 8, size - 8, true); // dark module
}

function drawCodewords(g: Grid, codewords: number[]) {
  const { size } = g;
  let i = 0;
  const total = codewords.length * 8;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!g.fixed[y][x] && i < total) {
          g.dark[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
      }
    }
  }
}

const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function applyMask(g: Grid, mask: number) {
  for (let y = 0; y < g.size; y++)
    for (let x = 0; x < g.size; x++) if (!g.fixed[y][x] && MASKS[mask](x, y)) g.dark[y][x] = !g.dark[y][x];
}

function penalty(m: boolean[][]): number {
  const n = m.length;
  let score = 0;
  const line = (get: (i: number, j: number) => boolean) => {
    for (let i = 0; i < n; i++) {
      let run = 1;
      for (let j = 1; j <= n; j++) {
        if (j < n && get(i, j) === get(i, j - 1)) run++;
        else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      // finder-like 1:1:3:1:1 with 4 light on one side
      for (let j = 0; j + 10 < n; j++) {
        const s = Array.from({ length: 11 }, (_, k) => get(i, j + k));
        const a = [true, false, true, true, true, false, true, false, false, false, false];
        const b = [false, false, false, false, true, false, true, true, true, false, true];
        if (a.every((v, k) => v === s[k]) || b.every((v, k) => v === s[k])) score += 40;
      }
    }
  };
  line((i, j) => m[i][j]);
  line((i, j) => m[j][i]);
  for (let y = 0; y + 1 < n; y++)
    for (let x = 0; x + 1 < n; x++) {
      const c = m[y][x];
      if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
    }
  const dark = m.reduce((s, row) => s + row.filter(Boolean).length, 0);
  score += Math.floor(Math.abs((dark * 20) / (n * n) - 10)) * 10;
  return score;
}

/** QR matrix for `text`; throws if it is longer than ~213 bytes. */
export function qrMatrix(text: string): boolean[][] {
  const bytes = utf8(text);
  let version = 1;
  while (version <= 10 && 4 + (version < 10 ? 8 : 16) + bytes.length * 8 > capacity(version) * 8) version++;
  if (version > 10) throw new Error("Text too long for a badge QR code.");

  const codewords = interleave(encodeData(bytes, version), version);
  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const g = newGrid(version);
    drawFunctionPatterns(g, version);
    drawCodewords(g, codewords);
    applyMask(g, mask);
    drawFormat(g, mask);
    const s = penalty(g.dark);
    if (s < bestScore) {
      bestScore = s;
      best = g.dark.map((row) => row.slice());
    }
  }
  return best!;
}

/** One SVG path drawing every dark module (1 unit each), with a 4-unit quiet zone. */
export function qrSvgPath(m: boolean[][], quiet = 4): string {
  let d = "";
  for (let y = 0; y < m.length; y++)
    for (let x = 0; x < m.length; x++) if (m[y][x]) d += `M${x + quiet} ${y + quiet}h1v1h-1z`;
  return d;
}
