import { invert3x3 } from "./metadata.js";

/**
 * Exports visual comparison results to PNG file download or Clipboard
 */
export async function exportComparison({
  kind = "current", // "current" | "split" | "diff" | "clipboard"
  imgA,
  imgB,
  viewer,
  modesCtrl,
  filenameA = "A",
  filenameB = "B",
  diffGain = 3,
  diffStyle = "difference",
}) {
  if (!imgA || !imgB || !viewer || !modesCtrl) {
    throw new Error("Images not loaded");
  }

  let canvas;
  const effectiveKind =
    kind === "clipboard"
      ? modesCtrl.currentMode === "split"
        ? "split"
        : modesCtrl.currentMode === "diff"
          ? "diff"
          : "current"
      : kind;

  if (effectiveKind === "split") {
    canvas = renderSideBySideCanvas(imgA, imgB, filenameA, filenameB);
  } else if (effectiveKind === "diff") {
    canvas = renderAlignedDiffCanvas(imgA, imgB, viewer, diffGain, diffStyle);
  } else if (modesCtrl.currentMode === "split") {
    canvas = renderSideBySideCanvas(imgA, imgB, filenameA, filenameB);
  } else if (modesCtrl.currentMode === "diff") {
    canvas = renderAlignedDiffCanvas(imgA, imgB, viewer, diffGain, diffStyle);
  } else {
    canvas = renderCompositeCanvas(imgA, imgB, viewer, modesCtrl);
  }

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas export failed"))), "image/png");
  });

  if (kind === "clipboard") {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      throw new Error("Clipboard image API unavailable");
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    return { copied: true };
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const suffix = effectiveKind === "split" ? "side-by-side" : effectiveKind === "diff" ? "diff" : modesCtrl.currentMode;
  const downloadName = `photocheck-${suffix}-${stamp}.png`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);

  return { filename: downloadName };
}

function drawAlignedB(ctx, imgB, viewer, outScale = 1) {
  const wB = imgB.naturalWidth || imgB.width;
  const hB = imgB.naturalHeight || imgB.height;
  const sA = viewer.scaleRatioA || 1.0;

  if (viewer.transformMatrixB && viewer.transformMatrixB.length === 16) {
    // Homography warp onto target canvas
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    const m = viewer.transformMatrixB;
    const H = [
      m[0], m[4], m[12],
      m[1], m[5], m[13],
      m[3], m[7], m[15],
    ];
    const Hinv = invert3x3(H);
    if (!Hinv) return;

    const tmp = document.createElement("canvas");
    tmp.width = wB;
    tmp.height = hB;
    const tctx = tmp.getContext("2d", { willReadFrequently: true });
    tctx.drawImage(imgB, 0, 0, wB, hB);
    const src = tctx.getImageData(0, 0, wB, hB).data;

    const existing = ctx.getImageData(0, 0, cw, ch);
    const dst = existing.data;
    const effScale = outScale / sA;

    for (let y = 0; y < ch; y++) {
      const ay = y / effScale;
      for (let x = 0; x < cw; x++) {
        const ax = x / effScale;
        const denom = Hinv[6] * ax + Hinv[7] * ay + Hinv[8];
        if (Math.abs(denom) < 1e-9) continue;
        const bx = Math.round((Hinv[0] * ax + Hinv[1] * ay + Hinv[2]) / denom);
        const by = Math.round((Hinv[3] * ax + Hinv[4] * ay + Hinv[5]) / denom);
        if (bx >= 0 && by >= 0 && bx < wB && by < hB) {
          const sIdx = (by * wB + bx) * 4;
          const dIdx = (y * cw + x) * 4;
          const alpha = src[sIdx + 3] / 255;
          if (alpha > 0) {
            dst[dIdx] = Math.round(src[sIdx] * alpha + dst[dIdx] * (1 - alpha));
            dst[dIdx + 1] = Math.round(src[sIdx + 1] * alpha + dst[dIdx + 1] * (1 - alpha));
            dst[dIdx + 2] = Math.round(src[sIdx + 2] * alpha + dst[dIdx + 2] * (1 - alpha));
            dst[dIdx + 3] = Math.min(255, Math.round(dst[dIdx + 3] + src[sIdx + 3] * (1 - dst[dIdx + 3] / 255)));
          }
        }
      }
    }
    ctx.putImageData(existing, 0, 0);
  } else if (viewer.transformMatrixB && viewer.transformMatrixB.length === 6) {
    const [a, b, c, d, e, f] = viewer.transformMatrixB;
    ctx.save();
    ctx.scale(outScale / sA, outScale / sA);
    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(imgB, 0, 0, wB, hB);
    ctx.restore();
  } else {
    const sB = viewer.scaleRatioB || 1.0;
    const dx = (viewer.offsetX * outScale) / sA;
    const dy = (viewer.offsetY * outScale) / sA;
    const dw = (wB * sB * outScale) / sA;
    const dh = (hB * sB * outScale) / sA;
    ctx.drawImage(imgB, dx, dy, dw, dh);
  }
}

