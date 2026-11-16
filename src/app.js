import { i18n } from "./i18n.js";
import { SynchronizedViewer } from "./viewer.js";
import { ModesController } from "./modes.js";
import { computeAutoEdgeAlignment } from "./auto_align.js";
import { loadOpenCV, computeOpenCVAlignment } from "./opencv_align.js";
import { exportComparison } from "./export.js";
import { loadMetadata, renderMetadata } from "./metadata.js";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize i18n
  i18n.updateUI();

  // --- 1. DOM Elements & State Variables ---
  const container = document.getElementById("viewer-container");
  const workspace = document.getElementById("workspace");

  // State for loaded images
  let imageASrc = null;
  let imageBSrc = null;
  let imgAObj = null;
  let imgBObj = null;
  let fileObjA = null;
  let fileObjB = null;

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
  const btnQuickFlash = document.getElementById("btn-quick-flash");
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

  function loadSingleFile(file, callback) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const src = evt.target.result;
      const img = new Image();
      img.onload = () => callback(src, img, file);
      img.onerror = () => updateStatusHint(i18n.t("invalidFile"));
      img.src = src;
    };
    reader.onerror = () => updateStatusHint(i18n.t("invalidFile"));
    reader.readAsDataURL(file);
  }

  function updateZoomUI() {
    if (!zoomRange || !zoomVal || !viewer) return;
    const scalePercent = Math.round(viewer.scale * 100);
    zoomRange.value = scalePercent;
    zoomVal.textContent = `${scalePercent}%`;
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
      if (workspace && imgAObj && viewer) {
        const rect = workspace.getBoundingClientRect();
        viewer.onStateChange();
      }
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

  function setFlashUI(active) {
    btnFadeFlash?.classList.toggle("toggle-active", active);
    btnQuickFlash?.classList.toggle("active", active);
    btnQuickFlash?.setAttribute("aria-pressed", String(active));
  }

  function stopAutoBlink() {
    if (isAutoBlinking) {
      clearInterval(autoBlinkInterval);
      isAutoBlinking = false;
      btnAutoBlink?.classList.remove("toggle-active");
      modesCtrl?.setBlinking(false);
      setOpacityValue(250);
    }
  }

  function startAutoBlink() {
    stopAutoBlink();
    modesCtrl?.setBlinking(true);
    if (isFlashing) {
      clearInterval(flashInterval);
      isFlashing = false;
      setFlashUI(false);
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
    if (!viewer || !modesCtrl) return;
    viewer.swapImages();
    const tempSrc = imageASrc;
    imageASrc = imageBSrc;
    imageBSrc = tempSrc;

    const tempImg = imgAObj;
    imgAObj = imgBObj;
    imgBObj = tempImg;

    const tempFile = fileObjA;
    fileObjA = fileObjB;
    fileObjB = tempFile;

    const tempName = filenameA;
    filenameA = filenameB;
    filenameB = tempName;

    modesCtrl.updateImages(imageASrc, imageBSrc);
    updateRightSidebarInfo();
    updateFilenameBadges();
  }

  function checkBothImagesLoaded() {
    if (!modesCtrl || !viewer || !workspace) return;
    workspace.classList.toggle("has-images", Boolean(imageASrc || imageBSrc));
    if (imageASrc && imageBSrc) {
      modesCtrl.updateImages(imageASrc, imageBSrc);
      viewer.setImages(imgAObj, imgBObj);
      const rect = workspace.getBoundingClientRect();
      viewer.centerBoth(rect.width, rect.height);
      updateFilenameBadges();
      setActiveAlignTool(currentActiveAlignBtn || btnAutoEdge);
      updateStatusHint(i18n.t("imagesLoaded"), false);
    } else if (imageASrc) {
      modesCtrl.updateImages(imageASrc, null);
      viewer.setImages(imgAObj, null);
      const rect = workspace.getBoundingClientRect();
      viewer.centerBoth(rect.width, rect.height);
      updateFilenameBadges();
    } else if (imageBSrc) {
      modesCtrl.updateImages(null, imageBSrc);
      viewer.setImages(null, imgBObj);
      const rect = workspace.getBoundingClientRect();
      viewer.centerBoth(rect.width, rect.height);
      updateFilenameBadges();
    }
  }

  function updateMetadata(slot, file) {
    const content = document.querySelector(`#metadata-${slot} .metadata-content`);
    if (!content) return;
    if (!file) {
      content.textContent = "—";
      return;
    }
    loadMetadata(file).then((exif) => {
      if ((slot === "a" ? fileObjA : fileObjB) !== file) return;
      renderMetadata(content, file, exif, {
        device: i18n.t("deviceLabel"), lens: i18n.t("lensLabel"), iso: "ISO",
        aperture: i18n.t("apertureLabel"), exposure: i18n.t("exposureLabel"),
        dpi: i18n.t("dpiLabel"), colorSpace: i18n.t("colorProfile"), captured: i18n.t("capturedLabel"),
        unavailable: i18n.t("unavailable"), noExif: i18n.t("noExif")
      });
    });
  }

  function updateRightSidebarInfo() {
    for (const [slot, src, file, img, name] of [["a", imageASrc, fileObjA, imgAObj, filenameA], ["b", imageBSrc, fileObjB, imgBObj, filenameB]]) {
      const set = (field, value) => {
        const element = document.getElementById(`info-${field}-${slot}`);
        if (element) element.textContent = value;
      };
      const thumb = document.getElementById(`thumb-${slot}`);
      if (thumb) {
        if (src) thumb.src = src;
        else thumb.removeAttribute("src");
      }
      set("name", file ? name : "—");
      set("path", file ? i18n.t("localFile") : "—");
      set("res", img ? `${img.naturalWidth} × ${img.naturalHeight}` : "—");
      set("fmt", file?.type ? file.type.split("/")[1]?.toUpperCase() : "—");
      set("size", file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "—");
      set("date", file ? new Date(file.lastModified || Date.now()).toLocaleDateString(i18n.lang) : "—");
      updateMetadata(slot, file);
    }
  }

  function setupDropzone(boxId, inputId, previewId, callback) {
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    box?.addEventListener("click", (e) => {
      if (e.target !== input) {
        input?.click();
      }
    });

    input?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) handleFile(file);
      e.target.value = "";
    });

    box?.addEventListener("dragover", (e) => {
      e.preventDefault();
      box.classList.add("drag-over");
    });

    box?.addEventListener("dragleave", () => {
      box.classList.remove("drag-over");
    });

    box?.addEventListener("drop", (e) => {
      e.preventDefault();
      box.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    function handleFile(file) {
      if (!isImageFile(file)) {
        updateStatusHint(i18n.t("invalidFile"), false);
        return;
      }
      loadSingleFile(file, (src, img) => {
        if (preview) {
          preview.src = src;
          preview.classList.remove("hidden");
        }
        callback(src, img, file);
      });
    }
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
  updateRightSidebarInfo();
  if (window.matchMedia("(max-width: 900px)").matches) {
    toggleLeftPanel(true);
    toggleRightPanel(true);
  }

  const resizeObserver = new ResizeObserver(() => {
    if (workspace && imgAObj && viewer) {
      viewer.onStateChange();
    }
  });
  if (workspace) resizeObserver.observe(workspace);

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

  // Zoom Controls
  zoomRange?.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value) / 100;
    const rect = workspace.getBoundingClientRect();
    viewer.setZoom(val, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
  });

  document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
    const rect = workspace.getBoundingClientRect();
    viewer.setZoom(viewer.scale * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
  });

  document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
    const rect = workspace.getBoundingClientRect();
    viewer.setZoom(viewer.scale / 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
  });

  document.getElementById("btn-zoom-100")?.addEventListener("click", () => {
    const rect = workspace.getBoundingClientRect();
    viewer.setZoom(1.0, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
  });

  document.getElementById("btn-zoom-11")?.addEventListener("click", () => {
    const rect = workspace.getBoundingClientRect();
    viewer.setZoom(1.0, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
  });

  document.getElementById("btn-zoom-fit")?.addEventListener("click", () => {
    const rect = workspace.getBoundingClientRect();
    viewer.centerBoth(rect.width, rect.height);
  });

  // Quick Bar Handlers
  document.getElementById("btn-quick-show-both")?.addEventListener("click", () => {
    const rect = workspace.getBoundingClientRect();
    viewer.centerBoth(rect.width, rect.height);
  });

  document.getElementById("btn-quick-fit")?.addEventListener("click", () => {
    const rect = workspace.getBoundingClientRect();
    viewer.centerBoth(rect.width, rect.height);
  });

  document.getElementById("btn-quick-actual")?.addEventListener("click", () => {
    const rect = workspace.getBoundingClientRect();
    viewer.setZoom(1.0, rect.left + rect.width / 2, rect.top + rect.height / 2, rect);
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

  // Workspace Pan & Zoom
  workspace?.addEventListener("mousedown", (e) => {
    mouseDownPos = { x: e.clientX, y: e.clientY };
    if (e.target.closest("#curtain-handle") || e.target.closest(".point-pin-badge") || e.target.closest(".floating-quick-bar")) return;
    if (e.button === 0 || e.button === 1) {
      isPanning = true;
      lastMouse = { x: e.clientX, y: e.clientY };
      workspace.classList.add("panning");
    }
  });

  window.addEventListener("mousemove", (e) => {
    if (!isPanning || !viewer) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    lastMouse = { x: e.clientX, y: e.clientY };
    viewer.panBy(dx, dy);
  });

  window.addEventListener("mouseup", () => {
    if (isPanning && workspace) {
      isPanning = false;
      workspace.classList.remove("panning");
    }
  });

  workspace?.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (!viewer) return;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = viewer.scale * zoomFactor;
    const rect = workspace.getBoundingClientRect();
    viewer.setZoom(newScale, e.clientX, e.clientY, rect);
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
  });

  opacityRange?.addEventListener("input", (e) => {
    setOpacityValue(parseInt(e.target.value, 10));
  });

  document.getElementById("btn-fade-0")?.addEventListener("click", () => setOpacityValue(0));
  document.getElementById("btn-fade-50")?.addEventListener("click", () => setOpacityValue(250));
  document.getElementById("btn-fade-100")?.addEventListener("click", () => setOpacityValue(500));

  const toggleFlash = () => {
    if (isFlashing) {
      clearInterval(flashInterval);
      isFlashing = false;
      setFlashUI(false);
      modesCtrl?.setBlinking(false);
      setOpacityValue(250);
    } else {
      stopAutoBlink();
      isFlashing = true;
      modesCtrl?.setBlinking(true);
      setFlashUI(true);
      let state = false;
      flashInterval = setInterval(() => {
        state = !state;
        setOpacityValue(state ? 500 : 0);
      }, 150);
    }
  };

  btnFadeFlash?.addEventListener("click", toggleFlash);
  btnQuickFlash?.addEventListener("click", toggleFlash);

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

  btnAutoEdge?.addEventListener("click", () => {
    if (!imgAObj || !imgBObj || !viewer) return;
    setActiveAlignTool(btnAutoEdge);
    updateStatusHint("Анализ контуров изображений...", true);
    
    setTimeout(() => {
      const result = computeAutoEdgeAlignment(imgAObj, imgBObj);
      if (result) {
        viewer.setScaleRatioB(result.scaleRatioB);
        viewer.offsetX = result.offsetX;
        viewer.offsetY = result.offsetY;
        viewer.onStateChange();
        updateScaleBUI();
        updateSimilarityScore(result.confidence);
        updateStatusHint(`Авто-совмещение контуров выполнено! (Сходство: ${result.confidence}%)`, false);
      } else {
        updateSimilarityScore(null);
        updateStatusHint("Не удалось выполнить авто-совмещение по контурам", false);
      }
    }, 50);
  });

  btnAutoOpenCV?.addEventListener("click", async () => {
    if (!imgAObj || !imgBObj || !viewer) return;
    setActiveAlignTool(btnAutoOpenCV);
    
    try {
      btnAutoOpenCV.disabled = true;
      updateStatusHint("Загрузка движка OpenCV...", true);
      await loadOpenCV((msg) => updateStatusHint(msg, true));
      
      const matrix = await computeOpenCVAlignment(imgAObj, imgBObj, (msg) => updateStatusHint(msg, true));
      
      viewer.clearTransformMatrix();
      viewer.transformMatrixB = matrix;
      viewer.onStateChange();
      updateStatusHint("AI Автовыравнивание (OpenCV) успешно выполнено!", false);
    } catch (err) {
      console.error(err);
      updateStatusHint(`Ошибка AI автовыравнивания: ${err.message || err}`, false);
    } finally {
      btnAutoOpenCV.disabled = false;
    }
  });

  workspace?.addEventListener("click", (e) => {
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

    const rect = workspace.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const expectingA = pointsA.length < activePointsMode;
    const expectingB = !expectingA && pointsB.length < activePointsMode;

    if (expectingA && !isClickOnPhotoA(e.clientX, e.clientY)) return;
    if (expectingB && !isClickOnPhotoB(e.clientX, e.clientY)) return;

    if (expectingA) {
      const trA = viewer.getTransformA();
      const imgX = (clickX - trA.x) / trA.scale;
      const imgY = (clickY - trA.y) / trA.scale;
      pointsA.push({ x: imgX, y: imgY });
      addPointPin(e.clientX, e.clientY, `A${pointsA.length}`);
      updateInstructionText();
    } else if (expectingB) {
      const trB = viewer.getTransformB();
      const imgX = (clickX - trB.x) / trB.scale;
      const imgY = (clickY - trB.y) / trB.scale;
      pointsB.push({ x: imgX, y: imgY });
      addPointPin(e.clientX, e.clientY, `B${pointsB.length}`);

      if (pointsB.length === activePointsMode) {
        viewer.clearTransformMatrix();
        if (activePointsMode === 1) {
          viewer.alignByOnePoint(pointsA[0], pointsB[0]);
        } else if (activePointsMode === 2) {
          viewer.alignByTwoPoints(pointsA[0], pointsA[1], pointsB[0], pointsB[1]);
          updateScaleBUI();
        } else if (activePointsMode === 3) {
          viewer.alignByThreePoints(pointsA, pointsB);
        } else if (activePointsMode === 4) {
          viewer.alignByFourPoints(pointsA, pointsB);
        }
        
        setTimeout(() => {
          cancelPointMode();
        }, 300);
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
    viewer.clearTransformMatrix();
    viewer.setScaleRatioA(1.0);
    viewer.setScaleRatioB(1.0);
    const rect = workspace.getBoundingClientRect();
    viewer.centerBoth(rect.width, rect.height);
    updateScaleAUI();
    updateScaleBUI();
  });

  document.getElementById("btn-center")?.addEventListener("click", () => {
    if (!viewer || !workspace) return;
    const rect = workspace.getBoundingClientRect();
    viewer.centerBoth(rect.width, rect.height);
  });

  document.getElementById("btn-swap")?.addEventListener("click", handleSwap);
  document.getElementById("btn-swap-bottom")?.addEventListener("click", handleSwap);

  setupDropzone("dropzone-a", "file-input-a", "preview-a", (src, img, file) => {
    imageASrc = src;
    imgAObj = img;
    fileObjA = file;
    if (file) filenameA = file.name;
    checkBothImagesLoaded();
    updateRightSidebarInfo();
  });

  setupDropzone("dropzone-b", "file-input-b", "preview-b", (src, img, file) => {
    imageBSrc = src;
    imgBObj = img;
    fileObjB = file;
    if (file) filenameB = file.name;
    checkBothImagesLoaded();
    updateRightSidebarInfo();
  });

  window.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  window.addEventListener("drop", (e) => {
    if (e.target.closest("#dropzone-a") || e.target.closest("#dropzone-b")) return;
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files).filter(isImageFile);
    if (files.length === 0) return;

    if (files.length >= 2) {
      loadSingleFile(files[0], (srcA, imgA) => {
        imageASrc = srcA; imgAObj = imgA; fileObjA = files[0]; filenameA = files[0].name;
        const previewA = document.getElementById("preview-a");
        if (previewA) { previewA.src = srcA; previewA.classList.remove("hidden"); }

        loadSingleFile(files[1], (srcB, imgB) => {
          imageBSrc = srcB; imgBObj = imgB; fileObjB = files[1]; filenameB = files[1].name;
          const previewB = document.getElementById("preview-b");
          if (previewB) { previewB.src = srcB; previewB.classList.remove("hidden"); }

          checkBothImagesLoaded();
          updateRightSidebarInfo();
        });
      });
    } else if (files.length === 1) {
      const targetSlot = !imageASrc ? 'A' : (!imageBSrc ? 'B' : 'A');
      loadSingleFile(files[0], (src, img) => {
        if (targetSlot === 'A') {
          imageASrc = src; imgAObj = img; fileObjA = files[0]; filenameA = files[0].name;
          const previewA = document.getElementById("preview-a");
          if (previewA) { previewA.src = src; previewA.classList.remove("hidden"); }
        } else {
          imageBSrc = src; imgBObj = img; fileObjB = files[0]; filenameB = files[0].name;
          const previewB = document.getElementById("preview-b");
          if (previewB) { previewB.src = src; previewB.classList.remove("hidden"); }
        }
        checkBothImagesLoaded();
        updateRightSidebarInfo();
      });
    }
  });

  window.addEventListener("paste", (e) => {
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type && item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (!file) continue;
        const targetSlot = !imageASrc ? 'A' : (!imageBSrc ? 'B' : 'A');
        loadSingleFile(file, (src, img) => {
          if (targetSlot === 'A') {
            imageASrc = src; imgAObj = img; fileObjA = file; filenameA = "Буфер_обмена_A.png";
            const previewA = document.getElementById("preview-a");
            if (previewA) { previewA.src = src; previewA.classList.remove("hidden"); }
          } else {
            imageBSrc = src; imgBObj = img; fileObjB = file; filenameB = "Буфер_обмена_B.png";
            const previewB = document.getElementById("preview-b");
            if (previewB) { previewB.src = src; previewB.classList.remove("hidden"); }
          }
          checkBothImagesLoaded();
          updateRightSidebarInfo();
          updateStatusHint("Изображение из буфера обмена вставлено", false);
        });
        break;
      }
    }
  });

  const fileInputPair = document.getElementById("file-input-pair");
  fileInputPair?.addEventListener("change", (e) => {
    const files = Array.from(e.target.files).filter(isImageFile);
    if (files.length < 1) return;

    e.target.value = "";

    if (files.length >= 2) {
      loadSingleFile(files[0], (src, img) => {
        imageASrc = src;
        imgAObj = img;
        fileObjA = files[0];
        filenameA = files[0].name;
        const previewA = document.getElementById("preview-a");
        if (previewA) { previewA.src = src; previewA.classList.remove("hidden"); }
        updateRightSidebarInfo();

        loadSingleFile(files[1], (srcB, imgB) => {
          imageBSrc = srcB;
          imgBObj = imgB;
          fileObjB = files[1];
          filenameB = files[1].name;
          const previewB = document.getElementById("preview-b");
          if (previewB) { previewB.src = srcB; previewB.classList.remove("hidden"); }
          checkBothImagesLoaded();
          updateRightSidebarInfo();
        });
      });
    } else {
      loadSingleFile(files[0], (src, img) => {
        imageASrc = src;
        imgAObj = img;
        fileObjA = files[0];
        filenameA = files[0].name;
        const previewA = document.getElementById("preview-a");
        if (previewA) { previewA.src = src; previewA.classList.remove("hidden"); }
        checkBothImagesLoaded();
        updateRightSidebarInfo();
      });
    }
  });

  document.querySelectorAll(".lang-btn, .lang-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      i18n.setLanguage(lang);
      langDropdownMenu?.classList.add("hidden");
    });
  });

  document.addEventListener("languageChanged", updateRightSidebarInfo);

  document.getElementById("btn-compare-action")?.addEventListener("click", () => {
    if (!imgAObj || !imgBObj) {
      updateStatusHint(i18n.t("noImageLoaded"));
      return;
    }
    btnAutoEdge?.click();
  });

  const exportButton = document.getElementById("btn-export-action");
  const exportMenu = document.getElementById("export-menu");
  exportButton?.addEventListener("click", (e) => {
    e.stopPropagation();
    exportMenu?.classList.toggle("hidden");
    exportButton.setAttribute("aria-expanded", String(!exportMenu?.classList.contains("hidden")));
  });
  exportMenu?.addEventListener("click", async (e) => {
    const button = e.target.closest("[data-export]");
    if (!button) return;
    exportMenu.classList.add("hidden");
    exportButton?.setAttribute("aria-expanded", "false");
    try {
      await exportComparison({ viewer, modes: modesCtrl, imgA: imgAObj, imgB: imgBObj, workspace, format: button.dataset.export });
      updateStatusHint(i18n.t("exportSuccess"));
    } catch (error) {
      updateStatusHint(i18n.t(error.message === "loadBoth" ? "noImageLoaded" : error.message === "perspective" ? "exportPerspective" : "exportError"));
    }
  });
  window.addEventListener("click", () => {
    exportMenu?.classList.add("hidden");
    exportButton?.setAttribute("aria-expanded", "false");
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
});
