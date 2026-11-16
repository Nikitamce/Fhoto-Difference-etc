/**
 * Bounded coarse-to-fine edge alignment.
 * Runs on reduced feature maps so large source photos do not block the UI for seconds.
 */
export function computeAutoEdgeAlignment(imgA, imgB) {
  if (!imgA || !imgB) return null;
  const widthA = imgA.naturalWidth || imgA.width || 0;
  const heightA = imgA.naturalHeight || imgA.height || 0;
  const widthB = imgB.naturalWidth || imgB.width || 0;
  const heightB = imgB.naturalHeight || imgB.height || 0;
  if (![widthA, heightA, widthB, heightB].every(value => Number.isFinite(value) && value > 0)) return null;

  const baseScale = widthA / widthB;
  // Keep the longest feature-map dimension bounded. Extremely tall scans or
  // screenshots should not turn the exhaustive search into a multi-second freeze.
  const maxAspect = Math.max(heightA / widthA, heightB / widthB, 1);
  // Beyond 24:1, the crop is too elongated for a useful global ZNCC match.
  // Bail out cleanly rather than allocating enormous feature maps; OpenCV or
  // manual point alignment remains available for these unusual inputs.
  if (maxAspect > 24) return null;
  const resolutionScale = Math.min(1, 960 / (320 * maxAspect));
  const coarseWidth = Math.max(16, Math.round(160 * resolutionScale));
  const coarseHeightA = Math.max(24, Math.round(heightA / widthA * coarseWidth));
  const coarseHeightB = Math.max(24, Math.round(heightB / widthB * coarseWidth));
  const fineWidth = Math.max(24, Math.round(320 * resolutionScale));
  const fineHeightA = Math.max(48, Math.round(heightA / widthA * fineWidth));
  const fineHeightB = Math.max(48, Math.round(heightB / widthB * fineWidth));

  try {
    const canvasA = document.createElement("canvas");
    const canvasB = document.createElement("canvas");
    const contextA = canvasA.getContext("2d", { willReadFrequently: true });
    const contextB = canvasB.getContext("2d", { willReadFrequently: true });
    if (!contextA || !contextB) return null;

    canvasA.width = coarseWidth; canvasA.height = coarseHeightA;
    canvasB.width = coarseWidth; canvasB.height = coarseHeightB;
    contextA.drawImage(imgA, 0, 0, coarseWidth, coarseHeightA);
    contextB.drawImage(imgB, 0, 0, coarseWidth, coarseHeightB);
    const coarseA = getHybridFeatureMap(contextA, coarseWidth, coarseHeightA);
    const coarseB = getHybridFeatureMap(contextB, coarseWidth, coarseHeightB);

    let best = { score: -1, scale: baseScale, dx: 0, dy: 0 };
    const coarseScaleSteps = 7;
    for (let index = 0; index < coarseScaleSteps; index++) {
      const factor = 0.78 + index * (0.44 / (coarseScaleSteps - 1));
      const scale = baseScale * factor;
      const testWidth = Math.max(12, Math.round(coarseWidth * factor));
      const testHeight = Math.max(12, Math.round(coarseHeightB * factor));
      const scaledB = resizeFeatureMapBilinear(coarseB, coarseWidth, coarseHeightB, testWidth, testHeight);
      const maxDx = Math.round(coarseWidth * 0.22);
      const maxDy = Math.round(coarseHeightA * 0.22);
      for (let dy = -maxDy; dy <= maxDy; dy += 4) {
        for (let dx = -maxDx; dx <= maxDx; dx += 4) {
          const score = computeZNCC(coarseA, coarseWidth, coarseHeightA, scaledB, testWidth, testHeight, dx, dy, 4);
          if (score > best.score) best = { score, scale, dx, dy };
        }
      }
    }

    canvasA.width = fineWidth; canvasA.height = fineHeightA;
    canvasB.width = fineWidth; canvasB.height = fineHeightB;
    contextA.drawImage(imgA, 0, 0, fineWidth, fineHeightA);
    contextB.drawImage(imgB, 0, 0, fineWidth, fineHeightB);
    const fineA = getHybridFeatureMap(contextA, fineWidth, fineHeightA);
    const fineB = getHybridFeatureMap(contextB, fineWidth, fineHeightB);

    let bestFine = {
      score: -1,
      scale: best.scale,
      dx: best.dx * (fineWidth / coarseWidth),
      dy: best.dy * (fineHeightA / coarseHeightA)
    };
    const fineCenterX = bestFine.dx;
    const fineCenterY = bestFine.dy;
    for (let index = 0; index < 7; index++) {
      const factor = (best.scale / baseScale) - 0.045 + index * (0.09 / 6);
      const scale = baseScale * factor;
      const testWidth = Math.max(12, Math.round(fineWidth * factor));
      const testHeight = Math.max(12, Math.round(fineHeightB * factor));
      const scaledB = resizeFeatureMapBilinear(fineB, fineWidth, fineHeightB, testWidth, testHeight);
      for (let dy = Math.round(fineCenterY - 12); dy <= Math.round(fineCenterY + 12); dy += 2) {
        for (let dx = Math.round(fineCenterX - 12); dx <= Math.round(fineCenterX + 12); dx += 2) {
          const score = computeZNCC(fineA, fineWidth, fineHeightA, scaledB, testWidth, testHeight, dx, dy, 2);
          if (score > bestFine.score) bestFine = { score, scale, dx, dy };
        }
      }
    }

    // A weak correlation is not a successful match; do not return a fake 50% score.
    if (!Number.isFinite(bestFine.score) || bestFine.score < 0.12) return null;
    const offsetX = -bestFine.dx * (widthA / fineWidth);
    const offsetY = -bestFine.dy * (heightA / fineHeightA);
    return {
      scaleRatioB: Number(bestFine.scale.toFixed(5)),
      offsetX: Number(offsetX.toFixed(2)),
      offsetY: Number(offsetY.toFixed(2)),
      confidence: Math.max(0, Math.min(100, Math.round(bestFine.score * 100)))
    };
  } catch (error) {
    console.warn("Auto edge alignment failed:", error);
    return null;
  }
}