function getExportDimensions(imgA) {
  const wA = imgA.naturalWidth || imgA.width;
  const hA = imgA.naturalHeight || imgA.height;
  // Cap at 4096px max side for safe single-canvas export
  const maxSide = 4096;
  const scale = Math.min(1, maxSide / Math.max(wA, hA));
  return {
    w: Math.max(1, Math.round(wA * scale)),
    h: Math.max(1, Math.round(hA * scale)),
    scale,
  };
}

function renderCompositeCanvas(imgA, imgB, viewer, modesCtrl) {
  const { w, h, scale } = getExportDimensions(imgA);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Draw B underneath
  drawAlignedB(ctx, imgB, viewer, scale);

  if (modesCtrl.currentMode === "fade") {
    ctx.save();
    ctx.globalAlpha = modesCtrl.opacity;
    ctx.drawImage(imgA, 0, 0, w, h);
    ctx.restore();
    return canvas;
  }

  // Slider mode: map viewport curtain position into Image A coordinate space when possible,
  // or fallback to sliderPos% of output canvas
  const trA = viewer.getTransformA();
  const rect = modesCtrl.overlayViewport?.getBoundingClientRect();
  let splitX = Math.round((modesCtrl.sliderPos / 100) * w);
  let splitY = Math.round((modesCtrl.sliderPos / 100) * h);

  if (rect && rect.width > 0 && rect.height > 0 && trA.scale > 0) {
    const vpSplitX = (modesCtrl.sliderPos / 100) * rect.width;
    const vpSplitY = (modesCtrl.sliderPos / 100) * rect.height;
    const imgSplitX = ((vpSplitX - trA.x) / trA.scale) * scale;
    const imgSplitY = ((vpSplitY - trA.y) / trA.scale) * scale;
    if (imgSplitX >= 0 && imgSplitX <= w) splitX = Math.round(imgSplitX);
    if (imgSplitY >= 0 && imgSplitY <= h) splitY = Math.round(imgSplitY);
  }

  ctx.save();
  ctx.beginPath();
  if (modesCtrl.sliderOrientation === "vertical") {
    ctx.rect(0, 0, splitX, h);
  } else {
    ctx.rect(0, 0, w, splitY);
  }
  ctx.clip();
  ctx.drawImage(imgA, 0, 0, w, h);
  ctx.restore();

  // Crisp 2px accent divider line
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  if (modesCtrl.sliderOrientation === "vertical") {
    ctx.fillRect(Math.max(0, splitX - 1), 0, 2, h);
  } else {
    ctx.fillRect(0, Math.max(0, splitY - 1), w, 2);
  }
  ctx.restore();

  return canvas;
}

