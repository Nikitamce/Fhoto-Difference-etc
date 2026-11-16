import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { i18n } from "./i18n.js";
import { settings } from "./settings.js";
import { SynchronizedViewer } from "./viewer.js";
import { ModesController } from "./modes.js";
import { computeAutoEdgeAlignment } from "./auto_align.js";
import { loadOpenCV, computeOpenCVAlignment } from "./opencv_align.js";
import {
  formatBytes,
  preparePixelBuffer,
  sampleCachedPixel,
  parseImageMetadata,
  computeComparisonMetrics,
} from "./metadata.js";
import { exportComparison } from "./exporter.js";

const SIMILARITY_CIRCUMFERENCE = 2 * Math.PI * 20; // r = 20 in SVG ring

const state = {
  imgA: null,
  imgB: null,
  urlA: null,
  urlB: null,
  fileA: null,
  fileB: null,
  metaA: null,
  metaB: null,
  sourceHintA: "",
  sourceHintB: "",

  isPanning: false,
  panPane: "both",
  panLastX: 0,
  panLastY: 0,

  showFilenames: true,
  quickBarCollapsed: false,

  isFlashing: false,
  opacityBeforeFlash: 0.5,
  opacityBeforeBlink: 0.5,
  uiMode: "slider", // "slider" | "fade" | "split" | "diff" | "blink"
  isBlinking: false,
  blinkIntervalId: null,
  blinkMs: 1000,

  pointModeCount: 0, // 0 | 1 | 2 | 3 | 4
  pointsA: [],
  pointsB: [],

  metricsTimer: null,
  probeRafId: null,
  lastProbeEvent: null,
};

const dom = {};
let viewer;
let modesCtrl;

function cacheDOM() {
  const ids = [
    "app-shell",
    "btn-collapse-left",
    "btn-close-left-inner",
    "btn-restore-left",
    "panel-left",
    "btn-collapse-right",
    "btn-close-right-inner",
    "btn-restore-right",
    "panel-right",
    "btn-collapse-bottom",
    "btn-restore-bottom",
    "panel-bottom",
    "mode-selector",
    "group-slider-controls",
    "group-blink-controls",
    "btn-header-blink-toggle",
    "btn-slider-vertical",
    "btn-slider-horizontal",
    "btn-zoom-out",
    "zoom-range",
    "btn-zoom-in",
    "btn-zoom-presets",
    "zoom-val",
    "btn-zoom-fit",
    "btn-zoom-11",
    "lang-dropdown-btn",
    "btn-settings",
    "btn-help",
    "btn-auto-edge",
    "btn-auto-opencv",
    "btn-match-sizes",
    "btn-center",
    "btn-target-none",
    "btn-sidebar-align-a",
    "btn-sidebar-align-b",
    "btn-nudge-up",
    "btn-nudge-down",
    "btn-nudge-left",
    "btn-nudge-right",
    "offset-val-x",
    "offset-val-y",
    "btn-1point-align",
    "btn-2point-align",
    "btn-3point-align",
    "btn-4point-align",
    "scale-a-range",
    "scale-a-input",
    "btn-reset-scale-a",
    "scale-b-range",
    "scale-b-input",
    "btn-reset-scale-b",
    "btn-reset-all",
    "workspace",
    "viewer-container",
    "empty-state-overlay",
    "empty-pick-a",
    "empty-pick-b",
    "btn-load-demo",
    "missing-slot-prompt",
    "btn-pick-missing-slot",
    "missing-slot-badge",
    "missing-slot-title",
    "missing-slot-hint",
    "filename-badge-a",
    "badge-name-a",
    "badge-res-a",
    "filename-badge-b",
    "badge-name-b",
    "badge-res-b",
    "point-align-banner",
    "point-align-instruction",
    "btn-undo-point",
    "btn-cancel-2point",
    "pixel-probe-hud",
    "probe-coords",
    "probe-swatch-a",
    "probe-rgb-a",
    "probe-swatch-b",
    "probe-rgb-b",
    "probe-delta-val",
    "quick-actions-bar",
    "btn-collapse-quick",
    "btn-restore-quick",
    "btn-quick-fit",
    "btn-quick-actual",
    "btn-swap",
    "btn-quick-sync-zoom",
    "btn-sidebar-filenames",
    "btn-toggle-probe",
    "btn-quick-upload",
    "btn-recalc-metrics",
    "similarity-ring-arc",
    "similarity-score-val",
    "metric-changed-val",
    "metric-maxdelta-val",
    "metric-mae-val",
    "btn-replace-a",
    "btn-replace-b",
    "thumb-a",
    "thumb-b",
    "thumb-placeholder-a",
    "thumb-placeholder-b",
    "info-name-a",
    "info-name-b",
    "info-path-a",
    "info-path-b",
    "info-res-a",
    "info-res-b",
    "info-fmt-a",
    "info-fmt-b",
    "info-size-a",
    "info-size-b",
    "info-date-a",
    "info-date-b",
    "opacity-range",
    "opacity-val",
    "btn-fade-0",
    "btn-fade-25",
    "btn-fade-50",
    "btn-fade-75",
    "btn-fade-100",
    "btn-fade-flash",
    "btn-auto-blink",
    "blink-speed-range",
    "blink-speed-input",
    "diff-style-selector",
    "diff-gain-range",
    "diff-gain-val",
    "channel-selector",
    "meta-aspect-a",
    "meta-aspect-b",
    "meta-alpha-a",
    "meta-alpha-b",
    "meta-depth-a",
    "meta-depth-b",
    "meta-profile-a",
    "meta-profile-b",
    "meta-dpi-a",
    "meta-dpi-b",
    "meta-comp-a",
    "meta-comp-b",
    "meta-cam-a",
    "meta-cam-b",
    "meta-exp-a",
    "meta-exp-b",
    "dropzone-a",
    "dropzone-b",
    "file-input-a",
    "file-input-b",
    "file-input-pair",
    "preview-a",
    "preview-b",
    "dropzone-title-a",
    "dropzone-title-b",
    "dropzone-hint-a",
    "dropzone-hint-b",
    "btn-swap-bottom",
    "btn-compare-action",
    "btn-export-action",
    "btn-header-export",
    "mode-params-section",
    "mode-params-heading",
    "mode-hint-slider",
    "mode-hint-split",
    "acc-blend-panel",
    "acc-blink-panel",
    "blink-frame-pill",
    "acc-diff-panel",
    "nudge-step-label",
    "point-progress-dots",
    "global-drop-overlay",
    "help-shortcut-search",
    "help-shortcuts-list",
    "setting-toggle-glass",
    "setting-toggle-quickbar",
    "setting-toggle-autohide-hud",
    "setting-toggle-modestrip",
    "setting-default-diff-gain",
    "setting-default-diff-gain-val",
    "workspace-bottom-hover-zone",
    "workspace-bottom-hud",
    "mode-bottom-strip",
    "strip-fade-controls",
    "strip-blink-controls",
    "strip-opacity-range",
    "strip-opacity-val",
    "btn-strip-flash",
    "btn-strip-blink-toggle",
    "strip-blink-frame",
    "strip-blink-range",
    "strip-blink-val",
    "acc-meta-panel",
    "lang-popover",
    "zoom-popover",
    "export-popover",
    "settings-dialog",
    "btn-close-settings",
    "theme-system-resolved",
    "setting-toggle-probe",
    "setting-toggle-filenames",
    "setting-toggle-autohide-badges",
    "setting-toggle-autometrics",
    "btn-reset-settings",
    "help-dialog",
    "btn-close-help",
    "toast-region",
    "sr-announcer",
  ];

  for (const id of ids) {
    const prop = id.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());
    dom[prop] = document.getElementById(id);
  }
}

/* ============================================================================
   UI Feedback: Toasts & Screen Reader Announcer
   ============================================================================ */
const activeToasts = new Map();

function announceSR(text) {
  if (!dom.srAnnouncer || !text) return;
  dom.srAnnouncer.textContent = "";
  requestAnimationFrame(() => {
    dom.srAnnouncer.textContent = text;
  });
}

function dismissToast(id) {
  const toast = activeToasts.get(id);
  if (!toast) return;
  activeToasts.delete(id);
  if (toast._timer) clearTimeout(toast._timer);
  toast.classList.add("closing");
  setTimeout(() => toast.remove(), 240);
}

