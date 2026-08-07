/** Map a rectangle onto a perspective quad via CSS matrix3d. */

export type Point = { x: number; y: number };

function at(m: number[], i: number): number {
  return m[i] ?? 0;
}

function adj(m: number[]): number[] {
  return [
    at(m, 4) * at(m, 8) - at(m, 5) * at(m, 7),
    at(m, 2) * at(m, 7) - at(m, 1) * at(m, 8),
    at(m, 1) * at(m, 5) - at(m, 2) * at(m, 4),
    at(m, 5) * at(m, 6) - at(m, 3) * at(m, 8),
    at(m, 0) * at(m, 8) - at(m, 2) * at(m, 6),
    at(m, 2) * at(m, 3) - at(m, 0) * at(m, 5),
    at(m, 3) * at(m, 7) - at(m, 4) * at(m, 6),
    at(m, 1) * at(m, 6) - at(m, 0) * at(m, 7),
    at(m, 0) * at(m, 4) - at(m, 1) * at(m, 3),
  ];
}

function multmm(a: number[], b: number[]): number[] {
  const c = new Array(9).fill(0) as number[];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += at(a, 3 * i + k) * at(b, 3 * k + j);
      }
      c[3 * i + j] = sum;
    }
  }
  return c;
}

function multmv(m: number[], v: number[]): number[] {
  return [
    at(m, 0) * at(v, 0) + at(m, 1) * at(v, 1) + at(m, 2) * at(v, 2),
    at(m, 3) * at(v, 0) + at(m, 4) * at(v, 1) + at(m, 5) * at(v, 2),
    at(m, 6) * at(v, 0) + at(m, 7) * at(v, 1) + at(m, 8) * at(v, 2),
  ];
}

function basisToPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
) {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [at(v, 0), 0, 0, 0, at(v, 1), 0, 0, 0, at(v, 2)]);
}

function general2DProjection(
  x1s: number,
  y1s: number,
  x1d: number,
  y1d: number,
  x2s: number,
  y2s: number,
  x2d: number,
  y2d: number,
  x3s: number,
  y3s: number,
  x3d: number,
  y3d: number,
  x4s: number,
  y4s: number,
  x4d: number,
  y4d: number,
) {
  const s = basisToPoints(x1s, y1s, x2s, y2s, x3s, y3s, x4s, y4s);
  const d = basisToPoints(x1d, y1d, x2d, y2d, x3d, y3d, x4d, y4d);
  return multmm(d, adj(s));
}

/**
 * CSS matrix3d that maps the rectangle (0,0)-(w,0)-(w,h)-(0,h)
 * onto dst quad [TL, TR, BR, BL] in the same coordinate space.
 */
export function matrix3dForQuad(width: number, height: number, quad: Point[]): string {
  if (width < 1 || height < 1 || quad.length < 4) {
    return 'none';
  }
  const tl = quad[0]!;
  const tr = quad[1]!;
  const br = quad[2]!;
  const bl = quad[3]!;
  const m = general2DProjection(
    0,
    0,
    tl.x,
    tl.y,
    width,
    0,
    tr.x,
    tr.y,
    width,
    height,
    br.x,
    br.y,
    0,
    height,
    bl.x,
    bl.y,
  );
  const denom = at(m, 8) || 1;
  for (let i = 0; i < 9; i++) {
    m[i] = at(m, i) / denom;
  }
  const t = [
    at(m, 0),
    at(m, 3),
    0,
    at(m, 6),
    at(m, 1),
    at(m, 4),
    0,
    at(m, 7),
    0,
    0,
    1,
    0,
    at(m, 2),
    at(m, 5),
    0,
    at(m, 8),
  ];
  return `matrix3d(${t.join(',')})`;
}

export function quadToPixels(quad: Point[], width: number, height: number): Point[] {
  return quad.map((p) => ({ x: p.x * width, y: p.y * height }));
}
