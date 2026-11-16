export class ModesController {
  constructor(viewer, containerEl) {
    this.viewer = viewer;
    this.container = containerEl;
    this.currentMode = "slider"; // "slider" | "fade" | "split" | "diff"

    this.opacity = 0.5; // 0.0 to 1.0 (fade mode)
    this.sliderPos = 50; // 0 to 100%
    this.sliderOrientation = "vertical"; // "vertical" | "horizontal"

    this.diffStyle = "difference"; // "difference" | "heatmap" | "threshold"
    this.diffGain = 3; // 1..8
    this.channelFilter = "all"; // "all" | "r" | "g" | "b" | "luma"
    this.imageRenderingPref = "pixelated-zoom"; // "auto" | "pixelated" | "pixelated-zoom"

    this.onCurtainChange = null;
    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <!-- Single Viewport Container (Slider, Fade, Diff) -->
      <div id="overlay-viewport" class="viewport mode-view">
        <div id="blend-stage" class="blend-stage">
          <div class="img-wrapper layer-b" id="wrapper-b">
            <img id="img-element-b" class="hidden" alt="Image B" draggable="false" />
          </div>
          <div class="clipper-a" id="clipper-a">
            <div class="img-wrapper layer-a" id="wrapper-a">
              <img id="img-element-a" class="hidden" alt="Image A" draggable="false" />
            </div>
          </div>
        </div>

        <!-- Interactive Curtain Handle -->
        <div
          id="curtain-handle"
          class="curtain-handle curtain-vertical hidden"
          role="slider"
          tabindex="0"
          aria-label="Comparison split position"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow="50"
          aria-orientation="horizontal"
        >
          <div class="curtain-line"></div>
          <div class="curtain-thumb">
            <span class="curtain-tag curtain-tag-a" aria-hidden="true">A</span>
            <svg class="i" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 7-5 5 5 5"/>
              <path d="m15 7 5 5-5 5"/>
            </svg>
            <span class="curtain-tag curtain-tag-b" aria-hidden="true">B</span>
          </div>
        </div>
      </div>

      <!-- Dual Viewport Container (Split mode) -->
      <div id="split-viewport" class="viewport mode-view hidden">
        <div class="split-pane pane-left" id="split-pane-a">
          <div class="split-badge split-badge-a">A</div>
          <div class="img-wrapper" id="wrapper-split-a">
            <img id="img-split-a" class="hidden" alt="Image A" draggable="false" />
          </div>
        </div>
        <div class="split-divider" aria-hidden="true"></div>
        <div class="split-pane pane-right" id="split-pane-b">
          <div class="split-badge split-badge-b">B</div>
          <div class="img-wrapper" id="wrapper-split-b">
            <img id="img-split-b" class="hidden" alt="Image B" draggable="false" />
          </div>
        </div>
      </div>
    `;

    this.overlayViewport = this.container.querySelector("#overlay-viewport");
    this.blendStage = this.container.querySelector("#blend-stage");
    this.splitViewport = this.container.querySelector("#split-viewport");

    this.clipperA = this.container.querySelector("#clipper-a");
    this.wrapperA = this.container.querySelector("#wrapper-a");
    this.wrapperB = this.container.querySelector("#wrapper-b");
    this.imgElA = this.container.querySelector("#img-element-a");
    this.imgElB = this.container.querySelector("#img-element-b");

    this.wrapperSplitA = this.container.querySelector("#wrapper-split-a");
    this.wrapperSplitB = this.container.querySelector("#wrapper-split-b");
    this.imgSplitA = this.container.querySelector("#img-split-a");
    this.imgSplitB = this.container.querySelector("#img-split-b");

    this.curtainHandle = this.container.querySelector("#curtain-handle");

    this.setupCurtainDrag();
  }

  setMode(mode) {
    this.currentMode = mode;
    this.container.classList.toggle("diff-mode", mode === "diff");
    this.container.dataset.mode = mode;

    if (mode === "split") {
      this.overlayViewport.classList.add("hidden");
      this.splitViewport.classList.remove("hidden");
    } else {
      this.splitViewport.classList.add("hidden");
      this.overlayViewport.classList.remove("hidden");

      if (mode === "slider") {
        this.wrapperA.style.opacity = "1";
      } else if (mode === "fade") {
        this.clipperA.style.width = "100%";
        this.clipperA.style.height = "100%";
        this.wrapperA.style.opacity = String(this.opacity);
      } else if (mode === "diff") {
        this.clipperA.style.width = "100%";
        this.clipperA.style.height = "100%";
        this.wrapperA.style.opacity = "1";
      }
    }

    this.syncCurtainVisibility();
    this.applyVisualFilters();
    this.render();
  }

  syncCurtainVisibility() {
    if (!this.curtainHandle) return;
    const hasAny =
      !this.imgElA.classList.contains("hidden") ||
      !this.imgElB.classList.contains("hidden");
    const show = this.currentMode === "slider" && hasAny;
    this.curtainHandle.classList.toggle("hidden", !show);
  }

  setOpacity(val) {
    this.opacity = Math.max(0, Math.min(1, val));
    if (this.currentMode === "fade") {
      this.wrapperA.style.opacity = String(this.opacity);
    }
  }

  setSliderPosition(posPercent) {
    this.sliderPos = Math.max(0, Math.min(100, posPercent));
    this.curtainHandle?.setAttribute("aria-valuenow", String(Math.round(this.sliderPos)));
    this.renderSlider();
    this.onCurtainChange?.(this.sliderPos);
  }

  setSliderOrientation(orient) {
    this.sliderOrientation = orient;
    this.curtainHandle?.setAttribute(
      "aria-orientation",
      orient === "vertical" ? "horizontal" : "vertical"
    );
    this.renderSlider();
  }

  setDiffConfig({ style, gain }) {
    if (style) this.diffStyle = style;
    if (typeof gain === "number") this.diffGain = Math.max(1, Math.min(8, gain));
    this.applyVisualFilters();
  }

  setChannelFilter(channel) {
    this.channelFilter = channel || "all";
    this.applyVisualFilters();
  }

  setImageRenderingPref(pref) {
    this.imageRenderingPref = pref || "pixelated-zoom";
    this.applyImageRendering();
  }

  applyImageRendering() {
    const scale = this.viewer?.scale || 1;
    let mode = "auto";
    if (this.imageRenderingPref === "pixelated") {
      mode = "pixelated";
    } else if (this.imageRenderingPref === "pixelated-zoom" && scale >= 1.5) {
      mode = "pixelated";
    }
    this.container.dataset.pixelRendering = mode;
  }

  applyVisualFilters() {
    const channelMap = {
      all: "",
      r: "url(#pc-filter-r)",
      g: "url(#pc-filter-g)",
      b: "url(#pc-filter-b)",
      luma: "url(#pc-filter-luma)",
    };
    const chFilter = channelMap[this.channelFilter] || "";

    [this.imgElA, this.imgElB, this.imgSplitA, this.imgSplitB].forEach((img) => {
      if (img) img.style.filter = chFilter;
    });

    if (!this.blendStage) return;

    if (this.currentMode === "diff") {
      const gain = this.diffGain;
      if (this.diffStyle === "heatmap") {
        const boost = 0.9 + gain * 0.45;
        this.blendStage.style.filter = `brightness(${boost.toFixed(2)}) url(#pc-diff-heatmap)`;
      } else if (this.diffStyle === "threshold") {
        const boost = 1 + gain * 0.65;
        this.blendStage.style.filter = `brightness(${boost.toFixed(2)}) url(#pc-diff-threshold)`;
      } else {
        const contrast = 100 + (gain - 1) * 55;
        const brightness = 100 + (gain - 1) * 32;
        this.blendStage.style.filter = `contrast(${contrast}%) brightness(${brightness}%)`;
      }
    } else {
      this.blendStage.style.filter = "";
    }
  }

  renderSlider() {
    if (this.currentMode !== "slider") return;

    const p = this.sliderPos;
    if (this.sliderOrientation === "vertical") {
      this.clipperA.style.width = `${p}%`;
      this.clipperA.style.height = "100%";
      this.curtainHandle.style.left = `${p}%`;
      this.curtainHandle.style.top = "0px";
      this.curtainHandle.classList.add("curtain-vertical");
      this.curtainHandle.classList.remove("curtain-horizontal");
    } else {
      this.clipperA.style.width = "100%";
      this.clipperA.style.height = `${p}%`;
      this.curtainHandle.style.top = `${p}%`;
      this.curtainHandle.style.left = "0px";
      this.curtainHandle.classList.add("curtain-horizontal");
      this.curtainHandle.classList.remove("curtain-vertical");
    }
  }

  setupCurtainDrag() {
    let isDraggingCurtain = false;

    const updateFromClient = (clientX, clientY) => {
      const rect = this.overlayViewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const percent =
        this.sliderOrientation === "vertical"
          ? ((clientX - rect.left) / rect.width) * 100
          : ((clientY - rect.top) / rect.height) * 100;
      this.setSliderPosition(percent);
    };

    this.curtainHandle.addEventListener("pointerdown", (e) => {
      if (this.currentMode !== "slider") return;
      isDraggingCurtain = true;
      this.curtainHandle.classList.add("dragging");
      try {
        this.curtainHandle.setPointerCapture(e.pointerId);
      } catch {
        // Ignore if unsupported
      }
      e.stopPropagation();
    });

    this.curtainHandle.addEventListener("pointermove", (e) => {
      if (!isDraggingCurtain) return;
      updateFromClient(e.clientX, e.clientY);
      e.stopPropagation();
    });

    const endDrag = (e) => {
      if (!isDraggingCurtain) return;
      isDraggingCurtain = false;
      this.curtainHandle.classList.remove("dragging");
      try {
        if (e.pointerId !== undefined) {
          this.curtainHandle.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore
      }
    };

    this.curtainHandle.addEventListener("pointerup", endDrag);
    this.curtainHandle.addEventListener("pointercancel", endDrag);

    this.curtainHandle.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this.setSliderPosition(50);
    });

    this.curtainHandle.addEventListener("keydown", (e) => {
      if (this.currentMode !== "slider") return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        this.setSliderPosition(this.sliderPos - step);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        this.setSliderPosition(this.sliderPos + step);
      } else if (e.key === "Home") {
        e.preventDefault();
        this.setSliderPosition(0);
      } else if (e.key === "End") {
        e.preventDefault();
        this.setSliderPosition(100);
      }
    });
  }

  updateImages(srcA, srcB) {
    if (srcA !== undefined) {
      this.imgElA.src = srcA || "";
      this.imgSplitA.src = srcA || "";
      this.imgElA.classList.toggle("hidden", !srcA);
      this.imgSplitA.classList.toggle("hidden", !srcA);
    }
    if (srcB !== undefined) {
      this.imgElB.src = srcB || "";
      this.imgSplitB.src = srcB || "";
      this.imgElB.classList.toggle("hidden", !srcB);
      this.imgSplitB.classList.toggle("hidden", !srcB);
    }
    this.syncCurtainVisibility();
  }

  render() {
    const transformA = this.viewer.getTransformA();
    const transformB = this.viewer.getTransformB();
    const splitTransformB = this.viewer.getSplitTransformB();

    const styleA = `translate3d(${transformA.x}px, ${transformA.y}px, 0) scale(${transformA.scale})`;
    let styleB = `translate3d(${transformB.x}px, ${transformB.y}px, 0) scale(${transformB.scale})`;
    if (transformB.matrix) {
      styleB += ` ${transformB.matrix}`;
    }

    let styleSplitB = `translate3d(${splitTransformB.x}px, ${splitTransformB.y}px, 0) scale(${splitTransformB.scale})`;
    if (splitTransformB.matrix) {
      styleSplitB += ` ${splitTransformB.matrix}`;
    }

    this.applyImageRendering();

    if (this.currentMode === "split") {
      this.wrapperSplitA.style.transform = styleA;
      this.wrapperSplitB.style.transform = styleSplitB;
    } else {
      this.wrapperA.style.transform = styleA;
      this.wrapperB.style.transform = styleB;
      if (this.currentMode === "slider") {
        this.renderSlider();
      }
    }
  }
}
