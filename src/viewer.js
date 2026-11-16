const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const MIN_IMAGE_SCALE = 0.1;
const MAX_IMAGE_SCALE = 10;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

function getImageSize(img) {
  return {
    width: img?.naturalWidth || img?.width || 0,
    height: img?.naturalHeight || img?.height || 0
  };
}

function matrixToHomography(matrix) {
  if (!Array.isArray(matrix)) return null;
  if (matrix.length === 6) {
    const [a, b, c, d, e, f] = matrix;
    return [a, c, e, b, d, f, 0, 0, 1];
  }
  if (matrix.length === 16) {
    // CSS matrix3d is column-major. These nine values form its 2D projective map.
    return [matrix[0], matrix[4], matrix[12], matrix[1], matrix[5], matrix[13], matrix[3], matrix[7], matrix[15]];
  }
  return null;
}

function projectPoint(h, point) {
  if (!h) return { x: point.x, y: point.y };
  const w = h[6] * point.x + h[7] * point.y + h[8];
  if (!Number.isFinite(w) || Math.abs(w) < 1e-10) return null;
  return {
    x: (h[0] * point.x + h[1] * point.y + h[2]) / w,
    y: (h[3] * point.x + h[4] * point.y + h[5]) / w
  };
}


function invertHomography(h) {
  const [a, b, c, d, e, f, g, i, j] = h;
  const A = e * j - f * i;
  const B = c * i - b * j;
  const C = b * f - c * e;
  const D = f * g - d * j;
  const E = a * j - c * g;
  const F = c * d - a * f;
  const G = d * i - e * g;
  const H = b * g - a * i;
  const I = a * e - b * d;
  const determinant = a * A + b * D + c * G;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return null;
  return [A, B, C, D, E, F, G, H, I].map(value => value / determinant);
}

function getBounds(points) {
  const valid = points.filter(point => point && Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!valid.length) return null;
  return {
    minX: Math.min(...valid.map(p => p.x)),
    minY: Math.min(...valid.map(p => p.y)),
    maxX: Math.max(...valid.map(p => p.x)),
    maxY: Math.max(...valid.map(p => p.y))
  };
}

export class SynchronizedViewer {
  constructor(options = {}) {
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scaleRatioA = 1;
    this.scaleRatioB = 1;
    this.syncZoom = true;
    this.alignTarget = "none";
    this.transformMatrixB = null;
    this.imgA = null;
    this.imgB = null;
    this.onStateChange = options.onStateChange || (() => {});
  }

  get isAligning() {
    return this.alignTarget !== "none";
  }

  getEffectiveZoom() {
    if (!this.syncZoom && this.alignTarget === "A") return this.scale * this.scaleRatioA;
    if (!this.syncZoom && this.alignTarget === "B") return this.scale * this.scaleRatioB;
    return this.scale;
  }

  setSyncZoom(enabled) {
    this.syncZoom = Boolean(enabled);
    this.onStateChange();
  }

  setImages(imgA, imgB) {
    this.imgA = imgA || null;
    this.imgB = imgB || null;
    this.resetAlignment(false);
    this.centerBoth();
  }

  resetAlignment(notify = true) {
    this.scaleRatioA = 1;
    this.scaleRatioB = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.transformMatrixB = null;
    this.alignTarget = "none";
    this.syncZoom = true;
    if (notify) this.onStateChange();
  }

  setAlignTarget(target) {
    this.alignTarget = ["A", "B"].includes(target) ? target : "none";
    this.onStateChange();
  }

