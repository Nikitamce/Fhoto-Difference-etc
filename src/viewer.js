import { invert3x3 } from "./metadata.js";

export class SynchronizedViewer {
  constructor(options = {}) {
    this.scale = 1.0; // 0.1 = 10% .. 10.0 = 1000%
    this.panX = 0;
    this.panY = 0;

    // Independent Pane B viewport offset used only when syncEnabled === false in Split mode
    this.syncEnabled = true;
    this.splitScaleB = 1.0;
    this.splitPanBX = 0;
    this.splitPanBY = 0;

    // Offset of Image B relative to Image A (in unscaled Image A-normalized coordinates)
    this.offsetX = 0;
    this.offsetY = 0;

    // Relative scale multipliers
    this.scaleRatioA = 1.0;
    this.scaleRatioB = 1.0;

    this.transformMatrixB = null; // 6-element affine or 16-element matrix3d

    this.alignTarget = "none"; // "none" | "A" | "B"
    this.imgA = null;
    this.imgB = null;

    this.onStateChange = options.onStateChange || (() => {});
  }

  setImages(imgA, imgB) {
    this.imgA = imgA;
    this.imgB = imgB;
    this.scaleRatioA = 1.0;
    this.scaleRatioB = 1.0;
    this.transformMatrixB = null;
    this.centerBoth();
  }

  get isAligning() {
    return this.alignTarget !== "none";
  }

  setAlignTarget(target) {
    this.alignTarget = target; // "none" | "A" | "B"
    this.onStateChange();
  }

  setSyncEnabled(enabled) {
    if (this.syncEnabled === enabled) return;
    this.syncEnabled = enabled;
    if (!enabled) {
      const trB = this.getTransformB();
      this.splitScaleB = trB.scale;
      this.splitPanBX = trB.x;
      this.splitPanBY = trB.y;
    }
    this.onStateChange();
  }

  setScaleRatioA(newRatio) {
    const clampedRatio = Math.max(0.1, Math.min(10.0, newRatio));
    if (!this.imgA || clampedRatio === this.scaleRatioA) {
      this.scaleRatioA = clampedRatio;
      this.onStateChange();
      return;
    }

    const wA = this.imgA.naturalWidth || this.imgA.width || 800;
    const hA = this.imgA.naturalHeight || this.imgA.height || 600;

    const centerX = this.panX + (wA * this.scale * this.scaleRatioA) / 2;
    const centerY = this.panY + (hA * this.scale * this.scaleRatioA) / 2;

    this.scaleRatioA = clampedRatio;

    this.panX = centerX - (wA * this.scale * this.scaleRatioA) / 2;
    this.panY = centerY - (hA * this.scale * this.scaleRatioA) / 2;

    this.onStateChange();
  }

  setScaleRatioB(newRatio) {
    const clampedRatio = Math.max(0.1, Math.min(10.0, newRatio));
    if (!this.imgB || clampedRatio === this.scaleRatioB) {
      this.scaleRatioB = clampedRatio;
      this.onStateChange();
      return;
    }

    const wB = this.imgB.naturalWidth || this.imgB.width || 800;
    const hB = this.imgB.naturalHeight || this.imgB.height || 600;

    const centerX = this.offsetX + (wB * this.scaleRatioB) / 2;
    const centerY = this.offsetY + (hB * this.scaleRatioB) / 2;

    this.scaleRatioB = clampedRatio;

    this.offsetX = centerX - (wB * this.scaleRatioB) / 2;
    this.offsetY = centerY - (hB * this.scaleRatioB) / 2;

    this.onStateChange();
  }

