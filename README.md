# PhotoCheck — Visual Photo & Image Comparison Tool 🔍

[**Читать на русском языке 🇷🇺**](README_RU.md) | **English 🇬🇧**

**PhotoCheck** is a powerful, privacy-focused, offline-first web application for precise visual image comparison, alignment, and pixel-difference analysis. Built for game developers, QA engineers, graphic designers, digital archivists, and photography enthusiasts.

It allows you to load two images, align them using AI or multi-point geometric transformations, and spot even the subtlest visual differences using curtain sliders, fade overlays, fast blinking, and pixel difference highlighting.
<img width="1857" height="907" alt="Screenshot 2026-07-26 at 17-16-55 PhotoCheck — Visual Photo Comparison" src="https://github.com/user-attachments/assets/ac4c505f-2452-4573-8fb7-d85f52e69762" />
<img width="1857" height="907" alt="Screenshot 2026-07-26 at 17-16-38 PhotoCheck — Visual Photo Comparison" src="https://github.com/user-attachments/assets/5e0d7a67-0d3f-4181-ae30-ff71a70988bb" />

---

## ✨ Key Features

- 🚀 **100% Offline & Single-File Portable**: Runs directly in any web browser without installation (`PhotoCheck_Portable.html`). Includes embedded OpenCV.js engine and zero external server dependencies.
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
- 📊 **Metadata & Inspection Panel**: Detailed resolution, file format, file size, color depth, alpha channel, and DPI inspection.

---

## 🚀 Quick Start

### Method 1: Portable HTML File (No Installation Required)
Simply download [**`PhotoCheck_Portable.html`**](PhotoCheck_Portable.html) from this repository and open it in any modern web browser (Chrome, Firefox, Edge, Safari, Opera).

### Method 2: Local Development Setup
```bash
# 1. Clone repository
git clone https://github.com/Nikitamce/Fhoto-Difference-etc.git
cd Fhoto-Difference-etc

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

### Build Single-File HTML Output
To bundle the application into a single standalone HTML file:
```bash
npm run build
```
The output will be created in `dist/index.html`. Copy `dist/index.html` to `PhotoCheck_Portable.html`.

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
   git add src/i18n.js index.html PhotoCheck_Portable.html
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
