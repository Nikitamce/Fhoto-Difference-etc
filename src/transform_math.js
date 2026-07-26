/**
 * Mathematical solvers for Affine and Perspective (Homography) transformations.
 */

/**
 * Solves a linear system Ax = b using Gaussian elimination.
 * @param {number[][]} A Matrix of coefficients
 * @param {number[]} b Vector of constants
 * @returns {number[]|null} Solution vector x, or null if singular
 */
function gaussianElimination(A, b) {
  const n = b.length;
  const M = [];
  for (let i = 0; i < n; i++) {
    M.push([...A[i], b[i]]);
  }

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }

    if (Math.abs(M[maxRow][i]) < 1e-10) return null;

    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    for (let k = i + 1; k < n; k++) {
      const c = -M[k][i] / M[i][i];
      for (let j = i; j < n + 1; j++) {
        if (i === j) {
          M[k][j] = 0;
        } else {
          M[k][j] += c * M[i][j];
        }
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / M[i][i];
    for (let k = i - 1; k >= 0; k--) {
      M[k][n] -= M[k][i] * x[i];
    }
  }

  return x;
}

/**
 * Computes the 2D Affine transformation matrix mapping 3 points from src to dst.
 * Returns an array representing a CSS matrix: [a, b, c, d, e, f]
 */
export function solveAffine(src, dst) {
  if (src.length !== 3 || dst.length !== 3) return null;

  const Ax = [
    [src[0].x, src[0].y, 1],
    [src[1].x, src[1].y, 1],
    [src[2].x, src[2].y, 1]
  ];
  const bx = [dst[0].x, dst[1].x, dst[2].x];
  const solX = gaussianElimination(Ax, bx);

  const Ay = [
    [src[0].x, src[0].y, 1],
    [src[1].x, src[1].y, 1],
    [src[2].x, src[2].y, 1]
  ];
  const by = [dst[0].y, dst[1].y, dst[2].y];
  const solY = gaussianElimination(Ay, by);

  if (!solX || !solY) return null;

  const a = solX[0], c = solX[1], e = solX[2];
  const b = solY[0], d = solY[1], f = solY[2];

  return [a, b, c, d, e, f];
}

/**
 * Computes the Homography matrix mapping 4 points from src to dst.
 * Returns an array representing a CSS matrix3d.
 */
export function solveHomography(src, dst) {
  if (src.length !== 4 || dst.length !== 4) return null;

  const A = [];
  const b = [];

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x;
    const sy = src[i].y;
    const dx = dst[i].x;
    const dy = dst[i].y;

    A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
    b.push(dx);

    A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
    b.push(dy);
  }

  const h = gaussianElimination(A, b);
  if (!h) return null;

  const H = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0];

  return [
    H[0], H[3], 0, H[6],
    H[1], H[4], 0, H[7],
    0,    0,    1, 0,
    H[2], H[5], 0, H[8]
  ];
}
