/* ============================================================
   Terviona — core app (vanilla JS, no deps)
   data loading · i18n · tiers · currency · region · settings ·
   spotlight search · shared chrome · FR chart · mouse shape.
   ============================================================ */
'use strict';

/* ---------- Яндекс Метрика ----------
   Счётчик № 111136565 (metrika.yandex.ru).
   На localhost/локальной разработке счётчик не грузится вовсе. */
(function(){
  const METRIKA_ID = 111136565;   // 0 = выключено
  const h = location.hostname;
  if (!METRIKA_ID) return;                                    // ещё не настроено
  if (h === "localhost" || h === "127.0.0.1" || h === "" ||
      h === "::1" || h.endsWith(".local")) return;            // локальная разработка
  (function(m,e,t,r,i,k,a){
    m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
    m[i].l=1*new Date();
    for (var j = 0; j < e.scripts.length; j++) {if (e.scripts[j].src === r) { return; }}
    k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
  })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js?id=" + METRIKA_ID, "ym");
  window.ym(METRIKA_ID, "init", {
    ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer",
    referrer: document.referrer, url: location.href,
    accurateTrackBounce:true, trackLinks:true
  });
})();

const DB = { data: {}, index: [] };

/* ---------- categories ---------- */
const CATEGORIES = {
  mice:                { file:"mice.json",                group:"mice",  nav:"mice",  label_ru:"Мыши", label_en:"Mice", label_uk:"Миші", short_ru:"Форма, начинка и хват", short_en:"Shape, internals & grip", short_uk:"Форма, начинка та хват", icon:"mouse", scale:"tier" },
  audio:               { file:"audio.json",               group:"audio", nav:"audio", label_ru:"Аудио", label_en:"Audio", label_uk:"Аудіо", short_ru:"Наушники, IEM, ЦАП, гарнитуры", short_en:"Headphones, IEMs, DACs, headsets", short_uk:"Навушники, IEM, ЦАП, гарнітури", icon:"audio", scale:"audio" },
};
const GROUPS = {
  peripherals: { key:"sec_peripherals", cats:["mice"] },
  audio:       { key:"sec_audio",       cats:["audio"] },
};

/* Future sections are deliberately kept out of CATEGORIES: loadAll() only
   knows about live datasets/routes, while these entries are presentation-only. */
const COMING_SOON_CATEGORIES = [
  { key:"mousepads", label_ru:"Коврики", label_en:"Mousepads", label_uk:"Килимки", shortKey:"mousepads_soon", icon:"mousepad" },
];

/* Methodology/disclaimer blocks mirror the current buying-guide workbook.
   They live next to category metadata so every category page uses one source. */
const CATEGORY_METHOD = {
  mice: {
    criteria: [
      { value:"35%", ru:"Форма", en:"Shape", uk:"Форма" },
      { value:"20%", ru:"Цена", en:"Price", uk:"Ціна" },
      { value:"15%", ru:"Качество", en:"Quality", uk:"Якість" },
      { value:"10%", ru:"Начинка", en:"Internals", uk:"Начинка" },
      { value:"10%", ru:"Клики", en:"Clicks", uk:"Кліки" },
      { value:"10%", ru:"Вес", en:"Weight", uk:"Вага" },
    ],
    note: {
      ru:"Оценка внутри одного тира не задаёт строгий порядок — важен сам тир. Все мыши от A-тира и выше стоит рассматривать с учётом формы, хвата, размера ладони, локальной цены и личных предпочтений.",
      en:"Devices are not strictly ranked within the same tier—the tier itself is what matters. Every A-tier-or-higher mouse can be a valid choice depending on shape, grip, hand size, local price and personal preference.",
      uk:"Оцінка всередині одного тіру не задає суворого порядку — важливий сам тір. Усі миші від A-тіру й вище варто розглядати з огляду на форму, хват, розмір долоні, локальну ціну та власні вподобання.",
    },
  },
  audio: {
    criteria: [],
    note: {
      ru:"Для максимально подходящего вам звучания рекомендуется эквализация. Более высокая цена не означает автоматически лучший звук: важны настройка, посадка, контроль качества и соответствие вашим предпочтениям. Для части моделей доступны пресеты под актуальные целевые кривые JM-1 и DF / Harman 2018.",
      en:"Equalization is recommended to get the best result for your preferences. A higher price does not automatically mean better sound: tuning, fit, quality control and personal preference matter. Selected models include presets for current JM-1 and DF / Harman 2018 targets.",
      uk:"Для найкращого звучання під ваші вподобання рекомендовано використовувати еквалізацію. Вища ціна не означає автоматично кращий звук: важливі налаштування, посадка, контроль якості та особисті вподобання. Для окремих моделей доступні пресети під актуальні цільові криві JM-1 і DF / Harman 2018.",
    },
    link:"https://eqpractice.pp.ua/en/the-easiest-way-to-eq-your-headphones/",
  },
};

/* ---------- unified tier system (req #6/#8) ---------- */
const TIERS = ["SS","S","A","B","C","D","F"];
/* monochrome grade ramp (Nothing-style): white at the top, stepping down
   through pure greys — no chromatic accents anywhere in the UI. Kept light
   enough for dark badge text. MUST stay in sync with --t-* in css/style.css. */
const TIER_COLORS = { SS:"#FFFFFF", S:"#D9D9DE", A:"#B4B4BC", B:"#8E8E97", C:"#6C6C75", D:"#4E4E56", F:"#34343B" };
/* audio shares the palette; its top grade is now SS (see tier bump below) */
const AUDIO_TIERS = ["SS","S","A","B","C","D","F"];

/* ---------- tier bump (+1 rung) ----------
   Ladder is SS>S>A>B>C>D>F (no "E"), so "one up" = the next entry.
   Applied only to the categories below; audio's emoji-derived S/A/…/F get
   bumped the same way, which materialises the new SS grade with no change to
   audioTier(). FF is retired everywhere and folded into F (final — not bumped
   further). Suffixes (+/-/~) and compound "A/S" grades keep their shape. */
const TIER_UP = { F:"D", D:"C", C:"B", B:"A", A:"S", S:"SS", SS:"SS" };
const BUMP_CATS = new Set(["audio"]);
function mapTier(base, bump){
  if (!base) return base;
  if (base === "FF") return "F";          // FF retired -> F (all categories)
  return bump ? (TIER_UP[base] || base) : base;
}

/* ---------- SVG icons + monochrome dot-matrix brand ----------
   The mark is a 3×3 dot-matrix "T" — the Nothing-style industrial glyph.
   Pure currentColor: the brand carries no chromatic accent anywhere. */
const BRAND_MARK = '<svg class="brand-mark" viewBox="0 0 96 96" aria-hidden="true"><g fill="currentColor"><circle cx="20" cy="20" r="9"/><circle cx="48" cy="20" r="9"/><circle cx="76" cy="20" r="9"/><circle cx="48" cy="48" r="9"/><circle cx="48" cy="76" r="9"/></g></svg>';
const BRAND_WORDMARK = '<svg class="brand-wordmark-svg" viewBox="0 0 780 100" role="img" aria-label="TERVIONA"><g fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16h62M41 16v68"/><path d="M112 16v68M112 16h58M112 50h48M112 84h58"/><path d="M202 84V16h43c14 0 23 7 23 18s-9 18-23 18h-43M244 52l28 32"/><path d="M306 16l34 68 34-68"/><path d="M420 16v68"/><rect x="480" y="16" width="70" height="68" rx="20"/><path d="M584 84V16l70 68V16"/><path d="M694 84l34-68 34 68"/></g></svg>';
const ICO = {
  logo:  BRAND_MARK,
  mouse: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v4" stroke-linecap="round"/></svg>',
  mousepad:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="4" width="19" height="16" rx="3"/><path d="M15 7.5c-2 0-3.2 1.4-3.2 3.5v2.3c0 2.1 1.2 3.5 3.2 3.5s3.2-1.4 3.2-3.5V11c0-2.1-1.2-3.5-3.2-3.5Z"/><path d="M15 7.7v3"/></svg>',
  audio: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="2" y="14" width="5" height="6" rx="1.5"/><rect x="17" y="14" width="5" height="6" rx="1.5"/></svg>',
  search:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3-3" stroke-linecap="round"/></svg>',
  more:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  menu:  '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/></svg>',
  arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ext:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 17 17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mail:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  cart:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L20 8H6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
  cog:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M16.9 16.9l2.1 2.1M19.1 4.9l-2.1 2.1M7 16.9l-2.1 2.1" stroke-linecap="round"/></svg>',
  list:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg>',
  grid:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  sun:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke-linecap="round"/></svg>',
  moon:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  dl:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const SOCIAL_ICO = {
  x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23.2 22H17l-4.9-6.4L6.5 22H3.4l7.3-8.4L1 2h6.4l4.4 5.8L18.9 2Zm-1.1 17.9h1.7L6.5 4H4.7l13.1 15.9Z" fill="currentColor"/></svg>',
  youtube:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4L15.8 12l-6.2 3.6Z" fill="currentColor"/></svg>',
  tiktok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.8 2c.3 2.4 1.7 3.9 4.2 4.1v3.2a8.3 8.3 0 0 1-4.2-1v6.1a7.1 7.1 0 1 1-6.1-7V11a3.6 3.6 0 1 0 2.6 3.5V2h3.5Z" fill="currentColor"/></svg>',
  telegram:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21.7 3.1-3.2 17.2c-.2 1.2-.9 1.5-1.9.9l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6 14l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.2 3.8c.9-.3 1.7.2 1.5 1.3Z" fill="currentColor"/></svg>',
  discord:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.5 5.3A16 16 0 0 0 15.4 4l-.5 1a15 15 0 0 0-5.8 0l-.5-1a16 16 0 0 0-4.1 1.3C1.9 9.2 1.2 13 1.6 16.8a16.5 16.5 0 0 0 5 2.5l1.2-1.7-1.9-.9.5-.4a11.5 11.5 0 0 0 11.2 0l.5.4-1.9.9 1.2 1.7a16.5 16.5 0 0 0 5-2.5c.5-4.4-.8-8.2-2.9-11.5ZM8.7 15.1c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5Zm6.6 0c-1.2 0-2.2-1.1-2.2-2.5s1-2.5 2.2-2.5 2.2 1.1 2.2 2.5-1 2.5-2.2 2.5Z" fill="currentColor"/></svg>',
};
const SOCIAL_LINKS = [
  { key:"x", label:"X", url:"https://x.com/terviona" },
  { key:"youtube", label:"YouTube", url:"https://www.youtube.com/@terviona" },
  { key:"tiktok", label:"TikTok", url:"https://www.tiktok.com/@terviona?_r=1&_t=ZS-98WA7S1eFBI" },
  { key:"telegram", label:"Telegram", url:"https://t.me/terviona_com" },
  { key:"discord", label:"Discord", url:"https://discord.gg/XJX7pRkQC" },
];

/* ============================================================ STATE / SETTINGS */
const DEFAULT_CUR = { ru:"RUB", en:"USD", uk:"UAH" };
const DEFAULT_REGION = { ru:"ru", en:"int", uk:"ua" };
/* region drives currency + language by default (req #2). A manual currency/
   language pick sets a *_locked flag and then survives region switches. */
const REGION_CUR  = { ru:"RUB", ua:"UAH", by:"BYN", int:"USD" };
const REGION_LANG = { ru:"ru",  ua:"uk",  by:"ru",  int:"en"  };
const GEO_DEFAULTS_KEY = "geo_defaults_v1";
const GEO_ATTEMPT_KEY = "geo_defaults_attempted_v1";
const EUROPE_COUNTRIES = new Set([
  "AD","AL","AM","AT","AZ","BA","BE","BG","CH","CY","CZ","DE","DK","EE","ES","FI","FR","GB",
  "GE","GR","HR","HU","IE","IS","IT","KZ","LI","LT","LU","LV","MC","MD","ME","MK","MT","NL",
  "NO","PL","PT","RO","RS","SE","SI","SK","SM","TR","VA"
]);
let LANG = localStorage.getItem("lang") || "en";
let CURRENCY = localStorage.getItem("currency") || DEFAULT_CUR[LANG] || "RUB";
let REGION   = localStorage.getItem("region")   || DEFAULT_REGION[LANG] || "ru";
let VIEW     = localStorage.getItem("view")     || "list";   // list | grid (req #28 default list)
let OS       = localStorage.getItem("os")       || (/mac/i.test(navigator.platform) ? "mac" : "win");

function geoDefaultsFor(countryCode, continentCode){
  const cc=String(countryCode||"").toUpperCase();
  if(cc==="UA") return {lang:"uk",region:"ua",currency:"UAH"};
  if(cc==="BY") return {lang:"ru",region:"by",currency:"BYN"};
  if(cc==="RU") return {lang:"ru",region:"ru",currency:"RUB"};
  const european=String(continentCode||"").toUpperCase()==="EU" || EUROPE_COUNTRIES.has(cc);
  return {lang:"en",region:"int",currency:european?"EUR":"USD"};
}

/* Detect defaults once, before the first page render. Explicit user choices are
   protected by their *_locked flags and always win over IP geolocation. */
async function initGeoDefaults(){
  if(localStorage.getItem(GEO_DEFAULTS_KEY) || sessionStorage.getItem(GEO_ATTEMPT_KEY)) return;
  sessionStorage.setItem(GEO_ATTEMPT_KEY,"1");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),1200);
  try{
    const response=await fetch("https://get.geojs.io/v1/ip/geo.json",{
      signal:controller.signal,cache:"no-store"
    });
    if(!response.ok) throw new Error(`Geo lookup failed: ${response.status}`);
    const geo=await response.json();
    const defaults=geoDefaultsFor(geo.country_code,geo.continent_code);
    if(!localStorage.getItem("lang_locked")){
      LANG=defaults.lang; localStorage.setItem("lang",LANG);
    }
    if(!localStorage.getItem("region_locked")){
      REGION=defaults.region; localStorage.setItem("region",REGION);
    }
    if(!localStorage.getItem("currency_locked")){
      CURRENCY=defaults.currency; localStorage.setItem("currency",CURRENCY);
    }
    localStorage.setItem(GEO_DEFAULTS_KEY,String(geo.country_code||"unknown").toUpperCase());
  }catch(err){
    // Safe fallback is already EN / INT / USD. Do not persist a failed lookup,
    // so a temporary network/API failure can recover on the next page load.
  }finally{
    clearTimeout(timeout);
    document.documentElement.setAttribute("lang",LANG);
    window.LANG=LANG; window.REGION=REGION; window.CURRENCY=CURRENCY;
  }
}

