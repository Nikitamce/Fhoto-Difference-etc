import test from "node:test";
import assert from "node:assert/strict";
import { SynchronizedViewer } from "../src/viewer.js";
import { solveHomography, projectHomography } from "../src/transform_math.js";

const image = (width, height) => ({ naturalWidth: width, naturalHeight: height });

function closeTo(actual, expected, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `Expected ${actual} to be close to ${expected}`);
}

test("centerBoth fits both images into the available viewport", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(1200, 800), image(600, 400));
  viewer.centerBoth(800, 600);
  assert.ok(viewer.scale > 0 && viewer.scale <= 10);
  assert.ok(Number.isFinite(viewer.panX) && Number.isFinite(viewer.panY));
});

test("centerBoth can position a single remaining image", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(null, image(500, 250));
  viewer.centerBoth(1000, 500);
  assert.ok(viewer.scale > 0);
  assert.ok(Number.isFinite(viewer.getTransformB().x));
});

test("loading a new pair discards a stale transform", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(100, 100), image(100, 100));
  viewer.transformMatrixB = [1, 0, 0, 1, 15, 20];
  viewer.offsetX = 22;
  viewer.scaleRatioB = 1.5;
  viewer.setImages(image(300, 200), image(200, 300));
  assert.equal(viewer.transformMatrixB, null);
  assert.equal(viewer.offsetX, 50);
  assert.equal(viewer.offsetY, -50);
  assert.equal(viewer.scaleRatioB, 1);
});

test("moving A in alignment mode keeps B fixed", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(100, 100), image(100, 100));
  const before = viewer.getTransformB();
  viewer.setAlignTarget("A");
  viewer.pan(17, -9);
  const after = viewer.getTransformB();
  closeTo(after.x, before.x);
  closeTo(after.y, before.y);
});

test("moving B in alignment mode leaves A fixed", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(100, 100), image(100, 100));
  const beforeA = viewer.getTransformA();
  viewer.setAlignTarget("B");
  viewer.pan(17, -9);
  const afterA = viewer.getTransformA();
  closeTo(afterA.x, beforeA.x);
  closeTo(afterA.y, beforeA.y);
  closeTo(viewer.getTransformB().x, beforeA.x + 17);
});

test("independent zoom changes the selected image only", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(300, 200), image(300, 200));
  viewer.setAlignTarget("A");
  viewer.setSyncZoom(false);
  const beforeA = viewer.getTransformA().scale;
  const beforeB = viewer.getTransformB().scale;
  viewer.setZoom(viewer.getEffectiveZoom() * 1.5);
  closeTo(viewer.getTransformA().scale, beforeA * 1.5);
  closeTo(viewer.getTransformB().scale, beforeB);
});

test("matchImageSizes sets a ratio based on both dimensions", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(400, 200), image(200, 100));
  assert.equal(viewer.matchImageSizes(), true);
  closeTo(viewer.scaleRatioB, 2);
});

test("two-point alignment calculates scale and offset", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(200, 200), image(200, 200));
  const success = viewer.alignByTwoPoints(
    { x: 20, y: 30 }, { x: 120, y: 30 },
    { x: 10, y: 10 }, { x: 60, y: 10 }
  );
  assert.equal(success, true);
  closeTo(viewer.scaleRatioB, 2);
  closeTo(viewer.offsetX, 0);
  closeTo(viewer.offsetY, 10);
});

test("three-point affine alignment creates a CSS matrix", async () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(100, 100), image(100, 100));
  const success = await viewer.alignByThreePoints(
    [{ x: 10, y: 20 }, { x: 30, y: 20 }, { x: 10, y: 40 }],
    [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 }]
  );
  assert.equal(success, true);
  assert.equal(viewer.transformMatrixB.length, 6);
});

test("swap resets directional transforms rather than reversing them incorrectly", () => {
  const viewer = new SynchronizedViewer();
  const first = image(120, 80);
  const second = image(80, 120);
  viewer.setImages(first, second);
  viewer.transformMatrixB = [1, 0, 0, 1, 5, 7];
  viewer.swapImages();
  assert.equal(viewer.imgA, second);
  assert.equal(viewer.imgB, first);
  assert.equal(viewer.transformMatrixB, null);
  assert.equal(viewer.scaleRatioB, 1);
});


test("screenToImageB reverses a projective transform and viewport scale", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(300, 200), image(300, 200));
  const source = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 200 }, { x: 0, y: 200 }];
  const destination = [{ x: 10, y: 20 }, { x: 280, y: 5 }, { x: 260, y: 190 }, { x: 20, y: 180 }];
  viewer.transformMatrixB = solveHomography(source, destination);
  viewer.offsetX = 14;
  viewer.offsetY = -7;
  viewer.scaleRatioB = 1.15;
  const original = { x: 121, y: 73 };
  const aligned = projectHomography(viewer.transformMatrixB, original);
  const screen = {
    x: viewer.panX + (viewer.offsetX + aligned.x * viewer.scaleRatioB) * viewer.scale,
    y: viewer.panY + (viewer.offsetY + aligned.y * viewer.scaleRatioB) * viewer.scale
  };
  const recovered = viewer.screenToImageB(screen.x, screen.y);
  closeTo(recovered.x, original.x, 1e-5);
  closeTo(recovered.y, original.y, 1e-5);
});


test("independent zoom of A keeps B's position and the focal image point fixed", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(400, 300), image(400, 300));
  viewer.setAlignTarget("A");
  viewer.setSyncZoom(false);

  const viewport = { left: 20, top: 30, width: 800, height: 600 };
  const focal = { x: 320, y: 260 };
  const beforeImagePoint = viewer.screenToImageA(focal.x - viewport.left, focal.y - viewport.top);
  const beforeB = viewer.getTransformB();

  viewer.setZoom(viewer.getEffectiveZoom() * 1.5, focal.x, focal.y, viewport);

  const afterImagePoint = viewer.screenToImageA(focal.x - viewport.left, focal.y - viewport.top);
  const afterB = viewer.getTransformB();
  closeTo(afterImagePoint.x, beforeImagePoint.x);
  closeTo(afterImagePoint.y, beforeImagePoint.y);
  closeTo(afterB.x, beforeB.x);
  closeTo(afterB.y, beforeB.y);
});

test("matchImageSizes accounts for A's manual scale", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(400, 200), image(200, 100));
  viewer.setScaleRatioA(1.25);
  assert.equal(viewer.matchImageSizes(), true);
  closeTo(viewer.scaleRatioB, 2.5);
});


test("changing A's manual scale keeps B's screen position fixed", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(320, 240), image(500, 300));
  const before = viewer.getTransformB();
  viewer.setScaleRatioA(1.8);
  const after = viewer.getTransformB();
  closeTo(after.x, before.x);
  closeTo(after.y, before.y);
});

test("changing B's manual scale keeps its center fixed", () => {
  const viewer = new SynchronizedViewer();
  viewer.setImages(image(320, 240), image(500, 300));
  const before = viewer.getTransformB();
  const beforeCenter = {
    x: before.x + 250 * before.scale,
    y: before.y + 150 * before.scale
  };
  viewer.setScaleRatioB(1.7);
  const after = viewer.getTransformB();
  const afterCenter = {
    x: after.x + 250 * after.scale,
    y: after.y + 150 * after.scale
  };
  closeTo(afterCenter.x, beforeCenter.x);
  closeTo(afterCenter.y, beforeCenter.y);
});
