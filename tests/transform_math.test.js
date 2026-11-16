import test from "node:test";
import assert from "node:assert/strict";
import { solveAffine, solveHomography, projectHomography } from "../src/transform_math.js";

test("solveAffine maps three source points to their destinations", () => {
  const source = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }];
  const destination = [{ x: 5, y: -3 }, { x: 25, y: -3 }, { x: 5, y: 17 }];
  const matrix = solveAffine(source, destination);
  assert.ok(matrix);
  const [a, b, c, d, e, f] = matrix;
  const mapped = source.map(({ x, y }) => ({ x: a * x + c * y + e, y: b * x + d * y + f }));
  mapped.forEach((point, index) => {
    assert.ok(Math.abs(point.x - destination[index].x) < 1e-8);
    assert.ok(Math.abs(point.y - destination[index].y) < 1e-8);
  });
});

test("solveAffine rejects collinear or invalid points", () => {
  assert.equal(solveAffine(
    [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]
  ), null);
  assert.equal(solveAffine([], []), null);
});

test("solveHomography maps four corners through perspective", () => {
  const source = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
  const destination = [{ x: 10, y: 20 }, { x: 130, y: 10 }, { x: 110, y: 140 }, { x: 0, y: 100 }];
  const matrix = solveHomography(source, destination);
  assert.ok(matrix);
  source.forEach((point, index) => {
    const projected = projectHomography(matrix, point);
    assert.ok(projected);
    assert.ok(Math.abs(projected.x - destination[index].x) < 1e-6);
    assert.ok(Math.abs(projected.y - destination[index].y) < 1e-6);
  });
});

test("solveHomography rejects degenerate point sets", () => {
  const collinear = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
  assert.equal(solveHomography(collinear, collinear), null);
});
