/**
 * Image Telemetry, Binary EXIF/PNG/JPEG Header Parser, Pixel Probe, and Comparison Metrics
 */

const pixelCache = new Map(); // img -> { width, height, data }

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, idx);
  return `${value >= 100 || idx === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[idx]}`;
}

export function formatAspectRatio(w, h) {
  if (!w || !h) return "—";
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(w, h);
  const rw = w / d;
  const rh = h / d;
  if (rw <= 32 && rh <= 32) return `${rw}:${rh}`;
  return `${(w / h).toFixed(2)}:1`;
}

export function detectImageTransparency(img) {
  if (!img) return null;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  const sampleW = Math.min(256, w);
  const sampleH = Math.max(1, Math.round((h / w) * sampleW));
  const canvas = document.createElement("canvas");
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const { data } = ctx.getImageData(0, 0, sampleW, sampleH);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 252) return true;
  }
  return false;
}

export function preparePixelBuffer(key, img) {
  if (!img) {
    pixelCache.delete(key);
    return null;
  }
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  // Cap offscreen probe buffer at 2048px longest side to stay fast and memory-safe
  const maxDim = 2048;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const bw = Math.max(1, Math.round(w * scale));
  const bh = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = bw;
  canvas.height = bh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, bw, bh);
  const imageData = ctx.getImageData(0, 0, bw, bh);

  const entry = {
    naturalWidth: w,
    naturalHeight: h,
    bufWidth: bw,
    bufHeight: bh,
    scale,
    data: imageData.data,
  };
  pixelCache.set(key, entry);
  return entry;
}

export function sampleCachedPixel(key, imgX, imgY) {
  const entry = pixelCache.get(key);
  if (!entry) return null;
  const ix = Math.floor(imgX);
  const iy = Math.floor(imgY);
  if (ix < 0 || iy < 0 || ix >= entry.naturalWidth || iy >= entry.naturalHeight) {
    return null;
  }
  const bx = Math.min(entry.bufWidth - 1, Math.max(0, Math.floor(ix * entry.scale)));
  const by = Math.min(entry.bufHeight - 1, Math.max(0, Math.floor(iy * entry.scale)));
  const idx = (by * entry.bufWidth + bx) * 4;
  return {
    x: ix,
    y: iy,
    r: entry.data[idx],
    g: entry.data[idx + 1],
    b: entry.data[idx + 2],
    a: entry.data[idx + 3],
  };
}

/**
 * Parse binary PNG/JPEG headers and EXIF metadata offline
 */
export async function parseImageMetadata(file, img) {
  const w = img?.naturalWidth || img?.width || 0;
  const h = img?.naturalHeight || img?.height || 0;
  const hasAlpha = detectImageTransparency(img);
  const ext = (file?.name?.split(".").pop() || "").toUpperCase();
  const mimeType = file?.type || "";
  const format = mimeType
    ? mimeType.split("/")[1]?.replace("jpeg", "JPG").replace("svg+xml", "SVG").toUpperCase()
    : ext || "PNG";

  const meta = {
    name: file?.name || "Image",
    sizeBytes: file?.size || 0,
    sizeFormatted: file?.size ? formatBytes(file.size) : "—",
    lastModified: file?.lastModified || null,
    width: w,
    height: h,
    megapixels: w && h ? ((w * h) / 1e6).toFixed(2) : "—",
    aspect: formatAspectRatio(w, h),
    format,
    hasAlpha,
    colorProfile: "sRGB",
    bitDepth: "24-bit (8 bpc)",
    dpi: null,
    compression: inferCompression(format),
    camera: null,
    exposure: null,
    iso: null,
    aperture: null,
    focalLength: null,
    software: null,
    capturedAt: null,
  };

  if (!file || typeof file.arrayBuffer !== "function") {
    return meta;
  }

  try {
    // Only inspect up to first 256 KB for headers/EXIF
    const slice = file.slice(0, 262144);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    if (isPNG(view)) {
      parsePNGChunks(view, meta);
    } else if (isJPEG(view)) {
      parseJPEGMarkers(view, meta);
    } else if (format === "SVG") {
      meta.colorProfile = "SVG Vector (sRGB)";
      meta.bitDepth = "Vector";
      meta.compression = "XML / SVG";
    }
  } catch {
    // Gracefully keep inferred metadata
  }

  return meta;
}

