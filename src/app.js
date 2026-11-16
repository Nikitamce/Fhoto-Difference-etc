import { i18n } from "./i18n.js";
import { SynchronizedViewer } from "./viewer.js";
import { ModesController } from "./modes.js";
import { computeAutoEdgeAlignment } from "./auto_align.js";
import { loadOpenCV, computeOpenCVAlignment } from "./opencv_align.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize i18n
  i18n.updateUI();

  // --- 1. DOM Elements & State Variables ---
  const container = document.getElementById("viewer-container");
  const workspace = document.getElementById("workspace");
  const getViewportRect = () => container?.getBoundingClientRect() || workspace?.getBoundingClientRect();

  // State for loaded images
  let imageASrc = null;
  let imageBSrc = null;
  let imgAObj = null;
  let imgBObj = null;
  let fileObjA = null;
  let fileObjB = null;
  let objectUrlA = null;
  let objectUrlB = null;
  const loadRevision = { A: 0, B: 0 };

  // Zoom & Scale UI elements
  const zoomRange = document.getElementById("zoom-range");
  const zoomVal = document.getElementById("zoom-val");
  const scaleARange = document.getElementById("scale-a-range");
  const scaleAInput = document.getElementById("scale-a-input");
  const scaleBRange = document.getElementById("scale-b-range");
  const scaleBInput = document.getElementById("scale-b-input");

  // Collapsible panels
  const panelLeft = document.getElementById("panel-left");
  const btnCollapseLeft = document.getElementById("btn-collapse-left");
  const btnCloseLeftInner = document.getElementById("btn-close-left-inner");
  const btnRestoreLeft = document.getElementById("btn-restore-left");

  const panelRight = document.getElementById("panel-right");
  const btnCollapseRight = document.getElementById("btn-collapse-right");
  const btnCloseRightInner = document.getElementById("btn-close-right-inner");
  const btnRestoreRight = document.getElementById("btn-restore-right");

  const panelBottom = document.getElementById("panel-bottom");
  const btnCollapseBottom = document.getElementById("btn-collapse-bottom");
  const btnRestoreBottom = document.getElementById("btn-restore-bottom");

  const quickBar = document.getElementById("quick-actions-bar");
  const btnCollapseQuick = document.getElementById("btn-collapse-quick");
  const btnRestoreQuick = document.getElementById("btn-restore-quick");

  // Dropdowns
  const toolsDropdownBtn = document.getElementById("tools-dropdown-btn");
  const toolsDropdownMenu = document.getElementById("tools-dropdown-menu");
  const langDropdownBtn = document.getElementById("lang-dropdown-btn");
  const langDropdownMenu = document.getElementById("lang-dropdown-menu");

  // Opacity & Blink
  const opacityRange = document.getElementById("opacity-range");
  const opacityVal = document.getElementById("opacity-val");
  const btnFadeFlash = document.getElementById("btn-fade-flash");
  const btnAutoBlink = document.getElementById("btn-auto-blink");
  const blinkSpeedRange = document.getElementById("blink-speed-range");
  const blinkSpeedInput = document.getElementById("blink-speed-input");
  const btnToggleDiff = document.getElementById("btn-toggle-diff");
  const btnSliderVert = document.getElementById("btn-slider-vertical");
  const btnSliderHoriz = document.getElementById("btn-slider-horizontal");

  let isFlashing = false;
  let flashInterval = null;
  let isAutoBlinking = false;
  let autoBlinkInterval = null;
  let blinkSpeedMs = 1000;
  let isDiffOverlay = false;

  // Alignment Tools
  const btnAlignA = document.getElementById("btn-align-a");
  const btnAlignB = document.getElementById("btn-align-b");
  const btnAutoOpenCV = document.getElementById("btn-auto-opencv");
  const btnAutoEdge = document.getElementById("btn-auto-edge");
  const btn1PointAlign = document.getElementById("btn-1point-align");
  const btn2PointAlign = document.getElementById("btn-2point-align");
  const btn3PointAlign = document.getElementById("btn-3point-align");
  const btn4PointAlign = document.getElementById("btn-4point-align");
  const btnWarpAlign = document.getElementById("btn-warp-align");
  const pointAlignBanner = document.getElementById("point-align-banner");
  const pointAlignInstruction = document.getElementById("point-align-instruction");
  const btnCancelPoint = document.getElementById("btn-cancel-2point");

  let activePointsMode = 0; // 0=off, 1=1pt, 2=2pt, 3=3pt, 4=4pt
  let alignmentJobRevision = 0; // Invalidates auto-align results when sources or user intent change.
  let pointsA = [];
  let pointsB = [];
  let currentActiveAlignBtn = null;

  // Filename overlay badges
  let filenameA = "sample_photo_a.png";
  let filenameB = "sample_photo_b.png";
  let showFilenames = true;
  let statusToastTimer = null;

  // Mouse pan state
  let isPanning = false;
  let lastMouse = { x: 0, y: 0 };
  let mouseDownPos = { x: 0, y: 0 };

  // Modes controller & Viewer instances
  let modesCtrl = null;
  let viewer = null;

  // --- 2. Function Declarations ---
  function isImageFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith("image/")) return true;
    return /\.(jpe?g|png|gif|webp|svg|bmp|ico|tiff?|avif|heic|jfif)$/i.test(file.name || "");
  }

  function decodeImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file || !isImageFile(file)) {
        reject(new Error(i18n.t("invalidFile")));
        return;
      }

      const src = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve({ src, img, file });
      img.onerror = () => {
        URL.revokeObjectURL(src);
        reject(new Error(i18n.t("imageDecodeError")));
      };
      img.src = src;
    });
  }

  function getFitDimensions() {
    const rect = getViewportRect();
    if (!rect) return { width: 800, height: 600 };
    if (modesCtrl?.currentMode === "split") {
      const paneRect = document.getElementById("split-pane-a")?.getBoundingClientRect();
      return { width: paneRect?.width || Math.max(1, (rect.width - 2) / 2), height: paneRect?.height || rect.height };
    }
    return { width: rect.width, height: rect.height };
  }

  function getZoomRect(clientX = null) {
    const rect = getViewportRect();
    if (!rect) return null;
    if (modesCtrl?.currentMode !== "split") return rect;
    const paneA = document.getElementById("split-pane-a")?.getBoundingClientRect();
    const paneB = document.getElementById("split-pane-b")?.getBoundingClientRect();
    if (!paneA || !paneB) return rect;
    const useRightPane = clientX !== null && clientX >= paneB.left;
    const pane = useRightPane ? paneB : paneA;
    return { left: pane.left, top: pane.top, width: pane.width, height: pane.height, right: pane.right, bottom: pane.bottom };
  }

  function zoomAt(scale, clientX = null, clientY = null) {
    const rect = getZoomRect(clientX);
    if (!rect || !viewer) return;
    const x = clientX === null ? rect.left + rect.width / 2 : clientX;
    const y = clientY === null ? rect.top + rect.height / 2 : clientY;
    viewer.setZoom(scale, x, y, rect);
  }

  function updatePreview(slot, src) {
    const preview = document.getElementById(slot === "A" ? "preview-a" : "preview-b");
    if (!preview) return;
    if (src) {
      preview.src = src;
      preview.classList.remove("hidden");
    } else {
      preview.removeAttribute("src");
      preview.classList.add("hidden");
    }
  }

  function updateZoomUI() {
    if (!viewer) return;
    const scalePercent = Math.round(viewer.getEffectiveZoom() * 100);
    if (zoomRange) zoomRange.value = String(Math.max(Number(zoomRange.min || 10), Math.min(Number(zoomRange.max || 1000), scalePercent)));
    if (zoomVal) zoomVal.textContent = `${scalePercent}%`;
    const syncButton = document.getElementById("btn-quick-sync-zoom");
    if (syncButton) {
      syncButton.classList.toggle("active", viewer.syncZoom);
      syncButton.setAttribute("aria-pressed", String(viewer.syncZoom));
      syncButton.title = viewer.syncZoom ? i18n.t("syncZoomEnabled") : i18n.t("syncZoomDisabled");
    }
  }

  function commitImageRecords(nextA, nextB) {
    alignmentJobRevision++;
    const previousUrls = [objectUrlA, objectUrlB];
    imageASrc = nextA?.src || null;
    imageBSrc = nextB?.src || null;
    imgAObj = nextA?.img || null;
    imgBObj = nextB?.img || null;
    fileObjA = nextA?.file || null;
    fileObjB = nextB?.file || null;
    objectUrlA = imageASrc;
    objectUrlB = imageBSrc;
    filenameA = nextA?.file?.name || "Изображение A";
    filenameB = nextB?.file?.name || "Изображение B";

    updatePreview("A", imageASrc);
    updatePreview("B", imageBSrc);
    checkBothImagesLoaded();
    updateRightSidebarInfo();
    updateFilenameBadges();

    previousUrls.forEach((url) => {
      if (url && url !== objectUrlA && url !== objectUrlB) URL.revokeObjectURL(url);
    });
  }

  async function loadImageIntoSlot(slot, file) {
    if (!isImageFile(file)) {
      updateStatusHint(i18n.t("invalidFile"), false);
      return false;
    }
    const revision = ++loadRevision[slot];
    updateStatusHint(i18n.t("imageLoading"), true);
    let record;
    try {
      record = await decodeImageFile(file);
      if (revision !== loadRevision[slot]) {
        URL.revokeObjectURL(record.src);
        return false;
      }
      commitImageRecords(
        slot === "A" ? record : (imageASrc ? { src: imageASrc, img: imgAObj, file: fileObjA } : null),
        slot === "B" ? record : (imageBSrc ? { src: imageBSrc, img: imgBObj, file: fileObjB } : null)
      );
      return true;
    } catch (error) {
      if (revision === loadRevision[slot]) updateStatusHint(error.message || i18n.t("imageDecodeError"), false);
      return false;
    }
  }

  async function loadImagePair(fileA, fileB) {
    if (!isImageFile(fileA) || !isImageFile(fileB)) {
      updateStatusHint(i18n.t("invalidFile"), false);
      return false;
    }
    const revisionA = ++loadRevision.A;
    const revisionB = ++loadRevision.B;
    updateStatusHint(i18n.t("imageLoading"), true);
    const results = await Promise.allSettled([decodeImageFile(fileA), decodeImageFile(fileB)]);
    const loaded = results.filter(result => result.status === "fulfilled").map(result => result.value);
    if (results.some(result => result.status === "rejected")) {
      loaded.forEach(record => URL.revokeObjectURL(record.src));
      if (revisionA === loadRevision.A && revisionB === loadRevision.B) {
        updateStatusHint(results.find(result => result.status === "rejected").reason?.message || i18n.t("imageDecodeError"), false);
      }
      return false;
    }
    if (revisionA !== loadRevision.A || revisionB !== loadRevision.B) {
      loaded.forEach(record => URL.revokeObjectURL(record.src));
      return false;
    }
    commitImageRecords(loaded[0], loaded[1]);
    return true;
  }

  function updateScaleAUI() {
    if (!scaleARange || !scaleAInput || !viewer) return;
    const ratio = viewer.scaleRatioA || 1.0;
    scaleARange.value = Math.round(ratio * 100);
    scaleAInput.value = ratio.toFixed(2);
  }

  function updateScaleBUI() {
    if (!scaleBRange || !scaleBInput || !viewer) return;
    const ratio = viewer.scaleRatioB || 1.0;
    scaleBRange.value = Math.round(ratio * 100);
    scaleBInput.value = ratio.toFixed(2);
  }

  function toggleLeftPanel(collapse) {
    if (collapse) {
      panelLeft?.classList.add("collapsed");
      btnRestoreLeft?.classList.remove("hidden");
    } else {
      panelLeft?.classList.remove("collapsed");
      btnRestoreLeft?.classList.add("hidden");
    }
    triggerCanvasResize();
  }

  function toggleRightPanel(collapse) {
    if (collapse) {
      panelRight?.classList.add("collapsed");
      btnRestoreRight?.classList.remove("hidden");
    } else {
      panelRight?.classList.remove("collapsed");
      btnRestoreRight?.classList.add("hidden");
    }
    triggerCanvasResize();
  }

  function toggleBottomPanel(collapse) {
    if (collapse) {
      panelBottom?.classList.add("collapsed");
      btnRestoreBottom?.classList.remove("hidden");
    } else {
      panelBottom?.classList.remove("collapsed");
      btnRestoreBottom?.classList.add("hidden");
    }
    triggerCanvasResize();
  }

  function toggleQuickBar(collapse) {
    if (collapse) {
      quickBar?.classList.add("collapsed");
      btnRestoreQuick?.classList.remove("hidden");
    } else {
      quickBar?.classList.remove("collapsed");
      btnRestoreQuick?.classList.add("hidden");
    }
  }

  function triggerCanvasResize() {
    setTimeout(() => {
      if (workspace && (imgAObj || imgBObj) && viewer) viewer.onStateChange();
    }, 230);
  }

  function setOpacityValue(rawVal) {
    if (!opacityRange || !opacityVal || !modesCtrl) return;
    const clamped = Math.max(0, Math.min(500, rawVal));
    opacityRange.value = clamped;
    const percent = (clamped / 5).toFixed(1);
    opacityVal.textContent = `${percent}%`;
    modesCtrl.setOpacity(clamped / 500);
  }

  function stopAutoBlink() {
    if (isAutoBlinking) {
      clearInterval(autoBlinkInterval);
      isAutoBlinking = false;
      btnAutoBlink?.classList.remove("toggle-active");
      setOpacityValue(250);
    }
  }

  function startAutoBlink() {
    stopAutoBlink();
    if (isFlashing) {
      clearInterval(flashInterval);
      isFlashing = false;
      btnFadeFlash?.classList.remove("toggle-active");
    }

    isAutoBlinking = true;
    btnAutoBlink?.classList.add("toggle-active");
    let state = false;
    autoBlinkInterval = setInterval(() => {
      state = !state;
      setOpacityValue(state ? 500 : 0);
    }, blinkSpeedMs);
  }

  function updateBlinkSpeed(ms) {
    const clampedMs = Math.max(100, Math.min(5000, ms));
    blinkSpeedMs = clampedMs;
    const sec = (clampedMs / 1000).toFixed(1);

    if (blinkSpeedRange) blinkSpeedRange.value = clampedMs;
    if (blinkSpeedInput) blinkSpeedInput.value = sec;

    if (isAutoBlinking) {
      startAutoBlink();
    }
  }

  function isClickOnPhotoA(clientX, clientY) {
    if (modesCtrl?.currentMode === "split") {
      const splitPaneA = document.getElementById("split-pane-a");
      if (splitPaneA) {
        const rA = splitPaneA.getBoundingClientRect();
        return clientX >= rA.left && clientX <= rA.right && clientY >= rA.top && clientY <= rA.bottom;
      }
    } else if (modesCtrl?.currentMode === "slider") {
      const curtainHandle = document.getElementById("curtain-handle");
      if (curtainHandle) {
        const rC = curtainHandle.getBoundingClientRect();
        if (modesCtrl.sliderOrientation === "vertical") {
          return clientX < rC.left;
        } else {
          return clientY < rC.top;
        }
      }
    }
    return true;
  }

  function isClickOnPhotoB(clientX, clientY) {
    if (modesCtrl?.currentMode === "split") {
      const splitPaneB = document.getElementById("split-pane-b");
      if (splitPaneB) {
        const rB = splitPaneB.getBoundingClientRect();
        return clientX >= rB.left && clientX <= rB.right && clientY >= rB.top && clientY <= rB.bottom;
      }
    } else if (modesCtrl?.currentMode === "slider") {
      const curtainHandle = document.getElementById("curtain-handle");
      if (curtainHandle) {
        const rC = curtainHandle.getBoundingClientRect();
        if (modesCtrl.sliderOrientation === "vertical") {
          return clientX > rC.right;
        } else {
          return clientY > rC.bottom;
        }
      }
    }
    return true;
  }

  function updateAlignButtonsUI() {
    if (!viewer) return;
    const btnSidebarAlignA = document.getElementById("btn-sidebar-align-a");
    const btnSidebarAlignB = document.getElementById("btn-sidebar-align-b");

    if (viewer.alignTarget === 'B') {
      btnAlignB?.classList.add("active");
      btnSidebarAlignB?.classList.add("active");
      btnSidebarAlignB?.classList.add("primary-tool");
      btnAlignA?.classList.remove("active");
      btnSidebarAlignA?.classList.remove("active");
      btnSidebarAlignA?.classList.remove("primary-tool");
    } else if (viewer.alignTarget === 'A') {
      btnAlignA?.classList.add("active");
      btnSidebarAlignA?.classList.add("active");
      btnSidebarAlignA?.classList.add("primary-tool");
      btnAlignB?.classList.remove("active");
      btnSidebarAlignB?.classList.remove("active");
      btnSidebarAlignB?.classList.remove("primary-tool");
    } else {
      btnAlignA?.classList.remove("active");
      btnSidebarAlignA?.classList.remove("active");
      btnSidebarAlignA?.classList.remove("primary-tool");
      btnAlignB?.classList.remove("active");
      btnSidebarAlignB?.classList.remove("active");
      btnSidebarAlignB?.classList.remove("primary-tool");
    }
  }

  function addPointPin(clientX, clientY, label) {
    if (!workspace) return;
    const pin = document.createElement("div");
    pin.className = "point-pin-badge";
    pin.textContent = label;
    pin.style.left = `${clientX - workspace.getBoundingClientRect().left}px`;
    pin.style.top = `${clientY - workspace.getBoundingClientRect().top}px`;
    workspace.appendChild(pin);
  }

  function clearPointPins() {
    workspace?.querySelectorAll(".point-pin-badge").forEach(p => p.remove());
  }

  function setActiveAlignTool(btnElement) {
    [btnAutoOpenCV, btnAutoEdge, btn1PointAlign, btn2PointAlign, btn3PointAlign, btn4PointAlign, btnWarpAlign].forEach(b => {
      b?.classList.remove("primary-tool");
    });
    if (btnElement) {
      btnElement.classList.add("primary-tool");
      currentActiveAlignBtn = btnElement;
    }
  }

  function cancelPointMode() {
    activePointsMode = 0;
    pointsA = [];
    pointsB = [];
    setActiveAlignTool(currentActiveAlignBtn || btnAutoEdge);
    pointAlignBanner?.classList.add("hidden");
    clearPointPins();
  }

  function startPointMode(count, btnElement) {
    cancelPointMode();
    alignmentJobRevision++;
    // Keep the current alignment visible; viewer.screenToImageB inverses any affine/projective transform.
    activePointsMode = count;
    pointsA = [];
    pointsB = [];
    if (btnElement) setActiveAlignTool(btnElement);
    pointAlignBanner?.classList.remove("hidden");
    updateInstructionText();
  }

  function togglePointMode(pointsCount, btnElement) {
    if (activePointsMode === pointsCount) {
      cancelPointMode();
    } else {
      startPointMode(pointsCount, btnElement);
    }
  }

  function updateInstructionText() {
    if (activePointsMode === 0 || !pointAlignInstruction) return;
    if (pointsA.length < activePointsMode) {
      const step = pointsA.length + 1;
      pointAlignInstruction.textContent = activePointsMode === 1 
        ? i18n.t("alignPoint1A") 
        : i18n.t(`alignPointA${step}`);
    } else if (pointsB.length < activePointsMode) {
      const step = pointsB.length + 1;
      pointAlignInstruction.textContent = activePointsMode === 1 
        ? i18n.t("alignPoint1B") 
        : i18n.t(`alignPointB${step}`);
    }
  }

  function updateFilenameBadges() {
    const badgeA = document.getElementById("filename-badge-a");
    const badgeB = document.getElementById("filename-badge-b");
    const btnSidebarFilenames = document.getElementById("btn-sidebar-filenames");
    
    if (btnSidebarFilenames) {
      btnSidebarFilenames.classList.toggle("active", showFilenames);
      btnSidebarFilenames.classList.toggle("primary-tool", showFilenames);
    }
    if (btnToggleFilenames) {
      btnToggleFilenames.classList.toggle("active", showFilenames);
    }

    if (!badgeA || !badgeB) return;
    const badgeNameA = document.getElementById("badge-name-a");
    const badgeNameB = document.getElementById("badge-name-b");
    
    if (badgeNameA) badgeNameA.textContent = `${filenameA} • ${imgAObj ? `${imgAObj.naturalWidth}×${imgAObj.naturalHeight}` : ''}`;
    if (badgeNameB) badgeNameB.textContent = `${filenameB} • ${imgBObj ? `${imgBObj.naturalWidth}×${imgBObj.naturalHeight}` : ''}`;

    if (showFilenames && imageASrc && imageBSrc) {
      badgeA.classList.remove("hidden");
      badgeB.classList.remove("hidden");
    } else {
      badgeA.classList.add("hidden");
      badgeB.classList.add("hidden");
    }
  }

  function updateStatusHint(message, isLoading = false) {
    const existing = document.getElementById("status-toast");
    if (existing) existing.remove();
    if (statusToastTimer) clearTimeout(statusToastTimer);

    const toast = document.createElement("div");
    toast.id = "status-toast";
    toast.style.cssText = `
      position: fixed;
      top: 56px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(17, 24, 39, 0.92);
      backdrop-filter: blur(10px);
      color: #f8fafc;
      padding: 4px 14px;
      height: 28px;
      border-radius: 14px;
      font-size: 0.76rem;
      font-weight: 500;
      border: 1px solid rgba(99, 102, 241, 0.5);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      z-index: 9999;
      white-space: nowrap;
      pointer-events: none;
      transition: opacity 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    if (isLoading) {
      const spinner = document.createElement("span");
      spinner.style.cssText = `
        display: inline-block;
        width: 10px;
        height: 10px;
        border: 2px solid rgba(99,102,241,0.3);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      `;
      if (!document.getElementById("spin-keyframes")) {
        const style = document.createElement("style");
        style.id = "spin-keyframes";
        style.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
        document.head.appendChild(style);
      }
      toast.appendChild(spinner);
    }

    const text = document.createTextNode(message);
    toast.appendChild(text);
    document.body.appendChild(toast);

    if (!isLoading) {
      statusToastTimer = setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
      }, 6000);
    }
  }

  function handleSwap() {
    if (!viewer || !modesCtrl || (!imageASrc && !imageBSrc)) return;
    alignmentJobRevision++;
    [imageASrc, imageBSrc] = [imageBSrc, imageASrc];
    [imgAObj, imgBObj] = [imgBObj, imgAObj];
    [fileObjA, fileObjB] = [fileObjB, fileObjA];
    [objectUrlA, objectUrlB] = [objectUrlB, objectUrlA];
    [filenameA, filenameB] = [filenameB, filenameA];
    viewer.setImages(imgAObj, imgBObj);
    modesCtrl.updateImages(imageASrc, imageBSrc);
    const fit = getFitDimensions();
    viewer.centerBoth(fit.width, fit.height);
    updatePreview("A", imageASrc);
    updatePreview("B", imageBSrc);
    updateRightSidebarInfo();
    updateFilenameBadges();
    updateScaleAUI();
    updateScaleBUI();
    updateSimilarityScore(null);
    publishImageState();
  }

  function clearImageSlot(slot) {
    if (slot !== "A" && slot !== "B") return;
    alignmentJobRevision++;
    loadRevision[slot]++;
    if (slot === "A") {
      if (objectUrlA) URL.revokeObjectURL(objectUrlA);
      objectUrlA = imageASrc = null;
      imgAObj = fileObjA = null;
      filenameA = i18n.lang === "en" ? "Image A" : "Изображение A";
    } else {
      if (objectUrlB) URL.revokeObjectURL(objectUrlB);
      objectUrlB = imageBSrc = null;
      imgBObj = fileObjB = null;
      filenameB = i18n.lang === "en" ? "Image B" : "Изображение B";
    }
    const input = document.getElementById(slot === "A" ? "file-input-a" : "file-input-b");
    if (input) input.value = "";
    cancelPointMode();
    viewer?.setImages(imgAObj, imgBObj);
    modesCtrl?.updateImages(imageASrc, imageBSrc);
    const fit = getFitDimensions();
    viewer?.centerBoth(fit.width, fit.height);
    updatePreview(slot, null);
    updateRightSidebarInfo();
    updateFilenameBadges();
    updateScaleAUI();
    updateScaleBUI();
    updateSimilarityScore(null);
    publishImageState();
    updateStatusHint(i18n.t("imageRemoved"), false);
  }

  function updatePairDependentControls() {
    const hasA = Boolean(imageASrc);
    const hasB = Boolean(imageBSrc);
    const hasPair = hasA && hasB;
    const pairOnlyIds = [
      "btn-auto-opencv", "btn-auto-edge",
      "btn-1point-align", "btn-2point-align", "btn-3point-align", "btn-4point-align",
      "btn-match-sizes", "btn-quick-match",
      "btn-align-a", "btn-align-b", "btn-sidebar-align-a", "btn-sidebar-align-b",
      "btn-fade-0", "btn-fade-50", "btn-fade-100", "btn-fade-flash", "btn-auto-blink", "btn-toggle-diff"
    ];

    pairOnlyIds.forEach((id) => {
      const control = document.getElementById(id);
      if (!control) return;
      control.disabled = !hasPair;
      control.setAttribute("aria-disabled", String(!hasPair));
      if (!hasPair) {
        if (!control.dataset.originalTitle) control.dataset.originalTitle = control.title || "";
        control.title = i18n.t("needPair");
      } else if (control.dataset.originalTitle !== undefined) {
        control.title = control.dataset.originalTitle;
      }
    });

    const swapEnabled = hasA || hasB;
    ["btn-swap", "btn-swap-bottom"].forEach((id) => {
      const control = document.getElementById(id);
      if (control) control.disabled = !swapEnabled;
    });

    ["scale-a-range", "scale-a-input"].forEach((id) => {
      const control = document.getElementById(id);
      if (control) control.disabled = !hasA;
    });
    ["scale-b-range", "scale-b-input"].forEach((id) => {
      const control = document.getElementById(id);
      if (control) control.disabled = !hasB;
    });
    const opacity = document.getElementById("opacity-range");
    if (opacity) opacity.disabled = !hasPair;
  }

  function publishImageState() {
    updatePairDependentControls();
    // Publish the app's source-of-truth state. The viewer's <img> elements decode
    // asynchronously, so UI state must not depend on their `complete` timing.
    window.dispatchEvent(new CustomEvent("photocheck:images-state", {
      detail: { hasA: Boolean(imageASrc), hasB: Boolean(imageBSrc), ready: Boolean(imageASrc && imageBSrc) }
    }));
  }

  function checkBothImagesLoaded() {
    if (!modesCtrl || !viewer || !workspace) {
      publishImageState();
      return;
    }

    modesCtrl.updateImages(imageASrc, imageBSrc);
    viewer.setImages(imgAObj, imgBObj);
    const fit = getFitDimensions();
    viewer.centerBoth(fit.width, fit.height);
    updateFilenameBadges();
    updateScaleAUI();
    updateScaleBUI();
    updateZoomUI();
    updateAlignButtonsUI();

    if (imageASrc && imageBSrc) {
      setActiveAlignTool(currentActiveAlignBtn || btnAutoEdge);
      updateStatusHint(i18n.t("imagesLoaded"), false);
    }
    publishImageState();
  }

  function updateRightSidebarInfo() {
    const updateSlot = (slot, src, image, file, filename) => {
      const suffix = slot.toLowerCase();
      const thumb = document.getElementById(`thumb-${suffix}`);
      const name = document.getElementById(`info-name-${suffix}`);
      const path = document.getElementById(`info-path-${suffix}`);
      const resolution = document.getElementById(`info-res-${suffix}`);
      const format = document.getElementById(`info-fmt-${suffix}`);
      const size = document.getElementById(`info-size-${suffix}`);
      const date = document.getElementById(`info-date-${suffix}`);
      const clearButton = document.getElementById(`btn-clear-${suffix}`);

      clearButton?.classList.toggle("hidden", !src);
      if (clearButton) {
        const removeLabel = i18n.t(slot === "A" ? "removeImageA" : "removeImageB");
        clearButton.title = removeLabel;
        clearButton.setAttribute("aria-label", removeLabel);
      }
      if (thumb) {
        if (src) thumb.src = src;
        else thumb.removeAttribute("src");
      }
      if (name) name.textContent = src ? (filename || file?.name || `Image ${slot}`) : (i18n.lang === "en" ? "Not loaded" : "Не загружено");
      if (path) path.textContent = src
        ? (file ? (i18n.lang === "en" ? "Source: file" : "Источник: файл") : (i18n.lang === "en" ? "Source: clipboard" : "Источник: буфер обмена"))
        : (i18n.lang === "en" ? `Choose image ${slot}` : `Выберите изображение ${slot}`);
      if (resolution) resolution.textContent = image ? `${image.naturalWidth} × ${image.naturalHeight}` : "—";
      if (format) {
        const extension = file?.name?.split(".").pop()?.toUpperCase();
        format.textContent = src ? (file?.type?.split("/")[1]?.toUpperCase() || extension || "Неизвестно") : "—";
      }
      if (size) size.textContent = src && file?.size ? `${(file.size / (1024 * 1024)).toFixed(2)} МБ` : "—";
      if (date) date.textContent = src && file?.lastModified
        ? new Date(file.lastModified).toLocaleDateString(i18n.lang === "en" ? "en-GB" : "ru-RU")
        : "—";
      const placeholder = thumb?.parentElement?.querySelector(".info-thumb-placeholder");
      placeholder?.classList.toggle("hidden", Boolean(src));
    };

    updateSlot("A", imageASrc, imgAObj, fileObjA, filenameA);
    updateSlot("B", imageBSrc, imgBObj, fileObjB, filenameB);
  }

  function setupDropzone(boxId, inputId, slot) {
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);

    // The upload zone is a native label[for], so do not call input.click() here:
    // doing both can open the file picker twice in some browsers.
    input?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) loadImageIntoSlot(slot, file);
      event.target.value = "";
    });

    box?.addEventListener("dragover", (event) => {
      event.preventDefault();
      box.classList.add("drag-over");
    });
    box?.addEventListener("dragleave", (event) => {
      if (!box.contains(event.relatedTarget)) box.classList.remove("drag-over");
    });
    box?.addEventListener("drop", (event) => {
      event.preventDefault();
      box.classList.remove("drag-over");
      const file = event.dataTransfer?.files?.[0];
      if (file) loadImageIntoSlot(slot, file);
    });
  }

  // --- 3. Instantiation & Event Wiring ---
  viewer = new SynchronizedViewer({
    onStateChange: () => {
      modesCtrl?.render();
      updateZoomUI();
      updateScaleAUI();
      updateScaleBUI();
    }
  });

  modesCtrl = new ModesController(viewer, container);
  updatePairDependentControls();

  let previousViewportSize = container ? {
    width: container.getBoundingClientRect().width,
    height: container.getBoundingClientRect().height
  } : null;
  const resizeObserver = new ResizeObserver(() => {
    const rect = getViewportRect();
    if (!rect || !viewer) return;
    if ((imgAObj || imgBObj) && previousViewportSize) {
      // Keep the same image point centered when side panels or the viewport change size.
      viewer.panX += (rect.width - previousViewportSize.width) / 2;
      viewer.panY += (rect.height - previousViewportSize.height) / 2;
      viewer.onStateChange();
    }
    previousViewportSize = { width: rect.width, height: rect.height };
  });
  if (container) resizeObserver.observe(container);

  // Set default active tool highlight
  setActiveAlignTool(btnAutoEdge);

  // Panel Collapsing Listeners
  btnCollapseLeft?.addEventListener("click", () => toggleLeftPanel(true));
  btnCloseLeftInner?.addEventListener("click", () => toggleLeftPanel(true));
  btnRestoreLeft?.addEventListener("click", () => toggleLeftPanel(false));

  btnCollapseRight?.addEventListener("click", () => toggleRightPanel(true));
  btnCloseRightInner?.addEventListener("click", () => toggleRightPanel(true));
  btnRestoreRight?.addEventListener("click", () => toggleRightPanel(false));

  btnCollapseBottom?.addEventListener("click", () => toggleBottomPanel(true));
  btnRestoreBottom?.addEventListener("click", () => toggleBottomPanel(false));

  btnCollapseQuick?.addEventListener("click", () => toggleQuickBar(true));
  btnRestoreQuick?.addEventListener("click", () => toggleQuickBar(false));

  // Accordions
  document.querySelectorAll(".accordion-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const content = document.getElementById(targetId);
      if (!content) return;
      const isOpen = !content.classList.contains("hidden");
      if (isOpen) {
        content.classList.add("hidden");
        btn.classList.remove("open");
      } else {
        content.classList.remove("hidden");
        btn.classList.add("open");
        setTimeout(() => {
          btn.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 80);
      }
    });
  });

  // Language Dropdown
  langDropdownBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    langDropdownMenu?.classList.toggle("hidden");
  });

  window.addEventListener("click", () => {
    toolsDropdownMenu?.classList.add("hidden");
    langDropdownMenu?.classList.add("hidden");
  });

  // Zoom Controls: every command uses the same focal-point-aware path.
  zoomRange?.addEventListener("input", (event) => zoomAt(parseFloat(event.target.value) / 100));
  document.getElementById("btn-zoom-in")?.addEventListener("click", () => zoomAt(viewer.getEffectiveZoom() * 1.2));
  document.getElementById("btn-zoom-out")?.addEventListener("click", () => zoomAt(viewer.getEffectiveZoom() / 1.2));
  document.getElementById("btn-zoom-11")?.addEventListener("click", () => zoomAt(1));
  document.getElementById("btn-zoom-fit")?.addEventListener("click", () => {
    const fit = getFitDimensions();
    viewer.centerBoth(fit.width, fit.height);
  });

  // Quick Bar Handlers
  document.getElementById("btn-quick-show-both")?.addEventListener("click", () => {
    const fit = getFitDimensions();
    viewer.centerBoth(fit.width, fit.height);
  });
  document.getElementById("btn-quick-fit")?.addEventListener("click", () => {
    const fit = getFitDimensions();
    viewer.centerBoth(fit.width, fit.height);
  });
  document.getElementById("btn-quick-actual")?.addEventListener("click", () => zoomAt(1));
  document.getElementById("btn-quick-sync-zoom")?.addEventListener("click", () => {
    viewer.setSyncZoom(!viewer.syncZoom);
    updateStatusHint(viewer.syncZoom ? i18n.t("syncZoomEnabled") : i18n.t("syncZoomDisabled"), false);
    updateZoomUI();
  });

  // Size Controls
  scaleARange?.addEventListener("input", (e) => {
    const ratio = parseFloat(e.target.value) / 100;
    viewer.setScaleRatioA(ratio);
    if (scaleAInput) scaleAInput.value = ratio.toFixed(2);
  });

  scaleAInput?.addEventListener("change", (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      viewer.setScaleRatioA(val);
      if (scaleARange) scaleARange.value = Math.round(val * 100);
    }
  });

  const btnMatchSizes = document.getElementById("btn-match-sizes");
  btnMatchSizes?.addEventListener("click", () => {
    viewer.matchImageSizes();
    updateScaleAUI();
    updateScaleBUI();
  });

  scaleBRange?.addEventListener("input", (e) => {
    const ratio = parseFloat(e.target.value) / 100;
    viewer.setScaleRatioB(ratio);
    if (scaleBInput) scaleBInput.value = ratio.toFixed(2);
  });

  scaleBInput?.addEventListener("change", (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      viewer.setScaleRatioB(val);
      if (scaleBRange) scaleBRange.value = Math.round(val * 100);
    }
  });

  // Pointer-based canvas navigation supports mouse, pen and touch consistently.
  let activePointerId = null;
  workspace?.addEventListener("pointerdown", (event) => {
    mouseDownPos = { x: event.clientX, y: event.clientY };
    const interactive = event.target.closest("button, input, select, textarea, a, #curtain-handle, .point-pin-badge, .floating-quick-bar, .filename-badge, #point-align-banner");
    if (interactive || ![0, 1].includes(event.button)) return;
    activePointerId = event.pointerId;
    isPanning = true;
    lastMouse = { x: event.clientX, y: event.clientY };
    workspace.classList.add("panning");
    workspace.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  });

  window.addEventListener("pointermove", (event) => {
    if (!isPanning || event.pointerId !== activePointerId || !viewer) return;
    const dx = event.clientX - lastMouse.x;
    const dy = event.clientY - lastMouse.y;
    lastMouse = { x: event.clientX, y: event.clientY };
    viewer.panBy(dx, dy);
  });
  const finishPan = (event) => {
    if (activePointerId === null || (event && event.pointerId !== activePointerId)) return;
    isPanning = false;
    activePointerId = null;
    workspace?.classList.remove("panning");
  };
  window.addEventListener("pointerup", finishPan);
  window.addEventListener("pointercancel", finishPan);
  workspace?.addEventListener("lostpointercapture", finishPan);

  workspace?.addEventListener("wheel", (event) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(viewer.getEffectiveZoom() * factor, event.clientX, event.clientY);
  }, { passive: false });

  // Mode Switching
  const modeSelector = document.getElementById("mode-selector");
  const groupSliderControls = document.getElementById("group-slider-controls");

  modeSelector?.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-seg");
    if (!btn || !modesCtrl) return;
    
    const mode = btn.dataset.mode;
    modeSelector.querySelectorAll(".btn-seg").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    if (mode === "slider") {
      stopAutoBlink();
      groupSliderControls?.classList.remove("hidden");
    } else {
      stopAutoBlink();
      groupSliderControls?.classList.add("hidden");
    }

    modesCtrl.setMode(mode);
    const fit = getFitDimensions();
    if (imgAObj || imgBObj) viewer.centerBoth(fit.width, fit.height);
  });

  opacityRange?.addEventListener("input", (e) => {
    setOpacityValue(parseInt(e.target.value, 10));
  });

  document.getElementById("btn-fade-0")?.addEventListener("click", () => setOpacityValue(0));
  document.getElementById("btn-fade-50")?.addEventListener("click", () => setOpacityValue(250));
  document.getElementById("btn-fade-100")?.addEventListener("click", () => setOpacityValue(500));

  btnFadeFlash?.addEventListener("click", () => {
    if (isFlashing) {
      clearInterval(flashInterval);
      isFlashing = false;
      btnFadeFlash.classList.remove("toggle-active");
      setOpacityValue(250);
    } else {
      stopAutoBlink();
      isFlashing = true;
      btnFadeFlash.classList.add("toggle-active");
      let state = false;
      flashInterval = setInterval(() => {
        state = !state;
        setOpacityValue(state ? 500 : 0);
      }, 150);
    }
  });

  blinkSpeedRange?.addEventListener("input", (e) => {
    updateBlinkSpeed(parseInt(e.target.value, 10));
  });

  blinkSpeedInput?.addEventListener("change", (e) => {
    const sec = parseFloat(e.target.value);
    if (!isNaN(sec) && sec > 0) {
      updateBlinkSpeed(Math.round(sec * 1000));
    }
  });

  btnToggleDiff?.addEventListener("click", () => {
    isDiffOverlay = !isDiffOverlay;
    btnToggleDiff.classList.toggle("primary-tool", isDiffOverlay);
    btnToggleDiff.classList.toggle("active", isDiffOverlay);
    container?.classList.toggle("diff-mode", isDiffOverlay);
    updateStatusHint(isDiffOverlay ? "Режим подсветки разницы (Diff) включен" : "Режим подсветки разницы отключен", false);
  });

  btnAutoBlink?.addEventListener("click", () => {
    if (isAutoBlinking) {
      stopAutoBlink();
    } else {
      startAutoBlink();
    }
  });

  btnSliderVert?.addEventListener("click", () => {
    btnSliderVert.classList.add("active");
    btnSliderHoriz?.classList.remove("active");
    modesCtrl?.setSliderOrientation("vertical");
  });

  btnSliderHoriz?.addEventListener("click", () => {
    btnSliderHoriz.classList.add("active");
    btnSliderVert?.classList.remove("active");
    modesCtrl?.setSliderOrientation("horizontal");
  });

  const toggleAlignB = () => {
    if (!viewer) return;
    const nextTarget = viewer.alignTarget === 'B' ? 'none' : 'B';
    viewer.setAlignTarget(nextTarget);
    updateAlignButtonsUI();
  };

  const toggleAlignA = () => {
    if (!viewer) return;
    const nextTarget = viewer.alignTarget === 'A' ? 'none' : 'A';
    viewer.setAlignTarget(nextTarget);
    updateAlignButtonsUI();
  };

  btnAlignB?.addEventListener("click", toggleAlignB);
  document.getElementById("btn-sidebar-align-b")?.addEventListener("click", toggleAlignB);

  btnAlignA?.addEventListener("click", toggleAlignA);
  document.getElementById("btn-sidebar-align-a")?.addEventListener("click", toggleAlignA);

  btn1PointAlign?.addEventListener("click", () => togglePointMode(1, btn1PointAlign));
  btn2PointAlign?.addEventListener("click", () => togglePointMode(2, btn2PointAlign));
  btn3PointAlign?.addEventListener("click", () => togglePointMode(3, btn3PointAlign));
  btn4PointAlign?.addEventListener("click", () => togglePointMode(4, btn4PointAlign));
  btnWarpAlign?.addEventListener("click", () => togglePointMode(4, btnWarpAlign));
  btnCancelPoint?.addEventListener("click", cancelPointMode);

  function updateSimilarityScore(percent) {
    const valEl = document.getElementById("similarity-score-val");
    if (!valEl) return;
    if (percent === null || percent === undefined) {
      valEl.textContent = "—";
      valEl.style.color = "var(--text-muted)";
      return;
    }
    valEl.textContent = `${percent}%`;
    if (percent >= 80) {
      valEl.style.color = "#10b981";
    } else if (percent >= 50) {
      valEl.style.color = "#f59e0b";
    } else {
      valEl.style.color = "#ef4444";
    }
  }

  btnAutoEdge?.addEventListener("click", async () => {
    if (!imgAObj || !imgBObj || !viewer) return;
    const sourceA = imgAObj;
    const sourceB = imgBObj;
    const jobRevision = ++alignmentJobRevision;
    setActiveAlignTool(btnAutoEdge);
    btnAutoEdge.disabled = true;
    updateStatusHint(i18n.t("analyzingEdges"), true);
    try {
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      const result = computeAutoEdgeAlignment(sourceA, sourceB);
      if (jobRevision !== alignmentJobRevision || sourceA !== imgAObj || sourceB !== imgBObj) return;
      if (!result) throw new Error(i18n.t("autoAlignNotFound"));
      viewer.clearTransformMatrix();
      viewer.setScaleRatioB(result.scaleRatioB);
      viewer.offsetX = result.offsetX;
      viewer.offsetY = result.offsetY;
      viewer.onStateChange();
      updateScaleBUI();
      updateSimilarityScore(result.confidence);
      updateStatusHint(`Авто-совмещение выполнено · уверенность ${result.confidence}%`, false);
    } catch (error) {
      updateSimilarityScore(null);
      updateStatusHint(error.message || "Не удалось выполнить автоматическое совмещение.", false);
    } finally {
      btnAutoEdge.disabled = false;
    }
  });

  btnAutoOpenCV?.addEventListener("click", async () => {
    if (!imgAObj || !imgBObj || !viewer) return;
    const sourceA = imgAObj;
    const sourceB = imgBObj;
    const jobRevision = ++alignmentJobRevision;
    setActiveAlignTool(btnAutoOpenCV);
    
    try {
      btnAutoOpenCV.disabled = true;
      updateStatusHint(i18n.t("loadingOpenCV"), true);
      await loadOpenCV((msg) => updateStatusHint(msg, true));
      if (jobRevision !== alignmentJobRevision || sourceA !== imgAObj || sourceB !== imgBObj) return;

      const matrix = await computeOpenCVAlignment(sourceA, sourceB, (msg) => updateStatusHint(msg, true));
      if (jobRevision !== alignmentJobRevision || sourceA !== imgAObj || sourceB !== imgBObj) return;

      viewer.clearTransformMatrix();
      viewer.transformMatrixB = matrix;
      viewer.onStateChange();
      updateSimilarityScore(null);
      updateStatusHint(i18n.t("openCVAlignmentDone"), false);
    } catch (err) {
      console.error(err);
      updateStatusHint(`Ошибка AI автовыравнивания: ${err.message || err}`, false);
    } finally {
      btnAutoOpenCV.disabled = false;
    }
  });

  workspace?.addEventListener("click", async (e) => {
    if (activePointsMode === 0 || !viewer || !workspace) return;

    const distDragged = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
    if (distDragged > 6) return;

    if (
      e.target.closest("#curtain-handle") ||
      e.target.closest(".curtain-thumb") ||
      e.target.closest(".curtain-line") ||
      e.target.closest("#point-align-banner") ||
      e.target.closest(".filename-badge") ||
      e.target.closest(".floating-quick-bar")
    ) {
      return;
    }

    const rect = getViewportRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const expectingA = pointsA.length < activePointsMode;
    const expectingB = !expectingA && pointsB.length < activePointsMode;

    if (expectingA && !isClickOnPhotoA(e.clientX, e.clientY)) return;
    if (expectingB && !isClickOnPhotoB(e.clientX, e.clientY)) return;

    if (expectingA) {
      const paneA = modesCtrl?.currentMode === "split" ? document.getElementById("split-pane-a")?.getBoundingClientRect() : null;
      const localX = paneA ? e.clientX - paneA.left : clickX;
      const point = viewer.screenToImageA(localX, clickY);
      if (!point || point.x < 0 || point.y < 0 || point.x > (imgAObj?.naturalWidth || 0) || point.y > (imgAObj?.naturalHeight || 0)) return;
      pointsA.push(point);
      addPointPin(e.clientX, e.clientY, `A${pointsA.length}`);
      updateInstructionText();
    } else if (expectingB) {
      const paneB = modesCtrl?.currentMode === "split" ? document.getElementById("split-pane-b")?.getBoundingClientRect() : null;
      const localX = paneB ? e.clientX - paneB.left : clickX;
      const point = viewer.screenToImageB(localX, clickY);
      if (!point || point.x < 0 || point.y < 0 || point.x > (imgBObj?.naturalWidth || 0) || point.y > (imgBObj?.naturalHeight || 0)) return;
      pointsB.push(point);
      addPointPin(e.clientX, e.clientY, `B${pointsB.length}`);

      if (pointsB.length === activePointsMode) {
        viewer.clearTransformMatrix();
        let aligned = false;
        if (activePointsMode === 1) aligned = viewer.alignByOnePoint(pointsA[0], pointsB[0]);
        else if (activePointsMode === 2) aligned = viewer.alignByTwoPoints(pointsA[0], pointsA[1], pointsB[0], pointsB[1]);
        else if (activePointsMode === 3) aligned = await viewer.alignByThreePoints(pointsA, pointsB);
        else if (activePointsMode === 4) aligned = await viewer.alignByFourPoints(pointsA, pointsB);
        if (!aligned) updateStatusHint(i18n.t("invalidPointSet"), false);
        updateScaleBUI();
        updateSimilarityScore(null);
        cancelPointMode();
      } else {
        updateInstructionText();
      }
    }
  });

  const toggleFilenamesHandler = () => {
    showFilenames = !showFilenames;
    updateFilenameBadges();
  };

  const btnToggleFilenames = document.getElementById("btn-toggle-filenames");
  btnToggleFilenames?.addEventListener("click", toggleFilenamesHandler);
  document.getElementById("btn-sidebar-filenames")?.addEventListener("click", toggleFilenamesHandler);

  document.getElementById("btn-reset-all")?.addEventListener("click", () => {
    if (!viewer || !workspace) return;
    alignmentJobRevision++;
    cancelPointMode();
    stopAutoBlink();
    if (isFlashing) clearInterval(flashInterval);
    isFlashing = false;
    flashInterval = null;
    btnFadeFlash?.classList.remove("toggle-active");
    btnAutoBlink?.classList.remove("toggle-active");
    isDiffOverlay = false;
    btnToggleDiff?.classList.remove("active", "primary-tool");
    container?.classList.remove("diff-mode");
    setOpacityValue(250);
    modesCtrl?.setSliderOrientation("vertical");
    modesCtrl?.setMode("slider");
    btnSliderVert?.classList.add("active");
    btnSliderHoriz?.classList.remove("active");
    document.querySelectorAll("#mode-selector .btn-seg").forEach(button => {
      button.classList.toggle("active", button.dataset.mode === "slider");
    });
    document.querySelectorAll("[data-preset]").forEach(button => {
      const active = button.dataset.preset === "curtain";
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    try { localStorage.setItem("photocheck-studio-compare", "curtain"); } catch { /* Optional preference. */ }
    viewer.resetAlignment(false);
    viewer.setSyncZoom(true);
    const fit = getFitDimensions();
    viewer.centerBoth(fit.width, fit.height);
    updateSimilarityScore(null);
    updateScaleAUI();
    updateScaleBUI();
    updateZoomUI();
    updateAlignButtonsUI();
    updateStatusHint(i18n.t("viewReset"), false);
  });

  document.getElementById("btn-center")?.addEventListener("click", () => {
    if (!viewer || !workspace) return;
    const fit = getFitDimensions();
    viewer.centerBoth(fit.width, fit.height);
  });

  document.getElementById("btn-clear-a")?.addEventListener("click", () => clearImageSlot("A"));
  document.getElementById("btn-clear-b")?.addEventListener("click", () => clearImageSlot("B"));
  document.getElementById("btn-swap")?.addEventListener("click", handleSwap);
  document.getElementById("btn-swap-bottom")?.addEventListener("click", handleSwap);

  setupDropzone("dropzone-a", "file-input-a", "A");
  setupDropzone("dropzone-b", "file-input-b", "B");

  window.addEventListener("dragover", (event) => event.preventDefault());
  window.addEventListener("drop", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("#dropzone-a, #dropzone-b")) return;
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []).filter(isImageFile);
    if (files.length >= 2) loadImagePair(files[0], files[1]);
    else if (files.length === 1) {
      const targetSlot = !imageASrc ? "A" : (!imageBSrc ? "B" : "A");
      loadImageIntoSlot(targetSlot, files[0]);
    }
  });

  window.addEventListener("paste", (event) => {
    const items = (event.clipboardData || event.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type?.startsWith("image/")) continue;
      const file = item.getAsFile();
      if (!file) continue;
      const targetSlot = !imageASrc ? "A" : (!imageBSrc ? "B" : "A");
      loadImageIntoSlot(targetSlot, file);
      break;
    }
  });

  const fileInputPair = document.getElementById("file-input-pair");
  fileInputPair?.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []).filter(isImageFile);
    event.target.value = "";
    if (files.length >= 2) {
      loadImagePair(files[0], files[1]);
    } else if (files.length === 1) {
      const targetSlot = !imageASrc ? "A" : (!imageBSrc ? "B" : "A");
      loadImageIntoSlot(targetSlot, files[0]);
    }
  });

  document.addEventListener("languageChanged", () => {
    updateRightSidebarInfo();
    updateFilenameBadges();
    updateZoomUI();
    updatePairDependentControls();
  });

  document.querySelectorAll(".lang-btn, .lang-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      i18n.setLanguage(lang);
      langDropdownMenu?.classList.add("hidden");
    });
  });

  const helpModal = document.getElementById("help-modal");
  document.getElementById("btn-help")?.addEventListener("click", () => {
    helpModal?.classList.remove("hidden");
  });
  document.getElementById("btn-close-help")?.addEventListener("click", () => {
    helpModal?.classList.add("hidden");
  });
  helpModal?.addEventListener("click", (e) => {
    if (e.target === helpModal) helpModal.classList.add("hidden");
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isEditing = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (event.key === "Escape") {
      cancelPointMode();
      langDropdownMenu?.classList.add("hidden");
      toolsDropdownMenu?.classList.add("hidden");
      document.getElementById("help-modal")?.classList.add("hidden");
      return;
    }
    if (isEditing || !(event.ctrlKey || event.metaKey || event.altKey || event.key === "0" || event.key === "1" || event.key === "+" || event.key === "=" || event.key === "-")) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "o") {
      event.preventDefault();
      fileInputPair?.click();
    } else if (!event.ctrlKey && !event.metaKey && event.key === "0") {
      event.preventDefault();
      const fit = getFitDimensions();
      viewer?.centerBoth(fit.width, fit.height);
    } else if (!event.ctrlKey && !event.metaKey && event.key === "1") {
      event.preventDefault();
      zoomAt(1);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomAt(viewer.getEffectiveZoom() * 1.2);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomAt(viewer.getEffectiveZoom() / 1.2);
    }
  });

  window.addEventListener("beforeunload", () => {
    if (objectUrlA) URL.revokeObjectURL(objectUrlA);
    if (objectUrlB) URL.revokeObjectURL(objectUrlB);
    if (autoBlinkInterval) clearInterval(autoBlinkInterval);
    if (flashInterval) clearInterval(flashInterval);
  }, { once: true });
});
