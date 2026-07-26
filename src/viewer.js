export class SynchronizedViewer {
  constructor(options = {}) {
    this.scale = 1.0; // 1.0 = 100%, 10.0 = 1000%, 0.1 = 10%
    this.panX = 0;
    this.panY = 0;
    
    // Offset of Image B relative to Image A (in unscaled source coordinates)
    this.offsetX = 0;
    this.offsetY = 0;

    // Relative scale multiplier for Image B relative to Image A (default 1.0)
    this.scaleRatioB = 1.0;
    // Relative scale multiplier for Image A (default 1.0)
    this.scaleRatioA = 1.0;

    this.alignTarget = 'none'; // 'none' | 'A' | 'B'
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };

    this.imgA = null;
    this.imgB = null;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
  }

  setImages(imgA, imgB) {
    this.imgA = imgA;
    this.imgB = imgB;
    this.scaleRatioA = 1.0;
    this.scaleRatioB = 1.0;
    this.centerBoth();
  }

  get isAligning() {
    return this.alignTarget !== 'none';
  }

  setAlignTarget(target) {
    this.alignTarget = target; // 'none' | 'A' | 'B'
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

    // Scale around the CENTER of Image A
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

    // Scale around the CENTER of Image B
    const centerX = this.offsetX + (wB * this.scaleRatioB) / 2;
    const centerY = this.offsetY + (hB * this.scaleRatioB) / 2;

    this.scaleRatioB = clampedRatio;

    this.offsetX = centerX - (wB * this.scaleRatioB) / 2;
    this.offsetY = centerY - (hB * this.scaleRatioB) / 2;

    this.onStateChange();
  }

  matchImageSizes() {
    if (!this.imgA || !this.imgB) return;

    const wA = this.imgA.naturalWidth || this.imgA.width;
    const hA = this.imgA.naturalHeight || this.imgA.height;
    const wB = this.imgB.naturalWidth || this.imgB.width;
    const hB = this.imgB.naturalHeight || this.imgB.height;

    if (!wA || !wB || !hA || !hB) return;

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
    // pt = { x, y } in unscaled image source pixels
    const distA = Math.hypot(ptA2.x - ptA1.x, ptA2.y - ptA1.y);
    const distB = Math.hypot(ptB2.x - ptB1.x, ptB2.y - ptB1.y);

    if (distA <= 0 || distB <= 0) return;

    const reqScaleB = distA / distB;
    this.scaleRatioB = reqScaleB;

    // Align ptB1 with ptA1
    this.offsetX = ptA1.x - ptB1.x * reqScaleB;
    this.offsetY = ptA1.y - ptB1.y * reqScaleB;

    this.onStateChange();
  }

  alignByOnePoint(ptA, ptB) {
    if (!ptA || !ptB) return;
    this.offsetX = ptA.x - ptB.x * this.scaleRatioB;
    this.offsetY = ptA.y - ptB.y * this.scaleRatioB;
    this.onStateChange();
  }

  setZoom(newScale, focalX = null, focalY = null, containerRect = null) {
    const clampedScale = Math.max(0.1, Math.min(10.0, newScale));
    
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

  pan(deltaX, deltaY) {
    if (this.alignTarget === 'B') {
      // Move image B offset in unscaled coordinates
      this.offsetX += deltaX / this.scale;
      this.offsetY += deltaY / this.scale;
    } else if (this.alignTarget === 'A') {
      // Move image A while keeping image B stationary on screen
      this.panX += deltaX;
      this.panY += deltaY;
      this.offsetX -= deltaX / (this.scale * this.scaleRatioB);
      this.offsetY -= deltaY / (this.scale * this.scaleRatioB);
    } else {
      // Synced pan both
      this.panX += deltaX;
      this.panY += deltaY;
    }
    this.onStateChange();
  }

  panBy(deltaX, deltaY) {
    this.pan(deltaX, deltaY);
  }

  centerBoth(containerWidth = 800, containerHeight = 600) {
    if (!this.imgA) return;

    const wA = this.imgA.naturalWidth || this.imgA.width || 800;
    const hA = this.imgA.naturalHeight || this.imgA.height || 600;

    const scaleX = (containerWidth * 0.85) / wA;
    const scaleY = (containerHeight * 0.85) / hA;
    this.scale = Math.max(0.1, Math.min(2.0, Math.min(scaleX, scaleY)));

    this.panX = (containerWidth - wA * this.scale) / 2;
    this.panY = (containerHeight - hA * this.scale) / 2;

    if (this.imgB) {
      const wB = (this.imgB.naturalWidth || this.imgB.width || wA) * this.scaleRatioB;
      const hB = (this.imgB.naturalHeight || this.imgB.height || hA) * this.scaleRatioB;
      this.offsetX = (wA - wB) / 2;
      this.offsetY = (hA - hB) / 2;
    } else {
      this.offsetX = 0;
      this.offsetY = 0;
    }

    this.onStateChange();
  }

  swapImages() {
    const temp = this.imgA;
    this.imgA = this.imgB;
    this.imgB = temp;
    this.scaleRatioB = 1 / this.scaleRatioB;
    this.offsetX = -this.offsetX;
    this.offsetY = -this.offsetY;
    this.onStateChange();
  }

  getTransformA() {
    return {
      x: this.panX,
      y: this.panY,
      scale: this.scale * this.scaleRatioA
    };
  }

  getTransformB() {
    if (this.transformMatrixB) {
      // If we have an affine or homography matrix, we apply global pan/zoom
      // and then the matrix. The scaleRatioB and offset are handled by the matrix.
      const is3d = this.transformMatrixB.length === 16;
      const matrixStr = is3d 
        ? `matrix3d(${this.transformMatrixB.join(',')})`
        : `matrix(${this.transformMatrixB.join(',')})`;
      
      return {
        x: this.panX,
        y: this.panY,
        scale: this.scale,
        matrix: matrixStr
      };
    }

    return {
      x: this.panX + this.offsetX * this.scale,
      y: this.panY + this.offsetY * this.scale,
      scale: this.scale * this.scaleRatioB
    };
  }

  alignByThreePoints(ptsA, ptsB) {
    import('./transform_math.js').then(({ solveAffine }) => {
      const matrix = solveAffine(ptsB, ptsA);
      if (matrix) {
        this.transformMatrixB = matrix;
        this.onStateChange();
      } else {
        console.error("Collinear or invalid points for affine transform");
      }
    });
  }

  alignByFourPoints(ptsA, ptsB) {
    import('./transform_math.js').then(({ solveHomography }) => {
      const matrix = solveHomography(ptsB, ptsA);
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
}