  matchImageSizes() {
    if (!this.imgA || !this.imgB) return;

    const wA = (this.imgA.naturalWidth || this.imgA.width) * this.scaleRatioA;
    const hA = (this.imgA.naturalHeight || this.imgA.height) * this.scaleRatioA;
    const wB = this.imgB.naturalWidth || this.imgB.width;
    const hB = this.imgB.naturalHeight || this.imgB.height;

    if (!wA || !wB || !hA || !hB) return;

    this.transformMatrixB = null;
    const widthRatio = wA / wB;
    const heightRatio = hA / hB;

    let targetRatio = widthRatio;
    if (Math.abs(hA - hB) < Math.abs(wA - wB) && Math.abs(heightRatio - 1.0) < 0.05) {
      targetRatio = 1.0;
    } else if (Math.abs(heightRatio - 1.0) < Math.abs(widthRatio - 1.0)) {
      targetRatio = heightRatio;
    }

    this.setScaleRatioB(targetRatio);
  }

  alignByTwoPoints(ptA1, ptA2, ptB1, ptB2) {
    const sA = this.scaleRatioA || 1.0;
    const distA = Math.hypot((ptA2.x - ptA1.x) * sA, (ptA2.y - ptA1.y) * sA);
    const distB = Math.hypot(ptB2.x - ptB1.x, ptB2.y - ptB1.y);

    if (distA <= 0 || distB <= 0) return;

    this.transformMatrixB = null;
    const reqScaleB = distA / distB;
    this.scaleRatioB = Math.max(0.1, Math.min(10.0, reqScaleB));

    this.offsetX = ptA1.x * sA - ptB1.x * this.scaleRatioB;
    this.offsetY = ptA1.y * sA - ptB1.y * this.scaleRatioB;

    this.onStateChange();
  }

  alignByOnePoint(ptA, ptB) {
    if (!ptA || !ptB) return;
    const sA = this.scaleRatioA || 1.0;
    this.transformMatrixB = null;
    this.offsetX = ptA.x * sA - ptB.x * this.scaleRatioB;
    this.offsetY = ptA.y * sA - ptB.y * this.scaleRatioB;
    this.onStateChange();
  }

  setZoom(newScale, focalX = null, focalY = null, containerRect = null, targetPane = "both") {
    const clampedScale = Math.max(0.1, Math.min(10.0, newScale));

    if (!this.syncEnabled && targetPane === "B") {
      if (focalX !== null && focalY !== null && containerRect) {
        const relX = focalX - containerRect.left;
        const relY = focalY - containerRect.top;
        const factor = clampedScale / this.splitScaleB;
        this.splitPanBX = relX - (relX - this.splitPanBX) * factor;
        this.splitPanBY = relY - (relY - this.splitPanBY) * factor;
      }
      this.splitScaleB = clampedScale;
      this.onStateChange();
      return;
    }

    if (focalX !== null && focalY !== null && containerRect) {
      const relX = focalX - containerRect.left;
      const relY = focalY - containerRect.top;
      const factor = clampedScale / this.scale;

      this.panX = relX - (relX - this.panX) * factor;
      this.panY = relY - (relY - this.panY) * factor;
    }

    this.scale = clampedScale;
    this.onStateChange();
  }

  pan(deltaX, deltaY, targetPane = "both") {
    if (this.alignTarget === "B") {
      this.nudgeB(deltaX / this.scale, deltaY / this.scale);
      return;
    }

    if (this.alignTarget === "A") {
      this.panX += deltaX;
      this.panY += deltaY;
      this.nudgeB(-deltaX / this.scale, -deltaY / this.scale);
      return;
    }

    if (!this.syncEnabled && targetPane === "B") {
      this.splitPanBX += deltaX;
      this.splitPanBY += deltaY;
      this.onStateChange();
      return;
    }

    this.panX += deltaX;
    this.panY += deltaY;
    this.onStateChange();
  }

  panBy(deltaX, deltaY, targetPane = "both") {
    this.pan(deltaX, deltaY, targetPane);
  }