function inferCompression(fmt) {
  if (fmt === "PNG" || fmt === "BMP" || fmt === "TIFF") return "lossless";
  if (fmt === "JPG" || fmt === "JPEG" || fmt === "AVIF" || fmt === "HEIC") return "lossy";
  if (fmt === "WEBP") return "webp";
  if (fmt === "GIF") return "lzw";
  if (fmt === "SVG") return "vector";
  return "standard";
}

function isPNG(view) {
  return (
    view.byteLength > 24 &&
    view.getUint32(0) === 0x89504e47 &&
    view.getUint32(4) === 0x0d0a1a0a
  );
}

function isJPEG(view) {
  return view.byteLength > 4 && view.getUint16(0) === 0xffd8;
}

function readASCII(view, start, length) {
  let out = "";
  const end = Math.min(view.byteLength, start + length);
  for (let i = start; i < end; i++) {
    const code = view.getUint8(i);
    if (code === 0) break;
    if (code >= 32 && code <= 126) out += String.fromCharCode(code);
  }
  return out.trim();
}

function parsePNGChunks(view, meta) {
  let offset = 8;
  while (offset + 8 <= view.byteLength) {
    const length = view.getUint32(offset);
    const type = readASCII(view, offset + 4, 4);
    const dataOffset = offset + 8;
    if (dataOffset + length > view.byteLength) break;

    if (type === "IHDR" && length >= 10) {
      const depth = view.getUint8(dataOffset + 8);
      const colorType = view.getUint8(dataOffset + 9);
      const channels =
        colorType === 0 ? 1 :
        colorType === 2 ? 3 :
        colorType === 3 ? 1 :
        colorType === 4 ? 2 :
        colorType === 6 ? 4 : 3;
      meta.bitDepth =
        colorType === 3
          ? `${depth}-bit Indexed`
          : `${depth * channels}-bit (${depth} bpc)`;
    } else if (type === "pHYs" && length >= 9) {
      const ppux = view.getUint32(dataOffset);
      const ppuy = view.getUint32(dataOffset + 4);
      const unit = view.getUint8(dataOffset + 8);
      if (unit === 1 && ppux > 0 && ppuy > 0) {
        const dpiX = Math.round(ppux * 0.0254);
        const dpiY = Math.round(ppuy * 0.0254);
        meta.dpi = `${dpiX} × ${dpiY} DPI`;
      }
    } else if (type === "iCCP" && length > 2) {
      const iccName = readASCII(view, dataOffset, Math.min(79, length));
      if (iccName) meta.colorProfile = iccName;
    } else if (type === "sRGB") {
      meta.colorProfile = "sRGB IEC61966-2.1";
    } else if (type === "IDAT" || type === "IEND") {
      break;
    }

    offset += 12 + length;
  }
}

function parseJPEGMarkers(view, meta) {
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break;
    const marker = view.getUint8(offset + 1);
    if (marker === 0xda || marker === 0xd9) break; // SOS / EOI
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const segLen = view.getUint16(offset + 2);
    const segStart = offset + 4;
    if (segStart + segLen - 2 > view.byteLength) break;

    // APP0 JFIF DPI
    if (marker === 0xe0 && segLen >= 14 && readASCII(view, segStart, 4) === "JFIF") {
      const units = view.getUint8(segStart + 7);
      const xDens = view.getUint16(segStart + 8);
      const yDens = view.getUint16(segStart + 10);
      if (units === 1 && xDens > 0 && yDens > 0) {
        meta.dpi = `${xDens} × ${yDens} DPI`;
      } else if (units === 2 && xDens > 0 && yDens > 0) {
        meta.dpi = `${Math.round(xDens * 2.54)} × ${Math.round(yDens * 2.54)} DPI`;
      }
    }

    // APP1 EXIF
    if (marker === 0xe1 && segLen > 14 && readASCII(view, segStart, 4) === "Exif") {
      parseEXIFBlock(view, segStart + 6, meta);
    }

    // SOF0 / SOF2 frame precision
    if ((marker === 0xc0 || marker === 0xc2) && segLen >= 8) {
      const precision = view.getUint8(segStart);
      const comps = view.getUint8(segStart + 5);
      meta.bitDepth = `${precision * comps}-bit (${precision} bpc)`;
    }

    offset += 2 + segLen;
  }
}

