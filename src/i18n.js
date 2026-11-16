const translations = {
  ru: {
    appTitle: "PhotoCheck — Визуальное сравнение фото",
    loadSectionTitle: "Загрузка изображений",
    photoALabel: "Изображение A",
    photoBLabel: "Изображение B",
    dragDropHint: "Перетащите фото сюда или кликните для выбора",
    changePhoto: "Заменить фото",
    
    // Header & Sidebar Titles
    sidebarAlignment: "ВЫРАВНИВАНИЕ",
    sidebarInfo: "ИНФОРМАЦИЯ",
    sectionExtra: "ДОПОЛНИТЕЛЬНО",
    accToolsTitle: "ИНСТРУМЕНТЫ И ПОДГОНКА",
    accCompareTitle: "НАСТРОЙКИ СРАВНЕНИЯ",
    accFiltersTitle: "ФИЛЬТРЫ И МИГАНИЕ",
    accExtraTitle: "ДОПОЛНИТЕЛЬНО (EXIF & КАНАЛЫ)",
    colorSpaceTitle: "ЦВЕТОВОЕ ПРОСТРАНСТВО",
    exifTitle: "EXIF МЕТАДАННЫЕ",
    similarityScoreLabel: "Сходство кадров:",

    // Metadata Labels
    metaResolution: "Разрешение:",
    metaFormat: "Формат:",
    metaSize: "Размер:",
    metaDate: "Дата:",
    colorProfile: "Цветовой профиль:",
    colorDepth: "Глубина цвета:",
    alphaChannel: "Альфа-канал:",
    supported: "Поддерживается",
    deviceLabel: "Камера / Устройство:",
    stdImage: "Стандартное изображение",
    dpiLabel: "Плотность (DPI):",
    compressionLabel: "Сжатие:",
    lossless: "Без потерь (Lossless)",

    // Modes
    modeSlider: "Шторка (Slider)",
    modeFade: "Наложение (Fade)",
    modeSplit: "Рядом (Split)",

    // Mode specific controls
    opacityLabel: "Прозрачность A:",
    orientationLabel: "Ориентация шторки:",
    orientationHoriz: "Вертикальная линия",
    orientationVert: "Горизонтальная линия",
    flashToggle: "Быстрое мигание",
    autoBlink: "Авто-мигание",
    blinkInterval: "Интервал (сек):",
    preset0: "0%",
    preset50: "50%",
    preset100: "100%",

    // Size Match & Alignment
    alignMethodTitle: "Способ совмещения:",
    matchSizes: "Совместить размер",
    scaleALabel: "Размер A:",
    scaleBLabel: "Размер B:",
    alignA: "Подгонка A",
    alignB: "Подгонка B",
    alignOnePoint: "По 1 точке",
    alignTwoPoints: "По 2 точкам",
    alignThreePoints: "По 3 точкам (Поворот)",
    alignFourPoints: "По 4 точкам (Перспектива)",
    alignWarp: "Деформация перспективы (4 точки)",
    alignAutoEdge: "Найти контуры (Авто)",
    alignAutoOpenCV: "Автовыравнивание AI (OpenCV)",
    alignTwoPointsHint: "Кликните 2 точки на фото A, затем 2 такие же точки на фото B для авто-совмещения",
    alignPointA1: "Кликните Точку 1 на фото A",
    alignPointA2: "Кликните Точку 2 на фото A",
    alignPointA3: "Кликните Точку 3 на фото A",
    alignPointA4: "Кликните Точку 4 на фото A",
    alignPointB1: "Кликните Точку 1 на фото B",
    alignPointB2: "Кликните Точку 2 на фото B",
    alignPointB3: "Кликните Точку 3 на фото B",
    alignPointB4: "Кликните Точку 4 на фото B",
    alignPoint1A: "Кликните Точку на фото A",
    alignPoint1B: "Кликните ту же Точку на фото B",
    clickOnAError: "Пожалуйста, кликните на ИЗОБРАЖЕНИЕ A!",
    clickOnBError: "Пожалуйста, кликните на ИЗОБРАЖЕНИЕ B!",
    showFilenames: "Имена файлов",
    diffOverlay: "Подсветка разницы (Diff)",

    // Navigation & Zoom
    zoomLabel: "Масштаб:",
    fitWindow: "По размеру окна",
    actualSize: "Фактический размер",
    showBoth: "Показать обе",
    syncZoom: "Синхронизировать зум",
    preset200: "200%",
    preset500: "500%",
    preset1000: "1000%",
    
    // Actions & Bottom Panel
    centerBoth: "Центрировать",
    resetView: "Сбросить все",
    swapPhotos: "Поменять местами",
    uploadA: "Загрузить изображение A",
    uploadB: "Загрузить изображение B",
    dragOrClick: "или перетащите файл сюда",
    openPair: "Открыть пару файлов",
    btnCompare: "Сравнить",
    btnExport: "Скачать PNG",
    compareReady: "Режим сравнения готов",
    exportReady: "Снимок сравнения сохранён в PNG",
    exportError: "Не удалось создать PNG-файл",
    cancel: "Отмена",

    // Manual alignment
    alignmentMode: "Ручная подгонка",
    alignmentActiveHint: "Режим подгонки АКТИВЕН: двигайте фото B отдельно для совмещения ориентиров",
    alignmentInactiveHint: "Синхронизация АКТИВНА: фотографии перемещаются и зумируются одновременно",
    
    // Statuses & Errors
    noImageLoaded: "Загрузите обе фотографии для начала сравнения",
    imagesLoaded: "Изображения загружены и отцентрированы",
    invalidFile: "Пожалуйста, выберите файл изображения (JPG, PNG, WEBP и др.)",
    
    // Quick Help
    helpTitle: "Как сравнивать?",
    helpStep1: "1. Загрузите два изображения.",
    helpStep2: "2. Нажмите 'Ручная подгонка', если нужно совместить сдвинутые детали на фото.",
    helpStep3: "3. Переключайте режим: Шторка, Наложение или Рядом.",
    helpStep4: "4. Зумируйте до 1000% колесиком мыши или ползунком."
  },
  en: {
    appTitle: "PhotoCheck — Visual Photo Comparison",
    loadSectionTitle: "Image Upload",
    photoALabel: "Image A",
    photoBLabel: "Image B",
    dragDropHint: "Drag & drop image here or click to select",
    changePhoto: "Change photo",

    // Header & Sidebar Titles
    sidebarAlignment: "ALIGNMENT",
    sidebarInfo: "INFORMATION",
    sectionExtra: "ADDITIONAL",
    accToolsTitle: "TOOLS & ALIGNMENT",
    accCompareTitle: "COMPARISON SETTINGS",
    accFiltersTitle: "FILTERS & BLINKING",
    accExtraTitle: "EXTRA (EXIF & CHANNELS)",
    colorSpaceTitle: "COLOR SPACE",
    exifTitle: "EXIF METADATA",
    similarityScoreLabel: "Similarity Score:",

    // Metadata Labels
    metaResolution: "Resolution:",
    metaFormat: "Format:",
    metaSize: "Size:",
    metaDate: "Date:",
    colorProfile: "Color Profile:",
    colorDepth: "Color Depth:",
    alphaChannel: "Alpha Channel:",
    supported: "Supported",
    deviceLabel: "Camera / Device:",
    stdImage: "Standard Image",
    dpiLabel: "Density (DPI):",
    compressionLabel: "Compression:",
    lossless: "Lossless",
    
    // Modes
    modeSlider: "Curtain (Slider)",
    modeFade: "Overlay (Fade)",
    modeSplit: "Side-by-Side (Split)",

    // Mode specific controls
    opacityLabel: "Image A Opacity:",
    orientationLabel: "Slider Direction:",
    orientationHoriz: "Vertical Line",
    orientationVert: "Horizontal Line",
    flashToggle: "Fast Flash",
    autoBlink: "Auto Blink",
    blinkInterval: "Interval (sec):",
    preset0: "0%",
    preset50: "50%",
    preset100: "100%",

    // Size Match & Alignment
    alignMethodTitle: "Align Method:",
    matchSizes: "Match Image Sizes",
    scaleALabel: "Size A:",
    scaleBLabel: "Size B:",
    alignA: "Align A",
    alignB: "Align B",
    alignOnePoint: "By 1 Point",
    alignTwoPoints: "By 2 Points",
    alignThreePoints: "By 3 Points (Rotate)",
    alignFourPoints: "By 4 Points (Perspective)",
    alignWarp: "Perspective Warp (4 points)",
    alignAutoEdge: "Auto Edge Match",
    alignAutoOpenCV: "AI Auto-Align (OpenCV)",
    alignTwoPointsHint: "Click 2 reference points on Photo A, then 2 matching points on Photo B to auto-fit",
    alignPointA1: "Click Point 1 on Photo A",
    alignPointA2: "Click Point 2 on Photo A",
    alignPointA3: "Click Point 3 on Photo A",
    alignPointA4: "Click Point 4 on Photo A",
    alignPointB1: "Click Point 1 on Photo B",
    alignPointB2: "Click Point 2 on Photo B",
    alignPointB3: "Click Point 3 on Photo B",
    alignPointB4: "Click Point 4 on Photo B",
    alignPoint1A: "Click Reference Point on Photo A",
    alignPoint1B: "Click Same Point on Photo B",
    clickOnAError: "Please click on IMAGE A!",
    clickOnBError: "Please click on IMAGE B!",
    showFilenames: "Filenames",
    diffOverlay: "Diff Highlighting",

    // Navigation & Zoom
    zoomLabel: "Zoom:",
    fitWindow: "Fit to Window",
    actualSize: "Actual Size (1:1)",
    showBoth: "Show Both",
    syncZoom: "Sync Zoom",
    preset200: "200%",
    preset500: "500%",
    preset1000: "1000%",
    
    // Actions & Bottom Panel
    centerBoth: "Center Both",
    resetView: "Reset All",
    swapPhotos: "Swap Photos",
    uploadA: "Upload Image A",
    uploadB: "Upload Image B",
    dragOrClick: "or drag & drop file here",
    openPair: "Open Pair of Files",
    btnCompare: "Compare",
    btnExport: "Export PNG",
    compareReady: "Comparison view is ready",
    exportReady: "Comparison snapshot saved as PNG",
    exportError: "Could not create the PNG file",
    cancel: "Cancel",

    // Manual alignment
    alignmentMode: "Manual Alignment",
    alignmentActiveHint: "Alignment mode ACTIVE: drag Photo B separately to match feature points",
    alignmentInactiveHint: "Sync ACTIVE: both photos pan & zoom in tandem",
    
    // Statuses & Errors
    noImageLoaded: "Load both photos to start comparison",
    imagesLoaded: "Images loaded and centered",
    invalidFile: "Please select an image file (JPG, PNG, WEBP, etc.)",
    
    // Quick Help
    helpTitle: "How to compare?",
    helpStep1: "1. Load two images.",
    helpStep2: "2. Toggle 'Manual Alignment' if you need to align offset details first.",
    helpStep3: "3. Switch between Curtain, Overlay, and Side-by-Side modes.",
    helpStep4: "4. Zoom up to 1000% using mouse wheel or zoom slider."
  }
};

class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem("photocheck_lang") || "ru";
  }

  get lang() {
    return this.currentLang;
  }

  setLanguage(lang) {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem("photocheck_lang", lang);
      this.updateUI();
      document.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));
    }
  }

  t(key) {
    const dict = translations[this.currentLang] || translations.ru;
    return dict[key] || translations.ru[key] || key;
  }

  updateUI() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const text = this.t(key);
      if (el.tagName === "INPUT" && el.type === "placeholder") {
        el.placeholder = text;
      } else {
        el.innerText = text;
      }
    });

    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      el.title = this.t(key);
    });

    // Update active state in lang buttons and dropdown badge
    document.querySelectorAll(".lang-btn, .lang-option").forEach(btn => {
      if (btn.dataset.lang === this.currentLang) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    const currentFlagEl = document.getElementById("current-lang-flag");
    const currentCodeEl = document.getElementById("current-lang-code");
    if (currentFlagEl && currentCodeEl) {
      if (this.currentLang === "en") {
        currentFlagEl.textContent = "🇬🇧";
        currentCodeEl.textContent = "EN";
      } else {
        currentFlagEl.textContent = "🇷🇺";
        currentCodeEl.textContent = "RU";
      }
    }
  }
}

export const i18n = new I18nManager();