function renderSideBySideCanvas(imgA, imgB, filenameA, filenameB) {
  const wA = imgA.naturalWidth || imgA.width;
  const hA = imgA.naturalHeight || imgA.height;
  const wB = imgB.naturalWidth || imgB.width;
  const hB = imgB.naturalHeight || imgB.height;

  const targetH = Math.min(2048, Math.max(hA, hB));
  const scaledWA = Math.round((wA / hA) * targetH);
  const scaledWB = Math.round((wB / hB) * targetH);
  const gap = 16;
  const headerH = 44;

  const canvas = document.createElement("canvas");
  canvas.width = scaledWA + scaledWB + gap;
  canvas.height = targetH + headerH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0d1017";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "600 16px system-ui, -apple-system, sans-serif";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#38bdf8";
  ctx.fillText(`A • ${filenameA} (${wA}×${hA})`, 14, headerH / 2);

  ctx.fillStyle = "#34d399";
  ctx.fillText(`B • ${filenameB} (${wB}×${hB})`, scaledWA + gap + 14, headerH / 2);

  ctx.drawImage(imgA, 0, headerH, scaledWA, targetH);
  ctx.drawImage(imgB, scaledWA + gap, headerH, scaledWB, targetH);

  return canvas;
}

function renderAlignedDiffCanvas(imgA, imgB, viewer, diffGain = 3, diffStyle = "difference") {
  const { w, h, scale } = getExportDimensions(imgA);
  const cA = document.createElement("canvas");
  cA.width = w;
  cA.height = h;
  const ctxA = cA.getContext("2d", { willReadFrequently: true });
  ctxA.drawImage(imgA, 0, 0, w, h);

  const cB = document.createElement("canvas");
  cB.width = w;
  cB.height = h;
  const ctxB = cB.getContext("2d", { willReadFrequently: true });
  drawAlignedB(ctxB, imgB, viewer, scale);

  const dA = ctxA.getImageData(0, 0, w, h).data;
  const dB = ctxB.getImageData(0, 0, w, h).data;
  const out = ctxA.createImageData(w, h);
  const dst = out.data;

  for (let i = 0; i < dA.length; i += 4) {
    const dr = Math.abs(dA[i] - dB[i]);
    const dg = Math.abs(dA[i + 1] - dB[i + 1]);
    const db = Math.abs(dA[i + 2] - dB[i + 2]);
    const mag = Math.min(255, ((dr + dg + db) / 3) * diffGain);

    if (diffStyle === "heatmap") {
      const t = mag / 255;
      // Dark navy -> Cyan -> Yellow -> Red thermal ramp
      dst[i] = Math.round(t < 0.5 ? t * 2 * 40 : 40 + (t - 0.5) * 2 * 215);
      dst[i + 1] = Math.round(t < 0.5 ? t * 2 * 210 : 210 - (t - 0.5) * 2 * 165);
      dst[i + 2] = Math.round(t < 0.35 ? 30 + t * 220 : Math.max(0, 220 - (t - 0.35) * 340));
      dst[i + 3] = 255;
    } else if (diffStyle === "threshold") {
      const isDiff = Math.max(dr, dg, db) * diffGain > 24;
      if (isDiff) {
        dst[i] = 244;
        dst[i + 1] = 63;
        dst[i + 2] = 94;
        dst[i + 3] = 255;
      } else {
        const lum = Math.round((dA[i] * 0.299 + dA[i + 1] * 0.587 + dA[i + 2] * 0.114) * 0.35);
        dst[i] = lum;
        dst[i + 1] = lum;
        dst[i + 2] = lum;
        dst[i + 3] = 255;
      }
    } else {
      dst[i] = Math.min(255, Math.round(dr * diffGain));
      dst[i + 1] = Math.min(255, Math.round(dg * diffGain));
      dst[i + 2] = Math.min(255, Math.round(db * diffGain));
      dst[i + 3] = 255;
    }
  }

  ctxA.putImageData(out, 0, 0);
  return cA;
}
