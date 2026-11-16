export class ModesController {
  constructor(viewer, containerEl) {
    this.viewer = viewer;
    this.container = containerEl;
    this.currentMode = "slider"; // "slider" | "fade" | "split"

    this.opacity = 0.5; // for fade mode (0.0 to 1.0)
    this.sliderPos = 50; // for slider mode (0 to 100%)
    this.sliderOrientation = "vertical"; // "vertical" (left/right split) | "horizontal" (top/bottom split)

    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <!-- Single Viewport Container (for Slider & Fade) -->
      <div id="overlay-viewport" class="viewport mode-view">
        <div class="img-wrapper layer-b" id="wrapper-b">
          <img id="img-element-b" alt="" draggable="false" />
        </div>
        <div class="clipper-a" id="clipper-a">
          <div class="img-wrapper layer-a" id="wrapper-a">
            <img id="img-element-a" alt="" draggable="false" />
          </div>
        </div>
        <!-- Interactive Curtain Handle for Slider mode -->
        <div id="curtain-handle" class="curtain-handle">
          <div class="curtain-line"></div>
          <div class="curtain-thumb">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M8.5 17L3.5 12L8.5 7v10zm7 0V7l5 5-5 5z"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Dual Viewport Container (for Split mode) -->
      <div id="split-viewport" class="viewport mode-view hidden">
        <div class="split-pane pane-left" id="split-pane-a">
          <div class="split-badge">A</div>
          <div class="img-wrapper" id="wrapper-split-a">
            <img id="img-split-a" alt="" draggable="false" />
          </div>
        </div>
        <div class="split-divider"></div>
        <div class="split-pane pane-right" id="split-pane-b">
          <div class="split-badge">B</div>
          <div class="img-wrapper" id="wrapper-split-b">
            <img id="img-split-b" alt="" draggable="false" />
          </div>
        </div>
      </div>
    `;

    // Cache elements
    this.overlayViewport = this.container.querySelector("#overlay-viewport");
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
    if (mode === "split") {
      this.overlayViewport.classList.add("hidden");
      this.splitViewport.classList.remove("hidden");
    } else {
      this.splitViewport.classList.add("hidden");
      this.overlayViewport.classList.remove("hidden");

      if (mode === "slider") {
        this.curtainHandle.classList.remove("hidden");
        this.wrapperA.style.opacity = "1";
      } else if (mode === "fade") {
        this.curtainHandle.classList.add("hidden");
        this.clipperA.style.width = "100%";
        this.clipperA.style.height = "100%";
        this.wrapperA.style.opacity = this.opacity;
      }
    }
    this.render();
  }

  setOpacity(val) {
    this.opacity = Math.max(0, Math.min(1, val));
    if (this.currentMode === "fade") {
      this.wrapperA.style.opacity = this.opacity;
    }
  }

  setSliderPosition(posPercent) {
    this.sliderPos = Math.max(0, Math.min(100, posPercent));
    this.renderSlider();
  }

  setSliderOrientation(orient) {
    this.sliderOrientation = orient;
    this.renderSlider();
  }

  renderSlider() {
    if (this.currentMode !== "slider") return;

    const p = this.sliderPos;
    if (this.sliderOrientation === "vertical") {
      // Left side Photo A, right side Photo B
      this.clipperA.style.width = `${p}%`;
      this.clipperA.style.height = "100%";
      this.curtainHandle.style.left = `${p}%`;
      this.curtainHandle.style.top = "0px";
      this.curtainHandle.className = "curtain-handle curtain-vertical";
    } else {
      // Top side Photo A, bottom side Photo B
      this.clipperA.style.width = "100%";
      this.clipperA.style.height = `${p}%`;
      this.curtainHandle.style.top = `${p}%`;
      this.curtainHandle.style.left = "0px";
      this.curtainHandle.className = "curtain-handle curtain-horizontal";
    }
  }

  setupCurtainDrag() {
    let pointerId = null;

    const onPointerDown = (event) => {
      if (this.currentMode !== "slider" || !event.isPrimary) return;
      pointerId = event.pointerId;
      this.curtainHandle.setPointerCapture?.(pointerId);
      document.body.classList.add("user-select-none");
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerMove = (event) => {
      if (pointerId === null || event.pointerId !== pointerId) return;
      const rect = this.overlayViewport.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const percent = this.sliderOrientation === "vertical"
        ? ((event.clientX - rect.left) / rect.width) * 100
        : ((event.clientY - rect.top) / rect.height) * 100;
      this.setSliderPosition(percent);
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerUp = (event) => {
      if (pointerId === null || (event && event.pointerId !== pointerId)) return;
      pointerId = null;
      document.body.classList.remove("user-select-none");
    };

    this.curtainHandle.style.touchAction = "none";
    this.curtainHandle.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    this.curtainHandle.addEventListener("lostpointercapture", onPointerUp);
  }

  updateImages(srcA, srcB) {
    const syncSource = (img, src) => {
      if (!img) return;
      if (src) {
        if (img.getAttribute("src") !== src) img.src = src;
      } else {
        img.removeAttribute("src");
      }
    };
    syncSource(this.imgElA, srcA);
    syncSource(this.imgSplitA, srcA);
    syncSource(this.imgElB, srcB);
    syncSource(this.imgSplitB, srcB);
    this.render();
  }

  render() {
    const transformA = this.viewer.getTransformA();
    const transformB = this.viewer.getTransformB();

    const styleA = `translate3d(${transformA.x}px, ${transformA.y}px, 0) scale(${transformA.scale})`;
    let styleB = `translate3d(${transformB.x}px, ${transformB.y}px, 0) scale(${transformB.scale})`;
    if (transformB.matrix) {
      styleB += ` ${transformB.matrix}`;
    }

    if (this.currentMode === "split") {
      this.wrapperSplitA.style.transform = styleA;
      this.wrapperSplitB.style.transform = styleB;
    } else {
      this.wrapperA.style.transform = styleA;
      this.wrapperB.style.transform = styleB;
      if (this.currentMode === "slider") {
        this.renderSlider();
      }
    }
  }
}
