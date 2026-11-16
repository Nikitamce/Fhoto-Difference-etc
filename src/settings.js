const STORAGE_KEY = "photocheck_settings";

export const DEFAULT_SETTINGS = {
  theme: "dark", // "system" | "dark" | "light"
  accent: "violet", // "violet" | "indigo" | "cyan" | "emerald" | "amber" | "rose" | "lime"
  colorA: "sky", // "sky" | "indigo" | "emerald" | "amber" | "rose"
  colorB: "orange", // "orange" | "emerald" | "cyan" | "pink" | "violet"
  backdrop: "checkerboard", // "checkerboard" | "dark" | "neutral" | "black" | "white"
  density: "standard", // "compact" | "standard"
  uiScale: 1, // 0.9 | 1 | 1.1
  reduceMotion: "system", // "system" | "on" | "off"
  glassEffects: true,
  showQuickBar: true,
  autoHideBottomHud: true,
  showModeBottomStrip: true,
  imageRendering: "pixelated-zoom", // "auto" | "pixelated" | "pixelated-zoom"
  wheelZoomSpeed: 0.15, // 0.08 | 0.15 | 0.25
  curtainStyle: "pill", // "pill" | "minimal" | "glow"
  autoHideBadges: false,
  showFilenameBadges: true,
  pixelProbe: true,
  autoAlignOnLoad: "none", // "none" | "match-sizes" | "auto-edge"
  defaultDiffMode: "difference", // "difference" | "heatmap" | "threshold"
  diffGain: 3, // 1..8
  nudgeStep: 1, // 1 | 2 | 5
  autoComputeMetrics: true,
};

export const ACCENT_PRESETS = {
  violet: {
    light: "#6d5dfc",
    dark: "#7c6cff",
    hoverLight: "#5a49eb",
    hoverDark: "#9387ff",
    contrastText: "#ffffff",
  },
  indigo: {
    light: "#4f46e5",
    dark: "#6366f1",
    hoverLight: "#4338ca",
    hoverDark: "#818cf8",
    contrastText: "#ffffff",
  },
  cyan: {
    light: "#0284c7",
    dark: "#0ea5e9",
    hoverLight: "#0369a1",
    hoverDark: "#38bdf8",
    contrastText: "#ffffff",
  },
  emerald: {
    light: "#059669",
    dark: "#10b981",
    hoverLight: "#047857",
    hoverDark: "#34d399",
    contrastText: "#ffffff",
  },
  amber: {
    light: "#d97706",
    dark: "#f59e0b",
    hoverLight: "#b45309",
    hoverDark: "#fbbf24",
    contrastText: "#111111",
  },
  rose: {
    light: "#e11d48",
    dark: "#f43f5e",
    hoverLight: "#be123c",
    hoverDark: "#fb7185",
    contrastText: "#ffffff",
  },
  lime: {
    light: "#65a30d",
    dark: "#a3e635",
    hoverLight: "#4d7c0f",
    hoverDark: "#bef264",
    contrastText: "#111111",
  },
};

export const COLOR_A_PRESETS = {
  sky: { light: "#0284c7", dark: "#3ea6ff" },
  indigo: { light: "#4f46e5", dark: "#818cf8" },
  emerald: { light: "#059669", dark: "#3ccf91" },
  amber: { light: "#d97706", dark: "#f5b84a" },
  rose: { light: "#e11d48", dark: "#ff5d6c" },
};

export const COLOR_B_PRESETS = {
  orange: { light: "#ea580c", dark: "#ff8a3d" },
  emerald: { light: "#059669", dark: "#3ccf91" },
  cyan: { light: "#0891b2", dark: "#22d3ee" },
  pink: { light: "#db2777", dark: "#f472b6" },
  violet: { light: "#7c3aed", dark: "#a78bfa" },
};

class SettingsManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.listeners = new Set();
    this.load();
    this.bindSystemListeners();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  get(key) {
    return this.settings[key];
  }

  getAll() {
    return { ...this.settings };
  }

  set(key, value) {
    if (this.settings[key] === value) return;
    this.settings[key] = value;
    this.save();
    this.applyToDOM();
    this.emit(key, value);
  }

  update(patch) {
    Object.assign(this.settings, patch);
    this.save();
    this.applyToDOM();
    this.emit("*", this.settings);
  }

  reset() {
    this.settings = { ...DEFAULT_SETTINGS };
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
    this.applyToDOM();
    this.emit("*", this.settings);
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(key, value) {
    this.listeners.forEach((fn) => fn(this.settings, key, value));
  }

  getResolvedTheme() {
    if (this.settings.theme === "light" || this.settings.theme === "dark") {
      return this.settings.theme;
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  }

  getSystemTheme() {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  }

  applyToDOM() {
    const root = document.documentElement;
    const resolvedTheme = this.getResolvedTheme();
    const metaScheme = document.querySelector('meta[name="color-scheme"]');
    const themeVal =
      this.settings.theme === "light" || this.settings.theme === "dark"
        ? this.settings.theme
        : "light dark";

    if (metaScheme) {
      metaScheme.setAttribute("content", themeVal);
    }

    root.dataset.theme = resolvedTheme;
    root.dataset.themePref = this.settings.theme;
    root.dataset.backdrop = this.settings.backdrop;
    root.dataset.density = this.settings.density;
    root.dataset.curtainStyle = this.settings.curtainStyle;
    root.dataset.autoHideBadges = String(Boolean(this.settings.autoHideBadges));

    const accent = ACCENT_PRESETS[this.settings.accent] || ACCENT_PRESETS.violet;
    const isLight = resolvedTheme === "light";
    root.style.setProperty("--accent", isLight ? accent.light : accent.dark);
    root.style.setProperty("--accent-hover", isLight ? accent.hoverLight : accent.hoverDark);
    root.style.setProperty("--accent-contrast", accent.contrastText);
    root.dataset.accent = this.settings.accent;

    const cA = COLOR_A_PRESETS[this.settings.colorA] || COLOR_A_PRESETS.sky;
    const cB = COLOR_B_PRESETS[this.settings.colorB] || COLOR_B_PRESETS.orange;
    root.style.setProperty("--color-a", isLight ? cA.light : cA.dark);
    root.style.setProperty("--color-b", isLight ? cB.light : cB.dark);

    const uiScale = Number(this.settings.uiScale) || 1;
    root.style.setProperty("--ui-scale", String(uiScale));
    root.dataset.uiScale = String(uiScale);

    const motionPref = this.settings.reduceMotion || "system";
    if (motionPref === "on") {
      root.dataset.motion = "reduce";
    } else if (motionPref === "off") {
      root.dataset.motion = "allow";
    } else {
      const sysReduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      root.dataset.motion = sysReduce ? "reduce" : "allow";
    }

    root.classList.toggle("no-glass", this.settings.glassEffects === false);
  }

  bindSystemListeners() {
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (mql) {
      const onChange = () => {
        if (this.settings.theme === "system") {
          this.applyToDOM();
          this.emit("theme", "system");
        }
      };
      mql.addEventListener?.("change", onChange);
    }

    const motionMql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (motionMql) {
      motionMql.addEventListener?.("change", () => {
        if (this.settings.reduceMotion === "system") {
          this.applyToDOM();
        }
      });
    }

    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        this.load();
        this.applyToDOM();
        this.emit("*", this.settings);
      }
    });
  }
}

export const settings = new SettingsManager();