function t(k){ return (window.I18N[LANG] && window.I18N[LANG][k]) || window.I18N.ru[k] || k; }
function catLabel(key){ const c = CATEGORIES[key]; return c["label_"+LANG] || c.label_ru; }
function catShort(key){ const c = CATEGORIES[key]; return c["short_"+LANG] || c.short_ru; }
function localizedValue(value){ return value && typeof value === "object" ? (value[LANG] || value.ru || "") : (value || ""); }
function localizedField(item, field){
  if(!item) return "";
  return trField(item[field+"_"+LANG] ?? item[field] ?? "");
}
function comingSoonLabel(item){ return item && (item["label_"+LANG] || item.label_ru) || ""; }

/* ---------- structured value translation (req #1) ---------- */
function trField(value){
  if (value == null) return "";
  let v = String(value).replace(/\s{2,}/g," ").trim();
  let res = v;
  const dict = window.DICT[LANG];
  if (dict && dict[v] != null) res = dict[v];
  else {
    // no exact match — swap known Russian tokens inside compound values
    // (e.g. connection strings). Longer tokens first so substrings don't
    // pre-empt them. Non-matching text (numbers, mAh, model names) is kept.
    const terms = window.TERMS && window.TERMS[LANG];
    if (terms) {
      Object.keys(terms).sort((a,b)=>b.length-a.length).forEach(ru=>{
        if (res.includes(ru)) res = res.split(ru).join(terms[ru]);
      });
    }
  }
  res = res.replace(/\{p(\d+)\}/g, (_,n) => fmtMoney(+n));
  if (CURRENCY !== "RUB") res = currencyRewrite(res);
  return res;
}
/* rewrite embedded RUB amounts inside free-ish labels when currency changed */
function currencyRewrite(str){
  return str
    .replace(/(\d[\d\s]*)\s*₽/g, (_,n) => fmtMoney(+n.replace(/\s/g,"")))
    .replace(/(\d+)\s*тыс(?:яч[аи]?)?\.?\s*(?:рублей|руб\.?)?/gi, (_,n) => fmtMoney(+n*1000));
}

/* ============================================================ CURRENCY (req #9) */
const CUR = {
  RUB: { sym:"₽", rate:1,    pos:"suf", label:"₽ Рубль" },
  USD: { sym:"$", rate:95,   pos:"pre", label:"$ Доллар" },
  EUR: { sym:"€", rate:103,  pos:"pre", label:"€ Евро" },
  UAH: { sym:"₴", rate:2.3,  pos:"suf", label:"₴ Гривня" },
  BYN: { sym:"Б̵", rate:30,  pos:"suf", label:"Б̵ Бел. рубль" },
};
let PRICING_UPDATED_AT = null;
function applyPricing(data){
  if(!data || !data.rates_rub_per_unit) return;
  Object.entries(data.rates_rub_per_unit).forEach(([code,rate])=>{
    if(CUR[code] && Number.isFinite(Number(rate)) && Number(rate)>0) CUR[code].rate=Number(rate);
  });
  PRICING_UPDATED_AT=data.updated_at||null;
}
function roundNice(v){
  if (v < 100) return Math.round(v);
  if (v < 1000) return Math.round(v/10)*10;
  return Math.round(v/100)*100;
}
function fmtMoney(rub){
  const c = CUR[CURRENCY] || CUR.RUB;
  const v = roundNice(rub / c.rate);
  const s = v.toLocaleString(LANG==="en"?"en-US":LANG==="uk"?"uk-UA":"ru-RU");
  return c.pos === "pre" ? `${c.sym}${s}` : `${s} ${c.sym}`;
}
function priceLabel(p){
  if (!p) return "";
  if (p.min == null && p.max == null) return p.raw ? currencyRewrite(String(p.raw)) : "";
  if (p.min != null && p.max != null && p.min !== p.max) return `${fmtMoney(p.min)}–${fmtMoney(p.max)}`;
  return fmtMoney(p.min != null ? p.min : p.max);
}
function priceMid(p){
  if (!p) return null;
  if (p.min != null && p.max != null) return (p.min + p.max)/2;
  if (p.min != null) return p.min;
  if (p.max != null) return p.max;
  return null;
}
function sourcePriceRub(src){
  if(!src) return null;
  const direct=Number(src.price_rub);
  if(Number.isFinite(direct)) return direct;
  const native=Number(src.price_native!=null?src.price_native:src.price);
  if(!Number.isFinite(native)) return null;
  const code=String(src.currency||"RUB").toUpperCase();
  return CUR[code] ? native*CUR[code].rate : native;
}
function itemPriceRub(it, region=REGION){
  const rp=it && it.regional_prices && it.regional_prices[region];
  const regionalPriceAllowed=region!=="ua" || (rp&&rp.platform==="aliexpress.com");
  if(rp && regionalPriceAllowed && Number.isFinite(Number(rp.price_rub))) return Number(rp.price_rub);
  const src=bestSource(it,null,region);
  const live=sourcePriceRub(src);
  return live!=null ? live : priceMid(it&&it.price);
}
function itemPriceMid(it){ return itemPriceRub(it); }
/* Price to SHOW on a card/modal. When the active region has a cheapest in-stock
   structured source (req #2), display that exact live price; otherwise fall back
   to the authored price range. Defined here so category.js can reuse it. */
function displayPrice(it){
  const bi = (typeof buyInfo==="function") ? buyInfo(it) : null;
  if (bi && bi.price_rub != null) return fmtMoney(bi.price_rub);
  const live=itemPriceRub(it);
  if(live!=null) return fmtMoney(live);
  return priceLabel(it.price);
}
/* budget category (req #10) */
function budgetCat(p){
  const v = priceMid(p);
  if (v == null) return null;
  if (v < 5000)  return "Бюджетно";
  if (v < 30000) return "Средне";
  return "Топ";
}

/* ============================================================ TIERS */
function tierBase(tier){
  if (!tier) return null;
  let s = String(tier).replace(/С/g,"C").replace(/[~\s]/g,"").toUpperCase();
  if (s.startsWith("SS")) return "SS";
  const c = s.charAt(0);
  if (c === "F") return "F";
  if ("SABCD".includes(c)) return c;
  return null;
}
function audioTier(score){
  const s = score || "";
  if (/👑/.test(s)) return "S";
  if (/💀|🤡|❌/.test(s)) return "F";
  const stars = (s.match(/🌟|⭐/g) || []).length;
  if (stars >= 3) return "A";
  if (stars === 2) return "B";
  if (stars === 1) return "C";
  if (/➖/.test(s)) return "D";
  return null;
}
/* unified accessor: canonical tier letter for any item (bump applied) */
function deviceTier(it, key){
  const bump = BUMP_CATS.has(key);
  // audio: an explicitly authored `tier` (editor override) wins over the
  // emoji-derived score; it is already final, so no bump is applied
  if (key === "audio") return it.tier ? tierBase(it.tier) : mapTier(audioTier(it.score), bump);
  const raw = String(it.tier || "").replace(/\s/g,"").toUpperCase();
  const base = raw.startsWith("FF") ? "FF" : tierBase(it.tier);
  return mapTier(base, bump);
}
/* bump a raw grade string token-by-token, keeping +/-/~ and compound "A/S" */
function bumpGradeString(raw, bump){
  if (!raw) return "";
  return String(raw).replace(/\s/g,"").replace(/С/g,"C").split("/").map(tok=>{
    const m = tok.match(/^(~?)(SS|FF|[SABCDF])([+\-]?)$/i);
    if (!m) return tok;
    const pre = m[1], suf = m[3]; let base = m[2].toUpperCase();
    if (base === "FF") return pre + "F";
    return pre + mapTier(base, bump) + suf;
  }).join("/");
}
function tierRank(letter){ const i = TIERS.indexOf(letter); return i < 0 ? 99 : i; }
function tierColorVar(letter){ return `var(--t-${(letter||"f").toLowerCase()})`; }
function tierList(key){ return CATEGORIES[key] && CATEGORIES[key].scale === "audio" ? AUDIO_TIERS : TIERS; }

/* exact grade shown on card (keeps +/- nuance, req keeps info) */
function tierGrade(it, key){
  if (key === "audio") return deviceTier(it, key);
  return bumpGradeString(it.tier, BUMP_CATS.has(key)) || deviceTier(it, key);
}

/* tier distribution for a category (req #26) */
function tierDist(key){
  const d = DB.data[key]; if (!d || !d.items) return {};
  const out = {};
  d.items.forEach(it => { const tr = deviceTier(it, key); if (tr) out[tr] = (out[tr]||0)+1; });
  return out;
}

/* ---------- recommend verdict cleanup (strip emoji, req #8/#11) ---------- */
function cleanRecommend(v){
  if (!v) return "";
  let s = v.replace(/[🌟⭐👑💀🤡🤖🍎❌➖]/g,"").replace(/\s{2,}/g," ").trim();
  return s;
}

/* ---------- brand ---------- */
function brandOf(name){ return (name||"").trim().split(/\s+/)[0] || ""; }
function brandCount(){ const s=new Set(); DB.index.forEach(e=>{const b=brandOf(e.name); if(b) s.add(b.toLowerCase());}); return s.size; }

/* ---------- asset freshness auto-reload -------------------------------------
   Nginx serves css/js with `no-cache` + ETag, so a normal reload always fetches
   the latest. But an already-open tab never reloads on its own. This polls the
   core assets with a HEAD request (no-store, so we hit the origin) and builds a
   signature from ETag/Last-Modified. If the signature changed since the last
   load — and this isn't the first ever load — reload ONCE. We write the new
   signature BEFORE reloading so a persistent mismatch can't loop. */
