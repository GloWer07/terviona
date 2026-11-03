/* ============================================================
   Terviona — internationalization.
   Two layers:
     1) I18N   — static UI chrome strings (ru / en / uk)
     2) DICT   — translations for STRUCTURED data values that come
                 from the JSON database (tiers labels, shapes, grips,
                 recommend verdicts, audio categories, brackets,
                 connection, software, sound, budgets, etc.)
   Free-text fields use their localized variants (`*_en` / `*_uk`)
   and fall back to Russian. See localizedField() in app.js.
   ============================================================ */
window.I18N = {
  ru: {
    code: "RU", label: "Русский",
    nav_home: "Главная", nav_mice: "Мыши", nav_audio: "Аудио", nav_articles: "Журнал", nav_methodology: "Методология", nav_builder: "Сборка по бюджету", nav_faq: "FAQ", nav_contact: "Контакты",
    nav_more: "Ещё", nav_menu: "Меню", nav_sections: "Разделы",
    search_hint: "Поиск",

    hero_badge: "Независимая база периферии",
    hero_h1a: "Мыши.", hero_h1b: "Исследуй:",
    hero_heading: "Исследуй: мыши, наушники, аудио, данные, измерения и Terviona.",
    hero_words: ["Мыши.", "Наушники.", "Аудио.", "Данные.", "Измерения.", "Terviona."],
    hero_sub: "Независимая база мышей и аудио от основателя GloWer-а. Измерения, тиры и сравнения.",
    hero_meta: "Измерения • База данных • Сравнения • Исследования",
    hero_search: "Найти устройство…", hero_search_label: "Поиск по базе", hero_quick: "Быстрый переход",
    lab_verified: "Verified",

    about_title: "Что такое Terviona",
    about_text: "Terviona — независимая база периферии с прозрачной системой оценок. Мы сводим живые замеры, обзоры и опыт сообщества в единый тир-лист, чтобы вы могли выбрать девайс по делу, а не по маркетингу.",
    /* заглушка: развёрнутое описание целей проекта (см. faq.html) */
    about_goals_title: "Цели проекта",
    about_goals_text: "",

    stat_devices: "девайсов", stat_brands: "брендов", stat_cats: "категорий", stat_tiers: "тиров оценки",

    sec_cats: "Категории", sec_cats_idx: "выбери раздел",
    sec_peripherals: "Периферия", sec_audio: "Аудио",
    cat_distribution: "распределение по тирам",

    open: "Открыть", back: "Назад", close: "Закрыть",
    view_list: "Список", view_grid: "Плитка",
    settings: "Настройки", set_view: "Отображение", set_currency: "Валюта", set_region: "Регион", set_os: "Шорткаты", set_theme: "Тема",
    theme_dark: "Тёмная", theme_light: "Светлая",

    filter_all: "Все", filter_price: "Цена", filter_search: "Поиск по названию…",
    filter_budget: "Бюджет", filter_grip: "Хват", filter_shape: "Форма",
    filter_sort: "Сортировка", sort_tier: "По тиру", sort_price_asc: "Цена ↑", sort_price_desc: "Цена ↓", sort_name: "По названию",
    budget_pick: "Выберите бюджет", budget_any: "Любой бюджет",
    builder_soon: "Сборка сетапа по бюджету — скоро",
    mousepads_soon: "Категория ковриков готовится — скоро",
    method_title: "Как формируется тир", method_note: "Важно", method_guide: "Гайд по эквализации",

    buy: "Купить", buy_on: "Купить на", source: "Источник", waitlist: "Скамья ожидания",
    market_new: "новый", market_used: "б/у", market_import: "импорт",
    region_note_ua: "AliExpress для Украины · цена пересчитана в гривны", region_note_int: "Ищите на Amazon",
    region_note_by: "Для Беларуси ищем дешевле на ozon.by, aliexpress.ru и wildberries.by",

    spec_price: "Цена", spec_tier: "Тир", spec_brand: "Бренд", spec_specs: "Характеристики", spec_weight: "Вес",
    spec_sensor: "Сенсор", spec_switches: "Свитчи", spec_encoder: "Энкодер", spec_clicks_ms: "Клики, мс", spec_recommend: "Рекомендация",
    spec_category: "Категория", spec_segment: "Сегмент",
    similar: "Похожие устройства", alternatives: "Альтернативы", details: "Подробнее",
    family_note: "По сути одна и та же модель — разные версии с мелкими отличиями",

    spot_ph: "Поиск девайса…", spot_loading: "Загрузка каталога…", spot_empty: "Ничего не найдено", spot_nav: "навигация", spot_open: "открыть", spot_close: "закрыть",
    spot_hint_os: "поиск",


    grip_small: "Маленькая ладонь", grip_medium: "Средняя ладонь", grip_large: "Большая ладонь",

    eq_title: "Эквализация", eq_target: "Целевая кривая", eq_pref: "Оценка предпочтения", eq_download: "Скачать пресет",
    eq_peq: "PEQ", eq_geq: "GEQ", eq_soon: "COMING SOON", fr_title: "АЧХ (частотная характеристика)", fr_legend_dev: "Измерение", fr_legend_target: "Цель",
    fr_measured_by: "Измерил", fr_target_lbl: "Цель", fr_m_avg: "Ср. отклонение", fr_m_spread: "Разброс отклонения", fr_m_slope: "Наклон", fr_std_missing: "нет измерения",
    eq_show: "Показать с EQ", eq_hide: "Скрыть EQ", eq_legend: "После EQ", fr_align_on: "Выровнять по цели", fr_align_off: "Сбросить выравнивание", fr_pref_bounds: "Границы предпочтения",
    shape_title: "Форма мыши", shape_available: "Точная форма доступна", shape_missing: "Форма не загружена",
    grip_style: "Стиль хвата", grip_palm: "Ладонный хват", grip_claw: "Когтевой хват", grip_fingertip: "Пальцевый хват",
    grip_note: "Совместимость зависит от размера руки и личных предпочтений.", not_available: "Нет данных",
    shape_similarity: "Сходство формы", closest_shapes: "Самые похожие мыши", shape_similarity_note: "Процент рассчитан по контурам сверху и сбоку.",

    faq_title: "Частые вопросы", faq_sub: "Ответы о методологии, выборе устройств и региональных различиях.",
    faq_sources: "Источники", faq_authors: "Авторы", faq_legend: "Система тиров",
    faq_ask: "Не нашли ответ? Задайте свой вопрос", faq_ask_cta: "Задать вопрос",
    faq_scope_title: "Международный охват",

    contact_title: "Контакты", contact_sub: "Пишите на почту — предложения, вопросы, сотрудничество и правки базы.",
    contact_general: "Общие вопросы и предложения", contact_support: "Поддержка", contact_partners: "Сотрудничество и реклама", contact_data: "Правки и дополнения базы",
    social_title: "Terviona в соцсетях", social_sub: "Новости проекта, короткие обзоры, обсуждения и обновления базы.",
    friends_title: "Наши друзья",
    soon_title: "Скоро", soon_media: "Медиа проекта (Telegram, TikTok, YouTube)", soon_news: "Новости, статьи и обзоры", soon_eq: "Конструктор эквализации", soon_accounts: "Аккаунты пользователей",
    soon_badge: "в разработке",

    footer_note: "Данные из открытого гайда сообщества. Обновляется регулярно.",
    tagline: "База и тир-лист периферии",
    foot_sections: "Разделы", foot_db: "База", foot_project: "Проект", foot_soon: "Скоро",
    foot_tag: "Independent Research",
    foot_founder: "Основано",
  },

  en: {
    code: "EN", label: "English",
    nav_home: "Home", nav_mice: "Mice", nav_audio: "Audio", nav_articles: "Journal", nav_methodology: "Methodology", nav_builder: "Setup Builder", nav_faq: "FAQ", nav_contact: "Contact",
    nav_more: "More", nav_menu: "Menu", nav_sections: "Sections",
    search_hint: "Search",

    hero_badge: "Independent peripherals database",
    hero_h1a: "Mice.", hero_h1b: "Explore:",
    hero_heading: "Explore: mice, headphones, audio, data, measurements and Terviona.",
    hero_words: ["Mice.", "Headphones.", "Audio.", "Data.", "Measurements.", "Terviona."],
    hero_sub: "The independent mouse & audio database, founded by GloWer.",
    hero_meta: "Measurements • Database • Comparisons • Research",
    hero_search: "Find a device…", hero_search_label: "Search the database", hero_quick: "Quick access",
    lab_verified: "Verified",

    about_title: "What is Terviona",
    about_text: "Terviona is an independent peripherals database with a transparent rating system. We combine real measurements, reviews and community experience into one tier-list, so you can pick a device on merit — not marketing.",
    /* stub: extended project goals description (see faq.html) */
    about_goals_title: "Project goals",
    about_goals_text: "",

    stat_devices: "devices", stat_brands: "brands", stat_cats: "categories", stat_tiers: "rating tiers",

    sec_cats: "Categories", sec_cats_idx: "pick a section",
    sec_peripherals: "Peripherals", sec_audio: "Audio",
    cat_distribution: "tier distribution",

    open: "Open", back: "Back", close: "Close",
    view_list: "List", view_grid: "Grid",
    settings: "Settings", set_view: "Layout", set_currency: "Currency", set_region: "Region", set_os: "Shortcuts", set_theme: "Theme",
    theme_dark: "Dark", theme_light: "Light",

    filter_all: "All", filter_price: "Price", filter_search: "Search by name…",
    filter_budget: "Budget", filter_grip: "Grip", filter_shape: "Shape",
    filter_sort: "Sort", sort_tier: "By tier", sort_price_asc: "Price ↑", sort_price_desc: "Price ↓", sort_name: "By name",
    budget_pick: "Choose a budget", budget_any: "Any budget",
    builder_soon: "Setup Builder by Budget — coming soon",
    mousepads_soon: "The Mousepads category is being prepared — coming soon",
    method_title: "How the tier is formed", method_note: "Important", method_guide: "Equalization guide",

    buy: "Buy", buy_on: "Buy on", source: "Source", waitlist: "Waitlist",
    market_new: "new", market_used: "used", market_import: "import",
    region_note_ua: "AliExpress for Ukraine · price converted to UAH", region_note_int: "Search on Amazon",
    region_note_by: "For Belarus, search cheaper on ozon.by, aliexpress.ru and wildberries.by",

    spec_price: "Price", spec_tier: "Tier", spec_brand: "Brand", spec_specs: "Specs", spec_weight: "Weight",
    spec_sensor: "Sensor", spec_switches: "Switches", spec_encoder: "Encoder", spec_clicks_ms: "Clicks, ms", spec_recommend: "Recommendation",
    spec_category: "Category", spec_segment: "Segment",
    similar: "Similar devices", alternatives: "Alternatives", details: "Details",
    family_note: "Essentially the same model — versions with minor differences",

    spot_ph: "Search a device…", spot_loading: "Loading catalogue…", spot_empty: "Nothing found", spot_nav: "navigate", spot_open: "open", spot_close: "close",
    spot_hint_os: "search",


    grip_small: "Small hand", grip_medium: "Medium hand", grip_large: "Large hand",

    eq_title: "Equalization", eq_target: "Target curve", eq_pref: "Preference score", eq_download: "Download preset",
    eq_peq: "PEQ", eq_geq: "GEQ", eq_soon: "COMING SOON", fr_title: "Frequency response", fr_legend_dev: "Measurement", fr_legend_target: "Target",
    fr_measured_by: "Measured by", fr_target_lbl: "Target", fr_m_avg: "Avg deviation", fr_m_spread: "Deviation spread", fr_m_slope: "Slope", fr_std_missing: "no measurement",
    eq_show: "Show with EQ", eq_hide: "Hide EQ", eq_legend: "With EQ", fr_align_on: "Align to Target", fr_align_off: "Reset Alignment", fr_pref_bounds: "Preference Bounds",
    shape_title: "Mouse shape", shape_available: "Verified shape available", shape_missing: "Shape not uploaded",
    grip_style: "Grip style", grip_palm: "Palm grip", grip_claw: "Claw grip", grip_fingertip: "Fingertip grip",
    grip_note: "Compatibility depends on hand size and personal preference.", not_available: "No data",
    shape_similarity: "Shape similarity", closest_shapes: "Closest mouse shapes", shape_similarity_note: "Percentage is calculated from the top and side outlines.",

    faq_title: "FAQ", faq_sub: "Answers about methodology, device choice and regional differences.",
    faq_sources: "Sources", faq_authors: "Authors", faq_legend: "Tier system",
    faq_ask: "Still have a question? Send it to us", faq_ask_cta: "Ask a question",
    faq_scope_title: "International scope",

    contact_title: "Contact", contact_sub: "Email us — suggestions, questions, partnerships and database fixes.",
    contact_general: "General questions & suggestions", contact_support: "Support", contact_partners: "Partnerships & ads", contact_data: "Database fixes & additions",
    social_title: "Terviona on social media", social_sub: "Project news, short reviews, discussions and database updates.",
    friends_title: "Our friends",
    soon_title: "Coming soon", soon_media: "Project media (Telegram, TikTok, YouTube)", soon_news: "News, articles & reviews", soon_eq: "EQ builder", soon_accounts: "User accounts",
    soon_badge: "in development",

    footer_note: "Data from an open community guide. Updated regularly.",
    tagline: "Peripherals database & tier-list",
    foot_sections: "Sections", foot_db: "Database", foot_project: "Project", foot_soon: "Soon",
    foot_tag: "Independent Research",
    foot_founder: "Founded by",
  },

  uk: {
    code: "UA", label: "Українська",
    nav_home: "Головна", nav_mice: "Миші", nav_audio: "Аудіо", nav_articles: "Журнал", nav_methodology: "Методологія", nav_builder: "Збірка за бюджетом", nav_faq: "FAQ", nav_contact: "Контакти",
    nav_more: "Ще", nav_menu: "Меню", nav_sections: "Розділи",
    search_hint: "Пошук",

    hero_badge: "Незалежна база периферії",
    hero_h1a: "Миші.", hero_h1b: "Досліджуй:",
    hero_heading: "Досліджуй: миші, навушники, аудіо, дані, вимірювання та Terviona.",
    hero_words: ["Миші.", "Навушники.", "Аудіо.", "Дані.", "Вимірювання.", "Terviona."],
    hero_sub: "Незалежна база мишей та аудіо, заснована GloWer-ом.",
    hero_meta: "Вимірювання • База даних • Порівняння • Дослідження",
    hero_search: "Знайти пристрій…", hero_search_label: "Пошук у базі", hero_quick: "Швидкий перехід",
    lab_verified: "Verified",

    about_title: "Що таке Terviona",
    about_text: "Terviona — незалежна база периферії з прозорою системою оцінок. Ми зводимо живі заміри, огляди та досвід спільноти в єдиний тір-лист, щоб ви обирали девайс по суті, а не за маркетингом.",
    /* заглушка: розгорнутий опис цілей проєкту (див. faq.html) */
    about_goals_title: "Цілі проєкту",
    about_goals_text: "",

    stat_devices: "девайсів", stat_brands: "брендів", stat_cats: "категорій", stat_tiers: "тірів оцінки",

    sec_cats: "Категорії", sec_cats_idx: "обери розділ",
    sec_peripherals: "Периферія", sec_audio: "Аудіо",
    cat_distribution: "розподіл за тірами",

    open: "Відкрити", back: "Назад", close: "Закрити",
    view_list: "Список", view_grid: "Плитка",
    settings: "Налаштування", set_view: "Відображення", set_currency: "Валюта", set_region: "Регіон", set_os: "Шорткати", set_theme: "Тема",
    theme_dark: "Темна", theme_light: "Світла",

    filter_all: "Усі", filter_price: "Ціна", filter_search: "Пошук за назвою…",
    filter_budget: "Бюджет", filter_grip: "Хват", filter_shape: "Форма",
    filter_sort: "Сортування", sort_tier: "За тіром", sort_price_asc: "Ціна ↑", sort_price_desc: "Ціна ↓", sort_name: "За назвою",
    budget_pick: "Оберіть бюджет", budget_any: "Будь-який бюджет",
    builder_soon: "Збірка сетапу за бюджетом — скоро",
    mousepads_soon: "Категорія килимків готується — незабаром",
    method_title: "Як формується тір", method_note: "Важливо", method_guide: "Гайд з еквалізації",

    buy: "Купити", buy_on: "Купити на", source: "Джерело", waitlist: "Лава очікування",
    market_new: "новий", market_used: "б/в", market_import: "імпорт",
    region_note_ua: "AliExpress для України · ціну перераховано у гривні", region_note_int: "Шукайте на Amazon",
    region_note_by: "Для Білорусі шукаємо дешевше на ozon.by, aliexpress.ru та wildberries.by",

    spec_price: "Ціна", spec_tier: "Тір", spec_brand: "Бренд", spec_specs: "Характеристики", spec_weight: "Вага",
    spec_sensor: "Сенсор", spec_switches: "Світчі", spec_encoder: "Енкодер", spec_clicks_ms: "Кліки, мс", spec_recommend: "Рекомендація",
    spec_category: "Категорія", spec_segment: "Сегмент",
    similar: "Схожі пристрої", alternatives: "Альтернативи", details: "Детальніше",
    family_note: "По суті одна й та сама модель — версії з дрібними відмінностями",

    spot_ph: "Пошук девайсу…", spot_loading: "Завантаження каталогу…", spot_empty: "Нічого не знайдено", spot_nav: "навігація", spot_open: "відкрити", spot_close: "закрити",
    spot_hint_os: "пошук",


    grip_small: "Мала долоня", grip_medium: "Середня долоня", grip_large: "Велика долоня",

    eq_title: "Еквалізація", eq_target: "Цільова крива", eq_pref: "Оцінка вподобання", eq_download: "Завантажити пресет",
    eq_peq: "PEQ", eq_geq: "GEQ", eq_soon: "COMING SOON", fr_title: "АЧХ (частотна характеристика)", fr_legend_dev: "Вимірювання", fr_legend_target: "Ціль",
    fr_measured_by: "Виміряв", fr_target_lbl: "Ціль", fr_m_avg: "Сер. відхилення", fr_m_spread: "Розкид відхилення", fr_m_slope: "Нахил", fr_std_missing: "немає вимірювання",
    eq_show: "Показати з EQ", eq_hide: "Сховати EQ", eq_legend: "Після EQ", fr_align_on: "Вирівняти за ціллю", fr_align_off: "Скинути вирівнювання", fr_pref_bounds: "Межі вподобання",
    shape_title: "Форма миші", shape_available: "Точна форма доступна", shape_missing: "Форму не завантажено",
    grip_style: "Стиль хвату", grip_palm: "Долонний хват", grip_claw: "Кігтьовий хват", grip_fingertip: "Пальцевий хват",
    grip_note: "Сумісність залежить від розміру руки та особистих уподобань.", not_available: "Немає даних",
    shape_similarity: "Схожість форми", closest_shapes: "Найсхожіші миші", shape_similarity_note: "Відсоток розраховано за контурами зверху та збоку.",

    faq_title: "Часті питання", faq_sub: "Відповіді про методологію, вибір пристроїв і регіональні відмінності.",
    faq_sources: "Джерела", faq_authors: "Автори", faq_legend: "Система тірів",
    faq_ask: "Залишилося питання? Надішліть його нам", faq_ask_cta: "Поставити питання",
    faq_scope_title: "Міжнародне охоплення",

    contact_title: "Контакти", contact_sub: "Пишіть на пошту — пропозиції, питання, співпраця та правки бази.",
    contact_general: "Загальні питання та пропозиції", contact_support: "Підтримка", contact_partners: "Співпраця та реклама", contact_data: "Правки та доповнення бази",
    social_title: "Terviona у соцмережах", social_sub: "Новини проєкту, короткі огляди, обговорення та оновлення бази.",
    friends_title: "Наші друзі",
    soon_title: "Незабаром", soon_media: "Медіа проєкту (Telegram, TikTok, YouTube)", soon_news: "Новини, статті та огляди", soon_eq: "Конструктор еквалізації", soon_accounts: "Акаунти користувачів",
    soon_badge: "у розробці",

    footer_note: "Дані з відкритого гайду спільноти. Оновлюється регулярно.",
    tagline: "База та тір-лист периферії",
    foot_sections: "Розділи", foot_db: "База", foot_project: "Проєкт", foot_soon: "Незабаром",
    foot_tag: "Independent Research",
    foot_founder: "Засновано",
  },
};

