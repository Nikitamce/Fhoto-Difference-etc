/**
 * Advanced Auto-alignment module for PhotoCheck.
 * Implements Multi-Resolution Coarse-to-Fine Search with
 * Feature-Selective Zero-Mean Normalized Cross-Correlation (ZNCC) on Hybrid Feature Maps.
 */

export function computeAutoEdgeAlignment(imgA, imgB) {
  if (!imgA || !imgB) return null;

  const wA = imgA.naturalWidth || imgA.width;
  const hA = imgA.naturalHeight || imgA.height;
  const wB = imgB.naturalWidth || imgB.width;
  const hB = imgB.naturalHeight || imgB.height;

  if (!wA || !wB || !hA || !hB) return null;

  // Initial scale ratio to make B match A's width
  const baseScaleB = wA / wB;

  // --- PASS 1: Coarse Search ---
  const coarseW = 280;
  const coarseHA = Math.round((hA / wA) * coarseW);
  const coarseHB = Math.round((hB / wB) * coarseW);

  const canvasA = document.createElement("canvas");
  canvasA.width = coarseW;
  canvasA.height = coarseHA;
  const ctxA = canvasA.getContext("2d");
  ctxA.drawImage(imgA, 0, 0, coarseW, coarseHA);

  const canvasB = document.createElement("canvas");
  canvasB.width = coarseW;
  canvasB.height = coarseHB;
  const ctxB = canvasB.getContext("2d");
  ctxB.drawImage(imgB, 0, 0, coarseW, coarseHB);

  const mapA1 = getHybridFeatureMap(ctxA, coarseW, coarseHA);
  const mapB1 = getHybridFeatureMap(ctxB, coarseW, coarseHB);

  let bestCoarseScore = -2;
  let bestCoarseScale = baseScaleB;
  let bestCoarseShiftX = 0;
  let bestCoarseShiftY = 0;

  // Scale search range: 60% to 140% of base scale
  const scaleMin1 = baseScaleB * 0.60;
  const scaleMax1 = baseScaleB * 1.40;
  const steps1 = 17;
  const scaleStep1 = (scaleMax1 - scaleMin1) / (steps1 - 1);

  for (let s = 0; s < steps1; s++) {
    const testScale = scaleMin1 + s * scaleStep1;
    const testW = Math.round(coarseW * (testScale / baseScaleB));
    const testH = Math.round(coarseHB * (testScale / baseScaleB));
    if (testW <= 10 || testH <= 10) continue;

    const scaledB = resizeFeatureMapBilinear(mapB1, coarseW, coarseHB, testW, testH);

    const maxShiftX = Math.round(coarseW * 0.40);
    const maxShiftY = Math.round(coarseHA * 0.40);
    const stepSize = 3;

    for (let dy = -maxShiftY; dy <= maxShiftY; dy += stepSize) {
      for (let dx = -maxShiftX; dx <= maxShiftX; dx += stepSize) {
        const score = computeZNCC(mapA1, coarseW, coarseHA, scaledB, testW, testH, dx, dy);
        if (score > bestCoarseScore) {
          bestCoarseScore = score;
          bestCoarseScale = testScale;
          bestCoarseShiftX = dx;
          bestCoarseShiftY = dy;
        }
      }
    }
  }

  // --- PASS 2: Fine Search ---
  const fineW = 560;
  const fineHA = Math.round((hA / wA) * fineW);
  const fineHB = Math.round((hB / wB) * fineW);

  canvasA.width = fineW;
  canvasA.height = fineHA;
  ctxA.drawImage(imgA, 0, 0, fineW, fineHA);

  canvasB.width = fineW;
  canvasB.height = fineHB;
  ctxB.drawImage(imgB, 0, 0, fineW, fineHB);

  const mapA2 = getHybridFeatureMap(ctxA, fineW, fineHA);
  const mapB2 = getHybridFeatureMap(ctxB, fineW, fineHB);

  const scaleMin2 = bestCoarseScale * 0.94;
  const scaleMax2 = bestCoarseScale * 1.06;
  const steps2 = 13;
  const scaleStep2 = (scaleMax2 - scaleMin2) / (steps2 - 1);

  const baseShiftX2 = (bestCoarseShiftX / coarseW) * fineW;
  const baseShiftY2 = (bestCoarseShiftY / coarseHA) * fineHA;

  let bestFineScore = -2;
  let bestFineScale = bestCoarseScale;
  let bestFineShiftX = baseShiftX2;
  let bestFineShiftY = baseShiftY2;

  for (let s = 0; s < steps2; s++) {
    const testScale = scaleMin2 + s * scaleStep2;
    const testW = Math.round(fineW * (testScale / baseScaleB));
    const testH = Math.round(fineHB * (testScale / baseScaleB));
    if (testW <= 10 || testH <= 10) continue;

    const scaledB = resizeFeatureMapBilinear(mapB2, fineW, fineHB, testW, testH);

    const shiftSearchRadius = 24;
    const stepSize2 = 1;

    for (let dy = baseShiftY2 - shiftSearchRadius; dy <= baseShiftY2 + shiftSearchRadius; dy += stepSize2) {
      for (let dx = baseShiftX2 - shiftSearchRadius; dx <= baseShiftX2 + shiftSearchRadius; dx += stepSize2) {
        const score = computeZNCC(mapA2, fineW, fineHA, scaledB, testW, testH, Math.round(dx), Math.round(dy));
        if (score > bestFineScore) {
          bestFineScore = score;
          bestFineScale = testScale;
          bestFineShiftX = dx;
          bestFineShiftY = dy;
        }
      }
    }
  }

  // Fallback to center fit if confidence is too low (< 10%)
  if (bestFineScore < 0.10) {
    const defaultScale = parseFloat(baseScaleB.toFixed(4));
    const defaultOffsetX = parseFloat(((wA - wB * defaultScale) / 2).toFixed(2));
    const defaultOffsetY = parseFloat(((hA - hB * defaultScale) / 2).toFixed(2));
    return {
      scaleRatioB: defaultScale,
      offsetX: defaultOffsetX,
      offsetY: defaultOffsetY,
      confidence: 50
    };
  }

  // Convert refined shift to Image B's required positioning offset
  // (Invert sign because if feature in B is at y+dy, B must be shifted by -dy to align with A)
  const scaleFactorX = wA / fineW;
  const scaleFactorY = hA / fineHA;

  const offsetX = -bestFineShiftX * scaleFactorX;
  const offsetY = -bestFineShiftY * scaleFactorY;

  const confidencePercent = Math.max(0, Math.min(100, Math.round(((bestFineScore + 1) / 2) * 100)));

  return {
    scaleRatioB: parseFloat(bestFineScale.toFixed(4)),
    offsetX: parseFloat(offsetX.toFixed(2)),
    offsetY: parseFloat(offsetY.toFixed(2)),
    confidence: confidencePercent
  };
}