const FRESH_KEY = "ter_asset_sig";
let __freshBusy = false;
async function checkFresh(){
  if (__freshBusy) return; __freshBusy = true;
  try {
    const assets = ["js/app.js", "css/style.css"];
    const parts = await Promise.all(assets.map(async u => {
      const r = await fetch(u, { method: "HEAD", cache: "no-store" });
      return u + ":" + (r.headers.get("etag") || r.headers.get("last-modified") || r.headers.get("content-length") || "");
    }));
    const sig = parts.join("|");
    const prev = localStorage.getItem(FRESH_KEY);
    if (prev == null) { localStorage.setItem(FRESH_KEY, sig); }
    else if (prev !== sig) { localStorage.setItem(FRESH_KEY, sig); location.reload(); }
  } catch (e) { /* offline or HEAD unsupported — ignore, try again next time */ }
  finally { __freshBusy = false; }
}
let __dataFreshBusy=false;
const __dataSignatures=new Map();
function watchedDataFiles(){
  const files=["pricing.json","methodology.json"];
  Object.keys(CATEGORIES).forEach(key=>{ if(DB.data[key]) files.push(CATEGORIES[key].file); });
  if(DB.data.faq) files.push("faq.json");
  if(FR_TARGETS) files.push("fr_targets.json");
  return files;
}
async function checkDataFresh(){
  if(__dataFreshBusy) return; __dataFreshBusy=true;
  try{
    const parts=await Promise.all(watchedDataFiles().map(async file=>{
      const r=await fetch("data/"+file,{method:"HEAD",cache:"no-store"});
      return {file,sig:r.headers.get("etag")||r.headers.get("last-modified")||r.headers.get("content-length")||""};
    }));
    const changed=[];
    parts.forEach(({file,sig})=>{
      const prev=__dataSignatures.get(file);
      if(prev!=null && prev!==sig) changed.push(file);
      __dataSignatures.set(file,sig);
    });
    if(changed.length){
      await Promise.all(changed.map(file=>{
        if(file==="pricing.json") return loadPricing(true);
        if(file==="methodology.json") return loadMethodology(true);
        if(file==="faq.json") return loadFAQ(true);
        if(file==="fr_targets.json") return loadFRTargets(true);
        const key=Object.keys(CATEGORIES).find(k=>CATEGORIES[k].file===file);
        return key ? loadCategoryData(key,{force:true,pricing:false}) : Promise.resolve();
      }));
      buildIndex();
      if(window.PAGE_RENDER) window.PAGE_RENDER();
      window.dispatchEvent(new CustomEvent("terviona:prices-updated",{detail:{updatedAt:PRICING_UPDATED_AT}}));
    }
  }catch(e){ /* transient network/cache errors: keep current catalogue */ }
  finally{ __dataFreshBusy=false; }
}