/* ============================================================
   DICT — value-level translations for structured DB fields.
   Keyed by en/uk; ru is the source (identity fallback).
   Matching is done on the exact source string; renderer also
   normalizes whitespace. Anything not found falls back to the
   original Russian value.
   ============================================================ */
window.DICT = {
  en: {
    // mouse shape
    "Симметричная": "Symmetrical", "Эргономичная": "Ergonomic", "Гибрид": "Hybrid",
    // grips
    "Ладонный": "Palm", "Когтевой": "Claw", "Пальцевый": "Fingertip",
    "Когтевой/Ладонный": "Claw / Palm", "Когтевой/Пальцевый": "Claw / Fingertip",
    "Пальцевый/Когтевой": "Fingertip / Claw", "Ладонный/Когтевой": "Palm / Claw",
    // recommend verdicts (normalized, emoji stripped upstream)
    "Да": "Yes", "Нет": "No",
    "Да (оверпрайс)": "Yes (overpriced)", "Нет (оверпрайс)": "No (overpriced)",
    "Да (Проблемы с QC)": "Yes (QC issues)", "Нет (проблемы с QC)": "No (QC issues)",
    "Нет (оверпрайс и QC)": "No (overpriced + QC)", "Нет (УЖАСНЫЙ QC)": "No (TERRIBLE QC)",
    "Нет (устарела)": "No (outdated)", "Да (Онли Б/У)": "Yes (used only)", "Да(Онли Б/У)": "Yes (used only)", "Да (Онли Б/У, оверпрайс)": "Yes (used only, overpriced)",
    // audio categories
    "Внутриканальные наушники (IEM)": "In-ear monitors (IEM)",
    "Источники (ЦАП + усилители)": "Sources (DAC + amps)",
    "Полноразмерные наушники (OEM)": "Over-ear headphones (OEM)",
    "Гарнитуры (с микрофоном)": "Headsets (with mic)",
    "Bluetooth внутриканальные наушники (TWS)": "Bluetooth in-ear (TWS)",
    "Bluetooth полноразмерные наушники": "Bluetooth over-ear",
    // audio brackets
    "Лучшие до 5000₽": "Best under {p5000}", "Лучшие до 10000₽": "Best under {p10000}",
    "Лучшие до 20000₽": "Best under {p20000}", "Лучшие до 30000₽": "Best under {p30000}",
    "Лучшие до 40000₽": "Best under {p40000}", "Лучшие до 60000₽": "Best under {p60000}",
    "Лучшие до 100000₽": "Best under {p100000}", "Лучшие до 200000₽": "Best under {p200000}",
    "Лучшие до 500000₽": "Best under {p500000}",
    "Лучшие из массмаркета": "Best from mass market", "Лучшие из DNS": "Best from DNS",
    "Лучшие портативные до 5000₽": "Best portable under {p5000}",
    "Лучшие портативные до 10000₽": "Best portable under {p10000}",
    "Лучшие портативные с Bluetooth": "Best portable with Bluetooth",
    "Лучшие стационарные до 10000₽": "Best desktop under {p10000}",
    "Лучшие стационарные до 200000₽": "Best desktop under {p200000}",
    // budget category tags (audio)
    "Бюджетно": "Budget", "Средне": "Mid", "Топ": "Top",
  },
  uk: {
    "Симметричная": "Симетрична", "Эргономичная": "Ергономічна", "Гибрид": "Гібрид",
    "Ладонный": "Долонний", "Когтевой": "Кігтьовий", "Пальцевый": "Пальцевий",
    "Когтевой/Ладонный": "Кігтьовий / Долонний", "Когтевой/Пальцевый": "Кігтьовий / Пальцевий",
    "Пальцевый/Когтевой": "Пальцевий / Кігтьовий", "Ладонный/Когтевой": "Долонний / Кігтьовий",
    "Да": "Так", "Нет": "Ні",
    "Да (оверпрайс)": "Так (оверпрайс)", "Нет (оверпрайс)": "Ні (оверпрайс)",
    "Да (Проблемы с QC)": "Так (проблеми з QC)", "Нет (проблемы с QC)": "Ні (проблеми з QC)",
    "Нет (оверпрайс и QC)": "Ні (оверпрайс + QC)", "Нет (УЖАСНЫЙ QC)": "Ні (ЖАХЛИВИЙ QC)",
    "Нет (устарела)": "Ні (застаріла)", "Да (Онли Б/У)": "Так (лише б/в)", "Да(Онли Б/У)": "Так (лише б/в)", "Да (Онли Б/У, оверпрайс)": "Так (лише б/в, оверпрайс)",
    "Внутриканальные наушники (IEM)": "Внутрішньоканальні навушники (IEM)",
    "Источники (ЦАП + усилители)": "Джерела (ЦАП + підсилювачі)",
    "Полноразмерные наушники (OEM)": "Повнорозмірні навушники (OEM)",
    "Гарнитуры (с микрофоном)": "Гарнітури (з мікрофоном)",
    "Bluetooth внутриканальные наушники (TWS)": "Bluetooth внутрішньоканальні (TWS)",
    "Bluetooth полноразмерные наушники": "Bluetooth повнорозмірні",
    "Лучшие до 5000₽": "Найкращі до {p5000}", "Лучшие до 10000₽": "Найкращі до {p10000}",
    "Лучшие до 20000₽": "Найкращі до {p20000}", "Лучшие до 30000₽": "Найкращі до {p30000}",
    "Лучшие до 40000₽": "Найкращі до {p40000}", "Лучшие до 60000₽": "Найкращі до {p60000}",
    "Лучшие до 100000₽": "Найкращі до {p100000}", "Лучшие до 200000₽": "Найкращі до {p200000}",
    "Лучшие до 500000₽": "Найкращі до {p500000}",
    "Лучшие из массмаркета": "Найкращі з мас-маркету", "Лучшие из DNS": "Найкращі з DNS",
    "Лучшие портативные до 5000₽": "Найкращі портативні до {p5000}",
    "Лучшие портативные до 10000₽": "Найкращі портативні до {p10000}",
    "Лучшие портативные с Bluetooth": "Найкращі портативні з Bluetooth",
    "Лучшие стационарные до 10000₽": "Найкращі стаціонарні до {p10000}",
    "Лучшие стационарные до 200000₽": "Найкращі стаціонарні до {p200000}",
    "Бюджетно": "Бюджетно", "Средне": "Середньо", "Топ": "Топ",
  },
};

/* ============================================================
   TERMS — word-level fallback for COMPOUND values that never match
   a full DICT key (e.g. connection strings like
   "Проводное + Блютуз + 2.4G Ресивер (4000 mAh)"). Applied by trField()
   ONLY when the whole value has no exact DICT hit; each Russian token is
   swapped in place, everything else (numbers, mAh, model names) is kept.
   ru is the source, so no ru map.
   ============================================================ */
window.TERMS = { en: {}, uk: {} };
