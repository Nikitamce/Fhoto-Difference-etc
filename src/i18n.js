const translations = {
  ru: {
    appTitle: "PhotoCheck — Визуальное сравнение и выравнивание фото",
    appSubtitle: "Studio",

    // Landmarks & Aria
    toggleLeftPanel: "Свернуть или развернуть левую панель инструментов",
    toggleRightPanel: "Свернуть или развернуть правую панель инспектора",
    toggleBottomPanel: "Свернуть или развернуть панель загрузки",
    toggleQuickBar: "Свернуть или развернуть панель быстрых действий",
    openSettings: "Настройки (Ctrl+,)",
    openHelp: "Справка и горячие клавиши",
    selectLanguage: "Выбрать язык интерфейса",
    zoomOut: "Уменьшить масштаб",
    zoomIn: "Увеличить масштаб",
    zoomPresets: "Пресеты масштаба",
    closeDialog: "Закрыть окно",

    // Header Modes
    modeSlider: "Шторка",
    modeFade: "Наложение",
    modeSplit: "Рядом",
    modeDiff: "Разница",
    modeBlink: "Мигание",
    orientationVert: "Вертикальная шторка (H)",
    orientationHoriz: "Горизонтальная шторка (H)",

    // Zoom
    fitWindow: "По окну (F)",
    actualSize: "1:1 / 100% (0)",
    fitShort: "По окну",

    // Left Dock (Alignment & Registration)
    sidebarAlignment: "Выравнивание",
    sectionAutoAlign: "Автоматическое",
    alignAutoOpenCV: "AI Перспектива (OpenCV)",
    alignAutoOpenCVHint: "ORB + RANSAC",
    alignAutoEdge: "По контурам",
    alignAutoEdgeHint: "Sobel + ZNCC",
    matchSizes: "По размеру",
    centerBoth: "Центрировать",

    sectionManualLayer: "Сдвиг слоя вручную",
    layerSync: "Синхронно",
    alignA: "Двигать A",
    alignB: "Двигать B",
    nudgeHint: "Перетаскивайте холст или используйте стрелки (Shift + стрелка = ×10)",
    offsetReadoutX: "Смещение X",
    offsetReadoutY: "Смещение Y",

    sectionPointAlign: "По реперным точкам",
    alignOnePoint: "1 точка",
    alignOnePointSub: "Сдвиг",
    alignTwoPoints: "2 точки",
    alignTwoPointsSub: "Масштаб",
    alignThreePoints: "3 точки",
    alignThreePointsSub: "Поворот",
    alignFourPoints: "4 точки",
    alignFourPointsSub: "Перспектива",

    sectionScaleCalib: "Калибровка масштаба",
    scaleALabel: "Масштаб A",
    scaleBLabel: "Масштаб B",
    resetScaleA: "Сбросить масштаб A",
    resetScaleB: "Сбросить масштаб B",
    resetView: "Сбросить трансформации",

    // Right Inspector
    sidebarInfo: "Инспектор",
    telemetryTitle: "Анализ сходства",
    similarityScoreLabel: "Сходство кадров",
    changedPixelsLabel: "Изменено",
    maxDeltaLabel: "Макс. ΔRGB",
    maeLabel: "Средняя Δ",
    computeMetricsBtn: "Пересчитать",
    waitingForBoth: "Загрузите оба кадра для расчёта",

    photoALabel: "Кадр A",
    photoBLabel: "Кадр B",
    notLoadedYet: "Не загружено",
    clickToUploadShort: "Выбрать файл",
    replacePhoto: "Заменить",

    accBlendTitle: "Наложение",
    accBlinkTitle: "Авто-мигание",
    blinkPause: "Пауза",
    blinkResume: "Мигать",
    blinkActiveFrame: "Текущий кадр",
    opacityLabel: "Прозрачность A",
    flashToggle: "Быстрая вспышка",
    autoBlink: "Авто-мигание",
    blinkInterval: "Интервал (с)",

    accDiffTitle: "Режим разницы и каналы",
    diffStyleLabel: "Стиль разницы",
    diffStyleDifference: "RGB Разница",
    diffStyleHeatmap: "Тепловая карта",
    diffStyleThreshold: "Маска отличий",
    diffGainLabel: "Усиление",
    channelFilterLabel: "Цветовой канал",
    channelAll: "Все",
    channelLuma: "Яркость",

    accMetaTitle: "Технические данные и EXIF",
    metaResolution: "Разрешение",
    metaFormat: "Формат",
    metaSize: "Размер",
    metaDate: "Изменён",
    metaAspect: "Пропорции",
    metaAlpha: "Альфа-канал",
    metaProfile: "Профиль",
    metaDepth: "Глубина",
    metaDpi: "Плотность",
    metaCompression: "Сжатие",
    metaCamera: "Камера",
    metaExposure: "Экспозиция",
    alphaPresent: "Есть прозрачность",
    alphaOpaque: "Непрозрачный",
    compLossless: "Без потерь",
    compLossy: "С потерями",
    compVector: "Векторное",
    compWebp: "WebP",
    compLzw: "LZW (GIF)",
    compStandard: "Стандартное",
    noExifData: "Нет EXIF",
    sourceClipboard: "Буфер обмена",
    sourceFile: "Локальный файл",

    // Empty State & Workspace
    emptyTitle: "Загрузите два изображения для сравнения",
    emptySubtitle: "Перетащите файлы сюда, вставьте из буфера (Ctrl+V) или выберите ниже",
    uploadA: "Загрузить изображение A",
    uploadB: "Загрузить изображение B",
    dragOrClick: "Перетащите или кликните",
    openPair: "Открыть пару файлов",
    loadDemoPair: "Загрузить демо-пару",
    demoLoadedHint: "Демо-пара загружена — попробуйте режимы шторки и выравнивания!",

    // Point Alignment Banner
    alignPoint1A: "Кликните точку привязки на кадре A",
    alignPoint1B: "Кликните ту же точку на кадре B",
    alignPointA1: "Кадр A: выберите точку 1",
    alignPointA2: "Кадр A: выберите точку 2",
    alignPointA3: "Кадр A: выберите точку 3",
    alignPointA4: "Кадр A: выберите точку 4",
    alignPointB1: "Кадр B: выберите точку 1",
    alignPointB2: "Кадр B: выберите точку 2",
    alignPointB3: "Кадр B: выберите точку 3",
    alignPointB4: "Кадр B: выберите точку 4",
    undoPoint: "Назад",
    cancel: "Отмена",

    // Quick Action Bar
    showBoth: "По окну (F)",
    swapPhotos: "Поменять A⇄B (X)",
    quickSwapShort: "A ⇄ B",
    syncZoom: "Синхр.",
    showFilenames: "Метки (B)",
    pixelProbeToggle: "Пиксель-лупа (I)",
    quickProbeShort: "Лупа",
    quickUploadToggle: "Загрузка",
    quickActionsLabel: "Панель",

    // Bottom Dock
    btnCompare: "Авто-сравнить",
    btnExport: "Экспорт",
    exportCurrent: "Текущий вид (PNG)",
    exportCurrentDesc: "С учётом шторки, прозрачности или разницы",
    exportSplit: "Рядом 1:1 (PNG)",
    exportSplitDesc: "Оба изображения с подписями",
    exportDiff: "Карта разницы (PNG)",
    exportDiffDesc: "Усиленное вычитание пикселей",
    exportClipboard: "Копировать в буфер",
    exportClipboardDesc: "Снимок текущего сравнения",

    // Pixel Probe HUD
    probeDelta: "ΔRGB",
    probeOutside: "Наведите на изображение",

    // Settings Dialog
    settingsTitle: "Настройки PhotoCheck",
    settingsNavAppearance: "Внешний вид",
    settingsNavViewport: "Просмотр",
    settingsNavCompare: "Выравнивание",
    settingsNavShortcuts: "Клавиши",
    settingsNavAbout: "О программе",
    settingsNavGeneral: "Язык и сброс",
    doneBtn: "Готово",
    settingSaved: "Сохранено",

    settingThemeLabel: "Тема оформления",
    settingThemeDesc: "Выберите светлую, тёмную студию или синхронизацию с ОС",
    themeSystem: "Системная",
    themeDark: "Тёмная",
    themeLight: "Светлая",
    themeCurrentDark: "сейчас тёмная",
    themeCurrentLight: "сейчас светлая",

    settingAccentLabel: "Акцентный цвет",
    settingAccentDesc: "Цвет активных инструментов и управляющих элементов",

    settingColorALabel: "Цвет кадра A",
    settingColorADesc: "Маркер и подсветка первого изображения",
    settingColorBLabel: "Цвет кадра B",
    settingColorBDesc: "Маркер и подсветка второго изображения",

    settingUiScaleLabel: "Масштаб интерфейса",
    settingUiScaleDesc: "Размер шрифтов и элементов панелей",

    settingReduceMotionLabel: "Уменьшение анимаций",
    settingReduceMotionDesc: "Отключает плавные переходы и эффекты движения",
    motionSystem: "Система",
    motionOn: "Вкл",
    motionOff: "Выкл",

    settingGlassLabel: "Эффект стекла (Blur)",
    settingGlassDesc: "Полупрозрачное размытие на плавающих панелях",

    settingQuickBarLabel: "Показывать панель быстрых действий",
    settingQuickBarDesc: "Плавающая панель поверх холста по умолчанию",

    settingAutoHideHudLabel: "Автоскрытие нижней панели (3 сек)",
    settingAutoHideHudDesc: "Скрывает плавающую панель поверх фото и показывает при наведении вниз",

    settingModeStripLabel: "Длинная полоса Наложения и Мигания снизу",
    settingModeStripDesc: "Удобный широкий ползунок прозрачности, вспышки и интервала над нижней панелью",

    stripOpacityShort: "Прозрачность A",
    stripIntervalShort: "Интервал",

    settingDefaultDiffLabel: "Режим разницы по умолчанию",
    settingDefaultDiffDesc: "Визуализация при переключении в «Разница»",
    settingDefaultDiffGainLabel: "Усиление разницы по умолчанию",
    settingDefaultDiffGainDesc: "Начальный коэффициент контраста отличий",

    sectionChannelsTitle: "Цветовой канал",
    modeHintSlider: "Перетаскивайте шторку для попиксельного сравнения A и B",
    modeHintSplit: "Оба изображения рядом. Используйте «Синхр.» для раздельного зума",
    pointBannerStep: "Кликните точку {curr} из {total} на фото {slot}",
    dropAsA: "Бросить как фото A",
    dropAsB: "Бросить как фото B",
    dropSlotHint: "Отпустите файл на нужную половину",
    pasteLoadedA: "Вставлено как фото A",
    pasteLoadedB: "Вставлено как фото B",
    pasteLoadedBoth: "Вставлены фото A и B",
    searchShortcutsPlaceholder: "Поиск горячих клавиш...",
    aboutDesc: "Офлайн-утилита для точного визуального сравнения, выравнивания и анализа разницы изображений.",
    aboutVersion: "Версия",
    aboutOffline: "Работает 100% офлайн — все данные остаются в браузере",
    aboutGithub: "Открыть на GitHub",
    hintKeyModes: "Режимы",
    hintKeyFit: "По окну",
    hintKeySwap: "Поменять A/B",
    hintKeyPaste: "Вставить",

    settingBackdropLabel: "Фон рабочей области",
    settingBackdropDesc: "Шахматная сетка помогает видеть прозрачность (Alpha)",
    backdropChecker: "Сетка (Alpha)",
    backdropDark: "Тёмный",
    backdropNeutral: "Серый 50%",
    backdropBlack: "Чёрный",
    backdropWhite: "Белый",

    settingDensityLabel: "Плотность интерфейса",
    settingDensityDesc: "Компактный режим освобождает больше места для фото",
    densityStandard: "Стандартный",
    densityCompact: "Компактный",

    settingRenderLabel: "Рендеринг при зуме",
    settingRenderDesc: "Чёткие пиксели без мыла при увеличении более 150%",
    renderPixelZoom: "Чёткие >150%",
    renderPixelAlways: "Всегда пиксели",
    renderAuto: "Сглаживание",

    settingZoomSpeedLabel: "Скорость зума колёсиком",
    settingZoomSpeedDesc: "Шаг масштабирования при прокрутке мыши",
    zoomSlow: "Плавно (8%)",
    zoomNormal: "Стандарт (15%)",
    zoomFast: "Быстро (25%)",

    settingCurtainLabel: "Стиль разделителя (Шторка)",
    settingCurtainDesc: "Внешний вид линии сравнения",
    curtainPill: "С маркером A/B",
    curtainGlow: "Неоновая линия",
    curtainMinimal: "Тонкая 1px",

    settingProbeLabel: "Показывать RGB-пробу при наведении",
    settingProbeDesc: "Координаты (X, Y) и точные значения пикселей A и B",
    settingAutoHideBadgesLabel: "Скрывать плашки имён при работе на холсте",
    settingAutoHideBadgesDesc: "Бейджи A и B затухают во время панорамирования",

    settingShowFilenamesLabel: "Показывать плашки имён файлов (B)",
    settingShowFilenamesDesc: "Отображает бейджи с именами кадров A и B поверх холста",

    settingAutoAlignLoadLabel: "При загрузке пары фото",
    settingAutoAlignLoadDesc: "Автоматическое действие после выбора второго кадра",
    autoLoadNone: "Только центрировать",
    autoLoadMatch: "Совместить размер",
    autoLoadEdge: "Авто-поиск контуров",

    settingAutoMetricsLabel: "Автоматически считать сходство пикселей",
    settingAutoMetricsDesc: "Вычисляет % совпадения и изменённые пиксели после загрузки/сдвига",

    settingNudgeLabel: "Шаг сдвига стрелками",
    settingNudgeDesc: "Базовое смещение слоя в режиме ручной подгонки",

    settingLanguageLabel: "Язык интерфейса",
    settingLanguageDesc: "Мгновенно переключает все подписи и подсказки",
    resetSettingsBtn: "Сбросить настройки по умолчанию",
    settingsResetDone: "Настройки сброшены по умолчанию",

    // Help & Shortcuts Dialog
    helpTitle: "Справка и горячие клавиши",
    helpIntro: "Быстрые советы по профессиональному сравнению и совмещению кадров:",
    helpStep1Title: "1. Загрузка",
    helpStep1: "Перетащите 1 или 2 файла на экран, кликните слоты A/B или вставьте скриншот через Ctrl+V.",
    helpStep2Title: "2. Выравнивание",
    helpStep2: "Если кадры сдвинуты или сняты под разным углом — используйте AI (OpenCV), По контурам или 1–4 точки.",
    helpStep3Title: "3. Анализ разницы",
    helpStep3: "Переключайте Шторку, Наложение, Рядом или Разницу (RGB / Тепловая карта / Маска).",
    helpStep4Title: "4. Детальный осмотр",
    helpStep4: "Зум до 1000% к точке курсора, цветовые каналы R/G/B/Luma и экспорт PNG в 1 клик.",
    shortcutsTitle: "Горячие клавиши",
    keyModes: "Режимы: Шторка / Наложение / Рядом / Разница / Мигание",
    keyOrientation: "Повернуть шторку (верт./гориз.)",
    keyFlashHold: "Удерживать — быстрая вспышка A↔B",
    keyFit: "Поместить в окно (Fit)",
    keyActual: "Фактический размер 1:1 (100%)",
    keySwap: "Поменять местами A и B",
    keyBadges: "Скрыть / показать бейджи имён",
    keyProbe: "Вкл / выкл RGB-пробу пикселей",
    keySettings: "Открыть настройки",
    keyNudge: "Сдвиг слоя (в режиме «Двигать A/B»)",

    // Status Toasts & Errors
    imagesLoaded: "Изображения загружены и выровнены по центру",
    invalidFile: "Поддерживаются форматы: PNG, JPG, WEBP, AVIF, GIF, BMP, SVG",
    pasteLoaded: "Изображение вставлено из буфера обмена",
    autoEdgeRunning: "Поиск общих контуров и масштаба...",
    autoEdgeSuccess: "Авто-совмещение завершено • Сходство: {score}%",
    autoEdgeFail: "Не удалось точно совместить контуры",
    opencvLoading: "Загрузка движка OpenCV...",
    opencvCompiling: "Инициализация оффлайн модуля OpenCV...",
    opencvPreparing: "Подготовка изображений...",
    opencvKeypoints: "Поиск ключевых точек (ORB)...",
    opencvMatching: "Сопоставление признаков...",
    opencvRansac: "Расчёт гомографии (RANSAC)...",
    opencvSuccess: "AI выравнивание OpenCV выполнено!",
    opencvError: "Ошибка OpenCV: {err}",
    exportSuccess: "Сохранено: {file}",
    exportCopied: "Сравнение скопировано в буфер обмена",
    exportError: "Ошибка экспорта: {err}",
    needBothImages: "Сначала загрузите оба изображения (A и B)",
    transformsReset: "Трансформации сброшены",
    compareSummary: "Сходство: {sim}% • Изменено: {chg}%",
  },

  en: {
    appTitle: "PhotoCheck — Visual Photo Comparison & Alignment",
    appSubtitle: "Studio",

    // Landmarks & Aria
    toggleLeftPanel: "Toggle left alignment dock",
    toggleRightPanel: "Toggle right inspector panel",
    toggleBottomPanel: "Toggle bottom upload dock",
    toggleQuickBar: "Toggle floating quick actions bar",
    openSettings: "Settings (Ctrl+,)",
    openHelp: "Help & keyboard shortcuts",
    selectLanguage: "Select interface language",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    zoomPresets: "Zoom presets",
    closeDialog: "Close dialog",

    // Header Modes
    modeSlider: "Curtain",
    modeFade: "Fade",
    modeSplit: "Split",
    modeDiff: "Diff",
    modeBlink: "Blink",
    orientationVert: "Vertical curtain (H)",
    orientationHoriz: "Horizontal curtain (H)",

    // Zoom
    fitWindow: "Fit to window (F)",
    actualSize: "1:1 / 100% (0)",
    fitShort: "Fit",

    // Left Dock
    sidebarAlignment: "Alignment",
    sectionAutoAlign: "Automatic",
    alignAutoOpenCV: "AI Perspective (OpenCV)",
    alignAutoOpenCVHint: "ORB + RANSAC",
    alignAutoEdge: "Edge Match",
    alignAutoEdgeHint: "Sobel + ZNCC",
    matchSizes: "Match Size",
    centerBoth: "Center Both",

    sectionManualLayer: "Manual Layer Shift",
    layerSync: "Synced",
    alignA: "Move A",
    alignB: "Move B",
    nudgeHint: "Drag canvas or use Arrow keys (Shift + Arrow = ×10)",
    offsetReadoutX: "Offset X",
    offsetReadoutY: "Offset Y",

    sectionPointAlign: "Point Registration",
    alignOnePoint: "1 Point",
    alignOnePointSub: "Translate",
    alignTwoPoints: "2 Points",
    alignTwoPointsSub: "Scale",
    alignThreePoints: "3 Points",
    alignThreePointsSub: "Rotate",
    alignFourPoints: "4 Points",
    alignFourPointsSub: "Perspective",

    sectionScaleCalib: "Scale Calibration",
    scaleALabel: "Scale A",
    scaleBLabel: "Scale B",
    resetScaleA: "Reset scale A",
    resetScaleB: "Reset scale B",
    resetView: "Reset Transforms",

    // Right Inspector
    sidebarInfo: "Inspector",
    telemetryTitle: "Similarity Telemetry",
    similarityScoreLabel: "Similarity",
    changedPixelsLabel: "Changed",
    maxDeltaLabel: "Max ΔRGB",
    maeLabel: "Mean Δ",
    computeMetricsBtn: "Recalculate",
    waitingForBoth: "Load both images to analyze",

    photoALabel: "Image A",
    photoBLabel: "Image B",
    notLoadedYet: "Not loaded",
    clickToUploadShort: "Choose file",
    replacePhoto: "Replace",

    accBlendTitle: "Overlay Blend",
    accBlinkTitle: "Auto Blink",
    blinkPause: "Pause",
    blinkResume: "Blink",
    blinkActiveFrame: "Visible frame",
    opacityLabel: "Image A Opacity",
    flashToggle: "Fast Flash",
    autoBlink: "Auto Blink",
    blinkInterval: "Interval (s)",

    accDiffTitle: "Diff Engine & Channels",
    diffStyleLabel: "Diff Mode",
    diffStyleDifference: "RGB Difference",
    diffStyleHeatmap: "Heatmap",
    diffStyleThreshold: "Diff Mask",
    diffGainLabel: "Gain",
    channelFilterLabel: "Color Channel",
    channelAll: "All",
    channelLuma: "Luma",

    accMetaTitle: "Technical Details & EXIF",
    metaResolution: "Resolution",
    metaFormat: "Format",
    metaSize: "Size",
    metaDate: "Modified",
    metaAspect: "Aspect",
    metaAlpha: "Alpha",
    metaProfile: "Profile",
    metaDepth: "Bit Depth",
    metaDpi: "Density",
    metaCompression: "Compression",
    metaCamera: "Camera",
    metaExposure: "Exposure",
    alphaPresent: "Has transparency",
    alphaOpaque: "Opaque",
    compLossless: "Lossless",
    compLossy: "Lossy",
    compVector: "Vector",
    compWebp: "WebP",
    compLzw: "LZW (GIF)",
    compStandard: "Standard",
    noExifData: "No EXIF",
    sourceClipboard: "Clipboard",
    sourceFile: "Local file",

    // Empty State & Workspace
    emptyTitle: "Load two images to start comparing",
    emptySubtitle: "Drop files anywhere, paste from clipboard (Ctrl+V), or select below",
    uploadA: "Upload Image A",
    uploadB: "Upload Image B",
    dragOrClick: "Drop or click",
    openPair: "Open Pair of Files",
    loadDemoPair: "Load Demo Pair",
    demoLoadedHint: "Demo pair loaded — try the curtain slider and alignment tools!",

    // Point Alignment Banner
    alignPoint1A: "Click reference point on Image A",
    alignPoint1B: "Click matching point on Image B",
    alignPointA1: "Image A: pick Point 1",
    alignPointA2: "Image A: pick Point 2",
    alignPointA3: "Image A: pick Point 3",
    alignPointA4: "Image A: pick Point 4",
    alignPointB1: "Image B: pick Point 1",
    alignPointB2: "Image B: pick Point 2",
    alignPointB3: "Image B: pick Point 3",
    alignPointB4: "Image B: pick Point 4",
    undoPoint: "Undo",
    cancel: "Cancel",

    // Quick Action Bar
    showBoth: "Fit (F)",
    swapPhotos: "Swap A⇄B (X)",
    quickSwapShort: "A ⇄ B",
    syncZoom: "Sync",
    showFilenames: "Badges (B)",
    pixelProbeToggle: "Pixel Probe (I)",
    quickProbeShort: "Probe",
    quickUploadToggle: "Upload",
    quickActionsLabel: "Quick Bar",

    // Bottom Dock
    btnCompare: "Auto Compare",
    btnExport: "Export",
    exportCurrent: "Current View (PNG)",
    exportCurrentDesc: "Captures current curtain, fade, or diff view",
    exportSplit: "Side-by-Side 1:1 (PNG)",
    exportSplitDesc: "Both frames with filename labels",
    exportDiff: "Difference Map (PNG)",
    exportDiffDesc: "Amplified pixel subtraction render",
    exportClipboard: "Copy to Clipboard",
    exportClipboardDesc: "Copy current comparison image",

    // Pixel Probe HUD
    probeDelta: "ΔRGB",
    probeOutside: "Hover over image",

    // Settings Dialog
    settingsTitle: "PhotoCheck Settings",
    settingsNavAppearance: "Appearance",
    settingsNavViewport: "Viewport",
    settingsNavCompare: "Alignment",
    settingsNavShortcuts: "Shortcuts",
    settingsNavAbout: "About",
    settingsNavGeneral: "Language & Reset",
    doneBtn: "Done",
    settingSaved: "Saved",

    settingThemeLabel: "Color Theme",
    settingThemeDesc: "Choose light studio, darkroom, or follow OS preference",
    themeSystem: "System",
    themeDark: "Dark",
    themeLight: "Light",
    themeCurrentDark: "currently dark",
    themeCurrentLight: "currently light",

    settingAccentLabel: "Accent Color",
    settingAccentDesc: "Highlight color for active controls and markers",

    settingColorALabel: "Image A Color",
    settingColorADesc: "Badge and highlight color for the first image",
    settingColorBLabel: "Image B Color",
    settingColorBDesc: "Badge and highlight color for the second image",

    settingUiScaleLabel: "Interface Scale",
    settingUiScaleDesc: "Adjusts font sizes and panel proportions",

    settingReduceMotionLabel: "Reduce Motion",
    settingReduceMotionDesc: "Disables transitions and motion effects",
    motionSystem: "System",
    motionOn: "On",
    motionOff: "Off",

    settingGlassLabel: "Glass Blur Effects",
    settingGlassDesc: "Translucent backdrop blur on floating controls",

    settingQuickBarLabel: "Show Quick Action Bar",
    settingQuickBarDesc: "Display the floating quick bar above the dock by default",

    settingAutoHideHudLabel: "Auto-hide bottom floating bar (3s)",
    settingAutoHideHudDesc: "Fades out the bottom canvas bar after 3 seconds and reveals on bottom hover",

    settingModeStripLabel: "Bottom strip for Fade & Blink",
    settingModeStripDesc: "Wide horizontal slider bar for opacity, flash, and blink interval",

    stripOpacityShort: "Opacity A",
    stripIntervalShort: "Interval",

    settingDefaultDiffLabel: "Default Diff Mode",
    settingDefaultDiffDesc: "Visualization style used in Diff mode",
    settingDefaultDiffGainLabel: "Default Diff Gain",
    settingDefaultDiffGainDesc: "Initial contrast amplification for differences",

    sectionChannelsTitle: "Color Channel",
    modeHintSlider: "Drag the curtain handle for pixel-accurate A/B comparison",
    modeHintSplit: "Side-by-side view. Toggle Sync to zoom or pan independently",
    pointBannerStep: "Click point {curr} of {total} on Image {slot}",
    dropAsA: "Drop as Image A",
    dropAsB: "Drop as Image B",
    dropSlotHint: "Release file on the desired half",
    pasteLoadedA: "Pasted as Image A",
    pasteLoadedB: "Pasted as Image B",
    pasteLoadedBoth: "Pasted Images A and B",
    searchShortcutsPlaceholder: "Search shortcuts...",
    aboutDesc: "Offline-first utility for precise visual image comparison, alignment, and pixel-difference analysis.",
    aboutVersion: "Version",
    aboutOffline: "Runs 100% offline — your images never leave your browser",
    aboutGithub: "View on GitHub",
    hintKeyModes: "Modes",
    hintKeyFit: "Fit",
    hintKeySwap: "Swap A/B",
    hintKeyPaste: "Paste",

    settingBackdropLabel: "Workspace Backdrop",
    settingBackdropDesc: "Checkerboard reveals transparent alpha pixels",
    backdropChecker: "Checker (Alpha)",
    backdropDark: "Dark",
    backdropNeutral: "50% Gray",
    backdropBlack: "Black",
    backdropWhite: "White",

    settingDensityLabel: "Interface Density",
    settingDensityDesc: "Compact mode maximizes image canvas area",
    densityStandard: "Standard",
    densityCompact: "Compact",

    settingRenderLabel: "Zoom Interpolation",
    settingRenderDesc: "Crisp nearest-neighbor pixels above 150% zoom",
    renderPixelZoom: "Crisp >150%",
    renderPixelAlways: "Always Pixelated",
    renderAuto: "Smooth",

    settingZoomSpeedLabel: "Wheel Zoom Sensitivity",
    settingZoomSpeedDesc: "Zoom increment per mouse wheel step",
    zoomSlow: "Fine (8%)",
    zoomNormal: "Standard (15%)",
    zoomFast: "Fast (25%)",

    settingCurtainLabel: "Curtain Handle Style",
    settingCurtainDesc: "Appearance of the slider comparison divider",
    curtainPill: "A/B Pill Handle",
    curtainGlow: "Glow Line",
    curtainMinimal: "Thin 1px",

    settingProbeLabel: "Live RGB Pixel Probe on Hover",
    settingProbeDesc: "Shows cursor (X, Y) and exact RGB A vs B values",
    settingAutoHideBadgesLabel: "Fade filename badges while interacting",
    settingAutoHideBadgesDesc: "Auto-dims corner pills during canvas panning",

    settingShowFilenamesLabel: "Show filename badges (B)",
    settingShowFilenamesDesc: "Displays Image A and B filename pills over the canvas",

    settingAutoAlignLoadLabel: "On Loading Image Pair",
    settingAutoAlignLoadDesc: "Automatic action when both images are ready",
    autoLoadNone: "Center Only",
    autoLoadMatch: "Match Sizes",
    autoLoadEdge: "Auto Edge Match",

    settingAutoMetricsLabel: "Auto-calculate Pixel Similarity",
    settingAutoMetricsDesc: "Computes similarity % and changed pixels automatically",

    settingNudgeLabel: "Arrow Key Nudge Step",
    settingNudgeDesc: "Base pixel offset in manual alignment mode",

    settingLanguageLabel: "Interface Language",
    settingLanguageDesc: "Instantly updates all labels and hints",
    resetSettingsBtn: "Reset All Settings to Default",
    settingsResetDone: "Settings restored to defaults",

    // Help & Shortcuts Dialog
    helpTitle: "Guide & Keyboard Shortcuts",
    helpIntro: "Pro workflow tips for pixel-accurate inspection and registration:",
    helpStep1Title: "1. Load Images",
    helpStep1: "Drop 1 or 2 files anywhere, click A/B slots, or paste screenshots via Ctrl+V.",
    helpStep2Title: "2. Align Offset Frames",
    helpStep2: "Use AI OpenCV, Auto Edge Match, or 1–4 reference points for shifted or angled shots.",
    helpStep3Title: "3. Inspect Differences",
    helpStep3: "Switch between Curtain, Fade, Side-by-Side, and Diff (RGB / Heatmap / Mask).",
    helpStep4Title: "4. Pixel Inspection",
    helpStep4: "Zoom up to 1000%, isolate R/G/B/Luma channels, probe RGB values, and export PNGs.",
    shortcutsTitle: "Keyboard Shortcuts",
    keyModes: "Switch modes: Curtain / Fade / Split / Diff / Blink",
    keyOrientation: "Flip curtain orientation (Vert / Horiz)",
    keyFlashHold: "Hold for quick A↔B flash peek",
    keyFit: "Fit to window",
    keyActual: "Actual pixel size 1:1 (100%)",
    keySwap: "Swap Images A and B",
    keyBadges: "Toggle filename badges",
    keyProbe: "Toggle RGB pixel probe",
    keySettings: "Open settings",
    keyNudge: "Nudge layer (when Move A/B is active)",

    // Status Toasts & Errors
    imagesLoaded: "Images loaded and centered",
    invalidFile: "Supported image formats: PNG, JPG, WEBP, AVIF, GIF, BMP, SVG",
    pasteLoaded: "Image pasted from clipboard",
    autoEdgeRunning: "Analyzing edges and scale...",
    autoEdgeSuccess: "Edge match complete • Similarity: {score}%",
    autoEdgeFail: "Could not reliably match image edges",
    opencvLoading: "Loading OpenCV engine...",
    opencvCompiling: "Initializing offline OpenCV module...",
    opencvPreparing: "Preparing images...",
    opencvKeypoints: "Detecting ORB keypoints...",
    opencvMatching: "Matching feature descriptors...",
    opencvRansac: "Computing homography (RANSAC)...",
    opencvSuccess: "AI OpenCV alignment complete!",
    opencvError: "OpenCV error: {err}",
    exportSuccess: "Saved: {file}",
    exportCopied: "Comparison copied to clipboard",
    exportError: "Export failed: {err}",
    needBothImages: "Load both Image A and Image B first",
    transformsReset: "Transforms reset",
    compareSummary: "Similarity: {sim}% • Changed: {chg}%",
  },
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

  t(key, vars = null) {
    const dict = translations[this.currentLang] || translations.ru;
    let str = dict[key] || translations.ru[key] || key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  }

  updateUI() {
    document.documentElement.lang = this.currentLang;
    document.title = this.t("appTitle");

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const text = this.t(key);
      if (el.tagName === "INPUT" && el.type === "placeholder") {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      el.title = this.t(key);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria-label");
      el.setAttribute("aria-label", this.t(key));
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.setAttribute("placeholder", this.t(key));
    });

    document.querySelectorAll(".lang-btn, .lang-option").forEach((btn) => {
      const isActive = btn.dataset.lang === this.currentLang;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });

    const currentFlagEl = document.getElementById("current-lang-flag");
    const currentCodeEl = document.getElementById("current-lang-code");
    if (currentFlagEl && currentCodeEl) {
      if (this.currentLang === "en") {
        currentFlagEl.textContent = "EN";
        currentCodeEl.textContent = "EN";
      } else {
        currentFlagEl.textContent = "RU";
        currentCodeEl.textContent = "RU";
      }
    }
  }
}

export const i18n = new I18nManager();