  nudgeB(dxImgPixels, dyImgPixels) {
    if (this.transformMatrixB) {
      if (this.transformMatrixB.length === 6) {
        this.transformMatrixB[4] += dxImgPixels;
        this.transformMatrixB[5] += dyImgPixels;
      } else if (this.transformMatrixB.length === 16) {
        this.transformMatrixB[12] += dxImgPixels * this.transformMatrixB[15];
        this.transformMatrixB[13] += dyImgPixels * this.transformMatrixB[15];
      }
    } else {
      this.offsetX += dxImgPixels;
      this.offsetY += dyImgPixels;
    }
    this.onStateChange();
  }

  nudgeA(dxImgPixels, dyImgPixels) {
    this.panX += dxImgPixels * this.scale;
    this.panY += dyImgPixels * this.scale;
    this.nudgeB(-dxImgPixels, -dyImgPixels);
  }

  centerBoth(containerWidth = 800, containerHeight = 600, mode = "slider") {
    if (!this.imgA && !this.imgB) return;

    const refImg = this.imgA || this.imgB;
    const wRef = (refImg.naturalWidth || refImg.width || 800) * (this.imgA ? this.scaleRatioA : this.scaleRatioB);
    const hRef = (refImg.naturalHeight || refImg.height || 600) * (this.imgA ? this.scaleRatioA : this.scaleRatioB);

    const effW = mode === "split" ? containerWidth / 2 : containerWidth;
    const scaleX = (effW * 0.88) / wRef;
    const scaleY = (containerHeight * 0.88) / hRef;
    this.scale = Math.max(0.1, Math.min(2.0, Math.min(scaleX, scaleY)));

    this.panX = (effW - wRef * this.scale) / 2;
    this.panY = (containerHeight - hRef * this.scale) / 2;

    if (this.imgA && this.imgB && !this.transformMatrixB) {
      const wA = (this.imgA.naturalWidth || this.imgA.width) * this.scaleRatioA;
      const hA = (this.imgA.naturalHeight || this.imgA.height) * this.scaleRatioA;
      const wB = (this.imgB.naturalWidth || this.imgB.width) * this.scaleRatioB;
      const hB = (this.imgB.naturalHeight || this.imgB.height) * this.scaleRatioB;
      this.offsetX = (wA - wB) / 2;
      this.offsetY = (hA - hB) / 2;
    } else if (!this.transformMatrixB) {
      this.offsetX = 0;
      this.offsetY = 0;
    }

    if (!this.syncEnabled) {
      const trB = this.getTransformB();
      this.splitScaleB = trB.scale;
      this.splitPanBX = trB.x;
      this.splitPanBY = trB.y;
    }

    this.onStateChange();
  }

  swapImages() {
    const tempImg = this.imgA;
    this.imgA = this.imgB;
    this.imgB = tempImg;

    if (this.transformMatrixB) {
      this.transformMatrixB = null;
    }

    const oldSA = this.scaleRatioA;
    const oldSB = this.scaleRatioB;
    this.panX = this.panX + this.offsetX * this.scale;
    this.panY = this.panY + this.offsetY * this.scale;
    this.offsetX = -this.offsetX;
    this.offsetY = -this.offsetY;
    this.scaleRatioA = oldSB;
    this.scaleRatioB = oldSA;

    this.onStateChange();
  }

  getTransformA() {
    return {
      x: this.panX,
      y: this.panY,
      scale: this.scale * this.scaleRatioA,
    };
  }

  getTransformB() {
    if (this.transformMatrixB) {
      const is3d = this.transformMatrixB.length === 16;
      const matrixStr = is3d
        ? `matrix3d(${this.transformMatrixB.join(",")})`
        : `matrix(${this.transformMatrixB.join(",")})`;

      return {
        x: this.panX,
        y: this.panY,
        scale: this.scale,
        matrix: matrixStr,
      };
    }

    return {
      x: this.panX + this.offsetX * this.scale,
      y: this.panY + this.offsetY * this.scale,
      scale: this.scale * this.scaleRatioB,
    };
  }