/* ============================================================ STORE / REGION (req #16,17,18,19) */
function marketplaceName(value){
  const s=String(value||"").trim().toLowerCase();
  if(!s) return "";
  const names=[
    ["wildberries","Wildberries"],["aliexpress","AliExpress"],
    ["yandex","Яндекс Маркет"],["amazon","Amazon"],["ebay","eBay"],
    ["onliner","Onlíner"],["kufar","Kufar"],["avito","Avito"],
    ["ozon","Ozon"],["dns","DNS"],["olx","OLX"],
  ];
  const match=names.find(([key])=>s.includes(key));
  if(match) return match[1];
  const plain=s.replace(/^https?:\/\//,"").replace(/^www\./,"").split(/[./]/)[0];
  return plain ? plain.charAt(0).toUpperCase()+plain.slice(1) : "";
}
function shopMarket(shop){
  const s = (shop||"").toLowerCase();
  if (s.includes("avito") || s.includes("olx")) return "used";
  return "new"; // ali, dns, ozon, wildberries, yandex, g-wolves… — "импорт" retired, shown as "новый"
}
/* Region-specific marketplace order and safe search fallbacks. The tracker
   replaces these search links with verified product URLs as it discovers them. */
const REGION_PLATFORMS = {
  ru:[
    {id:"ozon.ru",search:n=>`https://www.ozon.ru/search/?text=${encodeURIComponent(n)}`},
    {id:"wildberries.ru",search:n=>`https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(n)}`},
    {id:"dns",search:n=>`https://www.dns-shop.ru/search/?q=${encodeURIComponent(n)}`},
  ],
  by:[
    {id:"ozon.by",search:n=>`https://ozon.by/search/?text=${encodeURIComponent(n)}`},
    {id:"wildberries.by",search:n=>`https://wildberries.by/catalog/0/search.aspx?search=${encodeURIComponent(n)}`},
    {id:"kufar.by",search:n=>`https://www.kufar.by/l?query=${encodeURIComponent(n)}`},
  ],
  ua:[
    {id:"aliexpress.com",search:n=>`https://www.aliexpress.com/w/wholesale-${encodeURIComponent(n)}.html`},
  ],
  int:[
    {id:"amazon.com",search:n=>`https://www.amazon.com/s?k=${encodeURIComponent(n)}`},
    {id:"aliexpress.com",search:n=>`https://www.aliexpress.com/w/wholesale-${encodeURIComponent(n)}.html`},
    {id:"ebay.com",search:n=>`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(n)}`},
  ],
};
function sourceRegion(src){
  if(src&&src.region) return src.region;
  const p=String(src&&src.platform||"").toLowerCase();
  if(/\.by$/.test(p)||p==="kufar.by"||p==="onliner.by") return "by";
  if(/\.ua$/.test(p)) return "ua";
  if(["amazon.com","aliexpress.com","ebay.com"].includes(p)) return "int";
  return "ru";
}

/* Pick the best of an item's structured `sources` (req #2 / req #3 tracker):
   cheapest IN-STOCK wins; if none is in stock, fall back to the first source
   that has a URL (so the buy button still points somewhere real). `platforms`
   optionally restricts to a region's marketplaces (Belarus). Returns null when
   there's no usable structured source. A source looks like:
     { platform:"ozon.by", url, price (RUB), in_stock:true|false } */
function bestSource(it, platforms, region=REGION){
  let list = Array.isArray(it.sources) ? it.sources.filter(s=>s && (s.url || s.price!=null)) : [];
  if (!platforms && region==="ua") platforms=REGION_PLATFORMS.ua.map(p=>p.id);
  if (platforms) list = list.filter(s=>platforms.includes((s.platform||"").toLowerCase()));
  if (region) list = list.filter(s=>sourceRegion(s)===region);
  if (!list.length) return null;
  const inStock = list.filter(s=>s.in_stock!==false && sourcePriceRub(s)!=null);
  const pick = inStock.length
    ? inStock.reduce((a,b)=>(sourcePriceRub(b)<sourcePriceRub(a)?b:a))
    : (list.find(s=>s.url) || list[0]);
  return pick || null;
}

function buyInfo(it){
  const name = it.name || "";
  /* Product URLs in the imported datasets can be stale, shortened or point to
     a different variation. Until verified product/affiliate links are curated,
     always search the active region's marketplace for this exact device name. */
  const platforms=REGION_PLATFORMS[REGION]||REGION_PLATFORMS.ru;
  const fallback=platforms[0];
  const note=REGION==="by"?t("region_note_by"):REGION==="ua"?t("region_note_ua"):REGION==="int"?t("region_note_int"):"";
  return {url:fallback.search(name),label:`${t("buy_on")} ${marketplaceName(fallback.id)}`,market:shopMarket(fallback.id),note,price_rub:itemPriceRub(it)};
}
function marketBadge(m){
  if (!m) return "";
  const cls = m==="used"?"mk-used":m==="import"?"mk-import":"mk-new";
  const lbl = m==="used"?t("market_used"):m==="import"?t("market_import"):t("market_new");
  return `<span class="mk ${cls}">${lbl}</span>`;
}

/* ============================================================ DATA LOADING */
const DATA_REQUESTS=new Map();
async function loadJSON(file,{force=false}={}){
  if(!force && DATA_REQUESTS.has(file)) return DATA_REQUESTS.get(file);
  const request=(async()=>{
    const r = await fetch("data/"+file,{cache:force?"reload":"no-cache"}); if(!r.ok) throw new Error("failed "+file);
    const lm = Date.parse(r.headers.get("last-modified")||"");
    if (isFinite(lm)) DB.updatedAt = Math.max(DB.updatedAt||0, lm);
    return r.json();
  })();
  DATA_REQUESTS.set(file,request);
  try{ return await request; }
  catch(error){ if(DATA_REQUESTS.get(file)===request) DATA_REQUESTS.delete(file); throw error; }
}
async function loadPricing(force=false){
  try{ applyPricing(await loadJSON("pricing.json",{force})); }
  catch(e){ /* tracker has not produced pricing.json yet — keep safe fallbacks */ }
}
/* freshest data-file timestamp -> "Updated 18h ago" (lab-meta, mono/EN like
   Dataset/Method/Verified). Empty string when the server sends no date. */
function labAgo(){
  if (!DB.updatedAt) return "";
  const min = Math.max(1, Math.floor((Date.now()-DB.updatedAt)/60000));
  if (min < 60)   return `Updated ${min}m ago`;
  const h = Math.floor(min/60);
  if (h < 48)     return `Updated ${h}h ago`;
  return `Updated ${Math.floor(h/24)}d ago`;
}
async function loadCategoryData(key,{force=false,pricing=true}={}){
  if(!CATEGORIES[key]) throw new Error("unknown category "+key);
  if(pricing) await loadPricing(force);
  DB.data[key]=await loadJSON(CATEGORIES[key].file,{force});
  return DB.data[key];
}
async function loadFAQ(force=false){
  DB.data.faq=await loadJSON("faq.json",{force}).catch(()=>({questions:[]}));
  return DB.data.faq;
}
async function loadMethodology(force=false){
  const data=await loadJSON("methodology.json",{force});
  DB.data.methodology=data;
  const categories=data&&data.categories&&typeof data.categories==="object" ? data.categories : {};
  Object.keys(CATEGORY_METHOD).forEach(key=>delete CATEGORY_METHOD[key]);
  Object.assign(CATEGORY_METHOD,categories);
  return data;
}
async function loadCatalog({keys=Object.keys(CATEGORIES),force=false,includeFaq=false,includeFr=false}={}){
  await loadPricing(force);
  await Promise.all(keys.map(key=>loadCategoryData(key,{force,pricing:false})));
  if(includeFaq) await loadFAQ(force);
  if(includeFr) await loadFRTargets(force);
  buildIndex();
  return DB;
}
async function loadAll(options={}){
  return loadCatalog({includeFaq:true,includeFr:true,...options});
}
function buildIndex(){
  DB.index = [];
  for (const key of Object.keys(CATEGORIES)){
    const d = DB.data[key]; if(!d || !d.items) continue;
    for (const it of d.items){
      const name = it.name || "";
      DB.index.push({
        name, key, cat: catLabel(key),
        tier: tierGrade(it, key), tierBase: deviceTier(it, key),
        price: it.price || null,
        sub: trField(it.sensor || it.shape || it.format || it.category || "") ,
        norm: name.toLowerCase(), item: it,
      });
    }
  }
}
function searchIndex(q){
  q = q.trim().toLowerCase(); if(!q) return [];
  const terms = q.split(/\s+/); const scored = [];
  for (const e of DB.index){
    const n = e.norm; let score = 0, ok = true;
    if (n.startsWith(q)) score += 100;
    if (n.includes(q)) score += 40;
    for (const term of terms){
      if (n.includes(term)) score += 12;
      else { const L=term.split(""); let idx=0; for(const ch of n){ if(ch===L[idx]) idx++; if(idx===L.length) break; } if(idx===L.length) score+=4; else ok=false; }
    }
    if (ok && score>0) scored.push({e,score});
  }
  scored.sort((a,b)=> b.score-a.score || tierRank(a.e.tierBase)-tierRank(b.e.tierBase));
  return scored.slice(0,40).map(s=>s.e);
}

/* ============================================================ HELPERS */
function escapeHTML(s){ return String(s==null?"":s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function hash(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0); }
function rng(seed){ let s=seed>>>0; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }

/* ============================================================ PUBLIC ROUTES */
const CATEGORY_ROUTES = {
  mice:"mice",
  audio:"audio",
};
const ROUTE_CATEGORIES = Object.fromEntries(Object.entries(CATEGORY_ROUTES).map(([key,slug])=>[slug,key]));
function deviceSlug(value){
  const map={
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"
  };
  return String(value||"").toLowerCase().split("").map(ch=>map[ch]===undefined?ch:map[ch]).join("")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100);
}
function categoryPath(category, device){
  const base="/"+(CATEGORY_ROUTES[category]||CATEGORY_ROUTES.mice);
  return device ? base+"/"+deviceSlug(device) : base;
}
function profilePath(id){ return id ? "/user/"+encodeURIComponent(id) : "/user"; }
function routeFromPath(pathname=location.pathname){
  const parts=String(pathname||"/").replace(/^\/+|\/+$/g,"").split("/").filter(Boolean);
  if(parts[0]==="user") return {profileId:parts[1]||null};
  const category=ROUTE_CATEGORIES[parts[0]];
  return category ? {category,deviceSlug:parts[1]||null} : {};
}
function syncCanonical(path){
  const url=new URL(path,location.origin).href;
  let canonical=document.querySelector('link[rel="canonical"]');
  if(!canonical){ canonical=document.createElement("link"); canonical.rel="canonical"; document.head.appendChild(canonical); }
  canonical.href=url;
  const og=document.querySelector('meta[property="og:url"]'); if(og) og.content=url;
}
function roleMarkHTML(role, className="profile-role"){
  const key=String(role&&role.key||"").toLowerCase();
  const verified=/creator|founder|cofounder|verified/.test(key)||/[✓✔☑]/.test(String(role&&role.emoji||""));
  const icon=verified
    ? '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5.2 10.1 3 3 6.7-6.6"/></svg>'
    : `<span aria-hidden="true">${escapeHTML(role&&role.emoji||"•")}</span>`;
  return `<span class="${className}${verified?' is-verified':''}" title="${escapeHTML(role&&role.label||"")}" aria-label="${escapeHTML(role&&role.label||"")}" style="--role:${escapeHTML(role&&role.color||'#ffffff')}">${icon}</span>`;
}

/* ============================================================ FR / АЧХ CHART (req #4/#12, CrinGraph/squig style) */
const HARMAN = [ // [freqHz, dB] simplified Harman IEM 2019 target
  [20,6.2],[30,6.0],[50,5.4],[80,4.2],[120,2.8],[200,1.0],[400,0],[800,-0.2],[1000,0],
  [1500,1.4],[2000,3.6],[2700,5.2],[3500,3.4],[5000,-1.5],[7000,-2.2],[9000,-3.6],[12000,-2.0],[16000,-5.5],[20000,-8.0],
];
function logX(f){ const a=Math.log10(20), b=Math.log10(20000); return (Math.log10(f)-a)/(b-a); }
function frChartSVG(seedStr, tier){
  const W=520, H=210, padL=34, padR=10, padT=12, padB=24;
  const iw=W-padL-padR, ih=H-padT-padB;
  const yMin=-14, yMax=12;
  const Y = db => padT + ih*(1-(db-yMin)/(yMax-yMin));
  const X = f  => padL + iw*logX(f);
  // grid
  const gy=[-12,-6,0,6,12].map(db=>`<line x1="${padL}" y1="${Y(db).toFixed(1)}" x2="${W-padR}" y2="${Y(db).toFixed(1)}" class="fr-grid"/><text x="${padL-6}" y="${(Y(db)+3).toFixed(1)}" class="fr-tick" text-anchor="end">${db>0?'+':''}${db}</text>`).join("");
  const gx=[20,50,100,200,500,1000,2000,5000,10000,20000].map(f=>{ const lab=f>=1000?(f/1000)+'k':f; return `<line x1="${X(f).toFixed(1)}" y1="${padT}" x2="${X(f).toFixed(1)}" y2="${H-padB}" class="fr-grid"/><text x="${X(f).toFixed(1)}" y="${H-8}" class="fr-tick" text-anchor="middle">${lab}</text>`; }).join("");
  const target = HARMAN.map(([f,db])=>`${X(f).toFixed(1)},${Y(db).toFixed(1)}`).join(" ");
  // device curve: deterministic perturbation of target
  const rand = rng(hash(seedStr));
  const bias = (tierRank(tier)-2)*0.5; // better tiers hug target
  const dev = HARMAN.map(([f,db],i)=>{ const wob=(rand()-0.5)* (2.2+Math.abs(bias)) + Math.sin(i*1.3)*1.1 - bias*0.4; return [f, db+wob]; });
  const devLine = dev.map(([f,db])=>`${X(f).toFixed(1)},${Y(db).toFixed(1)}`).join(" ");
  return `<svg class="fr-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
    ${gy}${gx}
    <polyline class="fr-target" points="${target}"/>
    <polyline class="fr-dev" points="${devLine}" pathLength="1"/>
  </svg>`;
}

/* ============================================================ REAL FR RENDERING
   Dynamic frequency-response graph from an uploaded measurement (see admin/fr.py).
   Device measurements and target curves share the canonical 480-point 1/48-oct
   log grid (20 Hz .. ~20 kHz), so everything aligns index-for-index. */

const FR_GRID_N = 480, FR_GRID_F0 = 20, FR_GRID_STEP = 1/48;
// canonical grid frequencies + their log10, matching admin/fr.py
const FR_FREQ = Array.from({length:FR_GRID_N}, (_,i)=> FR_GRID_F0 * Math.pow(2, i*FR_GRID_STEP));
const FR_LOGF = FR_FREQ.map(f=>Math.log10(f));

// display smoothing (CrinGraph-style): Gaussian over log-frequency. 1/12 oct
// keeps real peaks/dips while removing measurement hash.
const FR_SMOOTH_OCT = 1/12;
// normalization + view constants
const FR_NORM_HZ = 800, FR_NORM_DB = 60, FR_Y_SPAN = 40; // 40..80 dB visible
// metrics analysis band + method (calibrated to the reference measurement:
// 7Hz Zero 2 @711 vs Harman IE2019v2 -> avg 1.57 / spread 2.21 / slope -0.98)
const FR_BAND_LO = 100, FR_BAND_HI = 10000;

let FR_TARGETS = null; // { grid, targets:{ key:{label,spl[]} } }
async function loadFRTargets(force=false){
  if(FR_TARGETS && !force) return FR_TARGETS;
  try { FR_TARGETS = await loadJSON("fr_targets.json",{force}); }
  catch(e){ FR_TARGETS = {targets:{}}; }
  return FR_TARGETS;
}
function frTarget(key){ return (FR_TARGETS && FR_TARGETS.targets && FR_TARGETS.targets[key]) || null; }

/* True for full-size / over-ear categories (headphones, wireless over-ears,
   headsets); false for in-ear (IEM / TWS / earbuds). Single source of truth —
   used for target selection, applicable standards, and the preference model. */
function frIsOverEar(category){
  const c = (category||"").toLowerCase();
  return /наушник|over|full|полноразмер|гарнитур|headset|headphone/.test(c) &&
         !/внутриканал|iem|tws|вклад|ear\s*bud|затыч/.test(c);
}

/* default target key for a device, from its audio category + selected standard.
   IEM/TWS -> in-ear targets; over-ear -> over-ear targets. */
function frDefaultTarget(category, standard){
  if(frIsOverEar(category)) return standard==="5128" ? "5128_df_8db" : "harman_oe2018";
  return standard==="5128" ? "5128_jm1_8db" : "harman_ie2019v2";
}
/* which standards apply to a device type */
function frStandardsFor(category){
  return frIsOverEar(category) ? ["KB50xx","5128"] : ["711","5128"];
}

/* Gaussian smoothing over the log-frequency grid. sigma = octFrac octaves. */
const FR_SMOOTH_CACHE=new WeakMap();
const FR_SMOOTH_KERNELS=new Map();
function frSmooth(vals, octFrac){
  if(!octFrac) return vals.slice();
  if(vals && typeof vals==="object"){
    const cached=FR_SMOOTH_CACHE.get(vals);
    if(cached?.has(octFrac)) return cached.get(octFrac);
  }
  const kernelKey=octFrac+":"+vals.length;
  let kernel=FR_SMOOTH_KERNELS.get(kernelKey);
  if(!kernel){
    // The FR grid is uniformly spaced at 1/48 octave. Restricting the
    // convolution to the same 3.5-sigma window avoids the previous O(n²)
    // scan. Exact weights are reused by every device and every EQ frame.
    const sig=octFrac*Math.log10(2),lim=3.5*sig;
    const radius=Math.ceil(3.5*octFrac/FR_GRID_STEP)+1;
    const rows=new Array(vals.length);
    for(let i=0;i<vals.length;i++){
      const start=Math.max(0,i-radius),end=Math.min(vals.length-1,i+radius);
      const indices=[],weights=[];
      for(let j=start;j<=end;j++){
        const d=FR_LOGF[i]-FR_LOGF[j];
        if(Math.abs(d)>lim) continue;
        const z=d/sig;
        indices.push(j); weights.push(Math.exp(-0.5*z*z));
      }
      rows[i]={indices,weights};
    }
    kernel={rows};
    FR_SMOOTH_KERNELS.set(kernelKey,kernel);
  }
  const out=new Array(vals.length);
  for(let i=0;i<vals.length;i++){
    let num=0,den=0;
    const row=kernel.rows[i];
    for(let k=0;k<row.indices.length;k++){
      const w=row.weights[k];
      num+=w*vals[row.indices[k]]; den+=w;
    }
    out[i]=num/den;
  }
  if(vals && typeof vals==="object"){
    let cached=FR_SMOOTH_CACHE.get(vals);
    if(!cached){ cached=new Map(); FR_SMOOTH_CACHE.set(vals,cached); }
    cached.set(octFrac,out);
  }
  return out;
}
function frValueAt(vals, hz){
  const x = Math.log10(hz);
  let best=0, bd=Infinity;
  for(let i=0;i<FR_LOGF.length;i++){ const d=Math.abs(FR_LOGF[i]-x); if(d<bd){bd=d;best=i;} }
  return vals[best];
}
function frMedian(arr){
  const s=arr.slice().sort((a,b)=>a-b), n=s.length;
  return n%2 ? s[(n-1)/2] : (s[n/2-1]+s[n/2])/2;
}

/* Deviation metrics: device vs target error curve over the analysis band.
   Offset removed via median (minimizes absolute deviation). Returns dB values. */
function frMetrics(devSpl, tgtSpl){
  const dev=frSmooth(devSpl,FR_SMOOTH_OCT), tgt=frSmooth(tgtSpl,FR_SMOOTH_OCT);
  const idx=[]; for(let i=0;i<FR_GRID_N;i++){ if(FR_FREQ[i]>=FR_BAND_LO && FR_FREQ[i]<=FR_BAND_HI) idx.push(i); }
  let err=idx.map(i=>dev[i]-tgt[i]);
  const off=frMedian(err); err=err.map(e=>e-off);
  const n=err.length, mean=err.reduce((a,b)=>a+b,0)/n;
  const std=Math.sqrt(err.reduce((a,e)=>a+(e-mean)*(e-mean),0)/n);
  const avg=err.reduce((a,e)=>a+Math.abs(e),0)/n;
  // slope: linear regression of error vs log2(freq), dB/octave
  const xs=idx.map(i=>FR_LOGF[i]/Math.log10(2)), xm=xs.reduce((a,b)=>a+b,0)/n;
  let sxy=0, sxx=0;
  for(let k=0;k<n;k++){ sxy+=(xs[k]-xm)*(err[k]-mean); sxx+=(xs[k]-xm)*(xs[k]-xm); }
  const slope=sxy/sxx;
  return { avg, spread:std, slope };
}

/* Render the real FR graph as SVG: panel-matched background, accent device curve,
   gray dashed target. Normalized to FR_NORM_DB at FR_NORM_HZ, fixed FR_Y_SPAN. */
let FRR_UID = 0;
function frRealSVG(devSpl, tgtSpl, opts){
  opts = opts || {};
  const W=520, H=230, padL=34, padR=12, padT=12, padB=26;
  const iw=W-padL-padR, ih=H-padT-padB;
  const dev=frSmooth(devSpl,FR_SMOOTH_OCT), tgt=tgtSpl?frSmooth(tgtSpl,FR_SMOOTH_OCT):null;
  // normalize both so FR_NORM_HZ maps to FR_NORM_DB
  const devOff = FR_NORM_DB - frValueAt(dev, FR_NORM_HZ);
  const dn = dev.map(v=>v+devOff);
  let tn=null;
  if(tgt){ const tOff = FR_NORM_DB - frValueAt(tgt, FR_NORM_HZ); tn = tgt.map(v=>v+tOff); }
  const yMax=FR_NORM_DB+FR_Y_SPAN/2, yMin=FR_NORM_DB-FR_Y_SPAN/2; // 80 .. 40
  const X = i  => padL + iw*(FR_LOGF[i]-FR_LOGF[0])/(FR_LOGF[FR_GRID_N-1]-FR_LOGF[0]);
  const Xf= hz => padL + iw*(Math.log10(hz)-FR_LOGF[0])/(FR_LOGF[FR_GRID_N-1]-FR_LOGF[0]);
  const Y = db => padT + ih*(1-(db-yMin)/(yMax-yMin));
  // Don't pin out-of-range points to the axis (that turns a steep treble roll-off
  // into a flat line on the floor). Keep the real slope; a clip-path hides the part
  // below the plot, so a big fall dives down and vanishes past ~15 kHz.
  const uid = "frrclip"+(++FRR_UID);
  const plotY = db => { const y=Y(db); return Math.max(padT-400, Math.min(H-padB+400, y)); };
  // grid: dB lines every 10 dB, freq decade+2·5 markers
  const dbTicks=[]; for(let db=yMin; db<=yMax; db+=10) dbTicks.push(db);
  const gy=dbTicks.map(db=>`<line x1="${padL}" y1="${Y(db).toFixed(1)}" x2="${W-padR}" y2="${Y(db).toFixed(1)}" class="frr-grid"/><text x="${padL-5}" y="${(Y(db)+3).toFixed(1)}" class="frr-tick" text-anchor="end">${db}</text>`).join("");
  const fTicks=[20,50,100,200,500,1000,2000,5000,10000,20000];
  const gx=fTicks.map(f=>{ const lab=f>=1000?(f/1000)+"k":f; const x=Xf(f); return `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${H-padB}" class="frr-grid"/><text x="${x.toFixed(1)}" y="${H-9}" class="frr-tick" text-anchor="middle">${lab}</text>`; }).join("");
  const line = arr => arr.map((v,i)=>`${X(i).toFixed(1)},${plotY(v).toFixed(1)}`).join(" ");
  const tgtLine = tn ? `<polyline class="frr-target" points="${line(tn)}"/>` : "";
  return `<svg class="frr-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${escapeHTML(opts.aria||'Frequency response')}">
    <defs><clipPath id="${uid}"><rect x="${padL}" y="${padT}" width="${iw}" height="${ih}"/></clipPath></defs>
    <rect x="0" y="0" width="${W}" height="${H}" class="frr-bg"/>
    ${gy}${gx}
    <g clip-path="url(#${uid})">
    ${tgtLine}
    <polyline class="frr-dev" points="${line(dn)}" pathLength="1"/>
    </g>
  </svg>`;
}

/* ============================================================ PEQ PARSER + APPLICATION */

/* Parse AutoEq/ParametricEQ.txt format. Returns {preamp, filters:[{type,fc,gain,q}]} */
function parsePEQ(text){
  if(!text) return null;
  let preamp=0;
  const filters=[];
  for(const line of text.split(/\r?\n/)){
    const pm=line.match(/Preamp:\s*([-\d.]+)\s*dB/i);
    if(pm){ preamp=parseFloat(pm[1]); continue; }
    const fm=line.match(/Filter\s*\d+:\s*ON\s+(\w+)\s+Fc\s+([\d.]+)\s*Hz\s+Gain\s+([-\d.]+)\s*dB\s+Q\s+([\d.]+)/i);
    if(fm) filters.push({type:fm[1].toUpperCase(), fc:parseFloat(fm[2]), gain:parseFloat(fm[3]), q:parseFloat(fm[4])});
  }
  return {preamp, filters};
}

/* Sample rate the AutoEq/ParametricEQ presets are authored for. The RBJ
   digital biquads below are defined on this fs; squig.link uses the same. */
const PEQ_FS = 48000;

/* Robert Bristow-Johnson "Audio EQ Cookbook" biquad coefficients, normalised
   by a0. This is the exact transfer function AutoEq targets, so LSC/HSC shelves
   reach their full plateau gain and PK peaks hit full gain at Fc — the earlier
   analog approximation flattened shelves toward 0 dB at the extremes and halved
   peak gain, which is why shelf filters looked like they did nothing. */
function peqCoeffs(type, fc, gain, q){
  const A = Math.pow(10, gain/40);
  const w0 = 2*Math.PI*fc/PEQ_FS;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw/(2*q);
  let b0,b1,b2,a0,a1,a2;
  if(type==="PK"){
    b0=1+alpha*A; b1=-2*cw; b2=1-alpha*A;
    a0=1+alpha/A; a1=-2*cw; a2=1-alpha/A;
  } else if(type==="LSC"){
    const s=2*Math.sqrt(A)*alpha;
    b0=A*((A+1)-(A-1)*cw+s); b1=2*A*((A-1)-(A+1)*cw); b2=A*((A+1)-(A-1)*cw-s);
    a0=(A+1)+(A-1)*cw+s;     a1=-2*((A-1)+(A+1)*cw);  a2=(A+1)+(A-1)*cw-s;
  } else if(type==="HSC"){
    const s=2*Math.sqrt(A)*alpha;
    b0=A*((A+1)+(A-1)*cw+s); b1=-2*A*((A-1)+(A+1)*cw); b2=A*((A+1)+(A-1)*cw-s);
    a0=(A+1)-(A-1)*cw+s;     a1=2*((A-1)-(A+1)*cw);    a2=(A+1)-(A-1)*cw-s;
  } else if(type==="LP"){
    b1=1-cw; b0=b1/2; b2=b0; a0=1+alpha; a1=-2*cw; a2=1-alpha;
  } else if(type==="HP"){
    b0=(1+cw)/2; b1=-(1+cw); b2=b0; a0=1+alpha; a1=-2*cw; a2=1-alpha;
  } else {
    return null; // unknown filter type → no-op
  }
  return {b0:b0/a0, b1:b1/a0, b2:b2/a0, a1:a1/a0, a2:a2/a0};
}

/* Magnitude (dB) of a normalised biquad at frequency f. */
function peqMagDb(c, f){
  const w = 2*Math.PI*f/PEQ_FS;
  const cw1=Math.cos(w), sw1=Math.sin(w), cw2=Math.cos(2*w), sw2=Math.sin(2*w);
  const nr=c.b0+c.b1*cw1+c.b2*cw2, ni=-(c.b1*sw1+c.b2*sw2);
  const dr=1+c.a1*cw1+c.a2*cw2,   di=-(c.a1*sw1+c.a2*sw2);
  return 10*Math.log10((nr*nr+ni*ni)/(dr*dr+di*di));
}

/* Apply parsed PEQ to an SPL array using RBJ digital biquads.
   Returns a new 480-point array. */
function applyPEQ(devSpl, parsed){
  if(!parsed) return devSpl.slice();
  // Precompute coefficients once per filter, then evaluate across the grid.
  const coeffs=[];
  for(const {type,fc,gain,q} of parsed.filters){
    const c=peqCoeffs(type, fc, gain, q);
    if(c) coeffs.push(c);
  }
  const out=devSpl.slice();
  for(let i=0;i<FR_GRID_N;i++){
    const f=FR_FREQ[i];
    let gainDb=parsed.preamp;
    for(const c of coeffs) gainDb+=peqMagDb(c, f);
    out[i]=devSpl[i]+gainDb;
  }
  return out;
}

/* Extended SVG renderer: draws raw (dimmed) + EQ curve + target.
   eqSpl may be an interpolated blend during animation. */
function frRealSVGWithEQ(devSpl, eqSpl, tgtSpl, opts){
  opts=opts||{};
  const W=520,H=230,padL=34,padR=12,padT=12,padB=26;
  const iw=W-padL-padR, ih=H-padT-padB;
  const dev=frSmooth(devSpl,FR_SMOOTH_OCT), eq=frSmooth(eqSpl,FR_SMOOTH_OCT);
  const tgt=tgtSpl?frSmooth(tgtSpl,FR_SMOOTH_OCT):null;
  const devOff=FR_NORM_DB-frValueAt(dev,FR_NORM_HZ);
  const eqOff=FR_NORM_DB-frValueAt(eq,FR_NORM_HZ);
  const dn=dev.map(v=>v+devOff), en=eq.map(v=>v+eqOff);
  let tn=null;
  if(tgt){ const tOff=FR_NORM_DB-frValueAt(tgt,FR_NORM_HZ); tn=tgt.map(v=>v+tOff); }
  const yMax=FR_NORM_DB+FR_Y_SPAN/2, yMin=FR_NORM_DB-FR_Y_SPAN/2;
  const X=i=>padL+iw*(FR_LOGF[i]-FR_LOGF[0])/(FR_LOGF[FR_GRID_N-1]-FR_LOGF[0]);
  const Xf=hz=>padL+iw*(Math.log10(hz)-FR_LOGF[0])/(FR_LOGF[FR_GRID_N-1]-FR_LOGF[0]);
  const Y=db=>padT+ih*(1-(db-yMin)/(yMax-yMin));
  const plotY=db=>Math.max(padT-400,Math.min(H-padB+400,Y(db)));
  const uid="frrclip"+(++FRR_UID);
  const dbTicks=[]; for(let db=yMin;db<=yMax;db+=10) dbTicks.push(db);
  const gy=dbTicks.map(db=>`<line x1="${padL}" y1="${Y(db).toFixed(1)}" x2="${W-padR}" y2="${Y(db).toFixed(1)}" class="frr-grid"/><text x="${padL-5}" y="${(Y(db)+3).toFixed(1)}" class="frr-tick" text-anchor="end">${db}</text>`).join("");
  const fTicks=[20,50,100,200,500,1000,2000,5000,10000,20000];
  const gx=fTicks.map(f=>{ const lab=f>=1000?(f/1000)+"k":f; const x=Xf(f); return `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${H-padB}" class="frr-grid"/><text x="${x.toFixed(1)}" y="${H-9}" class="frr-tick" text-anchor="middle">${lab}</text>`; }).join("");
  const pts=arr=>arr.map((v,i)=>`${X(i).toFixed(1)},${plotY(v).toFixed(1)}`).join(" ");
  const tgtLine=tn?`<polyline class="frr-target" points="${pts(tn)}"/>`:"";
  return `<svg class="frr-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${escapeHTML(opts.aria||'Frequency response')}">
    <defs><clipPath id="${uid}"><rect x="${padL}" y="${padT}" width="${iw}" height="${ih}"/></clipPath></defs>
    <rect x="0" y="0" width="${W}" height="${H}" class="frr-bg"/>
    ${gy}${gx}
    <g clip-path="url(#${uid})">
    ${tgtLine}
    <polyline class="frr-dev frr-dev-dim" points="${pts(dn)}"/>
    <polyline class="frr-eq-curve" points="${pts(en)}" pathLength="1"/>
    </g>
  </svg>`;
}

/* Aligned SVG renderer: subtracts target so it becomes a flat line.
   Draws device (and optionally EQ) deviation, plus preference bounds shading. */
function frRealSVGAligned(devSpl, tgtSpl, boundsUpper, boundsLower, eqSpl, opts){
  opts=opts||{};
  const W=520,H=230,padL=34,padR=12,padT=12,padB=26;
  const iw=W-padL-padR, ih=H-padT-padB;
  const dev=frSmooth(devSpl,FR_SMOOTH_OCT);
  const tgt=frSmooth(tgtSpl,FR_SMOOTH_OCT);
  const yMax=FR_NORM_DB+FR_Y_SPAN/2, yMin=FR_NORM_DB-FR_Y_SPAN/2;
  // align: subtract target so target becomes flat at FR_NORM_DB
  const devOff=FR_NORM_DB-frValueAt(dev,FR_NORM_HZ);
  const tgtOff=FR_NORM_DB-frValueAt(tgt,FR_NORM_HZ);
  const dn=dev.map((v,i)=>v+devOff-(tgt[i]+tgtOff)+FR_NORM_DB);
  const X=i=>padL+iw*(FR_LOGF[i]-FR_LOGF[0])/(FR_LOGF[FR_GRID_N-1]-FR_LOGF[0]);
  const Xf=hz=>padL+iw*(Math.log10(hz)-FR_LOGF[0])/(FR_LOGF[FR_GRID_N-1]-FR_LOGF[0]);
  const Y=db=>padT+ih*(1-(db-yMin)/(yMax-yMin));
  const plotY=db=>Math.max(padT-400,Math.min(H-padB+400,Y(db)));
  const uid="frrclip"+(++FRR_UID);
  const dbTicks=[]; for(let db=yMin;db<=yMax;db+=10) dbTicks.push(db);
  const gy=dbTicks.map(db=>`<line x1="${padL}" y1="${Y(db).toFixed(1)}" x2="${W-padR}" y2="${Y(db).toFixed(1)}" class="frr-grid"/><text x="${padL-5}" y="${(Y(db)+3).toFixed(1)}" class="frr-tick" text-anchor="end">${db}</text>`).join("");
  const fTicks=[20,50,100,200,500,1000,2000,5000,10000,20000];
  const gx=fTicks.map(f=>{ const lab=f>=1000?(f/1000)+"k":f; const x=Xf(f); return `<line x1="${x.toFixed(1)}" y1="${padT}" x2="${x.toFixed(1)}" y2="${H-padB}" class="frr-grid"/><text x="${x.toFixed(1)}" y="${H-9}" class="frr-tick" text-anchor="middle">${lab}</text>`; }).join("");
  const pts=arr=>arr.map((v,i)=>`${X(i).toFixed(1)},${plotY(v).toFixed(1)}`).join(" ");
  // flat target line — hidden in Preference Bounds mode (only the bounds area shows)
  const flatY=Y(FR_NORM_DB).toFixed(1);
  const hasBounds = !!(boundsUpper && boundsLower);
  const flatLine = hasBounds ? "" : `<line x1="${padL}" y1="${flatY}" x2="${W-padR}" y2="${flatY}" class="frr-target frr-target-flat"/>`;
  // preference bounds
  let boundsHTML="";
  if(hasBounds){
    const bSmU=frSmooth(boundsUpper,FR_SMOOTH_OCT), bSmL=frSmooth(boundsLower,FR_SMOOTH_OCT);
    const bu=bSmU.map((v,i)=>v-tgt[i]+FR_NORM_DB);
    const bl=bSmL.map((v,i)=>v-tgt[i]+FR_NORM_DB);
    const polyU=pts(bu), polyL=pts(bl);
    // shade polygon: upper forward + lower reversed
    const shadePoints=polyU+" "+bl.map((v,i)=>`${X(FR_GRID_N-1-i).toFixed(1)},${plotY(bl[FR_GRID_N-1-i]).toFixed(1)}`).join(" ");
    boundsHTML=`<polygon class="frr-bounds-fill" points="${shadePoints}"/>
    <polyline class="frr-bounds-upper" points="${polyU}"/>
    <polyline class="frr-bounds-lower" points="${polyL}"/>`;
  }
  // EQ curve in aligned mode
  let eqLine="";
  if(eqSpl){
    const eq=frSmooth(eqSpl,FR_SMOOTH_OCT);
    const eqOff=FR_NORM_DB-frValueAt(eq,FR_NORM_HZ);
    const en=eq.map((v,i)=>v+eqOff-(tgt[i]+tgtOff)+FR_NORM_DB);
    eqLine=`<polyline class="frr-eq-curve" points="${pts(en)}" pathLength="1"/>`;
    // dim raw when EQ active
  }
  const devCls=eqSpl?"frr-dev frr-dev-dim":"frr-dev";
  return `<svg class="frr-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${escapeHTML(opts.aria||'Frequency response')}">
    <defs><clipPath id="${uid}"><rect x="${padL}" y="${padT}" width="${iw}" height="${ih}"/></clipPath></defs>
    <rect x="0" y="0" width="${W}" height="${H}" class="frr-bg"/>
    ${gy}${gx}
    <g clip-path="url(#${uid})">
    ${boundsHTML}
    ${flatLine}
    <polyline class="${devCls}" points="${pts(dn)}" pathLength="1"/>
    ${eqLine}
    </g>
  </svg>`;
}

/* Preference bounds: real measured upper/lower limit curves (absolute SPL on
   the 480-pt grid) traced from the Harman 5128 research figures, one pair per
   base target. Keyed by the base-target key. */
const FR_PREF_BOUNDS_KEYS = {
  "5128_df_base": { upper: "5128_df_bounds_upper", lower: "5128_df_bounds_lower" },
  "jm1_df_base":  { upper: "jm1_df_bounds_upper",  lower: "jm1_df_bounds_lower"  },
};
/* Return preference bounds {upper, lower} as absolute SPL arrays for a given
   base-target key. Falls back to null when no measured bounds exist. */
function frPrefBounds(baseKey){
  const map = FR_PREF_BOUNDS_KEYS[baseKey];
  if(!map) return null;
  const up = frTarget(map.upper), lo = frTarget(map.lower);
  if(!up || !lo || !up.spl || !lo.spl) return null;
  return { upper: up.spl, lower: lo.spl };
}
/* Map a device's chosen 5128 target key to its base (no +8 dB bass shelf)
   version, used by the Preference Bounds view. Returns null for non-5128
   targets, which is what keeps the feature 5128-only. */
function frBaseTargetKey(tgtKey){
  if(tgtKey==="5128_df_8db")  return "5128_df_base";
  if(tgtKey==="5128_jm1_8db") return "jm1_df_base";
  return null;
}

/* Predicted preference rating — Olive-Welti / Harman model
   (Listen Inc "Prediction of Listener Preference … using the Harman Model").
   Pref = C0 − C_SD·SD − C_SL·|Slope|
   SD    = standard deviation of the error curve (device − target), dB
   Slope = linear-regression slope of that error curve, dB/octave
   Band: FR_PREF_LO..FR_PREF_HI (50 Hz – 10 kHz), 1/12-oct smoothed.

   Harman publishes SEPARATE listener models for over-ear and in-ear, so we key
   the coefficients on the device type:

   • Over-ear: the genuine published over-ear coefficients (114.49 / 12.62 /
     15.52). Validated against a reference set measured vs Harman OE 2018
     (LCD-5 70, HE400SE 89, HD600 91, HD 490 Pro 91) — and, critically, every
     stored EQ preset now raises the score (the old shelf-filter math flattened
     shelves so EQ could paradoxically lower it).

   • In-ear: recalibrated by least-squares against a reference set of 711 IEMs
     measured vs Harman IE 2019 v2 (EA500LM 84, EW100P 84, Quark2 84, KBear KB01
     78, KZ Dawn 65, Truthear Nova 88, EM6L 80, Aful Explorer 62; fit MAE ≈ 1.2).
     The published slope:SD ratio (15.52/12.62 ≈ 1.23) is preserved. The raw
     published coefficients score the 711 set too generously (EA500 LM → 98).

   See admin/analyze_pref.py for the derivation. */
const FR_PREF_LO = 50, FR_PREF_HI = 10000;
const FR_PREF_OE = { c0: 114.49, sd: 12.62, sl: 15.52 };  // published over-ear
const FR_PREF_IE = { c0: 92.98,  sd: 6.777, sl: 8.334 };  // recalibrated in-ear
function olivePref(devSpl, tgtSpl, overEar){
  if(!devSpl || !tgtSpl) return null;
  const dev=frSmooth(devSpl,FR_SMOOTH_OCT), tgt=frSmooth(tgtSpl,FR_SMOOTH_OCT);
  const idx=[]; for(let i=0;i<FR_GRID_N;i++){ if(FR_FREQ[i]>=FR_PREF_LO && FR_FREQ[i]<=FR_PREF_HI) idx.push(i); }
  if(idx.length<3) return null;
  let err=idx.map(i=>dev[i]-tgt[i]);
  // remove offset so absolute level doesn't affect SD/slope
  const off=frMedian(err); err=err.map(e=>e-off);
  const n=err.length, mean=err.reduce((a,b)=>a+b,0)/n;
  const sd=Math.sqrt(err.reduce((a,e)=>a+(e-mean)*(e-mean),0)/n);
  // slope in dB/octave: regress error vs log2(freq)
  const xs=idx.map(i=>FR_LOGF[i]/Math.log10(2)), xm=xs.reduce((a,b)=>a+b,0)/n;
  let sxy=0, sxx=0;
  for(let k=0;k<n;k++){ sxy+=(xs[k]-xm)*(err[k]-mean); sxx+=(xs[k]-xm)*(xs[k]-xm); }
  const slope=sxy/sxx;
  const C = overEar ? FR_PREF_OE : FR_PREF_IE;
  const pref=C.c0 - C.sd*sd - C.sl*Math.abs(slope);
  return { pref, sd, slope };
}

/* preference score for EQ view (req #12). A numeric `pref_override` on the item
   wins (manual pin). Otherwise, if a measurement + its target exist, use the
   Olive-Welti prediction (rounded, clamped 0-100). The measurement standard is
   whichever the device actually carries — in-ears store `711`, over-ears store
   `KB50xx`/`5128` — so we pick the preferred one for the category. Otherwise
   fall back to the deterministic tier+name estimate. */
function prefScore(it, tier){
  const name = typeof it === "string" ? it : (it && it.name) || "";
  if(it && typeof it === "object"){
    const ov = Number(it.pref_override);
    if(Number.isFinite(ov)) return Math.max(0, Math.min(100, Math.round(ov)));
    if(it.fr){
      const overEar = frIsOverEar(it.category);
      // preferred standard for this device type, then any measurement present
      const order = frStandardsFor(it.category).concat(["711","5128","KB50xx"]);
      let std = null, usedStd = null;
      for(const s of order){
        if(it.fr[s] && Array.isArray(it.fr[s].spl)){ std = it.fr[s]; usedStd = s; break; }
      }
      if(std){
        const tgtKey = std.target || frDefaultTarget(it.category, usedStd);
        const tgt = frTarget(tgtKey);
        if(tgt && tgt.spl){
          const r = olivePref(std.spl, tgt.spl, overEar);
          if(r) return Math.max(0, Math.min(100, Math.round(r.pref)));
        }
      }
    }
  }
  const base = {SS:93,S:88,A:82,B:73,C:64,D:54,F:42}[tier] ?? 60;
  const jitter = (hash(name)%7)-3;
  return Math.max(30, Math.min(99, base + jitter));
}

/* ============================================================ MOUSE SHAPE
   Only verified assets imported from the supplied archives are rendered.
   A missing shape_image deliberately produces no visual block. */
function hasMouseShape(it){
  return !!(it && typeof it.shape_image === "string" && it.shape_image.trim());
}
function mouseShapeSVG(it){
  if(!hasMouseShape(it)) return "";
  const src=escapeHTML(it.shape_image.trim());
  const label=escapeHTML(`${it.name||""} — ${t("shape_title")}`);
  return `<figure class="mouse-shape-figure">
    <img class="mouse-shape-image" src="${src}" alt="${label}" loading="lazy" decoding="async"
      onerror="this.closest('.mouse-shape-figure')?.remove()">
  </figure>`;
}
/* ============================================================ PRESET DOWNLOAD (req #12) */
function buildPreset(name, type){
  if (type === "GEQ"){
    const bands=[31,62,125,250,500,1000,2000,4000,8000,16000];
    const r=rng(hash(name+"geq"));
    const lines=bands.map(f=>`${f} Hz\t${((r()-0.5)*7).toFixed(1)} dB`);
    return `Terviona GEQ preset — ${name}\nGraphicEQ: `+bands.map(f=>`${f} ${((rng(hash(name+f))()-0.5)*7).toFixed(1)}`).join("; ")+`\n\n`+lines.join("\n");
  }
  const r=rng(hash(name+"peq"));
  let out=`Terviona PEQ preset — ${name}\nPreamp: -6.0 dB\n`;
  for(let i=1;i<=8;i++){ const f=Math.round(60*Math.pow(2,i*0.75)); const g=((r()-0.5)*8).toFixed(1); const q=(0.7+r()*0.9).toFixed(2); out+=`Filter ${i}: ON PK Fc ${f} Hz Gain ${g} dB Q ${q}\n`; }
  return out;
}
function downloadPreset(name, type, content){
  // content — ручной текст пресета из данных (поля peq/geq в audio.json,
  // заполняются через админку); без него генерируем заглушку.
  const blob = new Blob([content || buildPreset(name,type)], {type:"text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name.replace(/[^\w\-]+/g,"_")}_${type}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

/* ============================================================ THEME */
function initTheme(){ const s=localStorage.getItem("theme")||"dark"; document.documentElement.setAttribute("data-theme",s); }
function setTheme(v){ document.documentElement.setAttribute("data-theme",v); localStorage.setItem("theme",v); }

/* ============================================================ LANGUAGE + SETTINGS */
function setLang(l, manual){
  LANG = l; localStorage.setItem("lang", l);
  // Keep the window mirror in sync. NOTE: the Object.assign(window,{get LANG...})
  // export below copies the getter's VALUE once at load (Object.assign invokes
  // getters), so window.LANG would otherwise stay frozen at the initial language.
  // reviews.js / auth.js read window.LANG, so we must update it explicitly here.
  window.LANG = l;
  // A manual language pick (from the language menu) also drives the matching
  // region + currency (по запросу): en→INT/USD, uk→UA/UAH, ru→RU/RUB. It locks
  // the language so a later region switch won't override it, but it does NOT
  // set the currency/region locks — those stay tied to the language unless the
  // user picks them explicitly. Region-driven calls pass no flag (guarded to
  // avoid an infinite setLang⇄setRegion loop).
  if (manual) {
    localStorage.setItem("lang_locked", "1");
    if (!localStorage.getItem("region_locked")) {
      const rg = DEFAULT_REGION[l]; if (rg) { REGION = rg; localStorage.setItem("region", rg); }
    }
    if (!localStorage.getItem("currency_locked")) {
      const c = DEFAULT_CUR[l]; if (c) { CURRENCY = c; localStorage.setItem("currency", c); }
    }
  }
  document.documentElement.setAttribute("lang", l);
  buildIndex(); applyStaticI18n(); renderChrome(window.__ACTIVE__); wireGlobal();
  if (window.PAGE_RENDER) window.PAGE_RENDER();
  // signal for reviews.js/auth.js: re-render language-dependent blocks that live
  // outside the chrome/page render (e.g. the reviews block inside an open modal).
  window.dispatchEvent(new CustomEvent("terviona:lang", { detail: { lang: l } }));
}
function setCurrency(c){ CURRENCY=c; localStorage.setItem("currency",c); localStorage.setItem("currency_locked","1"); if(window.PAGE_RENDER) window.PAGE_RENDER(); refreshChromeLabels(); }
/* Changing region auto-sets the matching currency AND language (req #2) — but
   only the ones the user hasn't manually locked. Picking a region is itself an
   explicit choice, so it locks the region. If the region switch changes the
   language we re-render fully (via setLang path); otherwise a chrome refresh. */
function setRegion(rg){
  REGION=rg; localStorage.setItem("region",rg); localStorage.setItem("region_locked","1");
  if(!localStorage.getItem("currency_locked")){
    const c=REGION_CUR[rg]; if(c){ CURRENCY=c; localStorage.setItem("currency",c); }
  }
  if(!localStorage.getItem("lang_locked")){
    const l=REGION_LANG[rg];
    if(l && l!==LANG){ setLang(l); return; }   // setLang re-renders + honours locks
  }
  if(window.PAGE_RENDER) window.PAGE_RENDER();
  refreshChromeLabels();
}
function setView(v){ VIEW=v; localStorage.setItem("view",v); if(window.PAGE_RENDER) window.PAGE_RENDER(); refreshChromeLabels(); }
function setOS(v){ OS=v; localStorage.setItem("os",v); document.querySelectorAll("[data-os-kbd]").forEach(applyOsKbd); }

function applyStaticI18n(){
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{ el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el=>{ el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
  document.title = document.title; // keep
}

/* ============================================================ SPOTLIGHT SEARCH (req #13/#22) */
function osShortcut(){ return OS === "mac" ? ["⌘","K"] : ["Ctrl","K"]; }
let SEARCH_INDEX_PROMISE=null;
function catalogReady(){ return Object.keys(CATEGORIES).every(key=>DB.data[key]?.items); }
function ensureSearchIndex(){
  if(catalogReady()){ buildIndex(); return Promise.resolve(DB.index); }
  if(!SEARCH_INDEX_PROMISE){
    SEARCH_INDEX_PROMISE=loadCatalog().then(()=>DB.index).finally(()=>{ SEARCH_INDEX_PROMISE=null; });
  }
  return SEARCH_INDEX_PROMISE;
}
function warmSearchIndex(){
  if(catalogReady() || SEARCH_INDEX_PROMISE) return;
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory<=4)) return;
  const run=()=>ensureSearchIndex().catch(()=>{});
  setTimeout(()=>{
    if(catalogReady() || SEARCH_INDEX_PROMISE) return;
    if("requestIdleCallback" in window) requestIdleCallback(run,{timeout:5000});
    else run();
  },2000);
}
const Spot = {
  el:null, input:null, results:null, sel:0, items:[], loading:false,
  build(){
    if (document.getElementById("spot")) return;
    const ov=document.createElement("div"); ov.className="spot-overlay"; ov.id="spotOverlay";
    ov.innerHTML=`<div class="spot" id="spot" role="dialog" aria-modal="true">
      <div class="spot-in">${ICO.search}<input id="spotInput" type="text" autocomplete="off" spellcheck="false" placeholder="${escapeHTML(t('spot_ph'))}"/><button class="esc" id="spotEsc">ESC</button></div>
      <div class="spot-results" id="spotResults"></div>
      <div class="spot-foot"><span><span class="kk">↑↓</span>${t('spot_nav')}</span><span><span class="kk">↵</span>${t('spot_open')}</span><span><span class="kk">esc</span>${t('spot_close')}</span></div>
    </div>`;
    document.body.appendChild(ov);
    this.el=ov; this.input=ov.querySelector("#spotInput"); this.results=ov.querySelector("#spotResults");
    this.input.addEventListener("input",()=>this.query());
    ov.addEventListener("click",e=>{ if(e.target===ov) this.close(); });
    ov.querySelector("#spotEsc").addEventListener("click",()=>this.close());
    this.input.addEventListener("keydown",e=>this.onKey(e));
    this.query();
  },
  async open(){
    this.build(); this.el.classList.remove("closing"); this.el.classList.add("open"); this.input.value="";
    setTimeout(()=>this.input.focus(),30); document.body.style.overflow="hidden";
    this.loading=!catalogReady(); this.query();
    if(this.loading){
      try{ await ensureSearchIndex(); }
      catch(error){ /* keep the current partial index when offline */ }
      finally{ this.loading=false; if(this.isOpen()) this.query(); }
    }
  },
  close(){ if(this.el && this.el.classList.contains("open")){ const el=this.el; el.classList.remove("open"); el.classList.add("closing"); document.body.style.overflow=""; setTimeout(()=>el.classList.remove("closing"),190); } },
  isOpen(){ return this.el && this.el.classList.contains("open"); },
  query(){
    if(this.loading){ this.results.innerHTML=`<div class="spot-empty">${escapeHTML(t('spot_loading'))}</div>`; return; }
    const q=this.input.value; this.items = q?searchIndex(q):[]; this.sel=0; this.render(q);
  },
  render(q){
    if(!q){ this.results.innerHTML=`<div class="spot-empty">${escapeHTML(t('spot_ph'))}<br><span class="mut3" style="font-size:12px">${DB.index.length} ${t('stat_devices')} · ${brandCount()} ${t('stat_brands')}</span></div>`; return; }
    if(!this.items.length){ this.results.innerHTML=`<div class="spot-empty">${t('spot_empty')} “${escapeHTML(q)}”</div>`; return; }
    const groups={}; this.items.forEach((e,i)=>{ (groups[e.cat]=groups[e.cat]||[]).push({e,i}); });
    let html="";
    for(const [cat,arr] of Object.entries(groups)){
      html+=`<div class="spot-group-h">${escapeHTML(cat)}</div>`;
      for(const {e,i} of arr){
        html+=`<div class="spot-item${i===this.sel?' sel':''}" data-i="${i}">
          <div class="si-ico">${ICO[CATEGORIES[e.key].icon]||''}</div>
          <div style="min-width:0"><div class="si-name">${escapeHTML(e.name)}</div>
          <div class="si-sub">${escapeHTML([priceLabel(e.price), e.sub].filter(Boolean).join('  ·  '))}</div></div>
          ${e.tier?`<span class="si-tier t-${(e.tierBase||'x').toLowerCase()}" style="background:${tierColorVar(e.tierBase)}">${escapeHTML(e.tier)}</span>`:''}</div>`;
      }
    }
    this.results.innerHTML=html;
    this.results.querySelectorAll(".spot-item").forEach(el=> el.addEventListener("click",()=>this.go(parseInt(el.dataset.i))));
  },
  onKey(e){
    if(e.key==="Escape") this.close();
    else if(e.key==="ArrowDown"){ e.preventDefault(); this.sel=Math.min(this.sel+1,this.items.length-1); this.render(this.input.value); this.scrollSel(); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); this.sel=Math.max(this.sel-1,0); this.render(this.input.value); this.scrollSel(); }
    else if(e.key==="Enter"){ e.preventDefault(); if(this.items[this.sel]) this.go(this.sel); }
  },
  scrollSel(){ const el=this.results.querySelector(".spot-item.sel"); if(el) el.scrollIntoView({block:"nearest"}); },
  go(i){ const e=this.items[i]; if(!e) return; this.close(); location.href=categoryPath(e.key,e.name); },
};

/* ============================================================ CHROME (nav + footer + settings) */
function applyOsKbd(el){
  const [mod,key] = osShortcut();
  el.innerHTML = `<kbd>${mod}</kbd><kbd>${key}</kbd>`;
}
function socialLinksHTML(className="social-links"){
  return `<div class="${className}">${SOCIAL_LINKS.map(s=>`<a class="social-link" href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="Terviona on ${escapeHTML(s.label)}" title="${escapeHTML(s.label)}"><span class="social-icon">${SOCIAL_ICO[s.key]}</span><span class="social-label">${escapeHTML(s.label)}</span></a>`).join("")}</div>`;
}
function renderChrome(active){
  window.__ACTIVE__ = active;
  const moreLabel = ({ru:"Ещё",en:"More",uk:"Ще"})[LANG] || t('nav_more');
  const nav = document.getElementById("nav");
  if (nav) nav.innerHTML = `<div class="wrap nav-in">
    <a class="brand" href="/" aria-label="Terviona — главная"><span class="brand-symbol">${BRAND_MARK}</span><span class="brand-wordmark">${BRAND_WORDMARK}</span><span class="brand-code mono" aria-hidden="true">0x54_56</span></a>
    <nav class="nav-links" aria-label="${escapeHTML(t('nav_sections'))}">
      <a href="/" class="${active==='home'?'active':''}">${t('nav_home')}</a>
      <a href="${categoryPath('mice')}" class="${active==='mice'?'active':''}">${t('nav_mice')}</a>
      <a href="${categoryPath('audio')}" class="${active==='audio'?'active':''}">${t('nav_audio')}</a>
    </nav>
    <div class="pop-sel nav-more-wrap">
      <button class="nav-more-btn${['articles','methodology','faq','contact'].includes(active)?' active':''}" id="moreBtn" aria-label="${escapeHTML(moreLabel)}" aria-controls="moreMenu" aria-expanded="false">${ICO.more}<span>${escapeHTML(moreLabel)}</span></button>
      <div class="pop-menu nav-more-menu" id="moreMenu">
        <span class="nav-menu-label">${escapeHTML(moreLabel)}</span>
        <a class="nav-menu-link${active==='articles'?' active':''}" href="/articles">${t('nav_articles')}</a>
        <a class="nav-menu-link${active==='methodology'?' active':''}" href="/methodology">${t('nav_methodology')}</a>
        <span class="nav-menu-link nav-menu-soon" title="${escapeHTML(t('mousepads_soon'))}"><span>${escapeHTML(comingSoonLabel(COMING_SOON_CATEGORIES[0]))}</span><i>soon</i></span>
        <span class="nav-menu-link nav-menu-soon" title="${escapeHTML(t('builder_soon'))}"><span>${t('nav_builder')}</span><i>soon</i></span>
        <a class="nav-menu-link${active==='faq'?' active':''}" href="faq.html">${t('nav_faq')}</a>
        <a class="nav-menu-link${active==='contact'?' active':''}" href="contact.html">${t('nav_contact')}</a>
      </div>
    </div>
    <div class="nav-right">
      <button class="mini-search" data-spot-open aria-label="${escapeHTML(t('search_hint'))}">${ICO.search}<span>${t('search_hint')}</span></button>
      <div class="pop-sel"><button class="icon-btn" id="setBtn" aria-label="${escapeHTML(t('settings'))}" aria-controls="setMenu" aria-expanded="false">${ICO.cog}</button>${settingsMenu()}</div>
      <div class="pop-sel"><button class="lang-btn" id="langBtn" aria-controls="langMenu" aria-expanded="false"><span id="langCode">${window.I18N[LANG].code}</span> ▾</button>
        <div class="pop-menu" id="langMenu">
          <button data-l="ru" class="${LANG==='ru'?'active':''}">🇷🇺 Русский</button>
          <button data-l="en" class="${LANG==='en'?'active':''}">🇬🇧 English</button>
          <button data-l="uk" class="${LANG==='uk'?'active':''}">🇺🇦 Українська</button>
        </div></div>
      <div class="pop-sel nav-menu-wrap">
        <button class="icon-btn nav-menu-btn" id="navMenuBtn" aria-label="${escapeHTML(t('nav_menu'))}" aria-controls="navMenu" aria-expanded="false">${ICO.menu}</button>
        <div class="pop-menu mobile-nav-menu" id="navMenu">
          <button class="mobile-nav-search" data-spot-open>${ICO.search}<span>${t('search_hint')}</span></button>
          <span class="nav-menu-label">${t('nav_sections')}</span>
          <a class="nav-menu-link${active==='home'?' active':''}" href="/">${t('nav_home')}</a>
          <a class="nav-menu-link${active==='mice'?' active':''}" href="${categoryPath('mice')}">${t('nav_mice')}</a>
          <a class="nav-menu-link${active==='audio'?' active':''}" href="${categoryPath('audio')}">${t('nav_audio')}</a>
          <a class="nav-menu-link${active==='articles'?' active':''}" href="/articles">${t('nav_articles')}</a>
          <a class="nav-menu-link${active==='methodology'?' active':''}" href="/methodology">${t('nav_methodology')}</a>
          <span class="nav-menu-link nav-menu-soon" title="${escapeHTML(t('mousepads_soon'))}"><span>${escapeHTML(comingSoonLabel(COMING_SOON_CATEGORIES[0]))}</span><i>soon</i></span>
          <span class="nav-menu-link nav-menu-soon" title="${escapeHTML(t('builder_soon'))}"><span>${t('nav_builder')}</span><i>soon</i></span>
          <a class="nav-menu-link${active==='faq'?' active':''}" href="faq.html">${t('nav_faq')}</a>
          <a class="nav-menu-link${active==='contact'?' active':''}" href="contact.html">${t('nav_contact')}</a>
        </div>
      </div>
    </div></div>`;
  const foot = document.getElementById("footer");
  if (foot) foot.innerHTML = `<div class="wrap">
    <div class="foot-rule"></div>
    <div class="foot-top">
      <div class="foot-identity">
        <div class="fb-lockup"><span class="fb-mark">${BRAND_MARK}</span>${BRAND_WORDMARK}</div>
        <div class="fb-sub">${t('foot_tag')}</div>
        <div class="fb-founder mono">${t('foot_founder')} <span>GloWer</span></div>
        ${socialLinksHTML('foot-social')}
        <div class="fb-ascii mono" aria-hidden="true"><span>┌─ TERVIONA::DATABASE</span><span>├─ [MICE]──[AUDIO]──[DATA]</span><span>└─ STATUS::ONLINE</span></div>
      </div>
      <div class="foot-cols">
        <div class="fcol"><h5>${t('foot_sections')}</h5><ul>
          <li><a href="${categoryPath('mice')}">${t('nav_mice')}</a></li>
          <li><a href="${categoryPath('audio')}">${t('nav_audio')}</a></li>
        </ul></div>
        <div class="fcol"><h5>${t('foot_project')}</h5><ul>
          <li><a href="/articles">${t('nav_articles')}</a></li>
          <li><a href="/methodology">${t('nav_methodology')}</a></li>
          <li><a href="faq.html">${t('nav_faq')}</a></li>
          <li><a href="contact.html">${t('nav_contact')}</a></li>
        </ul></div>
        <div class="fcol"><h5>${t('foot_soon')}</h5><ul>
          <li><span class="soon">API<i>soon</i></span></li>
          <li><span class="soon">${escapeHTML(comingSoonLabel(COMING_SOON_CATEGORIES[0]))}<i>soon</i></span></li>
          <li><span class="soon">${t('soon_eq')}<i>soon</i></span></li>
        </ul></div>
      </div>
    </div>
    <div class="foot-bottom">
      <span class="fnote mut3">${t('footer_note')}</span>
      <span class="fauth mono mut3">Founded by GloWer · Terviona ${new Date().getFullYear()}</span>
    </div>
  </div>`;
  document.querySelectorAll("[data-os-kbd]").forEach(applyOsKbd);
  // сигнал для auth.js/reviews.js: шапка перерисована — можно вернуть свои кнопки
  window.dispatchEvent(new CustomEvent("terviona:chrome", { detail: { active } }));
}
function settingsMenu(){
  const seg = (name, opts) => `<div class="seg" data-seg="${name}">`+opts.map(o=>`<button data-${name}="${o.v}" class="${o.act?'active':''}">${o.l}</button>`).join("")+`</div>`;
  return `<div class="pop-menu set-menu" id="setMenu">
    <div class="set-row"><span class="set-lbl">${t('set_view')}</span>${seg("view",[
      {v:"list",l:ICO.list+"<span>"+t('view_list')+"</span>",act:VIEW==="list"},
      {v:"grid",l:ICO.grid+"<span>"+t('view_grid')+"</span>",act:VIEW==="grid"}])}</div>
    <div class="set-row"><span class="set-lbl">${t('set_currency')}</span>${seg("cur",
      Object.keys(CUR).map(k=>({v:k,l:CUR[k].sym,act:CURRENCY===k})))}</div>
    <div class="set-row"><span class="set-lbl">${t('set_region')}</span>${seg("region",[
      {v:"ru",l:"🇷🇺 RU",act:REGION==="ru"},{v:"by",l:"🇧🇾 BY",act:REGION==="by"},{v:"ua",l:"🇺🇦 UA",act:REGION==="ua"},{v:"int",l:"🌍 INT",act:REGION==="int"}])}</div>
    <div class="set-row"><span class="set-lbl">${t('set_theme')}</span>${seg("theme",[
      {v:"dark",l:t('theme_dark'),act:(localStorage.getItem('theme')||'dark')==='dark'},
      {v:"light",l:t('theme_light'),act:localStorage.getItem('theme')==='light'}])}</div>
  </div>`;
}
function refreshChromeLabels(){ renderChrome(window.__ACTIVE__); wireGlobal(); }

/* ============================================================ GLOBAL WIRING */
function wireGlobal(){
  if(!window.__terKeys){ window.__terKeys = 1;
    document.addEventListener("keydown", e=>{
      if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); Spot.open(); }
      else if(e.key==="/" && !/input|textarea/i.test(document.activeElement.tagName) && !Spot.isOpen()){ e.preventDefault(); Spot.open(); }
      else if(e.key==="Escape") closePopMenus();
    });
    // Freshness checks are network-only maintenance work. Start them after the
    // first render and never poll a background tab.
    const firstFreshCheck=()=>{ checkFresh(); checkDataFresh(); };
    if("requestIdleCallback" in window) requestIdleCallback(firstFreshCheck,{timeout:2500});
    else setTimeout(firstFreshCheck,1200);
    window.setInterval(()=>{ if(!document.hidden) checkDataFresh(); },60000);
    document.addEventListener("visibilitychange", ()=>{ if(!document.hidden){ checkFresh(); checkDataFresh(); } });
    window.addEventListener("focus", ()=>{ checkFresh(); checkDataFresh(); });
    document.addEventListener("click",e=>{ if(!e.target.closest(".pop-sel")) closePopMenus(); });
  }
  document.querySelectorAll("[data-spot-open]").forEach(el=> el.addEventListener("click",()=>{ closePopMenus(); Spot.open(); }));

  // Win/Mac shortcut toggle when hovering the big search trigger (req #13):
  // resting state shows the active OS shortcut, hover reveals the other OS.
  document.querySelectorAll("[data-shortcut-hover]").forEach(el=>{
    renderHoverKbd(el);
    el.addEventListener("mouseenter",()=>{ el.dataset.hover="1"; renderHoverKbd(el); });
    el.addEventListener("mouseleave",()=>{ el.dataset.hover="0"; renderHoverKbd(el); });
  });
  document.querySelectorAll("[data-os-kbd]").forEach(applyOsKbd);

  // popover menus (navigation + settings + language)
  wirePop("moreBtn","moreMenu");
  wirePop("navMenuBtn","navMenu");
  wirePop("setBtn","setMenu");
  wirePop("langBtn","langMenu");
  const lm=document.getElementById("langMenu");
  if(lm) lm.querySelectorAll("button").forEach(b=> b.addEventListener("click",()=>{ setLang(b.dataset.l, true); }));
  wireSettings();
}
function closePopMenus(except){
  document.querySelectorAll(".pop-menu.open").forEach(menu=>{
    if(menu===except) return;
    menu.classList.remove("open");
    document.querySelector(`[aria-controls="${menu.id}"]`)?.setAttribute("aria-expanded","false");
  });
}
function wirePop(btnId, menuId){
  const b=document.getElementById(btnId), m=document.getElementById(menuId);
  if(!b||!m) return;
  b.addEventListener("click",e=>{ e.stopPropagation(); closePopMenus(m); const isOpen=m.classList.toggle("open"); b.setAttribute("aria-expanded",String(isOpen)); });
  m.addEventListener("click",e=>e.stopPropagation());
}
function wireSettings(){
  const m=document.getElementById("setMenu"); if(!m) return;
  m.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>{ setView(b.dataset.view); }));
  m.querySelectorAll("[data-cur]").forEach(b=>b.addEventListener("click",()=>{ setCurrency(b.dataset.cur); }));
  m.querySelectorAll("[data-region]").forEach(b=>b.addEventListener("click",()=>{ setRegion(b.dataset.region); }));
  m.querySelectorAll("[data-theme]").forEach(b=>b.addEventListener("click",()=>{ setTheme(b.dataset.theme); refreshChromeLabels(); document.getElementById("setMenu")?.classList.add("open"); }));
}
function renderHoverKbd(el){
  const kb=el.querySelector("[data-hoverkbd]"); if(!kb) return;
  const hovering = el.dataset.hover === "1";
  const useOS = hovering ? (OS==="mac"?"win":"mac") : OS;
  const [mod,key] = useOS==="mac" ? ["⌘","K"] : ["Ctrl","K"];
  kb.innerHTML = `<kbd>${mod}</kbd><kbd>${key}</kbd>`;
}

