const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function initStudio() {
  const panelLeft = $("#panel-left");
  const panelRight = $("#panel-right");
  const panelBottom = $("#panel-bottom");
  const workspace = $("#workspace");
  const welcome = $("#studio-welcome");
  const status = $("#studio-live-status");
  const statusLabel = $("#studio-status-label");
  const appRoot = $("#app");
  // The main app creates viewer <img> nodes during its DOMContentLoaded setup.
  // Keep these references live because this module may initialize just before it.
  let imageA = null;
  let imageB = null;
  let imageSplitA = null;
  let imageSplitB = null;

  let toastTimer = null;
  let exportMenu = null;
  let activeExportTrigger = null;

  const isEnglish = () => $("#current-lang-code")?.textContent?.trim() === "EN";

  function toast(message) {
    let node = $("#studio-toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "studio-toast";
      node.className = "studio-toast";
      node.setAttribute("role", "status");
      document.body.append(node);
    }
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node?.remove(), 2800);
  }

  function getHasImage(img) {
    return Boolean(img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0);
  }

  let wasPairReady = false;
  const observedImages = new WeakSet();

  function updateImageState(sourceState = null) {
    // Resolve viewer images on every update: the main app creates them dynamically.
    const loadedA = getHasImage(imageA) || getHasImage(imageSplitA);
    const loadedB = getHasImage(imageB) || getHasImage(imageSplitB);
    const previewA = $("#preview-a");
    const previewB = $("#preview-b");
    const previewHasA = Boolean(previewA && !previewA.classList.contains("hidden") && (previewA.currentSrc || previewA.src));
    const previewHasB = Boolean(previewB && !previewB.classList.contains("hidden") && (previewB.currentSrc || previewB.src));
    const hasA = sourceState ? Boolean(sourceState.hasA) : (loadedA || previewHasA);
    const hasB = sourceState ? Boolean(sourceState.hasB) : (loadedB || previewHasB);
    const ready = sourceState ? Boolean(sourceState.ready) : (hasA && hasB);
    const justBecameReady = ready && !wasPairReady;
    wasPairReady = ready;

    appRoot?.classList.toggle("has-image-pair", ready);
    welcome?.classList.toggle("hidden", ready);
    welcome?.classList.toggle("is-partial", !ready && (hasA || hasB));

    const title = $("#studio-welcome-title");
    const copy = $("#studio-welcome-copy");
    if (!ready && title && copy) {
      if (hasA || hasB) {
        title.textContent = isEnglish() ? "One image is ready — add the other" : "Первое изображение готово — добавьте второе";
        copy.textContent = isEnglish() ? "Choose the missing image to start comparing" : "Выберите недостающее изображение, чтобы начать сравнение";
      } else {
        title.textContent = isEnglish() ? "Compare images with precision" : "Сравнивайте изображения точнее";
        copy.textContent = isEnglish()
          ? "Add two images to begin a visual difference analysis"
          : "Добавьте два изображения, чтобы начать визуальный анализ различий";
      }
    }

    $("#dropzone-a")?.classList.toggle("has-file", hasA);
    $("#dropzone-b")?.classList.toggle("has-file", hasB);
    $(".studio-welcome-slot.slot-a")?.classList.toggle("loaded", hasA);
    $(".studio-welcome-slot.slot-b")?.classList.toggle("loaded", hasB);
    status?.classList.toggle("is-ready", ready);
    status?.classList.toggle("is-partial", !ready && (hasA || hasB));
    $("#quick-actions-bar")?.classList.toggle("hidden", !ready);
    $("#btn-restore-quick")?.classList.toggle("hidden", !ready || !$("#quick-actions-bar")?.classList.contains("collapsed"));

    if (statusLabel) {
      statusLabel.textContent = ready
        ? (isEnglish() ? "Pair ready to compare" : "Пара готова к сравнению")
        : (hasA || hasB)
          ? (isEnglish() ? "Add the second image" : "Добавьте второе изображение")
          : (isEnglish() ? "Waiting for images" : "Ожидание изображений");
    }

    // The duplicate upload dock is useful during setup, but should not steal
    // canvas space once the pair is ready. It remains one click away via Restore.
    if (justBecameReady && panelBottom && !panelBottom.classList.contains("collapsed")) {
      $("#btn-collapse-bottom")?.click();
    }
  }

  function watchViewerImages() {
    imageA = $("#img-element-a");
    imageB = $("#img-element-b");
    imageSplitA = $("#img-split-a");
    imageSplitB = $("#img-split-b");
    ["#img-element-a", "#img-element-b", "#img-split-a", "#img-split-b"].forEach((selector) => {
      const img = $(selector);
      if (!img || observedImages.has(img)) return;
      observedImages.add(img);
      img.addEventListener("load", () => updateImageState());
      img.addEventListener("error", () => updateImageState());
    });
  }

  const viewerContainer = $("#viewer-container");
  if (viewerContainer && typeof MutationObserver !== "undefined") {
    const viewerObserver = new MutationObserver(() => {
      watchViewerImages();
      updateImageState();
    });
    viewerObserver.observe(viewerContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  }
  window.addEventListener("photocheck:images-state", (event) => updateImageState(event.detail || null));
  watchViewerImages();

  // Portable builds use the visible preview elements as their state signal;
  // watch them too so they behave exactly like the modular Vite app.
  [$("#dropzone-a"), $("#dropzone-b"), $("#preview-a"), $("#preview-b")].filter(Boolean).forEach((node) => {
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => updateImageState());
    observer.observe(node, { attributes: true, attributeFilter: ["src", "class"] });
  });
  ["#file-input-a", "#file-input-b", "#file-input-pair"].forEach((selector) => {
    $(selector)?.addEventListener("change", () => setTimeout(updateImageState, 80));
  });
  const langCode = $("#current-lang-code");
  if (langCode) new MutationObserver(() => {
    updateImageState();
    if (exportMenu) updateExportMenuLabels();
  }).observe(langCode, { childList: true, characterData: true, subtree: true });

  welcome?.querySelectorAll(".studio-welcome-slot").forEach((slot) => {
    slot.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); slot.click(); }
    });
  });

  // Workspace layouts use the application's existing panel controls, so the resize logic remains centralized.
  function setPanelVisibility(panel, collapse, collapseButton, restoreButton) {
    if (!panel) return;
    const currentlyCollapsed = panel.classList.contains("collapsed");
    if (currentlyCollapsed === collapse) return;
    const trigger = collapse ? $(collapseButton) : $(restoreButton);
    trigger?.click();
  }

  function setLayout(layout, persist = true) {
    const layouts = {
      standard: { left: false, right: false, bottom: false },
      focus: { left: true, right: true, bottom: true },
      inspect: { left: false, right: false, bottom: true }
    };
    const target = layouts[layout] || layouts.standard;
    setPanelVisibility(panelLeft, target.left, "#btn-collapse-left", "#btn-restore-left");
    setPanelVisibility(panelRight, target.right, "#btn-collapse-right", "#btn-restore-right");
    setPanelVisibility(panelBottom, target.bottom, "#btn-collapse-bottom", "#btn-restore-bottom");
    $$("[data-layout]").forEach((button) => {
      const active = button.dataset.layout === layout;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (persist) {
      try { localStorage.setItem("photocheck-studio-layout", layout); } catch { /* Storage may be disabled. */ }
    }
  }

  $("#studio-layout-presets")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layout]");
    if (button) setLayout(button.dataset.layout);
  });

  // Group the alignment tools into focused categories without changing their original handlers.
  function setToolTab(tab) {
    $$("[data-tool-tab]").forEach((button) => {
      const active = button.dataset.toolTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $$("[data-tool-group]").forEach((group) => {
      const active = group.dataset.toolGroup === tab;
      group.hidden = !active;
      group.classList.toggle("active", active);
    });
    try { localStorage.setItem("photocheck-studio-tools-tab", tab); } catch { /* Optional preference. */ }
  }
  $("#studio-tools-tabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tool-tab]");
    if (button) setToolTab(button.dataset.toolTab);
  });

  // Inspector tabs keep file metadata, comparison controls and technical details separated.
  function revealAccordion(targetId) {
    const content = $(`#${targetId}`);
    const trigger = $(`.accordion-trigger[data-target="${targetId}"]`);
    if (content?.classList.contains("hidden")) {
      content.classList.remove("hidden");
      trigger?.classList.add("open");
    }
  }
  function setInspectorTab(tab) {
    $$("[data-inspector-tab]").forEach((button) => {
      const active = button.dataset.inspectorTab === tab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $$("[data-inspector-group]").forEach((group) => {
      const active = group.dataset.inspectorGroup === tab;
      group.hidden = !active;
      group.classList.toggle("active", active);
    });
    const inspectorContent = $(".studio-inspector-content");
    if (inspectorContent) inspectorContent.scrollTop = 0;
    if (tab === "compare") revealAccordion("acc-compare-settings");
    if (tab === "details") revealAccordion("acc-extra");
    try { localStorage.setItem("photocheck-studio-inspector-tab", tab); } catch { /* Optional preference. */ }
  }
  $("#studio-inspector-tabs")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-inspector-tab]");
    if (button) setInspectorTab(button.dataset.inspectorTab);
  });

  // Comparison presets are aliases for the original controls, not parallel implementations.
  function stopTransientModes(except = "") {
    const flash = $("#btn-fade-flash");
    const blink = $("#btn-auto-blink");
    const diff = $("#btn-toggle-diff");
    if (except !== "flash" && flash?.classList.contains("toggle-active")) flash.click();
    if (except !== "blink" && blink?.classList.contains("toggle-active")) blink.click();
    if (except !== "difference" && diff?.classList.contains("active")) diff.click();
  }

  function applyComparisonPreset(preset) {
    const mode = preset === "curtain" ? "slider" : (preset === "split" ? "split" : "fade");
    const modeButton = $(`#mode-selector [data-mode="${mode}"]`);
    // Orientation only applies to the curtain comparison preset.
    $("#group-slider-controls")?.classList.toggle("hidden", preset !== "curtain");
    stopTransientModes(preset);
    modeButton?.click();

    if (preset === "overlay") {
      $("#btn-fade-50")?.click();
    } else if (preset === "difference") {
      if (!$("#btn-toggle-diff")?.classList.contains("active")) $("#btn-toggle-diff")?.click();
    } else if (preset === "blink") {
      if (!$("#btn-auto-blink")?.classList.contains("toggle-active")) $("#btn-auto-blink")?.click();
    }

    $$("[data-preset]").forEach((button) => {
      const active = button.dataset.preset === preset;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    try { localStorage.setItem("photocheck-studio-compare", preset); } catch { /* Optional preference. */ }
  }
  $("#studio-compare-presets")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset]");
    if (button) applyComparisonPreset(button.dataset.preset);
  });
  $("#btn-quick-match")?.addEventListener("click", () => $("#btn-match-sizes")?.click());

  // Demo pair uses the regular file-pair input and therefore the same decoding/metadata flow.
  if (location.protocol === "file:") {
    const demoButton = $("#studio-load-demo");
    if (demoButton) demoButton.hidden = true;
  }

  $("#studio-load-demo")?.addEventListener("click", async () => {
    const button = $("#studio-load-demo");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = isEnglish() ? "Loading sample images…" : "Загружаю примеры…";
    try {
      const urls = ["./demo/sample_photo_a.png", "./demo/sample_photo_b.png"];
      const files = await Promise.all(urls.map(async (url, index) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        return new File([blob], index === 0 ? "sample_photo_a.png" : "sample_photo_b.png", { type: blob.type || "image/png" });
      }));
      const transfer = new DataTransfer();
      files.forEach((file) => transfer.items.add(file));
      const input = $("#file-input-pair");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      setTimeout(updateImageState, 300);
    } catch (error) {
      console.error("Could not load demo pair:", error);
      toast(isEnglish() ? "Could not load demo images. Run the project through Vite." : "Не удалось загрузить примеры. Запустите проект через Vite.");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });

  // Lightweight export popover, with true pixel output and no added dependency.
  function updateExportMenuLabels(menuTarget = exportMenu) {
    if (!menuTarget) return;
    menuTarget.innerHTML = `
      <button type="button" data-export="view" role="menuitem">${isEnglish() ? "Current comparison view" : "Текущий вид сравнения"}<small>${isEnglish() ? "Export the visible composition as PNG" : "Сохранить видимую композицию в PNG"}</small></button>
      <div class="studio-export-divider"></div>
      <button type="button" data-export="pair" role="menuitem">${isEnglish() ? "Both originals side by side" : "Оригиналы рядом"}<small>${isEnglish() ? "Downscaled only if browser canvas limits require it" : "Уменьшит только при ограничениях браузера"}</small></button>
      <button type="button" data-export="a" role="menuitem">${isEnglish() ? "Save image A" : "Сохранить изображение A"}<small>${isEnglish() ? "Original file as PNG" : "Исходник в формате PNG"}</small></button>
      <button type="button" data-export="b" role="menuitem">${isEnglish() ? "Save image B" : "Сохранить изображение B"}<small>${isEnglish() ? "Original file as PNG" : "Исходник в формате PNG"}</small></button>`;
  }

  function createExportMenu() {
    const menu = document.createElement("div");
    menu.className = "studio-export-menu";
    menu.hidden = true;
    menu.setAttribute("role", "menu");
    updateExportMenuLabels(menu);
    document.body.append(menu);
    menu.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-export]");
      if (!button) return;
      menu.hidden = true;
      $("#btn-export-action")?.setAttribute("aria-expanded", "false");
      $("#btn-quick-export")?.setAttribute("aria-expanded", "false");
      try {
        if (button.dataset.export === "view") await exportCurrentView();
        if (button.dataset.export === "pair") await exportOriginalPair();
        if (button.dataset.export === "a") await exportSingleImage("a");
        if (button.dataset.export === "b") await exportSingleImage("b");
      } catch (error) {
        console.error("Export failed:", error);
        toast(isEnglish() ? "Export failed. Try another image format." : "Не удалось выполнить экспорт. Попробуйте другой формат изображения.");
      }
    });
    return menu;
  }
  exportMenu = createExportMenu();

  function positionExportMenu() {
    const button = activeExportTrigger || $("#btn-export-action");
    if (!button || !exportMenu) return;
    const rect = button.getBoundingClientRect();
    const menuHeight = exportMenu.getBoundingClientRect().height || 220;
    const top = rect.top - menuHeight - 10 >= 8 ? rect.top - menuHeight - 10 : Math.min(window.innerHeight - menuHeight - 8, rect.bottom + 8);
    exportMenu.style.left = `${Math.max(8, Math.min(window.innerWidth - 264, rect.right - 256))}px`;
    exportMenu.style.top = `${Math.max(8, top)}px`;
  }
  function toggleExportMenu(event, trigger) {
    event.stopPropagation();
    if (!exportMenu) return;
    const shouldOpen = exportMenu.hidden || activeExportTrigger !== trigger;
    activeExportTrigger = trigger;
    exportMenu.hidden = !shouldOpen;
    $("#btn-export-action")?.setAttribute("aria-expanded", String(shouldOpen));
    $("#btn-quick-export")?.setAttribute("aria-expanded", String(shouldOpen));
    if (shouldOpen) requestAnimationFrame(positionExportMenu);
  }
  $("#btn-export-action")?.addEventListener("click", event => toggleExportMenu(event, $("#btn-export-action")));
  $("#btn-quick-export")?.addEventListener("click", event => toggleExportMenu(event, $("#btn-quick-export")));
  function closeExportMenu() {
    if (!exportMenu) return;
    exportMenu.hidden = true;
    $("#btn-export-action")?.setAttribute("aria-expanded", "false");
    $("#btn-quick-export")?.setAttribute("aria-expanded", "false");
  }
  document.addEventListener("click", (event) => {
    if (exportMenu && !exportMenu.hidden && !exportMenu.contains(event.target) && !event.target.closest("#btn-export-action, #btn-quick-export")) {
      closeExportMenu();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && exportMenu && !exportMenu.hidden) {
      closeExportMenu();
      activeExportTrigger?.focus();
    }
  });
  window.addEventListener("resize", () => { if (exportMenu && !exportMenu.hidden) positionExportMenu(); });

  function getCanvas() {
    const container = $("#viewer-container");
    if (!container) throw new Error("Viewer not found");
    const rect = container.getBoundingClientRect();
    const ratio = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#090c12";
    ctx.fillRect(0, 0, rect.width, rect.height);
    return { canvas, ctx, rect, ratio };
  }

  function getMatrix(element) {
    const value = getComputedStyle(element).transform;
    if (!value || value === "none") return new DOMMatrixReadOnly();
    try { return new DOMMatrixReadOnly(value); }
    catch { return new DOMMatrixReadOnly(); }
  }

  function mapPoint(matrix, point) {
    const transformed = matrix.transformPoint(new DOMPoint(point.x, point.y, 0, 1));
    const w = Number.isFinite(transformed.w) && Math.abs(transformed.w) > 1e-10 ? transformed.w : 1;
    return { x: transformed.x / w, y: transformed.y / w };
  }

  function drawAffineTriangle(ctx, img, source, destination, pixelRatio) {
    const [s0, s1, s2] = source;
    const [d0, d1, d2] = destination;
    const sx1 = s1.x - s0.x, sy1 = s1.y - s0.y;
    const sx2 = s2.x - s0.x, sy2 = s2.y - s0.y;
    const determinant = sx1 * sy2 - sx2 * sy1;
    if (Math.abs(determinant) < 1e-8) return;
    const dx1 = d1.x - d0.x, dy1 = d1.y - d0.y;
    const dx2 = d2.x - d0.x, dy2 = d2.y - d0.y;
    const a = (dx1 * sy2 - dx2 * sy1) / determinant;
    const c = (dx2 * sx1 - dx1 * sx2) / determinant;
    const b = (dy1 * sy2 - dy2 * sy1) / determinant;
    const d = (dy2 * sx1 - dy1 * sx2) / determinant;
    const e = d0.x - a * s0.x - c * s0.y;
    const f = d0.y - b * s0.x - d * s0.y;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(d0.x, d0.y); ctx.lineTo(d1.x, d1.y); ctx.lineTo(d2.x, d2.y); ctx.closePath();
    ctx.clip();
    ctx.setTransform(a * pixelRatio, b * pixelRatio, c * pixelRatio, d * pixelRatio, e * pixelRatio, f * pixelRatio);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  function drawTransformed(ctx, img, wrapper, containerRect, offsetX = 0, offsetY = 0, opacity = 1, composite = "source-over", filter = "none") {
    if (!getHasImage(img) || !wrapper) return;
    const matrix = getMatrix(wrapper);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = composite;
    ctx.filter = filter;
    const pixelRatio = ctx.getTransform().a || 1;

    if (matrix.is2D) {
      ctx.setTransform(
        matrix.a * pixelRatio, matrix.b * pixelRatio,
        matrix.c * pixelRatio, matrix.d * pixelRatio,
        (matrix.e + offsetX) * pixelRatio, (matrix.f + offsetY) * pixelRatio
      );
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      return;
    }

    // Canvas 2D has no projective transform; approximate the 3D CSS homography with a fine triangle mesh.
    const columns = 18;
    const rows = 18;
    const sourceX = (column, row) => ({ x: img.naturalWidth * column / columns, y: img.naturalHeight * row / rows });
    const project = point => {
      const mapped = mapPoint(matrix, point);
      return { x: mapped.x + offsetX, y: mapped.y + offsetY };
    };
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const p00 = sourceX(column, row);
        const p10 = sourceX(column + 1, row);
        const p01 = sourceX(column, row + 1);
        const p11 = sourceX(column + 1, row + 1);
        const d00 = project(p00), d10 = project(p10), d01 = project(p01), d11 = project(p11);
        if (![d00, d10, d01, d11].every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) continue;
        drawAffineTriangle(ctx, img, [p00, p10, p11], [d00, d10, d11], pixelRatio);
        drawAffineTriangle(ctx, img, [p00, p11, p01], [d00, d11, d01], pixelRatio);
      }
    }
    ctx.restore();
  }

  function drawLabel(ctx, text, x, y, color) {
    const label = String(text || "");
    if (!label) return;
    ctx.save();
    ctx.font = "600 12px Inter, system-ui, sans-serif";
    const width = Math.min(260, ctx.measureText(label).width + 22);
    ctx.fillStyle = "rgba(15,20,30,.88)";
    ctx.strokeStyle = "rgba(190,202,224,.18)";
    ctx.lineWidth = 1;
    if (ctx.roundRect) {
      ctx.beginPath(); ctx.roundRect(x, y, width, 28, 8); ctx.fill(); ctx.stroke();
    } else ctx.fillRect(x, y, width, 28);
    ctx.fillStyle = color;
    ctx.fillText(label, x + 10, y + 18, width - 18);
    ctx.restore();
  }

  function drawVisibleComparison() {
    const { canvas, ctx, rect } = getCanvas();
    const mode = $("#mode-selector .btn-seg.active")?.dataset.mode || "slider";
    const diff = $("#viewer-container")?.classList.contains("diff-mode");

    if (mode === "split") {
      const paneA = $("#split-pane-a");
      const paneB = $("#split-pane-b");
      const rectA = paneA?.getBoundingClientRect();
      const rectB = paneB?.getBoundingClientRect();
      if (rectA) {
        ctx.save(); ctx.beginPath(); ctx.rect(rectA.left - rect.left, rectA.top - rect.top, rectA.width, rectA.height); ctx.clip();
        drawTransformed(ctx, imageSplitA, $("#wrapper-split-a"), rect, rectA.left - rect.left, rectA.top - rect.top);
        ctx.restore();
      }
      if (rectB) {
        ctx.save(); ctx.beginPath(); ctx.rect(rectB.left - rect.left, rectB.top - rect.top, rectB.width, rectB.height); ctx.clip();
        drawTransformed(ctx, imageSplitB, $("#wrapper-split-b"), rect, rectB.left - rect.left, rectB.top - rect.top);
        ctx.restore();
      }
      ctx.save(); ctx.fillStyle = "rgba(202,211,229,.55)"; ctx.fillRect(rect.width / 2 - 1, 0, 2, rect.height); ctx.restore();
    } else {
      drawTransformed(ctx, imageB, $("#wrapper-b"), rect);
      const clipperRect = $("#clipper-a")?.getBoundingClientRect();
      if (clipperRect) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(clipperRect.left - rect.left, clipperRect.top - rect.top, clipperRect.width, clipperRect.height);
        ctx.clip();
        const opacity = mode === "fade" ? Number.parseFloat(getComputedStyle($("#wrapper-a")).opacity || "1") : 1;
        drawTransformed(ctx, imageA, $("#wrapper-a"), rect, 0, 0, opacity, diff ? "difference" : "source-over", diff ? "contrast(3) brightness(1.8)" : "none");
        ctx.restore();
      }
    }

    const badgeA = $("#filename-badge-a");
    const badgeB = $("#filename-badge-b");
    if (badgeA && !badgeA.classList.contains("hidden")) {
      const nameA = $("#badge-name-a")?.textContent?.split("•")[0]?.trim() || "Image A";
      drawLabel(ctx, `A  ${nameA}`, 16, 16, "#8ec5ff");
    }
    if (badgeB && !badgeB.classList.contains("hidden")) {
      const nameB = $("#badge-name-b")?.textContent?.split("•")[0]?.trim() || "Image B";
      drawLabel(ctx, `B  ${nameB}`, Math.max(16, rect.width - 276), 16, "#72ddb7");
    }
    return canvas;
  }

  function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Could not create PNG"));
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        resolve();
      }, "image/png");
    });
  }

  async function exportCurrentView() {
    const a = getHasImage(imageA) || getHasImage(imageSplitA);
    const b = getHasImage(imageB) || getHasImage(imageSplitB);
    if (!a || !b) {
      toast(isEnglish() ? "Load both images before exporting the comparison." : "Для экспорта сравнения загрузите оба изображения.");
      return;
    }
    const canvas = drawVisibleComparison();
    await downloadCanvas(canvas, "photocheck-comparison.png");
    toast(isEnglish() ? "Comparison exported as PNG." : "Сравнение сохранено в PNG.");
  }

  async function exportSingleImage(which) {
    const img = which === "a" ? imageA : imageB;
    if (!getHasImage(img)) {
      toast(isEnglish() ? `Image ${which.toUpperCase()} is not loaded.` : `Изображение ${which.toUpperCase()} не загружено.`);
      return;
    }
    const scale = Math.min(1, Math.sqrt(80_000_000 / (img.naturalWidth * img.naturalHeight)), 16000 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    await downloadCanvas(canvas, `photocheck-image-${which.toUpperCase()}.png`);
    toast(scale < 1
      ? (isEnglish() ? `Image ${which.toUpperCase()} exported at reduced size due to browser limits.` : `Изображение ${which.toUpperCase()} уменьшено до безопасного размера из-за ограничений браузера.`)
      : (isEnglish() ? `Image ${which.toUpperCase()} exported as PNG.` : `Изображение ${which.toUpperCase()} сохранено в PNG.`));
  }

  async function exportOriginalPair() {
    if (!getHasImage(imageA) || !getHasImage(imageB)) {
      toast(isEnglish() ? "Load both images before exporting the pair." : "Для экспорта пары загрузите оба изображения.");
      return;
    }
    const gap = 24;
    const width = imageA.naturalWidth + imageB.naturalWidth + gap;
    const height = Math.max(imageA.naturalHeight, imageB.naturalHeight);
    const pixelBudgetScale = Math.sqrt(80_000_000 / (width * height));
    const dimensionScale = 18000 / Math.max(width, height);
    const scale = Math.min(1, pixelBudgetScale, dimensionScale);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#10141d";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(imageA, 0, 0);
    ctx.drawImage(imageB, imageA.naturalWidth + gap, 0);
    await downloadCanvas(canvas, "photocheck-originals-side-by-side.png");
    toast(scale < 1
      ? (isEnglish() ? "Pair exported side by side at a reduced size due to browser limits." : "Пара сохранена рядом в уменьшенном размере из-за ограничений браузера.")
      : (isEnglish() ? "Images exported side by side." : "Изображения сохранены рядом в одном PNG."));
  }

  // The former Compare button was only visual; make it return focus to the active comparison setup.
  $("#btn-compare-action")?.addEventListener("click", () => {
    const hasA = getHasImage(imageA) || getHasImage(imageSplitA);
    const hasB = getHasImage(imageB) || getHasImage(imageSplitB);
    if (!hasA || !hasB) {
      toast(isEnglish() ? "Choose image A and image B first." : "Сначала выберите изображения A и B.");
      welcome?.querySelector(".studio-welcome-slot:not(.loaded)")?.focus();
      return;
    }
    const activePreset = $("[data-preset].active")?.dataset.preset || "curtain";
    applyComparisonPreset(activePreset);
    toast(isEnglish() ? "Comparison view is ready." : "Режим сравнения применён.");
  });

  // Restore remembered tabs/layout, but always keep a safe default if storage is unavailable.
  try {
    const savedLayout = localStorage.getItem("photocheck-studio-layout");
    if (savedLayout && ["standard", "focus", "inspect"].includes(savedLayout)) setLayout(savedLayout, false);
    const savedToolTab = localStorage.getItem("photocheck-studio-tools-tab");
    if (savedToolTab && ["auto", "points", "adjust"].includes(savedToolTab)) setToolTab(savedToolTab);
    const savedInspectorTab = localStorage.getItem("photocheck-studio-inspector-tab");
    if (savedInspectorTab && ["files", "compare", "details"].includes(savedInspectorTab)) setInspectorTab(savedInspectorTab);
    const savedPreset = localStorage.getItem("photocheck-studio-compare");
    if (savedPreset && ["curtain", "overlay", "split", "difference", "blink"].includes(savedPreset)) {
      applyComparisonPreset(savedPreset === "blink" ? "curtain" : savedPreset);
    }
  } catch {
    // Preferences are conveniences only; the application remains fully usable without storage.
  }

  updateImageState();
  // Keep the orientation control in sync with the default or restored comparison preset.
  const activePreset = $("[data-preset].active")?.dataset.preset || "curtain";
  $("#group-slider-controls")?.classList.toggle("hidden", activePreset !== "curtain");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initStudio, { once: true });
} else {
  initStudio();
}