  getSplitTransformB() {
    if (!this.syncEnabled) {
      if (this.transformMatrixB) {
        const is3d = this.transformMatrixB.length === 16;
        const matrixStr = is3d
          ? `matrix3d(${this.transformMatrixB.join(",")})`
          : `matrix(${this.transformMatrixB.join(",")})`;
        return {
          x: this.splitPanBX,
          y: this.splitPanBY,
          scale: this.splitScaleB,
          matrix: matrixStr,
        };
      }
      return {
        x: this.splitPanBX,
        y: this.splitPanBY,
        scale: this.splitScaleB,
      };
    }
    return this.getTransformB();
  }

  mapViewportToImageA(vpX, vpY) {
    const trA = this.getTransformA();
    if (!trA.scale) return null;
    return {
      x: (vpX - trA.x) / trA.scale,
      y: (vpY - trA.y) / trA.scale,
    };
  }

  mapViewportToImageB(vpX, vpY, isSplitPaneB = false) {
    const trB = isSplitPaneB ? this.getSplitTransformB() : this.getTransformB();
    if (!trB.scale) return null;

    const u = (vpX - trB.x) / trB.scale;
    const v = (vpY - trB.y) / trB.scale;

    if (!this.transformMatrixB) {
      return { x: u, y: v };
    }

    if (this.transformMatrixB.length === 6) {
      const [a, b, c, d, e, f] = this.transformMatrixB;
      const det = a * d - b * c;
      if (Math.abs(det) < 1e-10) return { x: u, y: v };
      const du = u - e;
      const dv = v - f;
      return {
        x: (d * du - c * dv) / det,
        y: (-b * du + a * dv) / det,
      };
    }

    if (this.transformMatrixB.length === 16) {
      const m = this.transformMatrixB;
      const H = [
        m[0], m[4], m[12],
        m[1], m[5], m[13],
        m[3], m[7], m[15],
      ];
      const Hinv = invert3x3(H);
      if (!Hinv) return { x: u, y: v };
      const denom = Hinv[6] * u + Hinv[7] * v + Hinv[8];
      if (Math.abs(denom) < 1e-10) return { x: u, y: v };
      return {
        x: (Hinv[0] * u + Hinv[1] * v + Hinv[2]) / denom,
        y: (Hinv[3] * u + Hinv[4] * v + Hinv[5]) / denom,
      };
    }

    return { x: u, y: v };
  }

  alignByThreePoints(ptsA, ptsB) {
    const sA = this.scaleRatioA || 1.0;
    const scaledPtsA = ptsA.map((p) => ({ x: p.x * sA, y: p.y * sA }));
    import("./transform_math.js").then(({ solveAffine }) => {
      const matrix = solveAffine(ptsB, scaledPtsA);
      if (matrix) {
        this.transformMatrixB = matrix;
        this.onStateChange();
      } else {
        console.error("Collinear or invalid points for affine transform");
      }
    });
  }

  alignByFourPoints(ptsA, ptsB) {
    const sA = this.scaleRatioA || 1.0;
    const scaledPtsA = ptsA.map((p) => ({ x: p.x * sA, y: p.y * sA }));
    import("./transform_math.js").then(({ solveHomography }) => {
      const matrix = solveHomography(ptsB, scaledPtsA);
      if (matrix) {
        this.transformMatrixB = matrix;
        this.onStateChange();
      } else {
        console.error("Collinear or invalid points for homography transform");
      }
    });
  }

  clearTransformMatrix() {
    this.transformMatrixB = null;
    this.onStateChange();
  }

  resetAll(containerWidth, containerHeight, mode = "slider") {
    this.transformMatrixB = null;
    this.scaleRatioA = 1.0;
    this.scaleRatioB = 1.0;
    this.alignTarget = "none";
    this.centerBoth(containerWidth, containerHeight, mode);
  }
}