function parseEXIFBlock(view, tiffStart, meta) {
  if (tiffStart + 8 > view.byteLength) return;
  const endian = view.getUint16(tiffStart);
  const le = endian === 0x4949;
  if (!le && endian !== 0x4d4d) return;

  const u16 = (off) => (off + 2 <= view.byteLength ? view.getUint16(off, le) : 0);
  const u32 = (off) => (off + 4 <= view.byteLength ? view.getUint32(off, le) : 0);

  const ifd0Offset = u32(tiffStart + 4);
  if (!ifd0Offset) return;

  let make = "";
  let model = "";
  let exifIfdPtr = 0;
  let resX = 0;
  let resY = 0;

  const readRational = (valOffset) => {
    const num = u32(tiffStart + valOffset);
    const den = u32(tiffStart + valOffset + 4);
    return den ? num / den : 0;
  };

  const readTagString = (count, valueOrOffset, entryOffset) => {
    const start = count <= 4 ? entryOffset + 8 : tiffStart + valueOrOffset;
    return readASCII(view, start, count);
  };

  const readIFD = (relOffset, cb) => {
    const abs = tiffStart + relOffset;
    if (abs + 2 > view.byteLength) return;
    const count = u16(abs);
    for (let i = 0; i < count; i++) {
      const entry = abs + 2 + i * 12;
      if (entry + 12 > view.byteLength) break;
      const tag = u16(entry);
      const type = u16(entry + 2);
      const cnt = u32(entry + 4);
      const val = u32(entry + 8);
      cb(tag, type, cnt, val, entry);
    }
  };

  readIFD(ifd0Offset, (tag, type, cnt, val, entry) => {
    if (tag === 0x010f && type === 2) make = readTagString(cnt, val, entry);
    else if (tag === 0x0110 && type === 2) model = readTagString(cnt, val, entry);
    else if (tag === 0x0131 && type === 2) meta.software = readTagString(cnt, val, entry);
    else if (tag === 0x011a && type === 5) resX = Math.round(readRational(val));
    else if (tag === 0x011b && type === 5) resY = Math.round(readRational(val));
    else if (tag === 0x8769) exifIfdPtr = val;
  });

  if (make || model) {
    meta.camera = model.toLowerCase().startsWith(make.toLowerCase()) ? model : `${make} ${model}`.trim();
  }
  if (resX > 0 && resY > 0) {
    meta.dpi = `${resX} × ${resY} DPI`;
  }

  if (exifIfdPtr) {
    readIFD(exifIfdPtr, (tag, type, cnt, val, entry) => {
      if (tag === 0x829a && type === 5) {
        const exp = readRational(val);
        if (exp > 0) meta.exposure = exp < 1 ? `1/${Math.round(1 / exp)}s` : `${exp.toFixed(1)}s`;
      } else if (tag === 0x829d && type === 5) {
        const f = readRational(val);
        if (f > 0) meta.aperture = `f/${f.toFixed(1).replace(/\.0$/, "")}`;
      } else if (tag === 0x8827) {
        const iso = cnt <= 2 ? u16(entry + 8) : val;
        if (iso > 0) meta.iso = `ISO ${iso}`;
      } else if (tag === 0x920a && type === 5) {
        const fl = readRational(val);
        if (fl > 0) meta.focalLength = `${Math.round(fl)}mm`;
      } else if (tag === 0x9003 && type === 2) {
        meta.capturedAt = readTagString(cnt, val, entry);
      } else if (tag === 0xa001) {
        const cs = u16(entry + 8);
        if (cs === 1) meta.colorProfile = "sRGB (EXIF)";
        else if (cs === 2) meta.colorProfile = "Adobe RGB (1998)";
      }
    });
  }
}

/**
 * Computes real aligned pixel metrics between Image A and Image B.
 * Respects scaleRatioA, scaleRatioB, offsetX, offsetY, and affine/homography transformMatrixB.
 */