function getToastIconSvg(type) {
  const paths = {
    success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    danger: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  };
  const d = paths[type] || paths.info;
  return `<svg class="i toast-icon" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
}

function showToast(message, { duration = 2500, spinner = false, id = null, type = "info" } = {}) {
  if (!dom.toastRegion) return null;
  const key = id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  let toast = id ? activeToasts.get(id) : null;
  if (!toast) {
    if (activeToasts.size >= 2) {
      const oldestKey = activeToasts.keys().next().value;
      if (oldestKey) dismissToast(oldestKey);
    }
    toast = document.createElement("div");
    toast.className = "status-toast";
    toast.setAttribute("role", "status");
    dom.toastRegion.appendChild(toast);
    activeToasts.set(key, toast);
  }

  toast.classList.remove("closing");
  toast.dataset.type = spinner ? "info" : type;
  if (toast._timer) clearTimeout(toast._timer);

  toast.innerHTML = "";
  if (spinner) {
    const sp = document.createElement("span");
    sp.className = "toast-spinner";
    sp.setAttribute("aria-hidden", "true");
    toast.appendChild(sp);
  } else {
    toast.insertAdjacentHTML("beforeend", getToastIconSvg(type));
  }
  const textSpan = document.createElement("span");
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  announceSR(message);

  if (duration > 0) {
    toast._timer = setTimeout(() => dismissToast(key), duration);
  }
  return key;
}

/* ============================================================================
   Range Slider Custom Property Progress Sync & Dialog / Popover Fallbacks
   ============================================================================ */
function syncRangeVars(input) {
  if (!input) return;
  const min = Number(input.min === "" ? "0" : input.min);
  const max = Number(input.max === "" ? "100" : input.max);
  const val = Number(input.value || 0);
  const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
  input.style.setProperty("--attr-min", String(min));
  input.style.setProperty("--attr-max", String(max));
  input.style.setProperty("--control-value", input.value);
  input.style.setProperty("--p", `${Math.max(0, Math.min(100, pct))}%`);
}

function initAllRanges() {
  document.querySelectorAll('input[type="range"].range-input').forEach((input) => {
    syncRangeVars(input);
    input.addEventListener("input", () => syncRangeVars(input));
  });
}

function supportsTopLayerExit() {
  return Boolean(
    window.CSS?.supports?.("overlay", "auto") &&
    window.CSS?.supports?.("transition-behavior", "allow-discrete")
  );
}

function closeTopLayer(dialog) {
  if (!dialog?.open) return;
  if (supportsTopLayerExit()) {
    dialog.close();
    return;
  }
  dialog.setAttribute("data-closing", "true");
  const done = () => {
    dialog.removeAttribute("data-closing");
    if (dialog.open) dialog.close();
  };
  const timer = setTimeout(done, 230);
  dialog.addEventListener(
    "transitionend",
    (e) => {
      if (e.target === dialog) {
        clearTimeout(timer);
        done();
      }
    },
    { once: true }
  );
}

function setupDialogEnhancements(dialog, openBtn, closeBtn) {
  if (!dialog) return;

  // Fallback for browsers without native Invoker Commands
  if (!("commandForElement" in HTMLButtonElement.prototype)) {
    openBtn?.addEventListener("click", () => {
      if (!dialog.open) dialog.showModal();
    });
    closeBtn?.addEventListener("click", () => closeTopLayer(dialog));
  } else if (!supportsTopLayerExit()) {
    closeBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      closeTopLayer(dialog);
    });
  }

  // Fallback for Escape cancel animation on browsers without overlay transition
  dialog.addEventListener("cancel", (e) => {
    if (!supportsTopLayerExit()) {
      e.preventDefault();
      closeTopLayer(dialog);
    }
  });

  // Fallback for browsers without native closedby="any"
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    let startedOutside = false;
    const isOutside = (e) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    dialog.addEventListener("pointerdown", (e) => {
      startedOutside = e.target === dialog && isOutside(e);
    });
    dialog.addEventListener("pointerup", (e) => {
      if (startedOutside && e.target === dialog && isOutside(e)) {
        closeTopLayer(dialog);
      }
      startedOutside = false;
    });
  }
}

let lastPopoverTrigger = null;

function setupPopoverFallback(popoverEl, anchorEl, preferredSide = "bottom-end") {
  if (!popoverEl || !anchorEl) return;

  popoverEl.addEventListener("beforetoggle", (e) => {
    if (e.newState !== "open") return;
    const activeAnchor = (lastPopoverTrigger && document.body.contains(lastPopoverTrigger)) ? lastPopoverTrigger : anchorEl;
    if (window.CSS?.supports?.("position-area", "block-end") && (popoverEl.id !== "export-popover" || activeAnchor === dom.btnHeaderExport)) {
      popoverEl.style.position = "";
      popoverEl.style.inset = "";
      popoverEl.style.top = "";
      popoverEl.style.left = "";
      popoverEl.style.positionAnchor = "";
      return;
    }
    requestAnimationFrame(() => {
      const ar = activeAnchor.getBoundingClientRect();
      const pr = popoverEl.getBoundingClientRect();
      const gap = 8;
      const openBelow = ar.top < window.innerHeight / 2;
      let top = openBelow ? ar.bottom + gap : ar.top - pr.height - gap;
      let left =
        preferredSide.endsWith("start")
          ? ar.left
          : ar.right - pr.width;

      if (top < 8) top = ar.bottom + gap;
      if (top + pr.height > window.innerHeight - 8) {
        top = Math.max(8, ar.top - pr.height - gap);
      }
      left = Math.max(8, Math.min(window.innerWidth - pr.width - 8, left));

      popoverEl.style.positionAnchor = "none";
      popoverEl.style.position = "fixed";
      popoverEl.style.inset = "auto";
      popoverEl.style.margin = "0";
      popoverEl.style.top = `${Math.round(top)}px`;
      popoverEl.style.left = `${Math.round(left)}px`;
    });
  });
}

/* ============================================================================
   Core Initialization
   ============================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  cacheDOM();
  settings.applyToDOM();
  i18n.updateUI();
  initAllRanges();

  viewer = new SynchronizedViewer({
    onStateChange: handleViewerStateChange,
  });

  modesCtrl = new ModesController(viewer, dom.viewerContainer);
  modesCtrl.diffStyle = settings.get("defaultDiffMode");
  modesCtrl.diffGain = settings.get("diffGain");
  modesCtrl.setImageRenderingPref(settings.get("imageRendering"));
  modesCtrl.onCurtainChange = () => { };

  bindHeaderAndModes();
  bindZoomControls();
  bindLeftDock();
  bindWorkspaceInteractions();
  bindRightInspector();
  bindBottomDock();
  bindSettingsDialog();
  bindHelpDialog();
  bindPopovers();
  bindKeyboardShortcuts();

  document.addEventListener("languageChanged", () => {
    syncDynamicTextsOnLanguageChange();
  });

  syncSettingsUI();
  syncPanelCollapsedState();
  if (window.innerWidth < 1024) {
    if (dom.panelLeft && !dom.panelLeft.classList.contains("collapsed")) toggleDock("left");
    if (dom.panelRight && !dom.panelRight.classList.contains("collapsed")) toggleDock("right");
  }
  toggleQuickBar(!settings.get("showQuickBar"));
  applyModeSelection("slider");
  setLayerTarget("none");
  updateOpacityUI(modesCtrl.opacity);
  updateDiffUI();
  state.showFilenames = settings.get("showFilenameBadges") !== false;
  updateSyncToggleUI();
  updateFilenamesToggleUI();
  updateProbeVisibility();
  updateOffsetReadout();
  updateScaleUI();
  updateNudgeStepLabel();
  initBottomHudAutoHide();
  initMetaMarqueeObserver();

  window.addEventListener("resize", () => {
    updateModeIndicator();
    refreshMetaMarquee();
  });
});

function handleViewerStateChange() {
  modesCtrl.render();
  updateZoomDisplay();
  updateOffsetReadout();
  updatePointPins();
}

/* ============================================================================
   Header & Modes
   ============================================================================ */
function bindHeaderAndModes() {
  dom.modeSelector?.querySelectorAll(".seg-btn[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => applyModeSelection(btn.dataset.mode));
  });

  dom.btnSliderVertical?.addEventListener("click", () => {
    setCurtainOrientation("vertical");
  });

  dom.btnSliderHorizontal?.addEventListener("click", () => {
    setCurtainOrientation("horizontal");
  });

  dom.btnHeaderBlinkToggle?.addEventListener("click", toggleAutoBlink);

  document.querySelectorAll(".blink-speed-preset[data-blink-ms]").forEach((btn) => {
    btn.addEventListener("click", () => {
      setBlinkIntervalMs(Number(btn.dataset.blinkMs));
    });
  });

  const toggleLeft = () => toggleDock("left");
  const toggleRight = () => toggleDock("right");
  const toggleBottom = () => toggleDock("bottom");

  dom.btnCollapseLeft?.addEventListener("click", toggleLeft);
  dom.btnCloseLeftInner?.addEventListener("click", toggleLeft);
  dom.btnRestoreLeft?.addEventListener("click", toggleLeft);

  dom.btnCollapseRight?.addEventListener("click", toggleRight);
  dom.btnCloseRightInner?.addEventListener("click", toggleRight);
  dom.btnRestoreRight?.addEventListener("click", toggleRight);

  dom.btnCollapseBottom?.addEventListener("click", toggleBottom);
  dom.btnRestoreBottom?.addEventListener("click", toggleBottom);
  dom.btnQuickUpload?.addEventListener("click", toggleBottom);
}

function toggleDock(which) {
  if (which === "left" && dom.panelLeft) {
    const collapsed = dom.panelLeft.classList.toggle("collapsed");
    dom.btnRestoreLeft?.classList.toggle("hidden", !collapsed);
    dom.btnCollapseLeft?.setAttribute("aria-expanded", String(!collapsed));
  } else if (which === "right" && dom.panelRight) {
    const collapsed = dom.panelRight.classList.toggle("collapsed");
    dom.btnRestoreRight?.classList.toggle("hidden", !collapsed);
    dom.btnCollapseRight?.setAttribute("aria-expanded", String(!collapsed));
  } else if (which === "bottom" && dom.panelBottom) {
    const collapsed = dom.panelBottom.classList.toggle("collapsed");
    dom.btnRestoreBottom?.classList.toggle("hidden", !collapsed);
    dom.btnCollapseBottom?.setAttribute("aria-expanded", String(!collapsed));
    dom.btnQuickUpload?.classList.toggle("active", !collapsed);
    dom.btnQuickUpload?.setAttribute("aria-pressed", String(!collapsed));
  }
}

function syncPanelCollapsedState() {
  dom.btnQuickUpload?.classList.toggle("active", !dom.panelBottom?.classList.contains("collapsed"));
  dom.btnQuickUpload?.setAttribute(
    "aria-pressed",
    String(!dom.panelBottom?.classList.contains("collapsed"))
  );
}

function updateModeIndicator() {
  const indicator = dom.modeSelector?.querySelector(".seg-indicator");
  const activeBtn = dom.modeSelector?.querySelector(".seg-btn.active");
  if (!indicator || !activeBtn) return;
  indicator.style.left = `${activeBtn.offsetLeft}px`;
  indicator.style.width = `${activeBtn.offsetWidth}px`;
}

function applyModeSelection(mode) {
  const wasBlink = state.uiMode === "blink";
  state.uiMode = mode;

  if (wasBlink && mode !== "blink") {
    stopAutoBlink();
    if (mode === "fade") {
      modesCtrl.setOpacity(state.opacityBeforeBlink);
      updateOpacityUI(state.opacityBeforeBlink);
    }
  }

  const engineMode = mode === "blink" ? "fade" : mode;
  modesCtrl.setMode(engineMode);

  dom.modeSelector?.querySelectorAll(".seg-btn[data-mode]").forEach((btn) => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });

  requestAnimationFrame(updateModeIndicator);

  dom.groupSliderControls?.classList.toggle("hidden", mode !== "slider");
  dom.groupBlinkControls?.classList.toggle("hidden", mode !== "blink");

  // Contextual mode parameters in right inspector
  dom.accBlendPanel?.classList.toggle("hidden", mode !== "fade");
  dom.accBlinkPanel?.classList.toggle("hidden", mode !== "blink");
  dom.accDiffPanel?.classList.toggle("hidden", mode !== "diff");
  dom.modeHintSlider?.classList.toggle("hidden", mode !== "slider");
  dom.modeHintSplit?.classList.toggle("hidden", mode !== "split");

  updateModeBottomStripVisibility();

  if (dom.modeParamsHeading) {
    const headingKey =
      mode === "fade"
        ? "accBlendTitle"
        : mode === "blink"
          ? "accBlinkTitle"
          : mode === "diff"
            ? "accDiffTitle"
            : mode === "split"
              ? "modeSplit"
              : "modeSlider";
    dom.modeParamsHeading.setAttribute("data-i18n", headingKey);
    dom.modeParamsHeading.textContent = i18n.t(headingKey);
  }

  if (mode === "blink" && !wasBlink) {
    state.opacityBeforeBlink = modesCtrl.opacity;
    if (state.imgA || state.imgB) {
      startAutoBlink();
    }
  }

  if (state.pointModeCount > 0) {
    updatePointPins();
  }
}

function setCurtainOrientation(orientation) {
  modesCtrl.setSliderOrientation(orientation);
  const isVert = orientation === "vertical";
  dom.btnSliderVertical?.classList.toggle("active", isVert);
  dom.btnSliderVertical?.setAttribute("aria-pressed", String(isVert));
  dom.btnSliderHorizontal?.classList.toggle("active", !isVert);
  dom.btnSliderHorizontal?.setAttribute("aria-pressed", String(!isVert));
}

/* ============================================================================
   Zoom Controls
   ============================================================================ */
function bindZoomControls() {
  dom.btnZoomIn?.addEventListener("click", () => stepZoom(1.2));
  dom.btnZoomOut?.addEventListener("click", () => stepZoom(1 / 1.2));

  dom.zoomRange?.addEventListener("input", () => {
    const pct = Number(dom.zoomRange.value);
    const rect = dom.viewerContainer.getBoundingClientRect();
    viewer.setZoom(pct / 100, rect.left + rect.width / 2, rect.top + rect.height / 2, rect, "both");
  });

  dom.btnZoomFit?.addEventListener("click", fitImagesToViewport);
  dom.btnZoom11?.addEventListener("click", setActualSizeZoom);
  dom.btnQuickFit?.addEventListener("click", fitImagesToViewport);
  dom.btnQuickActual?.addEventListener("click", setActualSizeZoom);

  dom.zoomPopover?.querySelectorAll(".zoom-preset-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      const z = btn.dataset.zoom;
      if (z === "fit") {
        fitImagesToViewport();
      } else {
        const target = Number(z);
        const rect = dom.viewerContainer.getBoundingClientRect();
        viewer.setZoom(target, rect.left + rect.width / 2, rect.top + rect.height / 2, rect, "both");
      }
      dom.zoomPopover.hidePopover?.();
    });
  });
}

function stepZoom(multiplier) {
  const rect = dom.viewerContainer.getBoundingClientRect();
  viewer.setZoom(
    viewer.scale * multiplier,
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
    rect,
    "both"
  );
}

function fitImagesToViewport() {
  if (!state.imgA && !state.imgB) return;
  const w = dom.viewerContainer.clientWidth || 800;
  const h = dom.viewerContainer.clientHeight || 600;
  viewer.centerBoth(w, h, modesCtrl.currentMode);
  modesCtrl.render();
  updateZoomDisplay();
}

function setActualSizeZoom() {
  if (!state.imgA && !state.imgB) return;
  const rect = dom.viewerContainer.getBoundingClientRect();
  viewer.setZoom(1.0, rect.left + rect.width / 2, rect.top + rect.height / 2, rect, "both");
}

function updateZoomDisplay() {
  const pct = Math.round(viewer.scale * 100);
  if (dom.zoomVal) dom.zoomVal.textContent = `${pct}%`;
  if (dom.zoomRange) {
    dom.zoomRange.value = String(Math.max(10, Math.min(1000, pct)));
    syncRangeVars(dom.zoomRange);
  }
}

/* ============================================================================
   Left Alignment Dock
   ============================================================================ */
function bindLeftDock() {
  dom.btnAutoEdge?.addEventListener("click", runAutoEdgeAlignment);
  dom.btnAutoOpencv?.addEventListener("click", runOpenCVAlignment);
  dom.btnMatchSizes?.addEventListener("click", () => {
    if (!ensureBothImages()) return;
    viewer.clearTransformMatrix();
    viewer.matchImageSizes();
    updateScaleUI();
    scheduleMetricsRecalc();
  });
  dom.btnCenter?.addEventListener("click", () => {
    if (!state.imgA && !state.imgB) return;
    viewer.clearTransformMatrix();
    viewer.offsetX = 0;
    viewer.offsetY = 0;
    fitImagesToViewport();
    scheduleMetricsRecalc();
  });

  // 3-way manual layer shift
  dom.btnTargetNone?.addEventListener("click", () => setLayerTarget("none"));
  dom.btnSidebarAlignA?.addEventListener("click", () => setLayerTarget("A"));
  dom.btnSidebarAlignB?.addEventListener("click", () => setLayerTarget("B"));

  // D-pad nudging (automatically switches to moving B if currently 'none')
  const doNudge = (dx, dy, e) => {
    if (!state.imgA && !state.imgB) return;
    const base = Number(settings.get("nudgeStep")) || 1;
    const mult = e?.shiftKey ? 10 : base;
    if (viewer.alignTarget === "none") {
      setLayerTarget("B");
    }
    if (viewer.alignTarget === "A") {
      viewer.nudgeA(dx * mult, dy * mult);
    } else {
      viewer.nudgeB(dx * mult, dy * mult);
    }
    scheduleMetricsRecalc();
  };

  dom.btnNudgeUp?.addEventListener("click", (e) => doNudge(0, -1, e));
  dom.btnNudgeDown?.addEventListener("click", (e) => doNudge(0, 1, e));
  dom.btnNudgeLeft?.addEventListener("click", (e) => doNudge(-1, 0, e));
  dom.btnNudgeRight?.addEventListener("click", (e) => doNudge(1, 0, e));

  // Point registration modes
  dom.btn1pointAlign?.addEventListener("click", () => togglePointAlignMode(1));
  dom.btn2pointAlign?.addEventListener("click", () => togglePointAlignMode(2));
  dom.btn3pointAlign?.addEventListener("click", () => togglePointAlignMode(3));
  dom.btn4pointAlign?.addEventListener("click", () => togglePointAlignMode(4));

  dom.btnUndoPoint?.addEventListener("click", undoLastPoint);
  dom.btnCancel2point?.addEventListener("click", cancelPointAlignMode);

  // Scale A & B calibration
  dom.scaleARange?.addEventListener("input", () => {
    const ratio = Number(dom.scaleARange.value) / 100;
    viewer.setScaleRatioA(ratio);
    if (dom.scaleAInput) dom.scaleAInput.value = ratio.toFixed(2);
    scheduleMetricsRecalc();
  });

  dom.scaleAInput?.addEventListener("change", () => {
    const ratio = Math.max(0.1, Math.min(5, Number(dom.scaleAInput.value) || 1));
    viewer.setScaleRatioA(ratio);
    updateScaleUI();
    scheduleMetricsRecalc();
  });

  dom.btnResetScaleA?.addEventListener("click", () => {
    viewer.setScaleRatioA(1.0);
    updateScaleUI();
    scheduleMetricsRecalc();
  });

  dom.scaleBRange?.addEventListener("input", () => {
    const ratio = Number(dom.scaleBRange.value) / 100;
    viewer.setScaleRatioB(ratio);
    if (dom.scaleBInput) dom.scaleBInput.value = ratio.toFixed(2);
    scheduleMetricsRecalc();
  });

  dom.scaleBInput?.addEventListener("change", () => {
    const ratio = Math.max(0.1, Math.min(5, Number(dom.scaleBInput.value) || 1));
    viewer.setScaleRatioB(ratio);
    updateScaleUI();
    scheduleMetricsRecalc();
  });

  dom.btnResetScaleB?.addEventListener("click", () => {
    viewer.setScaleRatioB(1.0);
    updateScaleUI();
    scheduleMetricsRecalc();
  });

  dom.btnResetAll?.addEventListener("click", () => {
    cancelPointAlignMode();
    setLayerTarget("none");
    const w = dom.viewerContainer.clientWidth || 800;
    const h = dom.viewerContainer.clientHeight || 600;
    viewer.resetAll(w, h, modesCtrl.currentMode);
    updateScaleUI();
    scheduleMetricsRecalc();
    showToast(i18n.t("transformsReset"), { duration: 1800 });
  });
}

function setLayerTarget(target) {
  viewer.setAlignTarget(target);
  const buttons = [
    [dom.btnTargetNone, target === "none"],
    [dom.btnSidebarAlignA, target === "A"],
    [dom.btnSidebarAlignB, target === "B"],
  ];
  for (const [btn, active] of buttons) {
    if (!btn) continue;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  }
}

function updateOffsetReadout() {
  if (!dom.offsetValX || !dom.offsetValY) return;
  let ox = viewer.offsetX;
  let oy = viewer.offsetY;
  if (viewer.transformMatrixB?.length === 6) {
    ox = viewer.transformMatrixB[4];
    oy = viewer.transformMatrixB[5];
  } else if (viewer.transformMatrixB?.length === 16) {
    const w = viewer.transformMatrixB[15] || 1;
    ox = viewer.transformMatrixB[12] / w;
    oy = viewer.transformMatrixB[13] / w;
  }
  dom.offsetValX.textContent = `${Math.round(ox)} px`;
  dom.offsetValY.textContent = `${Math.round(oy)} px`;
}

function updateScaleUI() {
  const sA = viewer.scaleRatioA || 1;
  const sB = viewer.scaleRatioB || 1;
  if (dom.scaleAInput) dom.scaleAInput.value = sA.toFixed(2);
  if (dom.scaleARange) {
    dom.scaleARange.value = String(Math.round(Math.max(25, Math.min(300, sA * 100))));
    syncRangeVars(dom.scaleARange);
  }
  if (dom.scaleBInput) dom.scaleBInput.value = sB.toFixed(2);
  if (dom.scaleBRange) {
    dom.scaleBRange.value = String(Math.round(Math.max(25, Math.min(300, sB * 100))));
    syncRangeVars(dom.scaleBRange);
  }
}

async function runAutoEdgeAlignment() {
  if (!ensureBothImages()) return;
  const toastId = showToast(i18n.t("autoEdgeRunning"), { spinner: true, duration: 0, id: "auto-edge" });
  dom.btnAutoEdge?.classList.add("is-loading");
  if (dom.btnAutoEdge) dom.btnAutoEdge.disabled = true;

  try {
    // Yield briefly so spinner paints before Sobel/ZNCC calculation
    await new Promise((r) => setTimeout(r, 25));

    viewer.clearTransformMatrix();
    const res = computeAutoEdgeAlignment(state.imgA, state.imgB);
    dismissToast(toastId);

    if (res) {
      viewer.scaleRatioB = res.scaleRatioB;
      viewer.offsetX = res.offsetX;
      viewer.offsetY = res.offsetY;
      viewer.onStateChange();
      updateScaleUI();
      scheduleMetricsRecalc();
      const score = Math.max(0, Math.min(100, Math.round(res.confidence || 0)));
      showToast(i18n.t("autoEdgeSuccess", { score }), { duration: 3000, type: "success" });
    } else {
      showToast(i18n.t("autoEdgeFail"), { duration: 2800, type: "warning" });
    }
  } finally {
    dom.btnAutoEdge?.classList.remove("is-loading");
    if (dom.btnAutoEdge) dom.btnAutoEdge.disabled = false;
  }
}

async function runOpenCVAlignment() {
  if (!ensureBothImages()) return;
  const msgs = {
    loading: i18n.t("opencvLoading"),
    compiling: i18n.t("opencvCompiling"),
    preparing: i18n.t("opencvPreparing"),
    keypoints: i18n.t("opencvKeypoints"),
    matching: i18n.t("opencvMatching"),
    ransac: i18n.t("opencvRansac"),
  };

  const onStatus = (msg) => {
    showToast(msg, { spinner: true, duration: 0, id: "opencv-status" });
  };

  dom.btnAutoOpencv?.classList.add("is-loading");
  if (dom.btnAutoOpencv) dom.btnAutoOpencv.disabled = true;

  try {
    await loadOpenCV(onStatus, msgs);
    const matrix = await computeOpenCVAlignment(state.imgA, state.imgB, onStatus, msgs);
    dismissToast("opencv-status");

    viewer.offsetX = 0;
    viewer.offsetY = 0;
    viewer.scaleRatioB = 1.0;
    viewer.transformMatrixB = matrix;
    viewer.onStateChange();
    updateScaleUI();
    scheduleMetricsRecalc();
    showToast(i18n.t("opencvSuccess"), { duration: 3000, type: "success" });
  } catch (err) {
    dismissToast("opencv-status");
    const errText = err?.message || String(err);
    showToast(i18n.t("opencvError", { err: errText }), { duration: 4000, type: "danger" });
  } finally {
    dom.btnAutoOpencv?.classList.remove("is-loading");
    if (dom.btnAutoOpencv) dom.btnAutoOpencv.disabled = false;
  }
}

/* ============================================================================
   Point Registration Workflow (1 / 2 / 3 / 4 Points)
   ============================================================================ */
function togglePointAlignMode(count) {
  if (!ensureBothImages()) return;
  if (state.pointModeCount === count) {
    cancelPointAlignMode();
    return;
  }
  state.pointModeCount = count;
  state.pointsA = [];
  state.pointsB = [];
  setLayerTarget("none");
  updatePointButtonsUI();
  updatePointBanner();
  updatePointPins();
  dom.workspace?.style.setProperty("cursor", "crosshair");
}

function cancelPointAlignMode() {
  state.pointModeCount = 0;
  state.pointsA = [];
  state.pointsB = [];
  updatePointButtonsUI();
  dom.pointAlignBanner?.classList.add("hidden");
  clearPointPins();
  dom.workspace?.style.removeProperty("cursor");
}

function undoLastPoint() {
  if (state.pointModeCount === 0) return;
  if (state.pointsB.length > 0) {
    state.pointsB.pop();
  } else if (state.pointsA.length > 0) {
    state.pointsA.pop();
  }
  updatePointBanner();
  updatePointPins();
}

function updatePointButtonsUI() {
  const map = [
    [dom.btn1pointAlign, 1],
    [dom.btn2pointAlign, 2],
    [dom.btn3pointAlign, 3],
    [dom.btn4pointAlign, 4],
  ];
  for (const [btn, n] of map) {
    if (!btn) continue;
    btn.setAttribute("aria-pressed", String(state.pointModeCount === n));
  }
}

function updatePointBanner() {
  if (!dom.pointAlignBanner || !dom.pointAlignInstruction) return;
  const n = state.pointModeCount;
  if (n === 0) {
    dom.pointAlignBanner.classList.add("hidden");
    return;
  }

  dom.pointAlignBanner.classList.remove("hidden");
  const pickingB = state.pointsA.length >= n;
  const slot = pickingB ? "B" : "A";
  const curr = pickingB ? state.pointsB.length + 1 : state.pointsA.length + 1;
  dom.pointAlignInstruction.textContent = i18n.t("pointBannerStep", { curr, total: n, slot });

  if (dom.pointProgressDots) {
    const totalDots = n * 2;
    const filledDots = state.pointsA.length + state.pointsB.length;
    dom.pointProgressDots.innerHTML = "";
    for (let i = 0; i < totalDots; i++) {
      const dot = document.createElement("span");
      const isB = i >= n;
      dot.className = `progress-dot ${isB ? "dot-b" : "dot-a"}`;
      if (i < filledDots) dot.classList.add("filled");
      else if (i === filledDots) dot.classList.add("current");
      dom.pointProgressDots.appendChild(dot);
    }
  }
}

function handlePointPickClick(e) {
  const n = state.pointModeCount;
  if (n === 0) return;

  const isSplit = modesCtrl.currentMode === "split";
  const pickingB = state.pointsA.length >= n;

  let vpX, vpY;
  let isSplitPaneB = false;

  if (isSplit) {
    const targetPaneEl = pickingB
      ? document.getElementById("split-pane-b")
      : document.getElementById("split-pane-a");
    if (!targetPaneEl) return;
    const rect = targetPaneEl.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }
    vpX = e.clientX - rect.left;
    vpY = e.clientY - rect.top;
    isSplitPaneB = pickingB;
  } else {
    const rect = dom.viewerContainer.getBoundingClientRect();
    vpX = e.clientX - rect.left;
    vpY = e.clientY - rect.top;
  }

  if (!pickingB) {
    state.pointsA.push(viewer.mapViewportToImageA(vpX, vpY));
  } else {
    state.pointsB.push(viewer.mapViewportToImageB(vpX, vpY, isSplitPaneB));
  }

  updatePointBanner();
  updatePointPins();

  if (state.pointsA.length === n && state.pointsB.length === n) {
    if (n === 1) {
      viewer.alignByOnePoint(state.pointsA[0], state.pointsB[0]);
    } else if (n === 2) {
      viewer.alignByTwoPoints(
        state.pointsA[0],
        state.pointsA[1],
        state.pointsB[0],
        state.pointsB[1]
      );
      updateScaleUI();
    } else if (n === 3) {
      viewer.alignByThreePoints(state.pointsA, state.pointsB);
    } else if (n === 4) {
      viewer.alignByFourPoints(state.pointsA, state.pointsB);
    }
    cancelPointAlignMode();
    scheduleMetricsRecalc();
  }
}

function clearPointPins() {
  dom.workspace?.querySelectorAll(".point-pin-badge").forEach((el) => el.remove());
}

function updatePointPins() {
  clearPointPins();
  if (state.pointModeCount === 0 || !dom.workspace) return;

  const isSplit = modesCtrl.currentMode === "split";
  const wsRect = dom.workspace.getBoundingClientRect();

  const placePin = (pt, label, targetPaneEl, useTransformB = false, isSplitPaneB = false) => {
    let localX, localY;
    if (!useTransformB) {
      const tr = viewer.getTransformA();
      localX = tr.x + pt.x * tr.scale;
      localY = tr.y + pt.y * tr.scale;
    } else {
      const tr = isSplitPaneB ? viewer.getSplitTransformB() : viewer.getTransformB();
      localX = tr.x + pt.x * tr.scale;
      localY = tr.y + pt.y * tr.scale;
    }

    const baseRect = targetPaneEl ? targetPaneEl.getBoundingClientRect() : dom.viewerContainer.getBoundingClientRect();
    const x = baseRect.left - wsRect.left + localX;
    const y = baseRect.top - wsRect.top + localY;

    const pin = document.createElement("div");
    pin.className = "point-pin-badge";
    pin.textContent = label;
    pin.style.left = `${x}px`;
    pin.style.top = `${y}px`;
    dom.workspace.appendChild(pin);
  };

  const paneA = isSplit ? document.getElementById("split-pane-a") : null;
  const paneB = isSplit ? document.getElementById("split-pane-b") : null;

  state.pointsA.forEach((pt, idx) => placePin(pt, `A${idx + 1}`, paneA, false, false));
  state.pointsB.forEach((pt, idx) => placePin(pt, `B${idx + 1}`, paneB, true, isSplit));
}

/* ============================================================================
   Workspace Interactions: Pan, Wheel Zoom, Pixel Probe, D&D, Paste, Demo
   ============================================================================ */
function bindWorkspaceInteractions() {
  const vc = dom.viewerContainer;

  // Pointer Pan + Point Click
  let downX = 0;
  let downY = 0;
  let moved = false;

  vc?.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("#curtain-handle")) return;
    downX = e.clientX;
    downY = e.clientY;
    moved = false;

    if (!state.imgA && !state.imgB) return;

    state.isPanning = true;
    state.panLastX = e.clientX;
    state.panLastY = e.clientY;
    state.panPane =
      modesCtrl.currentMode === "split" && e.target.closest("#split-pane-b")
        ? "B"
        : "both";
    dom.workspace?.classList.add("panning");
    try {
      vc.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events
    }
  });

  vc?.addEventListener("pointermove", (e) => {
    if (state.isPanning) {
      const dx = e.clientX - state.panLastX;
      const dy = e.clientY - state.panLastY;
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 4) {
        moved = true;
      }
      state.panLastX = e.clientX;
      state.panLastY = e.clientY;
      viewer.pan(dx, dy, state.panPane);
    }

    if (settings.get("pixelProbe") && state.imgA && state.imgB) {
      state.lastProbeEvent = e;
      if (!state.probeRafId) {
        state.probeRafId = requestAnimationFrame(() => {
          state.probeRafId = null;
          if (state.lastProbeEvent) updatePixelProbeAt(state.lastProbeEvent);
        });
      }
    }
  });

  const endPan = (e) => {
    if (!state.isPanning) return;
    state.isPanning = false;
    dom.workspace?.classList.remove("panning");
    try {
      vc.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
    if (!moved && state.pointModeCount > 0) {
      handlePointPickClick(e);
    } else if (moved && viewer.alignTarget !== "none") {
      scheduleMetricsRecalc();
    }
  };

  vc?.addEventListener("pointerup", endPan);
  vc?.addEventListener("pointercancel", endPan);
  vc?.addEventListener("pointerleave", () => {
    if (!state.isPanning) dom.pixelProbeHud?.classList.add("hidden");
  });

  // Wheel Zoom toward pointer
  vc?.addEventListener(
    "wheel",
    (e) => {
      if (!state.imgA && !state.imgB) return;
      e.preventDefault();
      const speed = Number(settings.get("wheelZoomSpeed")) || 0.15;
      const factor = e.deltaY < 0 ? 1 + speed : 1 / (1 + speed);

      if (modesCtrl.currentMode === "split" && !viewer.syncEnabled) {
        const paneB = e.target.closest("#split-pane-b");
        if (paneB) {
          viewer.setZoom(
            viewer.splitScaleB * factor,
            e.clientX,
            e.clientY,
            paneB.getBoundingClientRect(),
            "B"
          );
          return;
        }
        const paneA = e.target.closest("#split-pane-a");
        if (paneA) {
          viewer.setZoom(
            viewer.scale * factor,
            e.clientX,
            e.clientY,
            paneA.getBoundingClientRect(),
            "both"
          );
          return;
        }
      }

      const targetRect =
        modesCtrl.currentMode === "split"
          ? (e.target.closest(".split-pane") || vc).getBoundingClientRect()
          : vc.getBoundingClientRect();

      viewer.setZoom(viewer.scale * factor, e.clientX, e.clientY, targetRect, "both");
    },
    { passive: false }
  );

  // Empty state & contextual missing-slot actions
  dom.emptyPickA?.addEventListener("click", () => dom.fileInputA?.click());
  dom.emptyPickB?.addEventListener("click", () => dom.fileInputB?.click());
  dom.btnLoadDemo?.addEventListener("click", loadDemoPair);
  dom.btnPickMissingSlot?.addEventListener("click", () => {
    const slot = dom.missingSlotPrompt?.dataset.slot === "A" ? "A" : "B";
    if (slot === "A") dom.fileInputA?.click();
    else dom.fileInputB?.click();
  });

  // Global drag and drop onto window with split A/B overlay
  let globalDragDepth = 0;
  const dropOverlay = dom.globalDropOverlay;
  const halfA = dropOverlay?.querySelector('[data-drop-slot="A"]');
  const halfB = dropOverlay?.querySelector('[data-drop-slot="B"]');

  const hasDraggedFiles = (e) =>
    Array.from(e.dataTransfer?.types || []).includes("Files");

  const hideGlobalDrop = () => {
    globalDragDepth = 0;
    dropOverlay?.classList.add("hidden");
    halfA?.classList.remove("active");
    halfB?.classList.remove("active");
    dom.workspace?.classList.remove("drag-active");
  };

  window.addEventListener("dragenter", (e) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    globalDragDepth += 1;
    dropOverlay?.classList.remove("hidden");
    dom.workspace?.classList.add("drag-active");
  });

  window.addEventListener("dragover", (e) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    const isLeft = e.clientX < window.innerWidth / 2;
    halfA?.classList.toggle("active", isLeft);
    halfB?.classList.toggle("active", !isLeft);
  });

  window.addEventListener("dragleave", (e) => {
    if (!hasDraggedFiles(e)) return;
    globalDragDepth = Math.max(0, globalDragDepth - 1);
    if (globalDragDepth === 0) hideGlobalDrop();
  });

  window.addEventListener("drop", async (e) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    const dropSlot = e.clientX < window.innerWidth / 2 ? "A" : "B";
    hideGlobalDrop();
    if (e.target.closest("#dropzone-a, #dropzone-b")) return;

    const files = [...(e.dataTransfer?.files || [])].filter(isSupportedImageFile);
    if (files.length === 0) {
      if (e.dataTransfer?.files?.length) showToast(i18n.t("invalidFile"), { type: "warning" });
      return;
    }
    if (files.length >= 2) {
      await Promise.all([loadImageFile("A", files[0]), loadImageFile("B", files[1])]);
    } else {
      await loadImageFile(dropSlot, files[0]);
    }
  });

  // Clipboard paste (Ctrl+V)
  window.addEventListener("paste", async (e) => {
    if (document.querySelector("dialog[open]")) return;
    const items = [...(e.clipboardData?.items || [])];
    const imageFiles = items
      .filter((it) => it.kind === "file" && it.type.startsWith("image/"))
      .map((it) => it.getAsFile())
      .filter(Boolean);

    if (imageFiles.length === 0) return;
    e.preventDefault();

    if (imageFiles.length >= 2) {
      await Promise.all([
        loadImageFile("A", imageFiles[0], i18n.t("sourceClipboard")),
        loadImageFile("B", imageFiles[1], i18n.t("sourceClipboard")),
      ]);
      showToast(i18n.t("pasteLoadedBoth"), { type: "success" });
    } else {
      const slot = !state.imgA ? "A" : "B";
      await loadImageFile(slot, imageFiles[0], i18n.t("sourceClipboard"));
      showToast(i18n.t(slot === "A" ? "pasteLoadedA" : "pasteLoadedB"), { type: "success" });
    }
  });

  // Floating Quick Bar controls
  dom.btnCollapseQuick?.addEventListener("click", () => toggleQuickBar(true));
  dom.btnRestoreQuick?.addEventListener("click", () => toggleQuickBar(false));
  dom.btnSwap?.addEventListener("click", swapImagesAndState);
  dom.btnQuickSyncZoom?.addEventListener("click", () => {
    viewer.setSyncEnabled(!viewer.syncEnabled);
    updateSyncToggleUI();
  });
  dom.btnSidebarFilenames?.addEventListener("click", () => {
    state.showFilenames = !state.showFilenames;
    settings.set("showFilenameBadges", state.showFilenames);
    updateFilenamesToggleUI();
    syncSettingsUI();
  });
  dom.btnToggleProbe?.addEventListener("click", () => {
    settings.set("pixelProbe", !settings.get("pixelProbe"));
    updateProbeVisibility();
    syncSettingsUI();
  });
}

function toggleQuickBar(collapse) {
  state.quickBarCollapsed = collapse;
  dom.quickActionsBar?.classList.toggle("collapsed", collapse);
  dom.btnRestoreQuick?.classList.toggle("hidden", !collapse);
}

function updateSyncToggleUI() {
  if (!dom.btnQuickSyncZoom) return;
  dom.btnQuickSyncZoom.classList.toggle("active", viewer.syncEnabled);
  dom.btnQuickSyncZoom.setAttribute("aria-pressed", String(viewer.syncEnabled));
}

function updateFilenamesToggleUI() {
  if (dom.btnSidebarFilenames) {
    dom.btnSidebarFilenames.classList.toggle("active", state.showFilenames);
    dom.btnSidebarFilenames.setAttribute("aria-pressed", String(state.showFilenames));
  }
  const showA = Boolean(state.showFilenames && state.imgA);
  const showB = Boolean(state.showFilenames && state.imgB);
  dom.filenameBadgeA?.classList.toggle("hidden", !showA);
  dom.filenameBadgeB?.classList.toggle("hidden", !showB);
}

function updateProbeVisibility() {
  const enabled = Boolean(settings.get("pixelProbe"));
  if (dom.btnToggleProbe) {
    dom.btnToggleProbe.classList.toggle("active", enabled);
    dom.btnToggleProbe.setAttribute("aria-pressed", String(enabled));
  }
  if (!enabled) {
    dom.pixelProbeHud?.classList.add("hidden");
  }
}

function updatePixelProbeAt(e) {
  if (!dom.pixelProbeHud || !state.imgA || !state.imgB) return;

  const isSplit = modesCtrl.currentMode === "split";
  let coordA, coordB;

  if (isSplit) {
    const paneB = document.getElementById("split-pane-b");
    const paneA = document.getElementById("split-pane-a");
    if (!paneA || !paneB) return;

    const rB = paneB.getBoundingClientRect();
    const inPaneB =
      e.clientX >= rB.left &&
      e.clientX <= rB.right &&
      e.clientY >= rB.top &&
      e.clientY <= rB.bottom;

    if (inPaneB) {
      coordB = viewer.mapViewportToImageB(e.clientX - rB.left, e.clientY - rB.top, true);
      coordA = coordB;
    } else {
      const rA = paneA.getBoundingClientRect();
      coordA = viewer.mapViewportToImageA(e.clientX - rA.left, e.clientY - rA.top);
      coordB = viewer.mapViewportToImageB(e.clientX - rA.left, e.clientY - rA.top, false);
    }
  } else {
    const rect = dom.viewerContainer.getBoundingClientRect();
    const vpX = e.clientX - rect.left;
    const vpY = e.clientY - rect.top;
    coordA = viewer.mapViewportToImageA(vpX, vpY);
    coordB = viewer.mapViewportToImageB(vpX, vpY, false);
  }

  const pA = sampleCachedPixel("A", coordA.x, coordA.y);
  const pB = sampleCachedPixel("B", coordB.x, coordB.y);

  if (!pA && !pB) {
    dom.pixelProbeHud.classList.add("hidden");
    return;
  }

  dom.pixelProbeHud.classList.remove("hidden");
  const ref = pA || pB;
  dom.probeCoords.textContent = `X: ${ref.x}  Y: ${ref.y}`;

  if (pA) {
    dom.probeSwatchA.style.backgroundColor = `rgb(${pA.r}, ${pA.g}, ${pA.b})`;
    dom.probeRgbA.textContent = `${pA.r}, ${pA.g}, ${pA.b}`;
  } else {
    dom.probeSwatchA.style.backgroundColor = "transparent";
    dom.probeRgbA.textContent = "—";
  }

  if (pB) {
    dom.probeSwatchB.style.backgroundColor = `rgb(${pB.r}, ${pB.g}, ${pB.b})`;
    dom.probeRgbB.textContent = `${pB.r}, ${pB.g}, ${pB.b}`;
  } else {
    dom.probeSwatchB.style.backgroundColor = "transparent";
    dom.probeRgbB.textContent = "—";
  }

  if (pA && pB) {
    const d = Math.round((Math.abs(pA.r - pB.r) + Math.abs(pA.g - pB.g) + Math.abs(pA.b - pB.b)) / 3);
    dom.probeDeltaVal.textContent = String(d);
  } else {
    dom.probeDeltaVal.textContent = "—";
  }
}

/* ============================================================================
   Right Studio Inspector: Metrics, Cards, Accordions, Blend, Diff, Metadata
   ============================================================================ */
function bindRightInspector() {
  dom.btnRecalcMetrics?.addEventListener("click", () => {
    if (!ensureBothImages()) return;
    updateComparisonMetrics(true);
  });

  dom.btnReplaceA?.addEventListener("click", () => dom.fileInputA?.click());
  dom.btnReplaceB?.addEventListener("click", () => dom.fileInputB?.click());

  // Accordion triggers
  document.querySelectorAll(".accordion-trigger").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const content = targetId ? document.getElementById(targetId) : null;
      if (!content) return;
      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      btn.classList.toggle("open", !isOpen);
      content.classList.toggle("hidden", isOpen);
    });
  });

  // Opacity slider + presets
  dom.opacityRange?.addEventListener("input", () => {
    const val = Number(dom.opacityRange.value) / 500;
    modesCtrl.setOpacity(val);
    updateOpacityUI(val);
    if (state.uiMode !== "fade") applyModeSelection("fade");
  });

  const fadePresets = [
    [dom.btnFade0, 0],
    [dom.btnFade25, 0.25],
    [dom.btnFade50, 0.5],
    [dom.btnFade75, 0.75],
    [dom.btnFade100, 1],
  ];
  for (const [btn, val] of fadePresets) {
    btn?.addEventListener("click", () => {
      modesCtrl.setOpacity(val);
      updateOpacityUI(val);
      if (state.uiMode !== "fade") applyModeSelection("fade");
    });
  }

  // Fast flash & auto-blink
  const triggerFastFlash = () => {
    if (!state.imgA && !state.imgB) return;
    if (state.uiMode !== "fade") applyModeSelection("fade");
    const nextOpacity = modesCtrl.opacity > 0.5 ? 0 : 1;
    modesCtrl.setOpacity(nextOpacity);
    updateOpacityUI(nextOpacity);
  };

  dom.btnFadeFlash?.addEventListener("click", triggerFastFlash);
  dom.btnStripFlash?.addEventListener("click", triggerFastFlash);

  // Bottom Mode Strip sync controls
  dom.stripOpacityRange?.addEventListener("input", () => {
    const val = Number(dom.stripOpacityRange.value) / 500;
    modesCtrl.setOpacity(val);
    updateOpacityUI(val);
    if (state.uiMode !== "fade") applyModeSelection("fade");
  });

  document.querySelectorAll("[data-strip-fade]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = Number(btn.dataset.stripFade);
      modesCtrl.setOpacity(val);
      updateOpacityUI(val);
      if (state.uiMode !== "fade") applyModeSelection("fade");
    });
  });

  dom.btnStripBlinkToggle?.addEventListener("click", toggleAutoBlink);

  dom.stripBlinkRange?.addEventListener("input", () => {
    setBlinkIntervalMs(Number(dom.stripBlinkRange.value));
  });

  dom.btnAutoBlink?.addEventListener("click", toggleAutoBlink);

  dom.blinkSpeedRange?.addEventListener("input", () => {
    const ms = Number(dom.blinkSpeedRange.value);
    setBlinkIntervalMs(ms);
  });

  dom.blinkSpeedInput?.addEventListener("change", () => {
    const sec = Math.max(0.1, Math.min(5.0, Number(dom.blinkSpeedInput.value) || 1.0));
    setBlinkIntervalMs(Math.round(sec * 1000));
  });

  // Diff style, gain & color channel isolation
  dom.diffStyleSelector?.querySelectorAll(".seg-btn[data-diff-style]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const style = btn.dataset.diffStyle;
      modesCtrl.setDiffConfig({ style });
      settings.set("defaultDiffMode", style);
      updateDiffUI();
      if (modesCtrl.currentMode !== "diff") applyModeSelection("diff");
    });
  });

  dom.diffGainRange?.addEventListener("input", () => {
    const gain = Number(dom.diffGainRange.value);
    modesCtrl.setDiffConfig({ gain });
    settings.set("diffGain", gain);
    updateDiffUI();
    if (modesCtrl.currentMode !== "diff") applyModeSelection("diff");
  });

  dom.channelSelector?.querySelectorAll(".seg-btn[data-channel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      modesCtrl.setChannelFilter(btn.dataset.channel);
      updateDiffUI();
    });
  });
}

function updateOpacityUI(opacity) {
  const pct = (opacity * 100).toFixed(1);
  if (dom.opacityVal) dom.opacityVal.textContent = `${pct}%`;
  if (dom.stripOpacityVal) dom.stripOpacityVal.textContent = `${pct}%`;
  if (dom.opacityRange) {
    dom.opacityRange.value = String(Math.round(opacity * 500));
    syncRangeVars(dom.opacityRange);
  }
  if (dom.stripOpacityRange) {
    dom.stripOpacityRange.value = String(Math.round(opacity * 500));
    syncRangeVars(dom.stripOpacityRange);
  }
  const presets = [
    [dom.btnFade0, 0],
    [dom.btnFade25, 0.25],
    [dom.btnFade50, 0.5],
    [dom.btnFade75, 0.75],
    [dom.btnFade100, 1],
  ];
  for (const [btn, val] of presets) {
    btn?.classList.toggle("active", Math.abs(opacity - val) < 0.015);
  }
  document.querySelectorAll("[data-strip-fade]").forEach((btn) => {
    const val = Number(btn.dataset.stripFade);
    btn.classList.toggle("active", Math.abs(opacity - val) < 0.015);
  });

  const isA = opacity > 0.5;
  if (dom.blinkFramePill) {
    dom.blinkFramePill.textContent = isA ? "A" : "B";
    dom.blinkFramePill.dataset.frame = isA ? "A" : "B";
  }
  if (dom.stripBlinkFrame) {
    dom.stripBlinkFrame.textContent = isA ? "A" : "B";
    dom.stripBlinkFrame.dataset.frame = isA ? "A" : "B";
  }
}

function updateBlinkButtonsUI() {
  const active = state.isBlinking;
  dom.btnAutoBlink?.classList.toggle("active", active);
  dom.btnAutoBlink?.setAttribute("aria-pressed", String(active));
  const labelEl = dom.btnAutoBlink?.querySelector("span");
  if (labelEl && state.uiMode === "blink") {
    const key = active ? "blinkPause" : "blinkResume";
    labelEl.setAttribute("data-i18n", key);
    labelEl.textContent = i18n.t(key);
  }
  const pausePlayIcon = active
    ? '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect width="4" height="14" x="6" y="5" rx="1"/><rect width="4" height="14" x="14" y="5" rx="1"/></svg>'
    : '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>';
  if (dom.btnHeaderBlinkToggle) {
    dom.btnHeaderBlinkToggle.classList.toggle("active", active);
    dom.btnHeaderBlinkToggle.setAttribute("aria-pressed", String(active));
    dom.btnHeaderBlinkToggle.innerHTML = pausePlayIcon;
  }
  if (dom.btnStripBlinkToggle) {
    dom.btnStripBlinkToggle.classList.toggle("active", active);
    dom.btnStripBlinkToggle.setAttribute("aria-pressed", String(active));
    const key = active ? "blinkPause" : "blinkResume";
    dom.btnStripBlinkToggle.innerHTML = `${pausePlayIcon}<span data-i18n="${key}">${i18n.t(key)}</span>`;
  }
}

function startAutoBlink() {
  if (!state.imgA && !state.imgB) return;
  if (state.uiMode !== "blink") {
    applyModeSelection("blink");
    return;
  }
  state.isBlinking = true;
  if (modesCtrl.opacity > 0.05 && modesCtrl.opacity < 0.95) {
    modesCtrl.setOpacity(1);
    updateOpacityUI(1);
  }
  updateBlinkButtonsUI();
  runBlinkTimer();
}

function toggleAutoBlink() {
  if (!state.imgA && !state.imgB) return;
  if (state.isBlinking) {
    stopAutoBlink();
    return;
  }
  startAutoBlink();
}

function stopAutoBlink() {
  state.isBlinking = false;
  if (state.blinkIntervalId) {
    clearInterval(state.blinkIntervalId);
    state.blinkIntervalId = null;
  }
  updateBlinkButtonsUI();
}

function runBlinkTimer() {
  if (state.blinkIntervalId) clearInterval(state.blinkIntervalId);
  state.blinkIntervalId = setInterval(() => {
    const next = modesCtrl.opacity > 0.5 ? 0 : 1;
    modesCtrl.setOpacity(next);
    updateOpacityUI(next);
  }, state.blinkMs);
}

function setBlinkIntervalMs(ms) {
  state.blinkMs = Math.max(100, Math.min(5000, ms));
  if (dom.blinkSpeedRange) {
    dom.blinkSpeedRange.value = String(Math.min(3000, state.blinkMs));
    syncRangeVars(dom.blinkSpeedRange);
  }
  if (dom.stripBlinkRange) {
    dom.stripBlinkRange.value = String(Math.min(3000, state.blinkMs));
    syncRangeVars(dom.stripBlinkRange);
  }
  const secStr = (state.blinkMs / 1000).toFixed(1);
  if (dom.blinkSpeedInput) {
    dom.blinkSpeedInput.value = secStr;
  }
  if (dom.stripBlinkVal) {
    dom.stripBlinkVal.textContent = `${secStr}s`;
  }
  document.querySelectorAll(".blink-speed-preset[data-blink-ms]").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.blinkMs) === state.blinkMs);
  });
  if (state.isBlinking) runBlinkTimer();
}

function updateModeBottomStripVisibility() {
  const enabled = settings.get("showModeBottomStrip") !== false;
  const mode = state.uiMode;
  const showStrip = enabled && (mode === "fade" || mode === "blink");
  dom.modeBottomStrip?.classList.toggle("hidden", !showStrip);
  dom.stripFadeControls?.classList.toggle("hidden", mode !== "fade");
  dom.stripBlinkControls?.classList.toggle("hidden", mode !== "blink");
}

let bottomHudHideTimer = null;
let bottomHudInteracting = false;

function setBottomHudHidden(hidden) {
  dom.workspaceBottomHud?.classList.toggle("auto-hidden", hidden);
  dom.workspaceBottomHoverZone?.classList.toggle("hint-visible", hidden);
}

function resetBottomHudAutoHideTimer() {
  if (bottomHudHideTimer) {
    clearTimeout(bottomHudHideTimer);
    bottomHudHideTimer = null;
  }
  const enabled = settings.get("autoHideBottomHud") !== false;
  const hasImages = Boolean(state.imgA || state.imgB);
  if (!enabled || !hasImages) {
    setBottomHudHidden(false);
    return;
  }
  if (bottomHudInteracting || dom.zoomPopover?.matches(":popover-open")) {
    return;
  }
  bottomHudHideTimer = setTimeout(() => {
    if (!bottomHudInteracting && !dom.zoomPopover?.matches(":popover-open")) {
      setBottomHudHidden(true);
    }
  }, 3000);
}

function revealBottomHudAndScheduleHide() {
  setBottomHudHidden(false);
  resetBottomHudAutoHideTimer();
}

function initBottomHudAutoHide() {
  const hud = dom.workspaceBottomHud;
  const ws = dom.workspace;
  if (!hud || !ws) return;

  hud.addEventListener("pointerenter", () => {
    bottomHudInteracting = true;
    setBottomHudHidden(false);
    if (bottomHudHideTimer) clearTimeout(bottomHudHideTimer);
  });

  hud.addEventListener("pointerleave", () => {
    bottomHudInteracting = false;
    resetBottomHudAutoHideTimer();
  });

  hud.addEventListener("pointerdown", () => {
    bottomHudInteracting = true;
    setBottomHudHidden(false);
    if (bottomHudHideTimer) clearTimeout(bottomHudHideTimer);
  });

  window.addEventListener("pointerup", () => {
    if (bottomHudInteracting && !hud.matches(":hover")) {
      bottomHudInteracting = false;
      resetBottomHudAutoHideTimer();
    }
  });

  ws.addEventListener("pointermove", (e) => {
    if (settings.get("autoHideBottomHud") === false) return;
    if (!state.imgA && !state.imgB) return;
    const rect = ws.getBoundingClientRect();
    const distFromBottom = rect.bottom - e.clientY;
    if (distFromBottom >= 0 && distFromBottom <= 76) {
      revealBottomHudAndScheduleHide();
    }
  });

  ws.addEventListener("pointerleave", () => {
    bottomHudInteracting = false;
    resetBottomHudAutoHideTimer();
  });

  dom.zoomPopover?.addEventListener("toggle", () => {
    resetBottomHudAutoHideTimer();
  });

  resetBottomHudAutoHideTimer();
}

function updateDiffUI() {
  dom.diffStyleSelector?.querySelectorAll(".seg-btn[data-diff-style]").forEach((btn) => {
    const active = btn.dataset.diffStyle === modesCtrl.diffStyle;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  if (dom.diffGainVal) dom.diffGainVal.textContent = `${modesCtrl.diffGain}×`;
  if (dom.diffGainRange) {
    dom.diffGainRange.value = String(modesCtrl.diffGain);
    syncRangeVars(dom.diffGainRange);
  }

  dom.channelSelector?.querySelectorAll(".seg-btn[data-channel]").forEach((btn) => {
    const active = btn.dataset.channel === modesCtrl.channelFilter;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

function scheduleMetricsRecalc() {
  if (!state.imgA || !state.imgB) return;
  if (!settings.get("autoComputeMetrics")) return;
  if (state.metricsTimer) clearTimeout(state.metricsTimer);
  state.metricsTimer = setTimeout(() => {
    updateComparisonMetrics(false);
  }, 90);
}

function updateComparisonMetrics(showToastOnDone = false) {
  if (!state.imgA || !state.imgB) return;
  const metrics = computeComparisonMetrics(state.imgA, state.imgB, viewer);
  if (!metrics) return;

  if (dom.similarityScoreVal) {
    dom.similarityScoreVal.textContent = `${metrics.similarity}%`;
  }
  if (dom.similarityRingArc) {
    const dashOffset = SIMILARITY_CIRCUMFERENCE * (1 - metrics.similarity / 100);
    dom.similarityRingArc.style.strokeDashoffset = dashOffset.toFixed(2);
    const color =
      metrics.similarity >= 90
        ? "var(--success)"
        : metrics.similarity >= 70
          ? "var(--accent)"
          : metrics.similarity >= 45
            ? "var(--warning)"
            : "var(--danger)";
    dom.similarityRingArc.style.stroke = color;
  }

  if (dom.metricChangedVal) dom.metricChangedVal.textContent = `${metrics.changedPercent}%`;
  if (dom.metricMaxdeltaVal) dom.metricMaxdeltaVal.textContent = String(metrics.maxDelta);
  if (dom.metricMaeVal) dom.metricMaeVal.textContent = String(metrics.mae);

  if (showToastOnDone) {
    showToast(
      i18n.t("compareSummary", {
        sim: metrics.similarity,
        chg: metrics.changedPercent,
      })
    );
  }
  return metrics;
}

/* ============================================================================
   Bottom Upload Dock, Actions & Export
   ============================================================================ */
function bindBottomDock() {
  const bindDropTarget = (el, slot) => {
    if (!el) return;
    ["dragenter", "dragover"].forEach((evt) => {
      el.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      el.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        el.classList.remove("drag-over");
      });
    });
    el.addEventListener("drop", async (e) => {
      const files = [...(e.dataTransfer?.files || [])].filter(isSupportedImageFile);
      if (files.length === 0) {
        if (e.dataTransfer?.files?.length) showToast(i18n.t("invalidFile"));
        return;
      }
      if (files.length >= 2) {
        await Promise.all([loadImageFile("A", files[0]), loadImageFile("B", files[1])]);
      } else {
        await loadImageFile(slot, files[0]);
      }
    });
  };

  bindDropTarget(dom.dropzoneA, "A");
  bindDropTarget(dom.dropzoneB, "B");

  dom.fileInputA?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await loadImageFile("A", file);
    e.target.value = "";
  });

  dom.fileInputB?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) await loadImageFile("B", file);
    e.target.value = "";
  });

  dom.fileInputPair?.addEventListener("change", async (e) => {
    const files = [...(e.target.files || [])].filter(isSupportedImageFile);
    if (files.length >= 2) {
      await Promise.all([loadImageFile("A", files[0]), loadImageFile("B", files[1])]);
    } else if (files.length === 1) {
      const slot = !state.imgA ? "A" : "B";
      await loadImageFile(slot, files[0]);
    } else if (e.target.files?.length) {
      showToast(i18n.t("invalidFile"));
    }
    e.target.value = "";
  });

  dom.btnSwapBottom?.addEventListener("click", () => {
    dom.btnSwapBottom.classList.remove("is-swapping");
    void dom.btnSwapBottom.offsetWidth;
    dom.btnSwapBottom.classList.add("is-swapping");
    swapImagesAndState();
  });

  dom.btnHeaderExport?.addEventListener("click", () => {
    lastPopoverTrigger = dom.btnHeaderExport;
  });
  dom.btnExportAction?.addEventListener("click", () => {
    lastPopoverTrigger = dom.btnExportAction;
  });
  dom.langDropdownBtn?.addEventListener("click", () => {
    lastPopoverTrigger = dom.langDropdownBtn;
  });
  dom.btnZoomPresets?.addEventListener("click", () => {
    lastPopoverTrigger = dom.btnZoomPresets;
  });

  dom.btnCompareAction?.addEventListener("click", async () => {
    if (!ensureBothImages()) return;
    await runAutoEdgeAlignment();
    updateComparisonMetrics(true);
  });

  dom.exportPopover?.querySelectorAll(".popover-export-item[data-export]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      dom.exportPopover.hidePopover?.();
      if (!ensureBothImages()) return;
      try {
        const res = await exportComparison({
          kind: btn.dataset.export,
          imgA: state.imgA,
          imgB: state.imgB,
          viewer,
          modesCtrl,
          filenameA: state.fileA?.name || "A",
          filenameB: state.fileB?.name || "B",
          diffGain: modesCtrl.diffGain,
          diffStyle: modesCtrl.diffStyle,
        });
        if (res?.copied) {
          showToast(i18n.t("exportCopied"), { type: "success" });
        } else if (res?.filename) {
          showToast(i18n.t("exportSuccess", { file: res.filename }), { type: "success" });
        }
      } catch (err) {
        showToast(i18n.t("exportError", { err: err?.message || String(err) }), {
          duration: 3800,
          type: "danger",
        });
      }
    });
  });
}

/* ============================================================================
   Image Loading, Swap & Demo Pair
   ============================================================================ */
function isSupportedImageFile(file) {
  if (!file) return false;
  if (file.type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif|bmp|svg|ico|tiff?|heic|avif)$/i.test(file.name);
}

function readImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = url;
  });
}

async function loadImageFile(slot, file, sourceHint = "") {
  if (!isSupportedImageFile(file)) {
    showToast(i18n.t("invalidFile"));
    return false;
  }

  const nextUrl = URL.createObjectURL(file);
  try {
    const img = await readImageElement(nextUrl);
    if (slot === "A") {
      if (state.urlA) URL.revokeObjectURL(state.urlA);
      state.imgA = img;
      state.urlA = nextUrl;
      state.fileA = file;
      state.sourceHintA = sourceHint;
      preparePixelBuffer("A", img);
      modesCtrl.updateImages(nextUrl, undefined);
      state.metaA = await parseImageMetadata(file, img);
    } else {
      if (state.urlB) URL.revokeObjectURL(state.urlB);
      state.imgB = img;
      state.urlB = nextUrl;
      state.fileB = file;
      state.sourceHintB = sourceHint;
      preparePixelBuffer("B", img);
      modesCtrl.updateImages(undefined, nextUrl);
      state.metaB = await parseImageMetadata(file, img);
    }

    onImagesUpdated();
    return true;
  } catch {
    URL.revokeObjectURL(nextUrl);
    showToast(i18n.t("invalidFile"));
    return false;
  }
}

function onImagesUpdated() {
  const hasAny = Boolean(state.imgA || state.imgB);
  dom.emptyStateOverlay?.classList.toggle("hidden", hasAny);

  viewer.setImages(state.imgA, state.imgB);
  fitImagesToViewport();
  refreshAllImageUI();
  updateFilenamesToggleUI();

  if (state.imgA && state.imgB) {
    const autoMode = settings.get("autoAlignOnLoad");
    if (autoMode === "match-sizes") {
      viewer.matchImageSizes();
    } else if (autoMode === "auto-edge") {
      const res = computeAutoEdgeAlignment(state.imgA, state.imgB);
      if (res) {
        viewer.scaleRatioB = res.scaleRatioB;
        viewer.offsetX = res.offsetX;
        viewer.offsetY = res.offsetY;
        viewer.onStateChange();
      }
    }
    updateScaleUI();
    scheduleMetricsRecalc();
  }

  if (hasAny && state.uiMode === "blink" && !state.isBlinking) {
    startAutoBlink();
  }
  updateMissingSlotPrompt();
  resetBottomHudAutoHideTimer();
}

function updateMissingSlotPrompt() {
  if (!dom.missingSlotPrompt) return;
  const hasA = Boolean(state.imgA);
  const hasB = Boolean(state.imgB);
  const showSingle = hasA !== hasB;
  dom.missingSlotPrompt.classList.toggle("hidden", !showSingle);
  if (!showSingle) return;

  const missing = hasA ? "B" : "A";
  dom.missingSlotPrompt.dataset.slot = missing;
  if (dom.missingSlotBadge) {
    dom.missingSlotBadge.textContent = missing;
    dom.missingSlotBadge.className = `slot-badge slot-badge-${missing.toLowerCase()}`;
  }
  if (dom.missingSlotTitle) {
    const key = missing === "A" ? "uploadA" : "uploadB";
    dom.missingSlotTitle.setAttribute("data-i18n", key);
    dom.missingSlotTitle.textContent = i18n.t(key);
  }
  if (dom.missingSlotHint) {
    dom.missingSlotHint.textContent = i18n.t("dragOrClick");
  }
}

function swapImagesAndState() {
  if (!state.imgA && !state.imgB) return;

  [state.imgA, state.imgB] = [state.imgB, state.imgA];
  [state.urlA, state.urlB] = [state.urlB, state.urlA];
  [state.fileA, state.fileB] = [state.fileB, state.fileA];
  [state.metaA, state.metaB] = [state.metaB, state.metaA];
  [state.sourceHintA, state.sourceHintB] = [state.sourceHintB, state.sourceHintA];

  preparePixelBuffer("A", state.imgA);
  preparePixelBuffer("B", state.imgB);

  modesCtrl.updateImages(state.urlA || "", state.urlB || "");
  viewer.swapImages();
  updateScaleUI();
  refreshAllImageUI();
  updateFilenamesToggleUI();
  updateMissingSlotPrompt();
  scheduleMetricsRecalc();
}

function refreshAllImageUI() {
  updateSlotUI("A", state.fileA, state.urlA, state.metaA, state.sourceHintA);
  updateSlotUI("B", state.fileB, state.urlB, state.metaB, state.sourceHintB);
  updateExtendedMetadataTable();
}

function truncateMiddleFilename(name, maxLen = 23) {
  if (!name || name.length <= maxLen) return name || "";
  const half = Math.floor((maxLen - 3) / 2);
  return `${name.slice(0, half)}...${name.slice(-half)}`;
}

function updateSlotUI(slot, file, url, meta, sourceHint) {
  const thumb = dom[`thumb${slot}`];
  const placeholder = dom[`thumbPlaceholder${slot}`];
  const infoName = dom[`infoName${slot}`];
  const infoPath = dom[`infoPath${slot}`];
  const infoRes = dom[`infoRes${slot}`];
  const infoFmt = dom[`infoFmt${slot}`];
  const infoSize = dom[`infoSize${slot}`];
  const infoDate = dom[`infoDate${slot}`];
  const preview = dom[`preview${slot}`];
  const dzTitle = dom[`dropzoneTitle${slot}`];
  const dzHint = dom[`dropzoneHint${slot}`];
  const badgeName = dom[`badgeName${slot}`];
  const badgeRes = dom[`badgeRes${slot}`];
  const badgeBox = dom[`filenameBadge${slot}`];

  if (!meta || !file || !url) {
    thumb?.classList.add("hidden");
    placeholder?.classList.remove("hidden");
    if (infoName) {
      infoName.textContent = i18n.t("notLoadedYet");
      infoName.removeAttribute("title");
    }
    if (infoPath) infoPath.textContent = "—";
    if (infoRes) infoRes.textContent = "—";
    if (infoFmt) infoFmt.textContent = "—";
    if (infoSize) infoSize.textContent = "—";
    if (infoDate) infoDate.textContent = "—";
    preview?.classList.add("hidden");
    if (dzTitle) {
      dzTitle.textContent = i18n.t(slot === "A" ? "uploadA" : "uploadB");
      dzTitle.removeAttribute("title");
    }
    if (dzHint) dzHint.textContent = i18n.t("dragOrClick");
    if (badgeName) badgeName.textContent = "";
    if (badgeRes) badgeRes.textContent = "";
    badgeBox?.removeAttribute("data-fullname");
    return;
  }

  if (thumb) {
    thumb.src = url;
    thumb.classList.remove("hidden");
  }
  placeholder?.classList.add("hidden");

  const name = meta.name || file.name;
  const resText = `${meta.width} × ${meta.height}`;
  const sizeText = meta.sizeFormatted || formatBytes(file.size);
  const dateText = file.lastModified
    ? new Date(file.lastModified).toLocaleDateString(i18n.lang === "en" ? "en-US" : "ru-RU")
    : "—";

  if (infoName) {
    infoName.textContent = name;
    infoName.title = name;
  }
  if (infoPath) {
    infoPath.textContent =
      sourceHint ||
      file.webkitRelativePath ||
      i18n.t("sourceFile");
  }
  if (infoRes) infoRes.textContent = resText;
  if (infoFmt) infoFmt.textContent = meta.format || "IMG";
  if (infoSize) infoSize.textContent = sizeText;
  if (infoDate) infoDate.textContent = dateText;

  if (preview) {
    preview.src = url;
    preview.classList.remove("hidden");
  }
  if (dzTitle) {
    dzTitle.textContent = name;
    dzTitle.title = name;
  }
  if (dzHint) dzHint.textContent = `${resText} • ${sizeText}`;
  if (badgeName) badgeName.textContent = truncateMiddleFilename(name, 23);
  if (badgeRes) badgeRes.textContent = `• ${meta.width}×${meta.height}`;
  badgeBox?.setAttribute("data-fullname", name);
}

function setMetaCellText(el, text) {
  if (!el) return;
  const val = String(text ?? "—");
  el.title = val;
  el.classList.remove("is-overflowing");
  el.style.removeProperty("--scroll-x");
  el.innerHTML = "";
  const track = document.createElement("span");
  track.className = "meta-v-track";
  track.textContent = val;
  el.appendChild(track);
}

function refreshMetaMarquee() {
  requestAnimationFrame(() => {
    document.querySelectorAll(".meta-v").forEach((el) => {
      const track = el.querySelector(".meta-v-track");
      if (!track) return;
      el.classList.remove("is-overflowing");
      el.style.removeProperty("--scroll-x");
      const diff = track.scrollWidth - el.clientWidth;
      if (el.clientWidth > 0 && diff > 2) {
        el.classList.add("is-overflowing");
        el.style.setProperty("--scroll-x", `-${diff + 6}px`);
      }
    });
  });
}

function initMetaMarqueeObserver() {
  const metaDetails = dom.accMetaPanel?.closest("details");
  metaDetails?.addEventListener("toggle", () => {
    if (metaDetails.open) refreshMetaMarquee();
  });
  dom.panelRight?.addEventListener("transitionend", () => {
    refreshMetaMarquee();
  });
}

function updateExtendedMetadataTable() {
  const fillMeta = (suffix, meta) => {
    const aspect = dom[`metaAspect${suffix}`];
    const alpha = dom[`metaAlpha${suffix}`];
    const depth = dom[`metaDepth${suffix}`];
    const profile = dom[`metaProfile${suffix}`];
    const dpi = dom[`metaDpi${suffix}`];
    const comp = dom[`metaComp${suffix}`];
    const cam = dom[`metaCam${suffix}`];
    const exp = dom[`metaExp${suffix}`];

    if (!meta) {
      for (const el of [aspect, alpha, depth, profile, dpi, comp, cam, exp]) {
        setMetaCellText(el, "—");
      }
      return;
    }

    setMetaCellText(aspect, `${meta.aspect} (${meta.megapixels} MP)`);
    setMetaCellText(
      alpha,
      meta.hasAlpha === null
        ? "—"
        : i18n.t(meta.hasAlpha ? "alphaPresent" : "alphaOpaque")
    );
    setMetaCellText(depth, meta.bitDepth || "—");
    setMetaCellText(profile, meta.colorProfile || "sRGB");
    setMetaCellText(dpi, meta.dpi || "72 DPI");

    const compKeyMap = {
      lossless: "compLossless",
      lossy: "compLossy",
      vector: "compVector",
      webp: "compWebp",
      lzw: "compLzw",
      standard: "compStandard",
    };
    const k = compKeyMap[meta.compression];
    setMetaCellText(comp, k ? i18n.t(k) : meta.compression || "—");

    setMetaCellText(cam, meta.camera || i18n.t("noExifData"));
    const parts = [meta.focalLength, meta.aperture, meta.exposure, meta.iso].filter(Boolean);
    setMetaCellText(exp, parts.length ? parts.join(" · ") : "—");
  };

  fillMeta("A", state.metaA);
  fillMeta("B", state.metaB);
  refreshMetaMarquee();
}

function renderProceduralDemoCanvas(variant) {
  const w = 960;
  const h = 640;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Sky / studio backdrop gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (variant === "A") {
    grad.addColorStop(0, "#101b33");
    grad.addColorStop(0.55, "#1f3a60");
    grad.addColorStop(1, "#3b2c59");
  } else {
    grad.addColorStop(0, "#111c35");
    grad.addColorStop(0.55, "#234069");
    grad.addColorStop(1, "#3e2e5c");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  // Frame B simulates a tiny camera shift & micro scale so alignment tools shine
  if (variant === "B") {
    ctx.translate(10, -6);
    ctx.scale(0.992, 0.992);
  }

  // Subtle architectural grid
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 40; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 40; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Horizon silhouette
  ctx.fillStyle = "#0b1120";
  ctx.beginPath();
  ctx.moveTo(0, 470);
  ctx.lineTo(180, 355);
  ctx.lineTo(350, 425);
  ctx.lineTo(540, 290);
  ctx.lineTo(750, 395);
  ctx.lineTo(w, 325);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Geometric resolution target & cards
  ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(120, 120, 320, 220, 18);
  ctx.fill();
  ctx.stroke();

  // Concentric focus target
  const cx = 280;
  const cy = 230;
  [70, 50, 30, 12].forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = idx % 2 === 0 ? "#6366f1" : "#e2e8f0";
    ctx.lineWidth = idx === 3 ? 4 : 2;
    ctx.stroke();
  });

  // Right card (shows visual differences between A and B for Diff/Slider testing)
  ctx.fillStyle = variant === "A" ? "#1e293b" : "#1f293d";
  ctx.strokeStyle = variant === "A" ? "#10b981" : "#f59e0b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(520, 120, 300, 220, 18);
  ctx.fill();
  ctx.stroke();

  // Intentional color swatch edit between A & B
  const swatches = variant === "A"
    ? ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"]
    : ["#ef4444", "#fb7185", "#10b981", "#06b6d4", "#a855f7"];

  swatches.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(550 + i * 50, 160, 40, 90);
  });

  // Intentional retouch element present only in B
  if (variant === "B") {
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc(778, 294, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 20px system-ui, sans-serif";
  ctx.fillText(variant === "A" ? "ORIGINAL FRAME A" : "EDITED FRAME B", 550, 300);
  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob], `demo_photo_${variant.toLowerCase()}.png`, { type: "image/png" })),
      "image/png"
    );
  });
}

async function loadDemoPair() {
  let fileA = null;
  let fileB = null;

  if (window.location.protocol !== "file:") {
    try {
      const [resA, resB] = await Promise.all([
        fetch("./demo/sample_photo_a.png"),
        fetch("./demo/sample_photo_b.png"),
      ]);
      if (resA.ok && resB.ok) {
        const [blobA, blobB] = await Promise.all([resA.blob(), resB.blob()]);
        fileA = new File([blobA], "sample_photo_a.png", { type: blobA.type || "image/png" });
        fileB = new File([blobB], "sample_photo_b.png", { type: blobB.type || "image/png" });
      }
    } catch {
      // Fallback to offline canvas generator below
    }
  }

  if (!fileA || !fileB) {
    [fileA, fileB] = await Promise.all([
      renderProceduralDemoCanvas("A"),
      renderProceduralDemoCanvas("B"),
    ]);
  }

  await Promise.all([
    loadImageFile("A", fileA, "Demo Studio"),
    loadImageFile("B", fileB, "Demo Studio"),
  ]);
  showToast(i18n.t("demoLoadedHint"), { duration: 3000 });
}

function ensureBothImages() {
  if (state.imgA && state.imgB) return true;
  showToast(i18n.t("needBothImages"), { duration: 2400 });
  return false;
}

/* ============================================================================
   Settings Modal, Help Modal & Anchored Popovers
   ============================================================================ */
function updateNudgeStepLabel() {
  if (dom.nudgeStepLabel) {
    dom.nudgeStepLabel.textContent = `${Number(settings.get("nudgeStep")) || 1}px`;
  }
}

function notifySettingSaved() {
  showToast(i18n.t("settingSaved"), { duration: 1200, id: "setting-saved", type: "success" });
}

function bindSettingsDialog() {
  setupDialogEnhancements(dom.settingsDialog, dom.btnSettings, dom.btnCloseSettings);

  const activateTab = (tabName) => {
    const valid = document.querySelector(`.settings-tab[data-tab="${tabName}"]`);
    const target = valid ? tabName : "appearance";
    document.querySelectorAll(".settings-tab[data-tab]").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === target);
    });
    document.querySelectorAll(".settings-pane[data-pane]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.pane !== target);
    });
    try {
      sessionStorage.setItem("photocheck_settings_tab", target);
    } catch { }
  };

  try {
    const savedTab = sessionStorage.getItem("photocheck_settings_tab");
    if (savedTab) activateTab(savedTab);
  } catch { }

  document.querySelectorAll(".settings-tab[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  document.querySelectorAll("[data-setting-theme]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("theme", btn.dataset.settingTheme);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-accent]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("accent", btn.dataset.accent);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-color-a]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("colorA", btn.dataset.colorA);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-color-b]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("colorB", btn.dataset.colorB);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-backdrop]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("backdrop", btn.dataset.backdrop);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-density]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("density", btn.dataset.density);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-ui-scale]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("uiScale", Number(btn.dataset.uiScale));
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-motion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("reduceMotion", btn.dataset.motion);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-render]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("imageRendering", btn.dataset.render);
      modesCtrl.setImageRenderingPref(btn.dataset.render);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-zoom-speed]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("wheelZoomSpeed", Number(btn.dataset.zoomSpeed));
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-curtain]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("curtainStyle", btn.dataset.curtain);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-autoload]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("autoAlignOnLoad", btn.dataset.autoload);
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-nudge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      settings.set("nudgeStep", Number(btn.dataset.nudge));
      updateNudgeStepLabel();
      notifySettingSaved();
    });
  });
  document.querySelectorAll("[data-default-diff]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const style = btn.dataset.defaultDiff;
      settings.set("defaultDiffMode", style);
      modesCtrl.setDiffConfig({ style });
      updateDiffUI();
      notifySettingSaved();
    });
  });

  dom.settingDefaultDiffGain?.addEventListener("input", () => {
    const gain = Number(dom.settingDefaultDiffGain.value);
    settings.set("diffGain", gain);
    modesCtrl.setDiffConfig({ gain });
    updateDiffUI();
    if (dom.settingDefaultDiffGainVal) dom.settingDefaultDiffGainVal.textContent = `${gain}×`;
  });

  dom.settingToggleGlass?.addEventListener("change", () => {
    settings.set("glassEffects", dom.settingToggleGlass.checked);
    notifySettingSaved();
  });
  dom.settingToggleQuickbar?.addEventListener("change", () => {
    const show = dom.settingToggleQuickbar.checked;
    settings.set("showQuickBar", show);
    toggleQuickBar(!show);
    notifySettingSaved();
  });
  dom.settingToggleAutohideHud?.addEventListener("change", () => {
    settings.set("autoHideBottomHud", dom.settingToggleAutohideHud.checked);
    resetBottomHudAutoHideTimer();
    notifySettingSaved();
  });
  dom.settingToggleModestrip?.addEventListener("change", () => {
    settings.set("showModeBottomStrip", dom.settingToggleModestrip.checked);
    updateModeBottomStripVisibility();
    notifySettingSaved();
  });
  dom.settingToggleProbe?.addEventListener("change", () => {
    settings.set("pixelProbe", dom.settingToggleProbe.checked);
    updateProbeVisibility();
    notifySettingSaved();
  });
  dom.settingToggleFilenames?.addEventListener("change", () => {
    const show = dom.settingToggleFilenames.checked;
    settings.set("showFilenameBadges", show);
    state.showFilenames = show;
    updateFilenamesToggleUI();
    notifySettingSaved();
  });
  dom.settingToggleAutohideBadges?.addEventListener("change", () => {
    settings.set("autoHideBadges", dom.settingToggleAutohideBadges.checked);
    notifySettingSaved();
  });
  dom.settingToggleAutometrics?.addEventListener("change", () => {
    settings.set("autoComputeMetrics", dom.settingToggleAutometrics.checked);
    if (dom.settingToggleAutometrics.checked) scheduleMetricsRecalc();
    notifySettingSaved();
  });

  document.querySelectorAll("#setting-lang-group .lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      i18n.setLanguage(btn.dataset.lang);
      notifySettingSaved();
    });
  });

  dom.btnResetSettings?.addEventListener("click", () => {
    settings.reset();
    modesCtrl.diffStyle = settings.get("defaultDiffMode");
    modesCtrl.diffGain = settings.get("diffGain");
    modesCtrl.setImageRenderingPref(settings.get("imageRendering"));
    toggleQuickBar(!settings.get("showQuickBar"));
    updateModeBottomStripVisibility();
    resetBottomHudAutoHideTimer();
    updateDiffUI();
    updateProbeVisibility();
    updateNudgeStepLabel();
    syncSettingsUI();
    showToast(i18n.t("settingsResetDone"), { type: "success" });
  });

  settings.subscribe(() => {
    syncSettingsUI();
    updateProbeVisibility();
    updateNudgeStepLabel();
  });
}

function syncSettingsUI() {
  const s = settings.getAll();
  const markGroup = (selector, attr, val) => {
    document.querySelectorAll(selector).forEach((el) => {
      const isMatch = el.getAttribute(attr) === String(val);
      el.classList.toggle("active", isMatch);
      el.setAttribute("aria-pressed", String(isMatch));
    });
  };

  markGroup("[data-setting-theme]", "data-setting-theme", s.theme);
  markGroup("[data-accent]", "data-accent", s.accent);
  markGroup("[data-color-a]", "data-color-a", s.colorA);
  markGroup("[data-color-b]", "data-color-b", s.colorB);
  markGroup("[data-backdrop]", "data-backdrop", s.backdrop);
  markGroup("[data-density]", "data-density", s.density);
  markGroup("[data-ui-scale]", "data-ui-scale", s.uiScale);
  markGroup("[data-motion]", "data-motion", s.reduceMotion);
  markGroup("[data-render]", "data-render", s.imageRendering);
  markGroup("[data-zoom-speed]", "data-zoom-speed", s.wheelZoomSpeed);
  markGroup("[data-curtain]", "data-curtain", s.curtainStyle);
  markGroup("[data-autoload]", "data-autoload", s.autoAlignOnLoad);
  markGroup("[data-nudge]", "data-nudge", s.nudgeStep);
  markGroup("[data-default-diff]", "data-default-diff", s.defaultDiffMode);

  if (dom.themeSystemResolved) {
    const sysTheme = settings.getSystemTheme();
    dom.themeSystemResolved.textContent = `(${i18n.t(
      sysTheme === "dark" ? "themeCurrentDark" : "themeCurrentLight"
    )})`;
  }

  if (dom.settingDefaultDiffGain) {
    dom.settingDefaultDiffGain.value = String(s.diffGain || 3);
    syncRangeVars(dom.settingDefaultDiffGain);
  }
  if (dom.settingDefaultDiffGainVal) {
    dom.settingDefaultDiffGainVal.textContent = `${s.diffGain || 3}×`;
  }

  if (dom.settingToggleGlass) dom.settingToggleGlass.checked = s.glassEffects !== false;
  if (dom.settingToggleQuickbar) dom.settingToggleQuickbar.checked = s.showQuickBar !== false;
  if (dom.settingToggleAutohideHud) dom.settingToggleAutohideHud.checked = s.autoHideBottomHud !== false;
  if (dom.settingToggleModestrip) dom.settingToggleModestrip.checked = s.showModeBottomStrip !== false;
  if (dom.settingToggleProbe) dom.settingToggleProbe.checked = Boolean(s.pixelProbe);
  if (dom.settingToggleFilenames) {
    dom.settingToggleFilenames.checked = s.showFilenameBadges !== false;
  }
  if (dom.settingToggleAutohideBadges) {
    dom.settingToggleAutohideBadges.checked = Boolean(s.autoHideBadges);
  }
  if (dom.settingToggleAutometrics) {
    dom.settingToggleAutometrics.checked = Boolean(s.autoComputeMetrics);
  }
}

function bindHelpDialog() {
  setupDialogEnhancements(dom.helpDialog, dom.btnHelp, dom.btnCloseHelp);

  dom.helpShortcutSearch?.addEventListener("input", () => {
    const q = dom.helpShortcutSearch.value.trim().toLowerCase();
    dom.helpShortcutsList?.querySelectorAll(".shortcut-row").forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.classList.toggle("hidden", Boolean(q) && !text.includes(q));
    });
  });
}

function bindPopovers() {
  setupPopoverFallback(dom.langPopover, dom.langDropdownBtn, "bottom-end");
  setupPopoverFallback(dom.zoomPopover, dom.btnZoomPresets, "bottom-start");
  setupPopoverFallback(dom.exportPopover, dom.btnExportAction, "top-end");

  dom.langPopover?.querySelectorAll(".lang-option[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      i18n.setLanguage(btn.dataset.lang);
      dom.langPopover.hidePopover?.();
    });
  });
}

function syncDynamicTextsOnLanguageChange() {
  syncSettingsUI();
  updatePointBanner();
  refreshAllImageUI();
  updateBlinkButtonsUI();
  updateMissingSlotPrompt();
  requestAnimationFrame(updateModeIndicator);
}

/* ============================================================================
   Keyboard Shortcuts
   ============================================================================ */
function bindKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if ((e.ctrlKey || e.metaKey) && e.key === ",") {
      e.preventDefault();
      if (dom.settingsDialog?.open) {
        closeTopLayer(dom.settingsDialog);
      } else {
        dom.settingsDialog?.showModal();
      }
      return;
    }

    if (document.querySelector("dialog[open]")) return;

    if (e.key === "Escape" && state.pointModeCount > 0) {
      cancelPointAlignMode();
      return;
    }

    if (e.key === "1") applyModeSelection("slider");
    else if (e.key === "2") applyModeSelection("fade");
    else if (e.key === "3") applyModeSelection("split");
    else if (e.key === "4") applyModeSelection("diff");
    else if (e.key === "5") applyModeSelection("blink");
    else if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
      fitImagesToViewport();
    } else if (e.key === "0") {
      setActualSizeZoom();
    } else if (e.key === "h" || e.key === "H" || e.key === "р" || e.key === "Р") {
      setCurtainOrientation(modesCtrl.sliderOrientation === "vertical" ? "horizontal" : "vertical");
    } else if (e.key === "x" || e.key === "X" || e.key === "ч" || e.key === "Ч") {
      swapImagesAndState();
    } else if (e.key === "b" || e.key === "B" || e.key === "и" || e.key === "И") {
      state.showFilenames = !state.showFilenames;
      settings.set("showFilenameBadges", state.showFilenames);
      updateFilenamesToggleUI();
      syncSettingsUI();
    } else if (e.key === "i" || e.key === "I" || e.key === "ш" || e.key === "Ш") {
      settings.set("pixelProbe", !settings.get("pixelProbe"));
      updateProbeVisibility();
      syncSettingsUI();
    } else if (e.code === "Space" && !e.repeat) {
      const isFocusedControl =
        tag === "BUTTON" ||
        tag === "A" ||
        document.activeElement?.getAttribute("role") === "slider";
      if (!isFocusedControl && (state.imgA || state.imgB)) {
        e.preventDefault();
        state.isFlashing = true;
        state.opacityBeforeFlash = modesCtrl.opacity;
        if (state.uiMode !== "fade") applyModeSelection("fade");
        const flashVal = state.opacityBeforeFlash > 0.5 ? 0 : 1;
        modesCtrl.setOpacity(flashVal);
        updateOpacityUI(flashVal);
      }
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      if (document.activeElement === modesCtrl.curtainHandle) return;
      if (!state.imgA && !state.imgB) return;
      e.preventDefault();
      const dirs = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const [dx, dy] = dirs[e.key];
      if (viewer.alignTarget !== "none") {
        const base = Number(settings.get("nudgeStep")) || 1;
        const mult = e.shiftKey ? 10 : base;
        if (viewer.alignTarget === "A") {
          viewer.nudgeA(dx * mult, dy * mult);
        } else {
          viewer.nudgeB(dx * mult, dy * mult);
        }
        scheduleMetricsRecalc();
      } else {
        const panStep = e.shiftKey ? 80 : 20;
        viewer.pan(dx * -panStep, dy * -panStep, "both");
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space" && state.isFlashing) {
      state.isFlashing = false;
      modesCtrl.setOpacity(state.opacityBeforeFlash);
      updateOpacityUI(state.opacityBeforeFlash);
    }
  });
}
