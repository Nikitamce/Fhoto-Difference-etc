/**
 * Stable solvers for affine and projective 2D transforms.
 * Returned matrices are CSS-compatible and map source image points to destination points.
 */
function gaussianElimination(A, b) {
  const n = b.length;
  if (!n || A.length !== n || A.some(row => row.length !== n) || b.some(v => !Number.isFinite(v))) return null;
  const M = A.map((row, index) => [...row, b[index]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivotRow][col])) pivotRow = row;
    }
    const pivot = M[pivotRow][col];
    if (!Number.isFinite(pivot) || Math.abs(pivot) < 1e-10) return null;
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];

    const divisor = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      if (!factor) continue;
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }
  const solution = M.map(row => row[n]);
  return solution.every(Number.isFinite) ? solution : null;
}

function validPoints(points, count) {
  return Array.isArray(points) && points.length === count && points.every(p =>
    p && Number.isFinite(p.x) && Number.isFinite(p.y)
  );
}

function hasNonCollinearTriplet(points) {
  const [a, b, c] = points;
  const area2 = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return Math.abs(area2) > 1e-6;
}

export function solveAffine(src, dst) {
  if (!validPoints(src, 3) || !validPoints(dst, 3) || !hasNonCollinearTriplet(src)) return null;
  const A = src.map(p => [p.x, p.y, 1]);
  const solX = gaussianElimination(A, dst.map(p => p.x));
  const solY = gaussianElimination(A, dst.map(p => p.y));
  if (!solX || !solY) return null;
  const [a, c, e] = solX;
  const [b, d, f] = solY;
  const result = [a, b, c, d, e, f];
  return result.every(Number.isFinite) ? result : null;
}

export function solveHomography(src, dst) {
  if (!validPoints(src, 4) || !validPoints(dst, 4)) return null;
  if (!hasNonCollinearTriplet(src.slice(0, 3)) || !hasNonCollinearTriplet(dst.slice(0, 3))) return null;

  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const { x: sx, y: sy } = src[i];
    const { x: dx, y: dy } = dst[i];
    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]); b.push(dx);
    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]); b.push(dy);
  }
  const h = gaussianElimination(A, b);
  if (!h) return null;
  const [h0, h1, h2, h3, h4, h5, h6, h7] = h;
  const result = [
    h0, h3, 0, h6,
    h1, h4, 0, h7,
    0, 0, 1, 0,
    h2, h5, 0, 1
  ];
  return result.every(Number.isFinite) ? result : null;
}

export function projectHomography(matrix3d, point) {
  if (!Array.isArray(matrix3d) || matrix3d.length !== 16) return null;
  const w = matrix3d[3] * point.x + matrix3d[7] * point.y + matrix3d[15];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-10) return null;
  return {
    x: (matrix3d[0] * point.x + matrix3d[4] * point.y + matrix3d[12]) / w,
    y: (matrix3d[1] * point.x + matrix3d[5] * point.y + matrix3d[13]) / w
  };
}
