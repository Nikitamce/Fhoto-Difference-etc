const STORAGE_KEY = "photocheck_settings";

export const DEFAULT_SETTINGS = {
  theme: "system", // "system" | "dark" | "light"
  accent: "indigo", // "indigo" | "cyan" | "emerald" | "amber" | "rose"
  backdrop: "checkerboard", // "checkerboard" | "dark" | "neutral" | "black" | "white"
  density: "standard", // "compact" | "standard"
  imageRendering: "pixelated-zoom", // "auto" | "pixelated" | "pixelated-zoom"
  wheelZoomSpeed: 0.15, // 0.08 | 0.15 | 0.25
  curtainStyle: "pill", // "pill" | "minimal" | "glow"
  autoHideBadges: false,
  pixelProbe: true,
  autoAlignOnLoad: "none", // "none" | "match-sizes" | "auto-edge"
  defaultDiffMode: "difference", // "difference" | "heatmap" | "threshold"
  diffGain: 3, // 1..8
  nudgeStep: 1, // 1 | 2 | 5
  autoComputeMetrics: true,
};

const ACCENT_PRESETS = {
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
    contrastText: "#0f172a",
  },
  rose: {
    light: "#e11d48",
    dark: "#f43f5e",
    hoverLight: "#be123c",
    hoverDark: "#fb7185",
    contrastText: "#ffffff",
  },
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
    const metaScheme = document.querySelector('meta[name="color-scheme"]');
    const themeVal = this.settings.theme === "light" || this.settings.theme === "dark"
      ? this.settings.theme
      : "light dark";

    if (metaScheme) {
      metaScheme.setAttribute("content", themeVal);
    }

    // Also reflect explicit attributes for CSS styling hooks & older browsers
    root.dataset.theme = this.getResolvedTheme();
    root.dataset.themePref = this.settings.theme;
    root.dataset.backdrop = this.settings.backdrop;
    root.dataset.density = this.settings.density;
    root.dataset.curtainStyle = this.settings.curtainStyle;
    root.dataset.autoHideBadges = String(Boolean(this.settings.autoHideBadges));

    const accent = ACCENT_PRESETS[this.settings.accent] || ACCENT_PRESETS.indigo;
    root.style.setProperty("--accent-light", accent.light);
    root.style.setProperty("--accent-dark", accent.dark);
    root.style.setProperty("--accent-hover-light", accent.hoverLight);
    root.style.setProperty("--accent-hover-dark", accent.hoverDark);
    root.style.setProperty("--accent-contrast", accent.contrastText);
    root.dataset.accent = this.settings.accent;
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
