let cvPromise = null;

export async function loadOpenCV(onStatus = () => {}) {
  if (window.cv?.Mat) return true;
  if (!cvPromise) {
    cvPromise = (async () => {
      onStatus("Загрузка OpenCV…");

      // OpenCV.js is a classic Emscripten/UMD script, not an ES module.
      // Loading it with ?raw made native browsers execute it as a strict module,
      // while Vite-only raw imports hid that incompatibility during development.
      // A classic script URL works with both Vite and the bundled local server.
      window.Module = window.Module || {};
      let script = document.querySelector('script[data-photocheck-opencv="true"]');
      if (!script) {
        script = document.createElement("script");
        script.dataset.photocheckOpencv = "true";
        script.async = true;
        script.src = new URL("./opencv.js", import.meta.url).href;
        const loaded = new Promise((resolve, reject) => {
          script.addEventListener("load", resolve, { once: true });
          script.addEventListener("error", () => reject(new Error("Не удалось загрузить локальный файл OpenCV.js.")), { once: true });
        });
        document.head.appendChild(script);
        await loaded;
      }

      const startedAt = Date.now();
      while (Date.now() - startedAt < 30000) {
        if (window.cv?.Mat) return true;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      throw new Error("OpenCV не инициализировался за 30 секунд.");
    })().catch(error => {
      cvPromise = null;
      const failedScript = document.querySelector('script[data-photocheck-opencv="true"]');
      if (failedScript && !window.cv?.Mat) failedScript.remove();
      throw error;
    });
  }
  return cvPromise;
}

function createScaledCanvas(image, maxDimension = 1600) {
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  if (!originalWidth || !originalHeight) throw new Error("Изображение пустое.");
  const scale = Math.min(1, maxDimension / Math.max(originalWidth, originalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(originalWidth * scale));
  canvas.height = Math.max(1, Math.round(originalHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Не удалось создать холст для анализа.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { canvas, scale, originalWidth, originalHeight };
}

function multiply3x3(a, b) {
  const output = new Array(9).fill(0);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      for (let k = 0; k < 3; k++) output[row * 3 + col] += a[row * 3 + k] * b[k * 3 + col];
    }
  }
  return output;
}

function homographyToCssMatrix(H) {
  const h = H[8] && Math.abs(H[8]) > 1e-12 ? H.map(value => value / H[8]) : H;
  return [
    h[0], h[3], 0, h[6],
    h[1], h[4], 0, h[7],
    0, 0, 1, 0,
    h[2], h[5], 0, h[8]
  ];
}

export async function computeOpenCVAlignment(imageA, imageB, onStatus = () => {}) {
  const cv = window.cv;
  if (!cv?.Mat) throw new Error("OpenCV ещё не загружен.");

  const resources = [];
  const track = value => { if (value && typeof value.delete === "function") resources.push(value); return value; };
  try {
    onStatus("Подготовка изображений…");
    const scaledA = createScaledCanvas(imageA);
    const scaledB = createScaledCanvas(imageB);
    const matA = track(cv.imread(scaledA.canvas));
    const matB = track(cv.imread(scaledB.canvas));
    const grayA = track(new cv.Mat());
    const grayB = track(new cv.Mat());
    cv.cvtColor(matA, grayA, cv.COLOR_RGBA2GRAY);
    cv.cvtColor(matB, grayB, cv.COLOR_RGBA2GRAY);

    onStatus("Поиск ключевых точек…");
    const orb = track(new cv.ORB(2500));
    const keypointsA = track(new cv.KeyPointVector());
    const keypointsB = track(new cv.KeyPointVector());
    const descriptorsA = track(new cv.Mat());
    const descriptorsB = track(new cv.Mat());
    const maskA = track(new cv.Mat());
    const maskB = track(new cv.Mat());
    orb.detectAndCompute(grayA, maskA, keypointsA, descriptorsA);
    orb.detectAndCompute(grayB, maskB, keypointsB, descriptorsB);

    if (descriptorsA.empty() || descriptorsB.empty() || keypointsA.size() < 4 || keypointsB.size() < 4) {
      throw new Error("Недостаточно текстурных деталей для автоматического совмещения.");
    }

    onStatus("Сопоставление признаков…");
    const matcher = track(new cv.BFMatcher(cv.NORM_HAMMING, true));
    const matches = track(new cv.DMatchVector());
    matcher.match(descriptorsB, descriptorsA, matches);
    const matchArray = [];
    for (let i = 0; i < matches.size(); i++) {
      const match = matches.get(i);
      if (Number.isFinite(match.distance)) matchArray.push({ queryIdx: match.queryIdx, trainIdx: match.trainIdx, distance: match.distance });
    }
    matchArray.sort((left, right) => left.distance - right.distance);
    const retained = matchArray.slice(0, Math.min(180, Math.max(4, Math.ceil(matchArray.length * 0.35))));
    if (retained.length < 4) throw new Error("Найдено меньше четырёх совпадающих ориентиров.");

    const pointsB = track(new cv.Mat(retained.length, 1, cv.CV_32FC2));
    const pointsA = track(new cv.Mat(retained.length, 1, cv.CV_32FC2));
    for (let i = 0; i < retained.length; i++) {
      const pointB = keypointsB.get(retained[i].queryIdx).pt;
      const pointA = keypointsA.get(retained[i].trainIdx).pt;
      pointsB.data32F[i * 2] = pointB.x;
      pointsB.data32F[i * 2 + 1] = pointB.y;
      pointsA.data32F[i * 2] = pointA.x;
      pointsA.data32F[i * 2 + 1] = pointA.y;
    }

    onStatus("Расчёт перспективы (RANSAC)…");
    const inlierMask = track(new cv.Mat());
    const H = track(cv.findHomography(pointsB, pointsA, cv.RANSAC, 4.0, inlierMask, 3000, 0.995));
    if (!H || H.empty()) throw new Error("Не удалось вычислить матрицу перспективы.");

    let inliers = 0;
    const maskData = inlierMask.data || [];
    for (let i = 0; i < maskData.length; i++) if (maskData[i]) inliers++;
    const inlierRatio = inliers / Math.max(1, retained.length);
    if (inliers < 4 || inlierRatio < 0.16) {
      throw new Error("Совпадения ненадёжны. Попробуйте ручное совмещение по точкам.");
    }

    const smallH = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) smallH.push(H.doubleAt(row, col));
    }
    const invScaleA = [1 / scaledA.scale, 0, 0, 0, 1 / scaledA.scale, 0, 0, 0, 1];
    const scaleB = [scaledB.scale, 0, 0, 0, scaledB.scale, 0, 0, 0, 1];
    const originalH = multiply3x3(multiply3x3(invScaleA, smallH), scaleB);
    if (!originalH.every(Number.isFinite)) throw new Error("Матрица выравнивания содержит некорректные значения.");

    onStatus(`Совмещение найдено: ${inliers} ориентиров из ${retained.length}`);
    return homographyToCssMatrix(originalH);
  } finally {
    // OpenCV uses WASM heap allocations; always release every native object on all paths.
    for (let i = resources.length - 1; i >= 0; i--) {
      try { resources[i].delete(); } catch { /* Ignore already-released OpenCV handles. */ }
    }
  }
}
