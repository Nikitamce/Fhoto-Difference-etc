# PhotoCheck — Visual Photo & Image Comparison Tool 🔍

[**Читать на русском языке 🇷🇺**](README_RU.md) | **English 🇬🇧**

**PhotoCheck** is a powerful, privacy-focused, offline-first web application for precise visual image comparison, alignment, and pixel-difference analysis. Built for game developers, QA engineers, graphic designers, digital archivists, and photography enthusiasts.

It allows you to load two images, align them using AI or multi-point geometric transformations, and spot even the subtlest visual differences using curtain sliders, fade overlays, fast blinking, and pixel difference highlighting.
<img width="1857" height="907" alt="Screenshot 2026-07-26 at 17-16-55 PhotoCheck — Visual Photo Comparison" src="https://github.com/user-attachments/assets/ac4c505f-2452-4573-8fb7-d85f52e69762" />
<img width="1857" height="907" alt="Screenshot 2026-07-26 at 17-16-38 PhotoCheck — Visual Photo Comparison" src="https://github.com/user-attachments/assets/5e0d7a67-0d3f-4181-ae30-ff71a70988bb" />

---

## ✨ Key Features

- 🔒 **Local processing**: selected images are processed in the browser on your computer; after dependencies are installed, photographs are not uploaded to a server. No remote web fonts are required.
- 🔍 **4 Versatile Comparison Modes**:
  - **Curtain (Slider)**: Drag an interactive vertical or horizontal curtain line to slice between Image A and Image B.
  - **Overlay (Fade)**: Adjust Image A transparency (0% to 100%), with manual flash and auto-blink interval controls.
  - **Side-by-Side (Split)**: View both images side by side with synchronized panning and zooming.
  - **Diff Highlighting**: Mathematical pixel subtraction (`|Image A - Image B|`) with high contrast boost to light up changed pixels in neon colors.
- 🤖 **Comprehensive Alignment Tools**:
  - **AI Auto-Align (OpenCV)**: Uses ORB keypoint detection + RANSAC homography for automatic feature matching.
  - **Auto Edge Match**: Fast multi-resolution ZNCC (Zero-Mean Normalized Cross-Correlation) alignment on hybrid Sobel gradient and contrast maps. Automatically filters out dark background bars to lock onto UI text, game scenes, and edges.
  - **1-Point Alignment**: Center and translate Image B to align a single reference point.
  - **2-Point Alignment**: Align position and scale relative to 2 reference points.
  - **3-Point Alignment**: Affine rotation, scaling, and translation matching 3 reference points.
  - **4-Point Perspective Warp**: Homography transformation to correct tilted document scans, angled camera shots, or distorted photos.
- 🔎 **Ultra-Zoom up to 1000%**: Synchronized panning and focal-point mouse wheel zooming up to 10x magnification.
- 🌐 **Full Multi-Language Support (i18n)**: On-the-fly switching between English 🇬🇧 and Russian 🇷🇺.
- 📊 **Metadata & Inspection Panel**: image resolution, file format, file size, and modified date. EXIF, ICC profile, DPI, and bit depth are not extracted by this version and are clearly marked as unavailable.
- 🎨 **PhotoCheck Studio UI**: a redesigned workspace with dedicated Auto, Points, and Adjust tool tabs plus a Files / Compare / Details inspector.
- 🧩 **Three workspace layouts**: Standard, Focus (hide side panels), and Inspect; the selected layout is remembered locally.
- ⚡ **One-click comparison presets**: Curtain, Overlay, Side-by-Side, Difference, and Blink.
- 📤 **PNG export**: save the current comparison composition, both originals side by side, or either source image individually.
- 🧪 **Demo pair**: load two sample images in development mode without browsing for files.

---

## 🚀 Quick Start

> **Important:** do not open `index.html` by double-clicking it. Browsers block ES modules on `file://` URLs, so the UI can appear while its buttons remain unbound.

### Easiest local launch (no npm install)

1. Install **Node.js 18 or newer** from <https://nodejs.org/>.
2. Extract the entire project archive.
3. On Windows, run `START-WINDOWS.bat`.
4. Open `http://127.0.0.1:4173/`. Keep the server window open while using PhotoCheck.

This uses the included `server.mjs` and does not require installing npm packages.

### Terminal launch on any OS
```bash
node server.mjs
```
Then open `http://127.0.0.1:4173/`.

### Vite development setup
```bash
npm ci
npm run dev
```
Open the local URL printed by Vite (usually `http://localhost:5173`). Image processing runs locally in the browser.

### Build Single-File HTML Output
To bundle the application into a single standalone HTML file:
```bash
npm run build
```
The standalone HTML output is created at `dist/index.html`. You may rename it to `PhotoCheck_Portable.html` and open it in a modern browser. The generated portable file is intentionally not included in this source archive; rebuild it from the current sources after changes.

---

## 🌍 Community Localization & Translation Guide

We welcome contributions to translate **PhotoCheck** into new languages (German, French, Spanish, Chinese, Japanese, etc.)!

### How to Add a New Language

1. **Fork & Clone Repository**:
   ```bash
   git clone https://github.com/Nikitamce/Fhoto-Difference-etc.git
   cd Fhoto-Difference-etc
   ```

2. **Add Translation Dictionary in [`src/i18n.js`](src/i18n.js)**:
   Open `src/i18n.js` and add your language code (e.g. `de` for German) inside the `translations` object:
   ```javascript
   const translations = {
     ru: { ... },
     en: { ... },
     de: {
       appTitle: "PhotoCheck — Visueller Fotovergleich",
       modeSlider: "Vorhang (Slider)",
       modeFade: "Überlagerung (Fade)",
       // Translate all remaining key-value pairs
     }
   };
   ```

3. **Add Language Option to Dropdown in [`index.html`](index.html)**:
   Inside `index.html`, locate `#lang-dropdown-menu` and add your new language button:
   ```html
   <button class="dropdown-item lang-option" data-lang="de">🇩🇪 Deutsch (DE)</button>
   ```

4. **Update Language Switcher Flag & Code in [`src/i18n.js`](src/i18n.js)**:
   In `I18nManager.updateUI()`, add your flag and code handler:
   ```javascript
   if (this.currentLang === "de") {
     currentFlagEl.textContent = "🇩🇪";
     currentCodeEl.textContent = "DE";
   }
   ```

5. **Test Your Translation Locally**:
   ```bash
   npm run dev
   ```

6. **Build & Submit a Pull Request (PR)**:
   ```bash
   npm run build
   git checkout -b feature/add-german-translation
   git add src/i18n.js index.html styles.css
   git commit -m "feat(i18n): Add German translation"
   git push origin feature/add-german-translation
   ```
   Open a **Pull Request** on GitHub to `Nikitamce/Fhoto-Difference-etc`. We will review and merge it into `main`!

---

## 🛠 Tech Stack & Architecture

- **Core**: Vanilla JavaScript (ES6+ Modules), HTML5 Canvas 2D.
- **Styling**: Vanilla CSS3 with CSS Variables, Flexbox, CSS Grid, and Glassmorphism design tokens.
- **Computer Vision**: OpenCV.js (Embedded WASM / JS) for ORB feature detection & RANSAC homography.
- **Algorithms**: Multi-resolution Coarse-to-Fine Sobel Gradient ZNCC (Zero-Mean Normalized Cross-Correlation), Bilinear feature map interpolation.
- **Bundler**: Vite + `vite-plugin-singlefile` for zero-dependency single-file HTML compilation.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for details.