  setScaleRatioA(newRatio) {
    const next = clamp(newRatio, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
    const old = this.scaleRatioA;
    if (Math.abs(next - old) < 1e-6) return;

    const { width, height } = getImageSize(this.imgA);
    if (width && height) {
      const centerX = this.panX + width * this.scale * old / 2;
      const centerY = this.panY + height * this.scale * old / 2;
      this.panX = centerX - width * this.scale * next / 2;
      this.panY = centerY - height * this.scale * next / 2;
      // Image B stays still while A is resized independently.
      this.offsetX -= (this.panX - (centerX - width * this.scale * old / 2)) / this.scale;
      this.offsetY -= (this.panY - (centerY - height * this.scale * old / 2)) / this.scale;
    }
    this.scaleRatioA = next;
    this.onStateChange();
  }

  getBReferenceBounds() {
    const { width, height } = getImageSize(this.imgB);
    if (!width || !height) return null;
    if (this.transformMatrixB) {
      const h = matrixToHomography(this.transformMatrixB);
      const corners = [
        { x: 0, y: 0 }, { x: width, y: 0 },
        { x: width, y: height }, { x: 0, y: height }
      ].map(point => projectPoint(h, point));
      return getBounds(corners);
    }
    return { minX: 0, minY: 0, maxX: width, maxY: height };
  }

  setScaleRatioB(newRatio) {
    const next = clamp(newRatio, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
    const old = this.scaleRatioB;
    if (Math.abs(next - old) < 1e-6) return;

    const bounds = this.getBReferenceBounds();
    if (bounds) {
      const centerX = this.offsetX + (bounds.minX + bounds.maxX) * old / 2;
      const centerY = this.offsetY + (bounds.minY + bounds.maxY) * old / 2;
      this.offsetX = centerX - (bounds.minX + bounds.maxX) * next / 2;
      this.offsetY = centerY - (bounds.minY + bounds.maxY) * next / 2;
    }
    this.scaleRatioB = next;
    this.onStateChange();
  }

  matchImageSizes() {
    if (!this.imgA || !this.imgB) return false;
    const a = getImageSize(this.imgA);
    const b = getImageSize(this.imgB);
    if (!a.width || !a.height || !b.width || !b.height) return false;
    // Geometric mean balances width and height when aspect ratios differ.
    const widthRatio = a.width / b.width;
    const heightRatio = a.height / b.height;
    // Keep the displayed area of B equal to A, including A's current manual scale.
    const targetRatio = this.scaleRatioA * Math.sqrt(widthRatio * heightRatio);
    this.setScaleRatioB(targetRatio);
    return true;
  }

  alignByTwoPoints(ptA1, ptA2, ptB1, ptB2) {
    const distA = Math.hypot(ptA2.x - ptA1.x, ptA2.y - ptA1.y);
    const distB = Math.hypot(ptB2.x - ptB1.x, ptB2.y - ptB1.y);
    if (!Number.isFinite(distA) || !Number.isFinite(distB) || distA <= 0 || distB <= 0) return false;

    const ratio = clamp(distA / distB, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
    this.transformMatrixB = null;
    this.scaleRatioB = ratio;
    this.offsetX = ptA1.x - ptB1.x * ratio;
    this.offsetY = ptA1.y - ptB1.y * ratio;
    this.onStateChange();
    return true;
  }

  alignByOnePoint(ptA, ptB) {
    if (!ptA || !ptB) return false;
    this.transformMatrixB = null;
    this.offsetX = ptA.x - ptB.x * this.scaleRatioB;
    this.offsetY = ptA.y - ptB.y * this.scaleRatioB;
    this.onStateChange();
    return true;
  }

  setZoom(newScale, focalX = null, focalY = null, containerRect = null) {
    const desired = clamp(newScale, MIN_ZOOM, MAX_ZOOM);
    const hasFocal = focalX !== null && focalY !== null && containerRect;
    const relX = hasFocal ? focalX - containerRect.left : null;
    const relY = hasFocal ? focalY - containerRect.top : null;

    if (!this.syncZoom && this.alignTarget === "A" && this.imgA) {
      const current = this.scale * this.scaleRatioA;
      const targetRatio = clamp(this.scaleRatioA * desired / current, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
      if (hasFocal) {
        const localX = (relX - this.panX) / current;
        const localY = (relY - this.panY) / current;
        const nextPanX = relX - localX * this.scale * targetRatio;
        const nextPanY = relY - localY * this.scale * targetRatio;
        this.offsetX -= (nextPanX - this.panX) / this.scale;
        this.offsetY -= (nextPanY - this.panY) / this.scale;
        this.panX = nextPanX;
        this.panY = nextPanY;
      }
      this.scaleRatioA = targetRatio;
      this.onStateChange();
      return;
    }

    if (!this.syncZoom && this.alignTarget === "B" && this.imgB) {
      const current = this.scale * this.scaleRatioB;
      const targetRatio = clamp(this.scaleRatioB * desired / current, MIN_IMAGE_SCALE, MAX_IMAGE_SCALE);
      if (hasFocal) {
        const mappedX = (relX - this.panX - this.offsetX * this.scale) / current;
        const mappedY = (relY - this.panY - this.offsetY * this.scale) / current;
        this.offsetX = (relX - this.panX - this.scale * targetRatio * mappedX) / this.scale;
        this.offsetY = (relY - this.panY - this.scale * targetRatio * mappedY) / this.scale;
      }
      this.scaleRatioB = targetRatio;
      this.onStateChange();
      return;
    }

    if (hasFocal) {
      const factor = desired / this.scale;
      this.panX = relX - (relX - this.panX) * factor;
      this.panY = relY - (relY - this.panY) * factor;
    }
    this.scale = desired;
    this.onStateChange();
  }

  pan(deltaX, deltaY) {
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;
    if (this.alignTarget === "B") {
      this.offsetX += deltaX / this.scale;
      this.offsetY += deltaY / this.scale;
    } else if (this.alignTarget === "A") {
      this.panX += deltaX;
      this.panY += deltaY;
      // Keep B stationary. Offset is expressed in the shared image coordinate space.
      this.offsetX -= deltaX / this.scale;
      this.offsetY -= deltaY / this.scale;
    } else {
      this.panX += deltaX;
      this.panY += deltaY;
    }
    this.onStateChange();
  }

  panBy(deltaX, deltaY) {
    this.pan(deltaX, deltaY);
  }

  centerBoth(containerWidth = 800, containerHeight = 600) {
    const a = getImageSize(this.imgA);
    const b = getImageSize(this.imgB);
    const hasA = a.width > 0 && a.height > 0;
    const hasB = b.width > 0 && b.height > 0;
    if (!hasA && !hasB) return;

    let boundsA = null;
    let boundsB = null;
    if (hasA) {
      boundsA = {
        minX: 0, minY: 0,
        maxX: a.width * this.scaleRatioA,
        maxY: a.height * this.scaleRatioA
      };
    }

    if (hasB) {
      if (!this.transformMatrixB) {
        // Default comparison starts with image B centered against image A.
        if (hasA) {
          this.offsetX = (a.width * this.scaleRatioA - b.width * this.scaleRatioB) / 2;
          this.offsetY = (a.height * this.scaleRatioA - b.height * this.scaleRatioB) / 2;
        } else {
          this.offsetX = 0;
          this.offsetY = 0;
        }
        boundsB = {
          minX: this.offsetX,
          minY: this.offsetY,
          maxX: this.offsetX + b.width * this.scaleRatioB,
          maxY: this.offsetY + b.height * this.scaleRatioB
        };
      } else {
        const h = matrixToHomography(this.transformMatrixB);
        const corners = [
          { x: 0, y: 0 }, { x: b.width, y: 0 },
          { x: b.width, y: b.height }, { x: 0, y: b.height }
        ].map(point => projectPoint(h, point))
          .map(point => point && ({ x: point.x * this.scaleRatioB + this.offsetX, y: point.y * this.scaleRatioB + this.offsetY }));
        boundsB = getBounds(corners);
      }
    }

    const allBounds = [boundsA, boundsB].filter(Boolean);
    const minX = Math.min(...allBounds.map(item => item.minX));
    const minY = Math.min(...allBounds.map(item => item.minY));
    const maxX = Math.max(...allBounds.map(item => item.maxX));
    const maxY = Math.max(...allBounds.map(item => item.maxY));
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);
    const availableWidth = Math.max(1, containerWidth) * 0.9;
    const availableHeight = Math.max(1, containerHeight) * 0.9;
    this.scale = clamp(Math.min(availableWidth / contentWidth, availableHeight / contentHeight), MIN_ZOOM, MAX_ZOOM);
    this.panX = (containerWidth - contentWidth * this.scale) / 2 - minX * this.scale;
    this.panY = (containerHeight - contentHeight * this.scale) / 2 - minY * this.scale;
    this.onStateChange();
  }

  swapImages() {
    const previousA = this.imgA;
    this.imgA = this.imgB;
    this.imgB = previousA;
    // A perspective/affine map is directional. Reset it rather than applying
    // the old B→A transform in the wrong direction after swapping sources.
    this.resetAlignment(false);
    this.centerBoth();
  }

  getTransformA() {
    return {
      x: this.panX,
      y: this.panY,
      scale: this.scale * this.scaleRatioA
    };
  }

  getTransformB() {
    const x = this.panX + this.offsetX * this.scale;
    const y = this.panY + this.offsetY * this.scale;
    if (this.transformMatrixB) {
      const is3d = this.transformMatrixB.length === 16;
      const matrixStr = is3d
        ? `matrix3d(${this.transformMatrixB.join(",")})`
        : `matrix(${this.transformMatrixB.join(",")})`;
      return { x, y, scale: this.scale * this.scaleRatioB, matrix: matrixStr };
    }
    return { x, y, scale: this.scale * this.scaleRatioB };
  }

  screenToImageA(localX, localY) {
    const scale = this.scale * this.scaleRatioA;
    if (!scale) return null;
    return { x: (localX - this.panX) / scale, y: (localY - this.panY) / scale };
  }

  screenToImageB(localX, localY) {
    const scale = this.scale * this.scaleRatioB;
    if (!scale) return null;
    const transformed = {
      x: (localX - this.panX - this.offsetX * this.scale) / scale,
      y: (localY - this.panY - this.offsetY * this.scale) / scale
    };
    if (!this.transformMatrixB) return transformed;
    const homography = matrixToHomography(this.transformMatrixB);
    const inverse = homography && invertHomography(homography);
    return inverse ? projectPoint(inverse, transformed) : null;
  }

  async alignByThreePoints(ptsA, ptsB) {
    const { solveAffine } = await import("./transform_math.js");
    const matrix = solveAffine(ptsB, ptsA);
    if (!matrix) return false;
    this.transformMatrixB = matrix;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scaleRatioB = 1;
    this.onStateChange();
    return true;
  }

  async alignByFourPoints(ptsA, ptsB) {
    const { solveHomography } = await import("./transform_math.js");
    const matrix = solveHomography(ptsB, ptsA);
    if (!matrix) return false;
    this.transformMatrixB = matrix;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scaleRatioB = 1;
    this.onStateChange();
    return true;
  }

  clearTransformMatrix() {
    this.transformMatrixB = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scaleRatioB = 1;
    this.onStateChange();
  }
}