/* ---------- scroll reveal ---------- */
function initReveal(){
  const io=new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } }); }, {threshold:.06, rootMargin:"0px 0px -40px 0px"});
  document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
}

/* ---------- expose ---------- */
Object.assign(window, {
  DB, CATEGORIES, COMING_SOON_CATEGORIES, CATEGORY_METHOD, GROUPS, TIERS, AUDIO_TIERS, TIER_COLORS, ICO, SOCIAL_ICO, SOCIAL_LINKS, CUR,
  t, trField, localizedValue, localizedField, comingSoonLabel, catLabel, catShort, fmtMoney, priceLabel, priceMid, sourcePriceRub, itemPriceRub, itemPriceMid, displayPrice, budgetCat,
  tierBase, audioTier, deviceTier, tierRank, tierColorVar, tierList, tierGrade, tierDist,
  cleanRecommend, brandOf, brandCount, buildIndex, shopMarket, buyInfo, marketBadge,
  escapeHTML, hash, frChartSVG, prefScore, olivePref, hasMouseShape, mouseShapeSVG, downloadPreset, labAgo,
  frRealSVG, frMetrics, frTarget, frDefaultTarget, frStandardsFor, frIsOverEar, frBaseTargetKey, loadFRTargets,
  initTheme, initGeoDefaults, setTheme, setLang, setCurrency, setRegion, setView, setOS,
  applyStaticI18n, wireGlobal, renderChrome, refreshChromeLabels, socialLinksHTML, initReveal,
  loadAll, loadCatalog, loadCategoryData, loadFAQ, loadMethodology, warmSearchIndex, Spot,
  get LANG(){return LANG;}, get CURRENCY(){return CURRENCY;}, get REGION(){return REGION;}, get VIEW(){return VIEW;}, get OS(){return OS;},
});
