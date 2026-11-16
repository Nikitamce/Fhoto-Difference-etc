import test from "node:test";
import assert from "node:assert/strict";
import { solveAffine, solveHomography } from "../src/transform_math.js";

const closeTo = (actual, expected) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 1e-8));
};

test("affine solver applies translation, scale and rotation", () => {
  const src = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
  const dst = [{ x: 2, y: 3 }, { x: 2, y: 5 }, { x: 0, y: 3 }];
  closeTo(solveAffine(src, dst), [0, 2, -2, 0, 2, 3]);
});

test("affine solver rejects collinear points", () => {
  const src = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }];
  assert.equal(solveAffine(src, src), null);
});

test("homography solver returns identity for matching points", () => {
  const square = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  closeTo(solveHomography(square, square), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
});

test("solvers reject an incorrect number of points", () => {
  assert.equal(solveAffine([], []), null);
  assert.equal(solveHomography([], []), null);
});