export function computeComparisonMetrics(imgA, imgB, viewer) {
  if (!imgA || !imgB || !viewer) return null;

  const wA = imgA.naturalWidth || imgA.width;
  const hA = imgA.naturalHeight || imgA.height;
  const wB = imgB.naturalWidth || imgB.width;
  const hB = imgB.naturalHeight || imgB.height;
  if (!wA || !hA || !wB || !hB) return null;

  const maxSide = 320;
  const workScale = Math.min(1, maxSide / Math.max(wA, hA));
  const cw = Math.max(16, Math.round(wA * workScale));
  const ch = Math.max(16, Math.round(hA * workScale));

  const cA = document.createElement("canvas");
  cA.width = cw;
  cA.height = ch;
  const ctxA = cA.getContext("2d", { willReadFrequently: true });
  ctxA.drawImage(imgA, 0, 0, cw, ch);

  const cB = document.createElement("canvas");
  cB.width = cw;
  cB.height = ch;
  const ctxB = cB.getContext("2d", { willReadFrequently: true });

  const sA = viewer.scaleRatioA || 1.0;

  if (viewer.transformMatrixB && viewer.transformMatrixB.length === 16) {
    // Perspective warp (column-major CSS matrix3d -> 3x3 H mapping B -> A)
    const m = viewer.transformMatrixB;
    const H = [
      m[0], m[4], m[12],
      m[1], m[5], m[13],
      m[3], m[7], m[15],
    ];
    const Hinv = invert3x3(H);
    if (Hinv) {
      drawHomographyToCanvas(imgB, ctxB, cw, ch, workScale / sA, Hinv);
    }
  } else if (viewer.transformMatrixB && viewer.transformMatrixB.length === 6) {
    const [a, b, c, d, e, f] = viewer.transformMatrixB;
    ctxB.save();
    ctxB.scale(workScale / sA, workScale / sA);
    ctxB.transform(a, b, c, d, e, f);
    ctxB.drawImage(imgB, 0, 0, wB, hB);
    ctxB.restore();
  } else {
    const sB = viewer.scaleRatioB || 1.0;
    const dx = (viewer.offsetX * workScale) / sA;
    const dy = (viewer.offsetY * workScale) / sA;
    const dw = (wB * sB * workScale) / sA;
    const dh = (hB * sB * workScale) / sA;
    ctxB.drawImage(imgB, dx, dy, dw, dh);
  }

  const dataA = ctxA.getImageData(0, 0, cw, ch).data;
  const dataB = ctxB.getImageData(0, 0, cw, ch).data;

  const totalPixels = cw * ch;
  let sumAbs = 0;
  let changedPixels = 0;
  let maxDelta = 0;

  for (let i = 0; i < dataA.length; i += 4) {
    const dr = Math.abs(dataA[i] - dataB[i]);
    const dg = Math.abs(dataA[i + 1] - dataB[i + 1]);
    const db = Math.abs(dataA[i + 2] - dataB[i + 2]);
    const avgPix = (dr + dg + db) / 3;
    const maxCh = Math.max(dr, dg, db);
    sumAbs += avgPix;
    if (maxCh > 6) changedPixels++;
    if (maxCh > maxDelta) maxDelta = maxCh;
  }

  const mae = sumAbs / totalPixels;
  const similarity = Math.max(0, Math.min(100, 100 - (mae / 255) * 100));
  const changedPercent = (changedPixels / totalPixels) * 100;

  return {
    similarity: Number(similarity.toFixed(1)),
    changedPercent: Number(changedPercent.toFixed(1)),
    mae: Number(mae.toFixed(1)),
    maxDelta,
  };
}

export function invert3x3(m) {
  const a = m[0], b = m[1], c = m[2];
  const d = m[3], e = m[4], f = m[5];
  const g = m[6], h = m[7], i = m[8];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const invDet = 1 / det;
  return [
    A * invDet, D * invDet, G * invDet,
    B * invDet, E * invDet, H * invDet,
    C * invDet, F * invDet, I * invDet,
  ];
}

function drawHomographyToCanvas(imgB, ctxB, cw, ch, scaleFactor, Hinv) {
  const wB = imgB.naturalWidth || imgB.width;
  const hB = imgB.naturalHeight || imgB.height;
  const tmp = document.createElement("canvas");
  tmp.width = wB;
  tmp.height = hB;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.drawImage(imgB, 0, 0, wB, hB);
  const srcData = tctx.getImageData(0, 0, wB, hB).data;

  const out = ctxB.createImageData(cw, ch);
  const dst = out.data;

  for (let y = 0; y < ch; y++) {
    const ay = y / scaleFactor;
    for (let x = 0; x < cw; x++) {
      const ax = x / scaleFactor;
      const denom = Hinv[6] * ax + Hinv[7] * ay + Hinv[8];
      if (Math.abs(denom) < 1e-9) continue;
      const bx = Math.round((Hinv[0] * ax + Hinv[1] * ay + Hinv[2]) / denom);
      const by = Math.round((Hinv[3] * ax + Hinv[4] * ay + Hinv[5]) / denom);
      if (bx >= 0 && by >= 0 && bx < wB && by < hB) {
        const sIdx = (by * wB + bx) * 4;
        const dIdx = (y * cw + x) * 4;
        dst[dIdx] = srcData[sIdx];
        dst[dIdx + 1] = srcData[sIdx + 1];
        dst[dIdx + 2] = srcData[sIdx + 2];
        dst[dIdx + 3] = srcData[sIdx + 3];
      }
    }
  }
  ctxB.putImageData(out, 0, 0);
}