/**
 * Computes Hybrid Feature Map (Sobel Edge Magnitudes + Luminance Contrast)
 */
function getHybridFeatureMap(ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const gray = new Float32Array(w * h);

  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const featureMap = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const gx =
        -gray[idx - w - 1] + gray[idx - w + 1] -
        2 * gray[idx - 1] + 2 * gray[idx + 1] -
        gray[idx + w - 1] + gray[idx + w + 1];

      const gy =
        -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] +
        gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];

      const mag = Math.sqrt(gx * gx + gy * gy);
      featureMap[idx] = mag * 0.7 + gray[idx] * 0.3;
    }
  }
  return featureMap;
}

/**
 * Resizes feature map using smooth Bilinear Interpolation
 */
function resizeFeatureMapBilinear(src, srcW, srcH, dstW, dstH) {
  const dst = new Float32Array(dstW * dstH);
  if (dstW <= 0 || dstH <= 0) return dst;

  const xRatio = (srcW - 1) / Math.max(1, dstW - 1);
  const yRatio = (srcH - 1) / Math.max(1, dstH - 1);

  for (let y = 0; y < dstH; y++) {
    const srcY = y * yRatio;
    const y1 = Math.floor(srcY);
    const y2 = Math.min(srcH - 1, y1 + 1);
    const yDiff = srcY - y1;

    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const x1 = Math.floor(srcX);
      const x2 = Math.min(srcW - 1, x1 + 1);
      const xDiff = srcX - x1;

      const A = src[y1 * srcW + x1];
      const B = src[y1 * srcW + x2];
      const C = src[y2 * srcW + x1];
      const D = src[y2 * srcW + x2];

      const val =
        A * (1 - xDiff) * (1 - yDiff) +
        B * xDiff * (1 - yDiff) +
        C * (1 - xDiff) * yDiff +
        D * xDiff * yDiff;

      dst[y * dstW + x] = val;
    }
  }
  return dst;
}

/**
 * Feature-Selective Zero-Mean Normalized Cross-Correlation (ZNCC)
 */
function computeZNCC(mapA, wA, hA, mapB, wB, hB, dx, dy) {
  const startY = Math.max(0, -dy);
  const endY = Math.min(hA, hB - dy);
  const startX = Math.max(0, -dx);
  const endX = Math.min(wA, wB - dx);

  let sumA = 0, sumB = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 2) {
    const idxA = y * wA;
    const idxB = (y + dy) * wB + dx;
    for (let x = startX; x < endX; x += 2) {
      const valA = mapA[idxA + x];
      const valB = mapB[idxB + x];
      if (valA > 12 || valB > 12) {
        sumA += valA;
        sumB += valB;
        count++;
      }
    }
  }

  if (count < 25) return -1;

  const meanA = sumA / count;
  const meanB = sumB / count;

  let num = 0, denA = 0, denB = 0;

  for (let y = startY; y < endY; y += 2) {
    const idxA = y * wA;
    const idxB = (y + dy) * wB + dx;
    for (let x = startX; x < endX; x += 2) {
      const valA = mapA[idxA + x];
      const valB = mapB[idxB + x];
      if (valA > 12 || valB > 12) {
        const diffA = valA - meanA;
        const diffB = valB - meanB;
        num += diffA * diffB;
        denA += diffA * diffA;
        denB += diffB * diffB;
      }
    }
  }

  const denom = Math.sqrt(denA * denB);
  return denom > 0 ? num / denom : -1;
}