function getHybridFeatureMap(context, width, height) {
  const { data } = context.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  for (let i = 0, pixel = 0; i < data.length; i += 4, pixel++) {
    gray[pixel] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const features = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const gx = -gray[index - width - 1] + gray[index - width + 1]
        - 2 * gray[index - 1] + 2 * gray[index + 1]
        - gray[index + width - 1] + gray[index + width + 1];
      const gy = -gray[index - width - 1] - 2 * gray[index - width] - gray[index - width + 1]
        + gray[index + width - 1] + 2 * gray[index + width] + gray[index + width + 1];
      features[index] = Math.hypot(gx, gy) * 0.75 + gray[index] * 0.25;
    }
  }
  return features;
}

function resizeFeatureMapBilinear(source, sourceWidth, sourceHeight, targetWidth, targetHeight) {
  const target = new Float32Array(targetWidth * targetHeight);
  const xRatio = (sourceWidth - 1) / Math.max(1, targetWidth - 1);
  const yRatio = (sourceHeight - 1) / Math.max(1, targetHeight - 1);
  for (let y = 0; y < targetHeight; y++) {
    const sourceY = y * yRatio;
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(sourceHeight - 1, y0 + 1);
    const fy = sourceY - y0;
    for (let x = 0; x < targetWidth; x++) {
      const sourceX = x * xRatio;
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(sourceWidth - 1, x0 + 1);
      const fx = sourceX - x0;
      const a = source[y0 * sourceWidth + x0];
      const b = source[y0 * sourceWidth + x1];
      const c = source[y1 * sourceWidth + x0];
      const d = source[y1 * sourceWidth + x1];
      target[y * targetWidth + x] = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
    }
  }
  return target;
}

function computeZNCC(mapA, widthA, heightA, mapB, widthB, heightB, dx, dy, sampleStep = 2) {
  dx = Math.round(dx);
  dy = Math.round(dy);
  const startY = Math.max(0, -dy);
  const endY = Math.min(heightA, heightB - dy);
  const startX = Math.max(0, -dx);
  const endX = Math.min(widthA, widthB - dx);
  if (endX - startX < 8 || endY - startY < 8) return -1;

  let sumA = 0, sumB = 0, count = 0;
  for (let y = startY; y < endY; y += sampleStep) {
    const indexA = y * widthA;
    const indexB = (y + dy) * widthB + dx;
    for (let x = startX; x < endX; x += sampleStep) {
      const a = mapA[indexA + x];
      const b = mapB[indexB + x];
      if (a > 8 || b > 8) { sumA += a; sumB += b; count++; }
    }
  }
  if (count < 25) return -1;

  const meanA = sumA / count;
  const meanB = sumB / count;
  let numerator = 0, varianceA = 0, varianceB = 0;
  for (let y = startY; y < endY; y += sampleStep) {
    const indexA = y * widthA;
    const indexB = (y + dy) * widthB + dx;
    for (let x = startX; x < endX; x += sampleStep) {
      const a = mapA[indexA + x];
      const b = mapB[indexB + x];
      if (a > 8 || b > 8) {
        const da = a - meanA;
        const db = b - meanB;
        numerator += da * db;
        varianceA += da * da;
        varianceB += db * db;
      }
    }
  }
  const denominator = Math.sqrt(varianceA * varianceB);
  return denominator > 1e-8 ? numerator / denominator : -1;
}
