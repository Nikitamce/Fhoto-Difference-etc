let cvReady = false;
let cvPromise = null;

export async function loadOpenCV(onStatus, msgs = {}) {
  if (cvReady && window.cv && window.cv.Mat) return true;
  
  if (!cvPromise) {
    cvPromise = (async () => {
      onStatus?.(msgs.compiling || "Загрузка и компиляция оффлайн библиотеки OpenCV...");
      // Dynamically import raw text of embedded opencv.js
      const opencvModule = await import("./opencv.js?raw");
      const opencvCode = opencvModule.default;

      const script = document.createElement("script");
      script.textContent = opencvCode;
      document.head.appendChild(script);

      return new Promise((resolve, reject) => {
        const checkCv = setInterval(() => {
          if (window.cv && window.cv.Mat) {
            clearInterval(checkCv);
            cvReady = true;
            resolve(true);
          }
        }, 100);

        setTimeout(() => {
          if (!cvReady) {
            clearInterval(checkCv);
            reject(new Error("Не удалось инициализировать OpenCV (Таймаут)."));
          }
        }, 15000);
      });
    })();
  }

  return cvPromise;
}

function imageToCanvas(img) {
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth || img.width || 800;
  const h = img.naturalHeight || img.height || 600;
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function computeOpenCVAlignment(imgAObj, imgBObj, onStatus, msgs = {}) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const cv = window.cv;
        onStatus?.(msgs.preparing || "Подготовка изображений...");
        
        const canvasA = imageToCanvas(imgAObj);
        const canvasB = imageToCanvas(imgBObj);

        let matA = cv.imread(canvasA);
        let matB = cv.imread(canvasB);
        
        let grayA = new cv.Mat();
        let grayB = new cv.Mat();
        cv.cvtColor(matA, grayA, cv.COLOR_RGBA2GRAY);
        cv.cvtColor(matB, grayB, cv.COLOR_RGBA2GRAY);
        
        onStatus?.(msgs.keypoints || "Поиск ключевых точек (ORB)...");
        // Limit to 2000 features to keep it relatively fast
        let orb = new cv.ORB(2000); 
        
        let keypointsA = new cv.KeyPointVector();
        let descriptorsA = new cv.Mat();
        orb.detectAndCompute(grayA, new cv.Mat(), keypointsA, descriptorsA);
        
        let keypointsB = new cv.KeyPointVector();
        let descriptorsB = new cv.Mat();
        orb.detectAndCompute(grayB, new cv.Mat(), keypointsB, descriptorsB);
        
        onStatus?.(msgs.matching || "Сопоставление точек...");
        // Match B to A
        let matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
        let matches = new cv.DMatchVector();
        matcher.match(descriptorsB, descriptorsA, matches);
        
        let matchArray = [];
        for (let i = 0; i < matches.size(); i++) {
          matchArray.push(matches.get(i));
        }
        matchArray.sort((a, b) => a.distance - b.distance);
        
        // Keep top 20% matches or max 100
        let numGoodMatches = Math.max(30, Math.floor(matchArray.length * 0.20));
        numGoodMatches = Math.min(numGoodMatches, matchArray.length);
        let goodMatches = matchArray.slice(0, numGoodMatches);
        
        if (goodMatches.length < 4) {
          throw new Error(msgs.notEnoughPoints || "Недостаточно совпадающих точек.");
        }
        
        onStatus?.(msgs.ransac || "Рассчет перспективы (RANSAC)...");
        let ptsA = new cv.Mat(goodMatches.length, 1, cv.CV_32FC2);
        let ptsB = new cv.Mat(goodMatches.length, 1, cv.CV_32FC2);
        
        for (let i = 0; i < goodMatches.length; i++) {
          let match = goodMatches[i];
          let ptB = keypointsB.get(match.queryIdx).pt;
          let ptA = keypointsA.get(match.trainIdx).pt;
          
          ptsB.data32F[i * 2] = ptB.x;
          ptsB.data32F[i * 2 + 1] = ptB.y;
          
          ptsA.data32F[i * 2] = ptA.x;
          ptsA.data32F[i * 2 + 1] = ptA.y;
        }
        
        let H = cv.findHomography(ptsB, ptsA, cv.RANSAC, 5.0);
        
        if (H.empty()) {
          throw new Error("Не удалось рассчитать матрицу перспективы.");
        }
        
        let h0 = H.doublePtr(0, 0)[0]; let h1 = H.doublePtr(0, 1)[0]; let h2 = H.doublePtr(0, 2)[0];
        let h3 = H.doublePtr(1, 0)[0]; let h4 = H.doublePtr(1, 1)[0]; let h5 = H.doublePtr(1, 2)[0];
        let h6 = H.doublePtr(2, 0)[0]; let h7 = H.doublePtr(2, 1)[0]; let h8 = H.doublePtr(2, 2)[0];
        
        const matrix3d = [
          h0, h3, 0, h6,
          h1, h4, 0, h7,
          0,  0,  1, 0,
          h2, h5, 0, h8
        ];
        
        // Cleanup memory
        matA.delete(); matB.delete();
        grayA.delete(); grayB.delete();
        orb.delete();
        keypointsA.delete(); descriptorsA.delete();
        keypointsB.delete(); descriptorsB.delete();
        matcher.delete(); matches.delete();
        ptsA.delete(); ptsB.delete();
        H.delete();
        
        resolve(matrix3d);
        
      } catch (err) {
        console.error("OpenCV Alignment Error:", err);
        reject(err);
      }
    }, 50);
  });
}
