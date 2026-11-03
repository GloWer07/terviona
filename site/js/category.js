/* ============================================================
   Terviona — category page.
   One unified layout for every category:
     · devices grouped by the single tier system (SS…F)
     · default = long horizontal rows (list); grid tiles optional
     · click a device -> inline short summary; "Подробнее" -> full modal
   Special handling:
     · audio — tiers grouped by device type; FR chart + EQ preset in the
       modal; price bands pale→strong per device type
   ============================================================ */
'use strict';

const QS = new URLSearchParams(location.search);
const PATH_ROUTE = routeFromPath();
let CUR_CAT = PATH_ROUTE.category || QS.get("c") || "mice";
if (!CATEGORIES[CUR_CAT]) CUR_CAT = "mice";

const S = {
  search: QS.get("q") || "",
  facet: "all",
  acat: "all",       // audio: category chosen via the rail chips
  price: "all",
  budget: "any",    // audio price-band bucket id; "any" = no price restriction
  sort: "tier",
  openName: null,
  openSlug: PATH_ROUTE.deviceSlug || null,
};

/* price buckets kept in RUB; labels localized to active currency */
const PRICE_BUCKETS = [
  { id:"all", min:0, max:Infinity, label:()=>t("budget_any") },
  { id:"b1",  min:0, max:5000,      label:()=>"< "+fmtMoney(5000) },
  { id:"b2",  min:5000, max:15000,  label:()=>fmtMoney(5000)+"–"+fmtMoney(15000) },
  { id:"b3",  min:15000, max:40000, label:()=>fmtMoney(15000)+"–"+fmtMoney(40000) },
  { id:"b4",  min:40000, max:Infinity, label:()=>fmtMoney(40000)+"+" },
];

/* ---------- budget segments ----------
   Audio derives its price bands from the best live regional price. Labels use
   fmtMoney so they auto-convert to $/₴/€/Br for the localized site versions.
   Budget is a plain OPTIONAL filter: the main page already exposes price
   sorting and a price/budget filter, so gating the list was redundant. */
function budgetDef(key){
  if (key === "audio"){
    // bands are per device type, so the price dropdown only applies once a
    // single category is picked on the rail; with "all" types selected there
    // is no single band scheme, so the dropdown is hidden.
    if (S.acat==="all") return null;
    return { kind:"price", mandatory:false, buckets:audioBandsFor(S.acat) };
  }
  return null;
}

/* ---------- audio price tiers (req #1) ----------
   Bands are per DEVICE TYPE — each audio category splits at its own RUB
   thresholds (below). All amounts are stored in RUB; fmtMoney() auto-converts
   the labels to the active currency, so RUB is the single source of truth.
   `AUDIO_BAND_EDGES[category]` lists the interior cut points; an empty list
   means one single band (no price separation, e.g. TWS). Buckets are built on
   demand with a `pb` colour rank (palest→brand-violet) spread across the bands. */
const AUDIO_BAND_EDGES = {
  "Внутриканальные наушники (IEM)":            [5000, 20000],   // < 5k · < 20k · 20k+
  "Bluetooth внутриканальные наушники (TWS)":  [],              // one band, no split
  "Полноразмерные наушники (OEM)":             [10000, 40000],  // < 10k · < 40k · 40k+
  "Bluetooth полноразмерные наушники":         [20000],         // < 20k · 20k+
  "Гарнитуры (с микрофоном)":                  [20000],         // < 20k · 20k+
  "Источники (ЦАП + усилители)":               [7000, 20000],   // < 7k · < 20k · 20k+
};
const AUDIO_BAND_EDGES_DEFAULT = [5000, 20000];   // fallback for any new category
/* pb colour rank per band, spread pale→saturated across --pb-1…--pb-4 so the
   most premium band is always the most saturated regardless of band count. */
const AUDIO_PB_BY_COUNT = { 1:[2], 2:[1,4], 3:[1,3,4], 4:[1,2,3,4] };
/* Build the ordered bucket list for one audio category. Each bucket:
   { id, pb, min, max, label() }. ids are category-scoped so a stale filter
   selection from another category simply doesn't match (falls back to "all"). */
function audioBandsFor(category){
  const edges = (category in AUDIO_BAND_EDGES) ? AUDIO_BAND_EDGES[category] : AUDIO_BAND_EDGES_DEFAULT;
  const bounds=[0, ...edges, Infinity];
  const n=bounds.length-1;
  const pbs=AUDIO_PB_BY_COUNT[n] || AUDIO_PB_BY_COUNT[4];
  const slug=(category||"").replace(/[^A-Za-zА-Яа-я0-9]+/g,"").slice(0,8)||"cat";
  const out=[];
  for(let i=0;i<n;i++){
    const min=bounds[i], max=bounds[i+1];
    out.push({
      id:"ab_"+slug+"_"+i, pb:pbs[i], min, max,
      label:()=> min===0 ? "< "+fmtMoney(max)
               : max===Infinity ? fmtMoney(min)+"+"
               : fmtMoney(min)+"–"+fmtMoney(max),
    });
  }
  return out;
}

/* ---------- inline meta specs per category ---------- */
function metaSpecs(it, key){
  const out = [];
  const push=(v)=>{ const s=trField(v); if(s && s!=="-" && s!=="~") out.push(s); };
  // grip is intentionally omitted from the collapsed strip — it only appears
  // in the expanded detail (fullSpecs / grip-list)
  if(key==="mice"){ push(it.shape); push(it.sensor); push(it.weight); }
  else if(key==="audio"){ push(trField(it.category||"").replace(/\s*\([^)]*\)\s*$/,"")); const b=budgetCat(it.price); if(b) push(b); }
  return out.slice(0, key==="mice" ? 4 : 3);
}

/* ---------- full spec table for detail ---------- */
function fullSpecs(it, key){
  const rows=[]; const push=(k,v)=>{ const s=trField(v); if(s&&s!=="-"&&s!=="~") rows.push([k,s]); };
  if(key==="mice"){
    push(t("filter_shape"), it.shape); push(t("spec_sensor"), it.sensor); push(t("spec_switches"), it.switches);
    push(t("spec_encoder"), it.encoder); push(t("spec_clicks_ms"), it.clicks_ms); push(t("spec_weight"), it.weight);
    push(t("grip_small"), it.grip_small); push(t("grip_medium"), it.grip_medium); push(t("grip_large"), it.grip_large);
    const r=cleanRecommend(it.recommend); if(r) push(t("spec_recommend"), r);
  } else if(key==="audio"){
    push(t("spec_category"), it.category); push(t("spec_segment"), it.bracket);
    if(it.eq_preset && it.eq_preset!=="-") push("EQ", it.eq_preset+(it.eq_app?` · ${it.eq_app}`:""));
  }
  return rows;
}

/* ============================================================ ENTRY */
window.PAGE_RENDER = renderCategory;
async function initCategory(){
  await initGeoDefaults();
  initTheme(); renderChrome(CATEGORIES[CUR_CAT].nav); applyStaticI18n(); wireGlobal();
  document.getElementById("catMain").innerHTML = `<div class="loading">loading…</div>`;
  try {
    await Promise.all([
      loadCategoryData(CUR_CAT),
      loadMethodology(),
      CUR_CAT==="audio" ? loadFRTargets() : Promise.resolve(),
    ]);
    buildIndex();
  } catch(e){ document.getElementById("catMain").innerHTML=`<div class="empty">Ошибка загрузки данных</div>`; return; }
  if(S.openSlug){ const deep=findItemBySlug(S.openSlug); if(deep) S.openName=deep.name; }
  const publicPath=categoryPath(CUR_CAT,S.openName);
  if(location.pathname!==publicPath || location.search) history.replaceState({device:S.openName||null,direct:Boolean(S.openName)},"",publicPath);
  else history.replaceState({device:S.openName||null,direct:Boolean(S.openName)},"",publicPath);
  syncCanonical(publicPath);
  renderCategory();
  warmSearchIndex();
}

function renderCategory(){
  const activeName=ACTIVE_MODAL?.name||null;
  const activeReturnFocus=ACTIVE_MODAL?.returnFocus||null;
  if(activeName) dismissActiveModal({restoreFocus:false,animate:false});
  const c = CATEGORIES[CUR_CAT];
  document.title = catLabel(CUR_CAT) + " — Terviona";
  const d = DB.data[CUR_CAT];
  const n = d && d.items ? d.items.length : 0;
  const ago = labAgo();
  document.getElementById("catHead").innerHTML = `
    <h1>${escapeHTML(catLabel(CUR_CAT))}</h1>
    <div class="lab-meta">
      <span class="lm num">${n} ${t('stat_devices')}</span>
      ${ago?`<span class="lm num">${ago}</span>`:""}
    </div>
    <div class="cat-ascii mono" aria-hidden="true">[ NODE::${escapeHTML(CUR_CAT.toUpperCase())} ] ── [ RECORDS::${n} ] ── [ STATUS::ONLINE ]</div>`;
  renderMethodology();
  renderTabs();
  renderShell();
  if(activeName) openModal(activeName,activeReturnFocus,{historyMode:"none"});
}
function renderMethodology(){
  const el=document.getElementById("catMethod");
  const method=CATEGORY_METHOD[CUR_CAT];
  if(!el || !method){ if(el) el.innerHTML=""; return; }
  const criteria=(method.criteria||[]).map(c=>`<div class="method-chip">
    <span class="method-value num">${escapeHTML(c.value)}</span>
    <span class="method-label">${escapeHTML(c[LANG]||c.ru||"")}</span>
  </div>`).join("");
  const guide=method.link?`<a class="method-link" href="${escapeHTML(method.link)}" target="_blank" rel="noopener noreferrer">${t('method_guide')} ${ICO.ext}</a>`:"";
  el.innerHTML=`<aside class="method-card${criteria?'':' method-card-compact'}" aria-labelledby="methodTitle">
    <div class="method-copy">
      <span class="method-kicker mono">METHODOLOGY · ${escapeHTML(catLabel(CUR_CAT))}</span>
      <h2 id="methodTitle">${t('method_title')}</h2>
      <p><strong>${t('method_note')}.</strong> ${escapeHTML(localizedValue(method.note))}</p>
      ${guide}
    </div>
    ${criteria?`<div class="method-criteria">${criteria}</div>`:""}
  </aside>`;
}
function renderTabs(){
  const order=["mice","audio"];
  document.getElementById("catTabs").innerHTML = order.map((k,i)=>
    `<a class="chip ${k===CUR_CAT?'active':''}" href="${categoryPath(k)}" style="--i:${i}">${ICO[CATEGORIES[k].icon]}<span>${escapeHTML(catLabel(k))}</span></a>`
  ).join("");
}

/* ---------- filter shell ---------- */
function facetDef(){
  const d=DB.data[CUR_CAT]; if(!d) return null;
  if(CUR_CAT==="mice") return { key:"shape", label:t("filter_shape"), vals:[...new Set(d.items.map(i=>i.shape).filter(Boolean))] };
  return null;   // audio picks its category via the rail chips, not a select
}

/* ---------- branded filter selects ----------
   The native <select> remains the source of truth and the no-JS fallback, while
   the visible control uses the same dark glass / violet signal language as the
   rest of Terviona. This also keeps every existing change handler intact. */
let FILTER_SELECTS_WIRED=false;
const FILTER_SELECT_ICONS={
  sort:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h11M8 12h8M8 18h5M4 5v14m0 0-2.5-2.5M4 19l2.5-2.5"/></svg>',
  facet:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6"/></svg>',
};
function filterSelectMeta(select){
  if(select.id==="fBudget" || select.id==="fPrice") return { kind:select.id==="fBudget"?"budget":"price", label:t("filter_budget"), icon:ICO.cart };
  if(select.id==="fSort") return { kind:"sort", label:t("filter_sort"), icon:FILTER_SELECT_ICONS.sort };
  return { kind:"facet", label:select.getAttribute("aria-label")||t("filter_format"), icon:FILTER_SELECT_ICONS.facet };
}
function closeFilterSelects(except){
  document.querySelectorAll(".filter-select.open").forEach(host=>{
    if(host===except) return;
    host.classList.remove("open","align-right");
    host.querySelector(".filter-select-trigger")?.setAttribute("aria-expanded","false");
    const menu=host.querySelector(".filter-select-menu"); if(menu) menu.hidden=true;
  });
}
function openFilterSelect(host,focusIndex){
  closeFilterSelects(host);
  const trigger=host.querySelector(".filter-select-trigger"), menu=host.querySelector(".filter-select-menu");
  if(!trigger||!menu) return;
  menu.hidden=false; host.classList.add("open"); trigger.setAttribute("aria-expanded","true");
  const rect=host.getBoundingClientRect(), menuWidth=Math.max(menu.offsetWidth,host.offsetWidth);
  host.classList.toggle("align-right",rect.left+menuWidth>window.innerWidth-12);
  if(Number.isInteger(focusIndex)) requestAnimationFrame(()=>{
    const options=[...menu.querySelectorAll('[role="option"]')];
    (options[Math.max(0,Math.min(focusIndex,options.length-1))]||options[0])?.focus();
  });
}
function enhanceFilterSelect(select){
  if(!select || select.dataset.enhanced==="1") return;
  const host=select.closest(".select"), meta=filterSelectMeta(select); if(!host) return;
  const menuId=`${select.id}Menu`;
  host.classList.add("filter-select",`is-${meta.kind}`);
  host.querySelector(":scope > svg")?.remove();
  select.dataset.enhanced="1"; select.classList.add("filter-select-native"); select.tabIndex=-1; select.hidden=true; select.setAttribute("aria-hidden","true");

  const trigger=document.createElement("button");
  trigger.type="button"; trigger.className="filter-select-trigger";
  trigger.dataset.filterSelect=select.id;
  trigger.setAttribute("aria-haspopup","listbox"); trigger.setAttribute("aria-expanded","false"); trigger.setAttribute("aria-controls",menuId);
  trigger.innerHTML=`<span class="filter-select-icon">${meta.icon}</span><span class="filter-select-copy"><span class="filter-select-label mono">${escapeHTML(meta.label)}</span><span class="filter-select-value"></span></span><svg class="filter-select-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>`;

  const menu=document.createElement("div");
  menu.id=menuId; menu.className="filter-select-menu"; menu.hidden=true;
  menu.setAttribute("role","listbox"); menu.setAttribute("aria-label",meta.label);
  menu.innerHTML=[...select.options].map((option,index)=>`<button type="button" class="filter-select-option" role="option" data-select-value="${escapeHTML(option.value)}" data-option-index="${index}" aria-selected="false"><span class="filter-select-mark" aria-hidden="true"></span><span>${escapeHTML(option.textContent.trim())}</span></button>`).join("");
  host.append(trigger,menu);

  const options=()=>[...menu.querySelectorAll('[role="option"]')];
  const sync=()=>{
    const selected=select.options[select.selectedIndex]||select.options[0];
    trigger.querySelector(".filter-select-value").textContent=selected?.textContent.trim()||"";
    trigger.setAttribute("aria-label",`${meta.label}: ${selected?.textContent.trim()||""}`);
    options().forEach((option,index)=>option.setAttribute("aria-selected",String(index===select.selectedIndex)));
  };
  const choose=option=>{
    if(!option) return;
    select.value=option.dataset.selectValue;
    sync(); select.dispatchEvent(new Event("change",{bubbles:true}));
    closeFilterSelects(); trigger.focus();
  };
  trigger.addEventListener("click",()=>{
    if(host.classList.contains("open")) closeFilterSelects();
    else openFilterSelect(host);
  });
  trigger.addEventListener("keydown",event=>{
    if(!["Enter"," ","ArrowDown","ArrowUp","Home","End"].includes(event.key)) return;
    event.preventDefault();
    const end=options().length-1;
    const index=event.key==="End"?end:event.key==="Home"?0:event.key==="ArrowUp"?Math.max(0,select.selectedIndex-1):select.selectedIndex;
    openFilterSelect(host,index);
  });
  menu.addEventListener("click",event=>choose(event.target.closest('[role="option"]')));
  menu.addEventListener("keydown",event=>{
    const rows=options(), current=rows.indexOf(document.activeElement);
    if(event.key==="Escape"){ event.preventDefault(); closeFilterSelects(); trigger.focus(); return; }
    if(event.key==="Tab"){ closeFilterSelects(); return; }
    if(event.key==="Enter" || event.key===" "){ event.preventDefault(); choose(document.activeElement); return; }
    let next=null;
    if(event.key==="ArrowDown") next=Math.min(rows.length-1,current+1);
    else if(event.key==="ArrowUp") next=Math.max(0,current-1);
    else if(event.key==="Home") next=0;
    else if(event.key==="End") next=rows.length-1;
    if(next!=null){ event.preventDefault(); rows[next]?.focus(); }
  });
  select.addEventListener("change",sync); sync();
}
function mountFilterSelects(root){
  root.querySelectorAll(".select select").forEach(enhanceFilterSelect);
  if(FILTER_SELECTS_WIRED) return;
  FILTER_SELECTS_WIRED=true;
  document.addEventListener("pointerdown",event=>{ if(!event.target.closest(".filter-select")) closeFilterSelects(); });
  document.addEventListener("keydown",event=>{ if(event.key==="Escape") closeFilterSelects(); });
  window.addEventListener("resize",()=>closeFilterSelects(),{passive:true});
}

function renderShell(){
  const el=document.getElementById("catMain");
  el.innerHTML = `<div class="filters" id="filters"></div><div class="audio-nav" id="audioNav" hidden></div><div id="body"></div>`;
  const f=document.getElementById("filters");
  let html=`<div class="fsearch">${ICO.search}<input id="fSearch" type="text" placeholder="${escapeHTML(t('filter_search'))}" value="${escapeHTML(S.search)}"/></div>`;
  // audio: per-band budget dropdown (mice uses the generic price buckets below)
  const bd=budgetDef(CUR_CAT);
  if(bd){
    const cls = 'select budget-select';
    const anyOpt = `<option value="any" ${(!S.budget||S.budget==='all'||S.budget==='any')?'selected':''}>${escapeHTML(t('budget_any'))}</option>`;
    const opts = bd.buckets.map(b=>`<option value="${escapeHTML(b.id)}" ${b.id===S.budget?'selected':''}>${escapeHTML(b.label())}</option>`).join("");
    html+=`<div class="${cls}">${ICO.cart}<select id="fBudget" aria-label="${escapeHTML(t('filter_budget'))}">${anyOpt}${opts}</select></div>`;
  } else {
    html+=`<div class="select"><select id="fPrice" aria-label="${escapeHTML(t('filter_budget'))}">`+PRICE_BUCKETS.map(b=>`<option value="${b.id}" ${b.id===S.price?'selected':''}>${escapeHTML(b.label())}</option>`).join("")+`</select></div>`;
  }
  // facet
  const facet=facetDef();
  if(facet && facet.vals.length){
    html+=`<div class="select"><select id="fFacet" aria-label="${escapeHTML(facet.label)}"><option value="all">${t('filter_all')}</option>`+
      facet.vals.map(v=>`<option value="${escapeHTML(v)}" ${v===S.facet?'selected':''}>${escapeHTML(trField(v))}</option>`).join("")+`</select></div>`;
  }
  // sort
  html+=`<div class="select"><select id="fSort" aria-label="${escapeHTML(t('filter_sort'))}">
    <option value="tier" ${S.sort==='tier'?'selected':''}>${t('sort_tier')}</option>
    <option value="price_asc" ${S.sort==='price_asc'?'selected':''}>${t('sort_price_asc')}</option>
    <option value="price_desc" ${S.sort==='price_desc'?'selected':''}>${t('sort_price_desc')}</option>
    <option value="name" ${S.sort==='name'?'selected':''}>${t('sort_name')}</option>
  </select></div>`;
  // view toggle
  html+=`<div class="view-toggle" id="viewToggle">
    <button data-v="list" class="${VIEW==='list'?'active':''}" title="${t('view_list')}">${ICO.list}</button>
    <button data-v="grid" class="${VIEW==='grid'?'active':''}" title="${t('view_grid')}">${ICO.grid}</button></div>`;
  html+=`<span class="count mono" id="fCount"></span>`;
  f.innerHTML=html;

  const fs=document.getElementById("fSearch"); fs.addEventListener("input",()=>{ S.search=fs.value; S._noAnim=true; scheduleBodyRender(); });
  const fp=document.getElementById("fPrice"); if(fp) fp.addEventListener("change",e=>{ S.price=e.target.value; renderBody(); });
  const fb=document.getElementById("fBudget"); if(fb) fb.addEventListener("change",e=>{ S.budget=e.target.value||null; renderBody(); });
  const ff=document.getElementById("fFacet"); if(ff) ff.addEventListener("change",e=>{ S.facet=e.target.value; renderBody(); });
  document.getElementById("fSort").addEventListener("change",e=>{ S.sort=e.target.value; renderBody(); });
  document.getElementById("viewToggle").querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.v)));

  mountFilterSelects(f);

  renderBody();
}

/* ---------- filtering ---------- */
function passFacet(it){
  const facet=facetDef(); if(!facet || S.facet==="all") return true;
  return (it[facet.key]||"")===S.facet;
}
function passPrice(it){
  if(S.price==="all") return true;
  const b=PRICE_BUCKETS.find(x=>x.id===S.price); const v=itemPriceMid(it);
  if(v==null) return false; return v>=b.min && v<b.max;
}
function passBudget(it){
  const bd=budgetDef(CUR_CAT); if(!bd) return true;
  if(S.budget==="any") return true;                          // "Любой": show every price
  if(!S.budget || S.budget==="all") return !bd.mandatory;   // unselected: block only when mandatory
  const b=bd.buckets.find(x=>x.id===S.budget); if(!b) return true;
  if(bd.kind==="field") return (it.budget||"")===b.id;
  const v=itemPriceMid(it); if(v==null) return false;
  return v>=b.min && v<b.max;
}
function passSearch(it){ return !S.search || (it.name||"").toLowerCase().includes(S.search.toLowerCase()); }
function passAudioCat(it){
  if(CUR_CAT!=="audio" || S.acat==="all") return true;
  return (it.category||"")===S.acat;
}
function itemPasses(it){ return passSearch(it) && passBudget(it) && passPrice(it) && passFacet(it) && passAudioCat(it); }

/* ---------- body ---------- */
let BODY_RENDER_TIMER=0;
function scheduleBodyRender(){
  clearTimeout(BODY_RENDER_TIMER);
  BODY_RENDER_TIMER=setTimeout(()=>{ BODY_RENDER_TIMER=0; renderBody(); },80);
}
function renderBody(){
  if(BODY_RENDER_TIMER){ clearTimeout(BODY_RENDER_TIMER); BODY_RENDER_TIMER=0; }
  const d=DB.data[CUR_CAT];
  const body=document.getElementById("body");
  const bd=budgetDef(CUR_CAT);

  let items=d.items.filter(itemPasses);
  const cnt=document.getElementById("fCount"); if(cnt) cnt.textContent=`${items.length} / ${d.items.length}`;
  if(!items.length){ body.className=S._noAnim?"no-anim":""; S._noAnim=false; body.innerHTML=`<div class="empty">${t('spot_empty')}</div>`; renderAudioNav(); return; }

  body.className = (VIEW==="grid" ? "view-grid" : "view-list") + (S._noAnim ? " no-anim" : "");
  S._noAnim = false;
  // audio: "Любой бюджет" renders per-band labeled sections
  if(S.budget==="any" && bd){
    // "Любой": every bucket becomes its own labeled section, in the cat's order;
    // inside each section the usual tier/category grouping + sorting still applies.
    // Price ↓ flips the bucket order too — most expensive section first.
    const buckets = S.sort==="price_desc" ? bd.buckets.slice().reverse() : bd.buckets;
    const matched=new Set();
    let out = buckets.map(b=>{
      const arr=items.filter(it=>bucketMatch(bd,b,it));
      arr.forEach(it=>matched.add(it));
      if(!arr.length) return "";
      return `<section class="budget-section">
        <div class="bsec-head"><h3>${escapeHTML(b.label())}</h3><span class="tier-count mono">${arr.length}</span></div>
        ${groupHTML(items.filter(it=>arr.includes(it)))}
      </section>`;
    }).join("");
    const rest=items.filter(it=>!matched.has(it));   // e.g. items with no price
    if(rest.length) out += `<section class="budget-section">
      <div class="bsec-head"><h3>—</h3><span class="tier-count mono">${rest.length}</span></div>
      ${groupHTML(rest)}
    </section>`;
    body.innerHTML = out;
  } else {
    body.innerHTML = groupHTML(items);
  }

  // waitlist
  if(d.waitlist && d.waitlist.length && S.search==="" && (!S.budget||S.budget==="all"||S.budget==="any") && S.price==="all" && S.facet==="all" && S.acat==="all"){
    body.innerHTML += `<section class="tier-block"><div class="tier-head"><span class="tier-badge t-x">${t('waitlist')}</span></div>
      <div class="dev-wrap">${d.waitlist.map(it=>deviceCard(it)).join("")}</div></section>`;
  }
  wireCards();
  layoutGrid();
  renderAudioNav();
  maybeAutoOpen();
}

/* Build the grouped/sorted markup for a set of items (tier groups, audio
   category groups, or a flat list) — shared by the normal render and by each
   per-budget section in "Любой" mode. */
function groupHTML(items){
  const dir = S.sort==="price_asc"?1:-1;
  const byName=(a,b)=>(a.name||"").localeCompare(b.name||"",undefined,{sensitivity:"base",numeric:true});
  // items without a price always sink to the bottom, regardless of direction
  const cmpPrice=(a,b)=>{
    const pa=itemPriceMid(a), pb=itemPriceMid(b);
    if(pa==null && pb==null) return 0;
    if(pa==null) return 1;
    if(pb==null) return -1;
    return (pa-pb)*dir;
  };
  if(S.sort==="name") items=items.slice().sort(byName);
  else if(S.sort.startsWith("price")) items=items.slice().sort(cmpPrice);

  if(CUR_CAT==="audio"){
    // audio is grouped by DEVICE TYPE (req #1): categories are numbered 01, 02…
    // and, inside each, items are split into visual BUDGET sub-groups that fade
    // from pale (cheap) to brand-violet (premium). Category numbering follows
    // the curated AUDIO_CAT_ORDER regardless of the active sort, so a device
    // type always keeps the same number.
    const {groups}=audioGroups(items);
    const numbered=orderedAudioCats();                       // stable full order
    const cats=numbered.filter(c=>groups[c] && groups[c].length);
    return cats.map(cat=>{
      const idx=numbered.indexOf(cat);
      const num=String(idx+1).padStart(2,"0");
      const arr = S.sort==="tier"
        ? groups[cat].slice().sort((a,b)=>tierRank(deviceTier(a,"audio"))-tierRank(deviceTier(b,"audio"))||byName(a,b))
        : groups[cat];
      return `<section class="tier-block cat-block">
        <div class="cat-head" data-acat="${escapeHTML(cat)}"><span class="cat-num num">${num}</span><h3>${escapeHTML(trField(cat))}</h3><span class="tier-count mono">${arr.length}</span></div>
        <div class="dev-wrap">${audioBudgetHTML(arr)}</div>
      </section>`;
    }).join("");
  } else if(S.sort==="tier"){
    // group by tier
    const groups={}; items.forEach(it=>{ const tr=deviceTier(it,CUR_CAT)||"—"; (groups[tr]=groups[tr]||[]).push(it); });
    const order=tierList(CUR_CAT).concat(["—"]);
    const tiers=Object.keys(groups).sort((a,b)=>order.indexOf(a)-order.indexOf(b));
    return tiers.map(tr=>{
      const cls=(tr==="—")?"x":tr;
      const tierItems=groups[tr].slice().sort(byName);
      const cards=tierItems.map(it=>deviceCard(it)).join("");
      return `<section class="tier-block">
        <div class="tier-head"><span class="tier-badge t-${cls.toLowerCase()}">${escapeHTML(tr)}</span><span class="tier-count mono">${tierItems.length}</span></div>
        <div class="dev-wrap">${cards}</div>
      </section>`;
    }).join("");
  } else {
    return `<section class="tier-block"><div class="dev-wrap">${items.map(it=>deviceCard(it)).join("")}</div></section>`;
  }
}
/* Does an item fall into a given budget bucket? Mirrors passBudget's logic. */
function bucketMatch(bd,b,it){
  if(bd.kind==="field") return (it.budget||"")===b.id;
  const v=itemPriceMid(it); if(v==null) return false;
  return v>=b.min && v<b.max;
}

/* Источники (ЦАП + усилители) — не имеют АЧХ, поэтому для них не рендерится
   блок частотной характеристики и EQ-строка (только спеки, покупка, отзывы,
   похожие). */
const AUDIO_SOURCES_CAT = "Источники (ЦАП + усилители)";

/* preferred display order of audio categories (req #16) */
const AUDIO_CAT_ORDER = [
  "Внутриканальные наушники (IEM)",
  "Bluetooth внутриканальные наушники (TWS)",
  "Полноразмерные наушники (OEM)",
  "Bluetooth полноразмерные наушники",
  "Гарнитуры (с микрофоном)",
  "Источники (ЦАП + усилители)",
];

/* Group audio items by category and decide the order of the categories
   themselves. Tier/name sort keeps the curated AUDIO_CAT_ORDER; price sort
   reorders whole categories by their price extreme, so "Цена ↓" starts with
   the category holding the most expensive devices and descends. */
function audioGroups(items){
  const groups={}; items.forEach(it=>{ const cat=it.category||"—"; (groups[cat]=groups[cat]||[]).push(it); });
  let cats;
  if(S.sort.startsWith("price")){
    const dir=S.sort==="price_asc"?1:-1;
    const ext=c=>{
      const vals=groups[c].map(it=>itemPriceMid(it)).filter(v=>v!=null);
      if(!vals.length) return null;
      return dir===1 ? Math.min(...vals) : Math.max(...vals);
    };
    cats=Object.keys(groups).sort((a,b)=>{
      const ea=ext(a), eb=ext(b);
      if(ea==null&&eb==null) return 0; if(ea==null) return 1; if(eb==null) return -1;
      return (ea-eb)*dir;
    });
  } else {
    cats=Object.keys(groups).sort((a,b)=>{
      const ia=AUDIO_CAT_ORDER.indexOf(a), ib=AUDIO_CAT_ORDER.indexOf(b);
      return (ia<0?99:ia)-(ib<0?99:ib) || a.localeCompare(b);
    });
  }
  return {groups, cats};
}

/* Full, stable list of audio categories in curated order (req #1). Any category
   present in the data but missing from AUDIO_CAT_ORDER is appended, sorted, so
   sequential numbering (01, 02…) is deterministic and independent of filters. */
function orderedAudioCats(){
  const d=DB.data.audio;
  const present=d&&d.items ? [...new Set(d.items.map(i=>i.category||"—"))] : [];
  const extra=present.filter(c=>AUDIO_CAT_ORDER.indexOf(c)<0).sort((a,b)=>a.localeCompare(b));
  return AUDIO_CAT_ORDER.concat(extra);
}

/* Split one device-type's items into visual BUDGET sub-groups (req #1). Groups
   run pale→saturated via the `pb` rank on each bucket. Under tier/name sort the
   buckets ascend (cheap first); under a price sort they follow the sort dir so
   the sub-group order agrees with the card order. A single populated bucket is
   rendered without the sub-group chrome (no point labelling one band). Family
   grouping (devListHTML) still applies inside each bucket. */
function audioBudgetHTML(arr){
  const bands = audioBandsFor(arr.length ? (arr[0].category||"") : "");
  const buckets = S.sort==="price_desc" ? bands.slice().reverse() : bands;
  const seen=new Set();
  const sections=buckets.map(b=>{
    const inb=arr.filter(it=>{ const v=itemPriceMid(it); return v!=null && v>=b.min && v<b.max; });
    inb.forEach(it=>seen.add(it));
    return inb.length ? {b, inb} : null;
  }).filter(Boolean);
  const rest=arr.filter(it=>!seen.has(it));            // no/unknown price
  const populated=sections.length + (rest.length?1:0);
  if(populated<=1) return devListHTML(arr);            // one band -> no chrome
  let out=sections.map(({b,inb})=>`<div class="abud abud-${b.pb}">
      <div class="abud-head"><span class="abud-label">${escapeHTML(b.label())}</span><span class="abud-count mono">${inb.length}</span></div>
      <div class="abud-list">${devListHTML(inb)}</div>
    </div>`).join("");
  if(rest.length) out+=`<div class="abud abud-0">
      <div class="abud-head"><span class="abud-label">—</span><span class="abud-count mono">${rest.length}</span></div>
      <div class="abud-list">${devListHTML(rest)}</div>
    </div>`;
  return out;
}

/* ---------- sticky audio category rail (ref: audio-guide.ykj13.ru) ----------
   The rail is the single category picker for audio: chips for every category
   plus "Все". Picking a chip filters the list to that category only. */
let AUDIO_SPY=null;   // legacy scroll-spy handle; kept so old listeners detach
function renderAudioNav(hide){
  const nav=document.getElementById("audioNav"); if(!nav) return;
  const d=DB.data[CUR_CAT];
  if(CUR_CAT!=="audio" || hide || !d){
    nav.hidden=true; nav.innerHTML="";
    if(AUDIO_SPY){ removeEventListener("scroll",AUDIO_SPY); AUDIO_SPY=null; }
    return;
  }
  const cats=[...new Set(d.items.map(i=>i.category).filter(Boolean))].sort((a,b)=>{
    const ia=AUDIO_CAT_ORDER.indexOf(a), ib=AUDIO_CAT_ORDER.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib) || a.localeCompare(b);
  });
  nav.hidden=false;
  nav.innerHTML=[`<button class="anav-chip ${S.acat==="all"?'active':''}" data-acat="all">${escapeHTML(t('filter_all'))}</button>`]
    .concat(cats.map(c=>`<button class="anav-chip ${S.acat===c?'active':''}" data-acat="${escapeHTML(c)}">${escapeHTML(trField(c))}</button>`))
    .join("");
  nav.querySelectorAll(".anav-chip").forEach(ch=>ch.addEventListener("click",()=>{
    S.acat=ch.dataset.acat;
    S.budget="any";          // band ids are category-scoped — drop any stale price filter
    S._noAnim=true;
    renderBody();
  }));
  positionAudioNav();
}
function positionAudioNav(){
  const nav=document.getElementById("audioNav"), f=document.getElementById("filters");
  if(!nav||nav.hidden||!f) return;
  const navH=parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"))||84;
  const top=navH+f.offsetHeight+8;                     // floating nav + sticky filter bar
  nav.style.top=top+"px";
  document.documentElement.style.setProperty("--anav-offset",(top+nav.offsetHeight+12)+"px");
}
addEventListener("resize",positionAudioNav);

/* Hide the audio category rail WHILE scrolling (req #3): the picker shouldn't
   stay pinned over the list as the user scrolls. We add .anav-hidden on scroll
   and remove it once scrolling has settled (debounced), so the rail slides out
   of the way during the gesture and returns when the user stops. Registered
   once, guarded so re-renders don't stack duplicate listeners. */
if(!window.__terAnavScroll){
  window.__terAnavScroll=1;
  let hideT;
  addEventListener("scroll",()=>{
    const nav=document.getElementById("audioNav");
    if(!nav||nav.hidden) return;
    nav.classList.add("anav-hidden");
    clearTimeout(hideT);
    hideT=setTimeout(()=>nav.classList.remove("anav-hidden"),260);
  },{passive:true});
}

/* ---------- device list ----------
   Every item renders as its own independent card. (Family grouping — stacking
   versions of one model into a single connected cell — was removed: it created
   a tall multi-row cell that fought the grid's row-major auto-placement and
   pushed neighbouring cards around. Each device now stands on its own.) */
function devListHTML(arr){
  return arr.map(it=>deviceCard(it)).join("");
}

/* ---------- device card (row / tile) ---------- */
/* Framed thumbnail for a device. Shows `it.image` (local path or external URL);
   falls back to a graceful placeholder (brand/name initial) when absent or the
   image fails to load. `lg` renders the larger modal-head variant. */
function devThumb(it, lg){
  const init = (((brandOf(it.name)||it.name||"?").trim().charAt(0))||"?").toUpperCase();
  const cls = "dev-thumb"+(lg?" lg":"");
  const img = it.image
    ? `<img src="${escapeHTML(it.image)}" alt="${escapeHTML(it.name)}" loading="lazy" decoding="async" onerror="this.style.display='none'">`
    : "";
  return `<span class="${cls}"><span class="dt-ph">${escapeHTML(init)}</span>${img}</span>`;
}

function mouseShapeStatus(it){
  if(CUR_CAT!=="mice") return "";
  const ready = hasMouseShape(it);
  const label = t(ready ? "shape_available" : "shape_missing");
  return `<span class="shape-state ${ready ? "has-shape" : "no-shape"}" role="img" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.7c-4 0-6.4 2.9-6.4 7.1v4.6c0 4.2 2.4 6.9 6.4 6.9s6.4-2.7 6.4-6.9V9.8c0-4.2-2.4-7.1-6.4-7.1Z"/><path d="M12 3v6.2"/></svg>
  </span>`;
}

function deviceCard(it){
  const key=CUR_CAT;
  const tr=deviceTier(it,key), grade=tierGrade(it,key);
  const brand=brandOf(it.name);
  const specs=metaSpecs(it,key);
  const bi=buyInfo(it);
  // Show the current regional price in the selected currency.
  const price=displayPrice(it);
  const open = "";
  const eqBadge = (key==="audio" && it.eq_preset && it.eq_preset!=="-" && it.eq_preset!=="") ? `<span class="eq-badge">EQ</span>` : "";
  const shapeState = key==="mice" ? mouseShapeStatus(it) : "";
  return `<article class="dev bd-${(tr||'x').toLowerCase()}${open}" data-name="${escapeHTML(it.name)}">
    <div class="dev-main" role="button" tabindex="0" aria-expanded="${open?"true":"false"}">
      <span class="dev-tier t-${(tr||'x').toLowerCase()}">${escapeHTML(grade||'—')}</span>
      <div class="dev-body">
        <div class="dev-line1"><span class="dev-name">${escapeHTML(it.name)}</span>${shapeState}${eqBadge}</div>
        <div class="dev-specs">${specs.map(s=>`<span>${escapeHTML(s)}</span>`).join("<i class='dot-sep'></i>")}</div>
      </div>
      <div class="dev-right">
        ${brand?`<span class="dev-brand mut3">${escapeHTML(brand)}</span>`:""}
        ${price?`<span class="dev-price num">${escapeHTML(price)}</span>`:""}
        ${bi?marketBadge(bi.market):""}
      </div>
      <span class="dev-caret">${ICO.arrow}</span>
    </div>
    <div class="dev-detail"><div class="dd-inner">${detailInner(it)}</div></div>
  </article>`;
}

function detailInner(it){
  const noteText=localizedField(it,"note");
  const note = noteText ? `<p class="dd-note">${escapeHTML(noteText)}</p>` : "";
  const bi=buyInfo(it);
  const buy = bi ? `<a class="buy-btn" href="${escapeHTML(bi.url)}" target="_blank" rel="noopener">${ICO.cart}<span>${escapeHTML(bi.label)}</span>${ICO.ext}</a>${bi.note?`<span class="buy-note mut3">${escapeHTML(bi.note)}</span>`:""}` : "";
  return `${note}
    <div class="dd-actions">${buy}<button class="more-btn" data-more="${escapeHTML(it.name)}">${t('details')} ${ICO.arrow}</button></div>`;
}

/* ---------- interactions ---------- */
function gridPanelScope(card){
  return card?.closest(".abud") || card?.closest(".tier-block") || card?.closest(".budget-section");
}
function clearGridPanelReserve(card, delayed=true){
  const scope=gridPanelScope(card);
  if(!scope) return;
  clearTimeout(scope.__gridPanelReserveTimer);
  const clear=()=>{
    scope.classList.remove("grid-panel-reserve");
    scope.style.removeProperty("--grid-panel-reserve");
  };
  if(delayed) scope.__gridPanelReserveTimer=setTimeout(clear,360);
  else clear();
}
function updateGridPanelReserve(card){
  if(VIEW!=="grid" || !card?.classList.contains("open")) return;
  const scope=gridPanelScope(card);
  const grid=card.closest(".abud-list, .dev-wrap");
  const main=card.querySelector(":scope > .dev-main");
  const det=card.querySelector(":scope > .dev-detail");
  if(!scope || !grid || !main || !det) return;
  clearTimeout(scope.__gridPanelReserveTimer);
  const roomBelow=Math.max(0,grid.getBoundingClientRect().bottom-main.getBoundingClientRect().bottom);
  const reserve=Math.max(0,Math.ceil(det.scrollHeight+14-roomBelow));
  scope.style.setProperty("--grid-panel-reserve",reserve+"px");
  scope.classList.toggle("grid-panel-reserve",reserve>0);
}
function setCardOpen(card, open){
  if(!card) return;
  const main=card.querySelector(":scope > .dev-main");
  const det=card.querySelector(":scope > .dev-detail");
  if(!det) return;
  if(open && VIEW==="grid"){
    document.querySelectorAll(".view-grid .dev.open").forEach(other=>{
      if(other!==card) setCardOpen(other,false);
    });
  }
  const detailHeight=open ? det.scrollHeight : 0;
  card.classList.toggle("open",open);
  if(main) main.setAttribute("aria-expanded",String(open));
  det.style.maxHeight=detailHeight+"px";
  if(VIEW==="grid"){
    if(open) updateGridPanelReserve(card);
    else clearGridPanelReserve(card);
  }
}

function wireCards(){
  document.querySelectorAll(".dev").forEach(card=>{
    const main=card.querySelector(".dev-main");
    const toggle=e=>{
      if(e.target.closest("a")||e.target.closest("button")) return;
      setCardOpen(card,!card.classList.contains("open"));
    };
    main.addEventListener("click",toggle);
    main.addEventListener("keydown",e=>{
      if(e.key!=="Enter" && e.key!==" ") return;
      e.preventDefault(); toggle(e);
    });
  });
  document.querySelectorAll("[data-more]").forEach(b=> b.addEventListener("click",e=>{ e.stopPropagation(); openModal(b.dataset.more); }));
  // set heights for pre-opened
  document.querySelectorAll(".dev.open .dev-detail").forEach(det=>{ det.style.maxHeight = det.scrollHeight+"px"; });
}
/* Grid cards keep a fixed row rhythm. Their summaries are positioned above the
   following rows, so expanding a card never changes the grid geometry. */
function setupAudioGrid(){
  document.querySelectorAll(".view-grid .abud-list, .view-grid .dev-wrap:not(:has(> .abud))").forEach(grid=>{
    const tall=[...grid.children].filter(el=>el.classList.contains("dev"));
    tall.forEach(el=>el.style.gridRow="");
    const solo=tall[0];
    const rowH=(solo?solo.offsetHeight:160);
    grid.style.setProperty("--gh", rowH+"px");
    stretchLastRow(grid, tall);
  });
}
/* The grid uses a base of `tracks` fractional columns with each card spanning
   `tracks/perRow`. When the final row holds fewer than perRow cards, widen those
   orphans so they divide the full width evenly (1 of 3 → full, 2 of 3 → halves).
   Runs after row sizing so offsetTop groups reflect the real layout. */
function stretchLastRow(grid, cards){
  cards.forEach(el=>{ el.style.gridColumn=""; });      // reset to CSS default span
  if(cards.length<2) return;
  const cs=getComputedStyle(grid);
  const tracks=cs.gridTemplateColumns.split(" ").filter(Boolean).length;
  if(tracks<2) return;                                 // 1-col (mobile): nothing to do
  const baseSpan=2, perRow=Math.floor(tracks/baseSpan);
  if(perRow<2) return;
  // Group cards by their visual row via offsetTop.
  const tops=cards.map(c=>c.offsetTop);
  const lastTop=Math.max(...tops);
  const lastRow=cards.filter((c,i)=>tops[i]===lastTop);
  const r=lastRow.length;
  if(r===0 || r>=perRow || tracks%r!==0) return;       // full row or non-even split
  const span=tracks/r;
  lastRow.forEach(el=>{ el.style.gridColumn="span "+span; });
}
function layoutGrid(){
  if(VIEW!=="grid") return;
  setupAudioGrid();   // one row-major CSS grid drives every section's flow
  document.querySelectorAll(".view-grid .dev.open").forEach(updateGridPanelReserve);
}
if(!window.__terGridResize){
  window.__terGridResize=1;
  let rt; addEventListener("resize",()=>{ clearTimeout(rt); rt=setTimeout(layoutGrid,120); });
}
if(!window.__terGridDismiss){
  window.__terGridDismiss=1;
  document.addEventListener("pointerdown",e=>{
    if(VIEW!=="grid" || e.target.closest(".view-grid .dev.open")) return;
    document.querySelectorAll(".view-grid .dev.open").forEach(card=>setCardOpen(card,false));
  });
  document.addEventListener("keydown",e=>{
    if(e.key!=="Escape" || VIEW!=="grid") return;
    document.querySelectorAll(".view-grid .dev.open").forEach(card=>setCardOpen(card,false));
  });
}
function maybeAutoOpen(){
  if(!S.openName) return;
  const name=S.openName;
  S.openName=null;
  openModal(name,null,{historyMode:"none"});
}

/* ============================================================ FULL DEVICE MODAL (req #14 "полноценное окно") */
function findItem(name){ return (DB.data[CUR_CAT].items||[]).concat(DB.data[CUR_CAT].waitlist||[]).find(x=>x.name===name); }
function findItemBySlug(slug){ return (DB.data[CUR_CAT].items||[]).concat(DB.data[CUR_CAT].waitlist||[]).find(x=>deviceSlug(x.name)===slug); }
function relatedDevices(it){
  const key=CUR_CAT; let items=DB.data[key].items||[];
  // Curated "similar" list authored in the admin: `similar` is an array of
  // device names. When present it wins over the auto-derived same-tier list,
  // preserving the author's order and dropping names that no longer exist.
  const pool=DB.data[key].items||[];
  if(Array.isArray(it.similar) && it.similar.length){
    const byName=new Map(pool.map(x=>[x.name,x]));
    const similar=it.similar.map(n=>byName.get(n)).filter(x=>x&&x!==it).slice(0,4);
    return {similar, alt:[]};
  }
  const tr=deviceTier(it,key);
  const similar=items.filter(x=>x!==it && deviceTier(x,key)===tr).slice(0,4);
  return {similar, alt:[]};
}

/* ---------- mouse profile: grip matrix, specs and shape similarity ---------- */
const MOUSE_SPEC_ICONS = {
  weight:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 11a5 5 0 0 1 10 0"/><path d="M8 11h16l4 16H4l4-16Z"/><path d="m16 16-2 6h4l-2-6Z"/></svg>`,
  sensor:`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="3"/><path d="M16 2v5M16 25v5M2 16h5M25 16h5"/></svg>`,
  switches:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M9 8h14l2 8H7l2-8Z"/><path d="M8 16h16v8H8zM11 24v4M21 24v4M12 4h8v4"/></svg>`,
  latency:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m18 3-9 14h7l-2 12 9-15h-7l2-11Z"/></svg>`,
  encoder:`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="5"/><path d="M16 2v4M16 26v4"/></svg>`,
  shape:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3c-5 0-8 3.5-8 9v7c0 6 3 10 8 10s8-4 8-10v-7c0-5.5-3-9-8-9Z"/><path d="M16 3v8M13.5 8h5"/></svg>`,
};

const GRIP_KINDS = [
  {key:"palm", label:"grip_palm", re:/ладон|palm|долон/i},
  {key:"claw", label:"grip_claw", re:/когт|claw/i},
  {key:"fingertip", label:"grip_fingertip", re:/пальц|finger/i},
];
const GRIP_SIZES = [
  {letter:"S", field:"grip_small"},
  {letter:"M", field:"grip_medium"},
  {letter:"L", field:"grip_large"},
];

function gripHandIcon(kind){
  // Cleaned, label-free crops derived from the editor-provided reference.
  // The luminance-to-alpha filter removes the baked dark canvas so every icon
  // inherits the real card background in both layouts instead of showing a
  // mismatched rectangular patch.
  const crops={
    claw:"180 175 330 550",
    palm:"670 175 335 550",
    fingertip:"1175 175 335 550",
  };
  const filterId=`grip-bg-${kind}`;
  return `<svg class="grip-hand grip-hand-${kind}" viewBox="${crops[kind]}" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
    <defs><filter id="${filterId}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  .9 .9 .9 0 -.22"/>
    </filter></defs>
    <image href="img/grip-contact-cleaned.png" x="0" y="0" width="1672" height="941" filter="url(#${filterId})"/>
  </svg>`;
}
function mouseGripCards(it){
  return `<div class="mouse-grips"><div class="mouse-section-title"><i></i><span>${escapeHTML(t('grip_style'))}</span></div>
    <div class="grip-card-grid">${GRIP_KINDS.map(grip=>`<section class="grip-card">
      ${gripHandIcon(grip.key)}<h4>${escapeHTML(t(grip.label))}</h4>
      <div class="grip-score-list">${GRIP_SIZES.map(size=>{
        const raw=it.grip_scores&&it.grip_scores[size.field.replace('grip_','')];
        const fallback=grip.re.test(trField(it[size.field]||""))?(/[/,+]/.test(trField(it[size.field]||""))?4:5):1;
        const n=Math.max(1,Math.min(5,Math.round(Number(raw&&raw[grip.key])||fallback)));
        const title=escapeHTML(trField(it[size.field])||t('not_available'));
        return `<div class="grip-score" title="${title}" aria-label="${size.letter}: ${n}/5"><b>${size.letter}</b><span>${[0,1,2,3,4].map(i=>`<i class="${i<n?'on':''}"></i>`).join('')}</span><small class="num">${n}/5</small></div>`;
      }).join('')}</div>
    </section>`).join('')}</div>
    <p class="grip-note">ⓘ ${escapeHTML(t('grip_note'))}</p>
  </div>`;
}

function mouseSpecTiles(it){
  const specs=[
    ["weight",t("spec_weight"),it.weight],
    ["sensor",t("spec_sensor"),it.sensor],
    ["switches",t("spec_switches"),it.switches],
    ["latency",t("spec_clicks_ms"),it.clicks_ms],
    ["encoder",t("spec_encoder"),it.encoder],
    ["shape",t("filter_shape"),it.shape],
  ].filter(([, ,value])=>value && value!=="-" && value!=="~");
  return `<div class="mouse-spec-grid">${specs.map(([icon,label,value])=>`<div class="mouse-spec-card"><span class="mouse-spec-icon">${MOUSE_SPEC_ICONS[icon]}</span><div><span>${escapeHTML(label)}</span><b>${escapeHTML(trField(value))}</b></div></div>`).join('')}</div>`;
}

function mouseShapeMatches(it){
  if(!hasMouseShape(it)) return [];
  const items=DB.data.mice.items||[];
  const byName=new Map(items.map(mouse=>[mouse.name,mouse]));
  const authored=Array.isArray(it.shape_similarities)?it.shape_similarities:[];
  const out=[]; const seen=new Set();
  for(const row of authored){
    const mouse=byName.get(row&&row.name);
    if(!mouse || mouse===it || !hasMouseShape(mouse) || seen.has(mouse.name)) continue;
    const percent=Math.max(0,Math.min(100,Math.round(Number(row.percent)||0)));
    seen.add(mouse.name); out.push({mouse,percent});
  }
  // Family is a hard 100% guarantee even if an administrator removes it from
  // the generated list by accident.
  if(it.shape_family){
    for(const mouse of items){
      if(mouse!==it && mouse.shape_family===it.shape_family && hasMouseShape(mouse) && !seen.has(mouse.name)){
        seen.add(mouse.name); out.push({mouse,percent:100});
      }
    }
  }
  return out.sort((a,b)=>b.percent-a.percent||a.mouse.name.localeCompare(b.mouse.name)).slice(0,6);
}
function mouseShapeMatchesHTML(it){
  const matches=mouseShapeMatches(it);
  if(!matches.length) return "";
  return `<section class="shape-matches"><div class="shape-matches-head"><div><span>${escapeHTML(t('shape_similarity'))}</span><h3>${escapeHTML(t('closest_shapes'))}</h3></div><p>${escapeHTML(t('shape_similarity_note'))}</p></div>
    <div class="shape-match-grid">${matches.map(({mouse,percent})=>`<button type="button" class="shape-match" data-modal-device="${escapeHTML(mouse.name)}">
      <span class="shape-match-preview"><img src="${escapeHTML(mouse.shape_image)}" alt="" loading="lazy" decoding="async"></span>
      <span class="shape-match-copy"><b>${escapeHTML(mouse.name)}</b><span><i style="width:${percent}%"></i></span></span>
      <strong class="num">${percent}%</strong>
    </button>`).join('')}</div>
  </section>`;
}

/* ---------- FR block: dynamic graph + standard toggle + metrics ----------
   `it.fr` is a map keyed by standard: { "711": {spl:[...], author, target}, ... }.
   Renders the graph for one standard with a toggle between the type's two
   standards (a square is disabled when that measurement is absent). Falls back
   to a legacy screenshot (`fr_image`) then the placeholder curve. */
function frStandardLabel(std){ return std; }
function frRenderInner(it, std){
  const m = it.fr && it.fr[std];
  const tgtKey = (m && m.target) || frDefaultTarget(it.category, std);
  const tgt = frTarget(tgtKey);
  const tgtSpl = tgt ? tgt.spl : null;
  const svg = frRealSVG(m.spl, tgtSpl, {aria:`${t('fr_title')} — ${it.name}`});
  // metrics (only when a target exists)
  let metrics="";
  if(tgtSpl){
    const mt = frMetrics(m.spl, tgtSpl);
    metrics = `<div class="frr-metrics">
      <div><span class="mut3">${t('fr_m_avg')}</span><b class="num">${mt.avg.toFixed(2)}<span class="mut3"> dB</span></b></div>
      <div><span class="mut3">${t('fr_m_spread')}</span><b class="num">${mt.spread.toFixed(2)}<span class="mut3"> dB</span></b></div>
      <div><span class="mut3">${t('fr_m_slope')}</span><b class="num">${mt.slope.toFixed(2)}<span class="mut3"> dB/oct</span></b></div>
    </div>`;
  }
  // credit line
  const bits=[];
  if(m.author) bits.push(`${t('fr_measured_by')} ${escapeHTML(m.author)}`);
  if(tgt) bits.push(`${t('fr_target_lbl')}: ${escapeHTML(tgt.label)}`);
  const credit = bits.length ? `<div class="frr-credit">${bits.join(" · ")}</div>` : "";
  const tgtLabel = tgt ? tgt.label : t('fr_legend_target');
  const legend = `<span class="fr-legend"><i class="lg-dev"></i>${t('fr_legend_dev')} <i class="lg-tgt"></i>${escapeHTML(tgtLabel)}</span>`;
  return { svg, metrics, credit, legend };
}
function frBlock(it){
  const hasFr = it.fr && Object.keys(it.fr).some(k=>it.fr[k] && it.fr[k].spl);
  if(!hasFr){
    const legend = `<span class="fr-legend"><i class="lg-dev"></i>${t('fr_legend_dev')} <i class="lg-tgt"></i>${t('fr_legend_target')}</span>`;
    const body = it.fr_image
      ? `<img class="fr-img" src="${escapeHTML(it.fr_image)}" alt="${escapeHTML(t('fr_title'))} — ${escapeHTML(it.name)}" loading="lazy" decoding="async">`
      : frChartSVG(it.name, deviceTier(it,'audio'));
    return `<div class="viz-head"><span>${t('fr_title')}</span>${legend}</div>${body}`;
  }
  const stds = frStandardsFor(it.category);
  const cur = stds.find(s=>it.fr[s] && it.fr[s].spl) || stds[0];
  const toggle = stds.map(s=>{
    const avail = !!(it.fr[s] && it.fr[s].spl);
    const cls = "frr-std"+(s===cur?" active":"")+(avail?"":" disabled");
    const attr = avail ? `data-frstd="${escapeHTML(s)}"` : `aria-disabled="true" title="${escapeHTML(t('fr_std_missing'))}"`;
    return `<button class="${cls}" ${attr}>${escapeHTML(frStandardLabel(s))}</button>`;
  }).join("");
  const hasPeq = !!(it.peq && it.peq.trim());
  const eqBtn = hasFr && hasPeq
    ? `<button class="frr-eq-btn" data-eq-toggle>${escapeHTML(t('eq_show'))}</button>` : "";
  const alignBtn = `<button class="frr-align-btn" data-align-toggle>${escapeHTML(t('fr_align_on'))}</button>`;
  const prefAvail = cur === "5128";
  const prefBoundsBtn = `<button class="frr-pref-btn${prefAvail?'':' disabled'}" data-pref-toggle${prefAvail?'':' disabled aria-disabled="true"'}>${escapeHTML(t('fr_pref_bounds'))}</button>`;
  const r = frRenderInner(it, cur);
  return `<div class="viz-head"><span>${t('fr_title')}</span>${r.legend}</div>
    <div class="frr-toggle-row">${toggle}<div class="frr-right-btns">${eqBtn}${alignBtn}${prefBoundsBtn}</div></div>
    <div class="frr-view" data-frname="${escapeHTML(it.name)}">${r.svg}${r.metrics}${r.credit}</div>`;
}
/* re-render the FR view when a standard square / EQ / align button is clicked.
   Manages three independent bits of state (standard, EQ on, alignment on) and
   animates the EQ toggle: the curve morphs raw→EQ and the metrics + preference
   score count to their new values over ~420 ms. */
function wireFRToggle(ov, it){
  const view = ov.querySelector(".frr-view"); if(!view) return;
  const tr = deviceTier(it,'audio');
  const parsed = it.peq ? parsePEQ(it.peq) : null;
  const active = ov.querySelector(".frr-std.active[data-frstd]");
  const st = { std: active ? active.dataset.frstd : (frStandardsFor(it.category)[0]), eq:false, align:false, pbounds:false };

  const frData = (std)=>{
    const m = it.fr && it.fr[std];
    const tgtKey = (m && m.target) || frDefaultTarget(it.category, std);
    const tgt = frTarget(tgtKey);
    const baseKey = frBaseTargetKey(tgtKey);
    const baseTgt = baseKey ? frTarget(baseKey) : null;
    return { m, tgt, tgtSpl: tgt ? tgt.spl : null, baseKey, baseTgt, baseSpl: baseTgt ? baseTgt.spl : null };
  };
  const lerp = (a,b,t)=> a + (b-a)*t;
  const metricsHTML = (mt)=> mt ? `<div class="frr-metrics">
      <div><span class="mut3">${t('fr_m_avg')}</span><b class="num">${mt.avg.toFixed(2)}<span class="mut3"> dB</span></b></div>
      <div><span class="mut3">${t('fr_m_spread')}</span><b class="num">${mt.spread.toFixed(2)}<span class="mut3"> dB</span></b></div>
      <div><span class="mut3">${t('fr_m_slope')}</span><b class="num">${mt.slope.toFixed(2)}<span class="mut3"> dB/oct</span></b></div>
    </div>` : "";
  const creditHTML = (std)=>{
    const {m,tgt}=frData(std); const bits=[];
    if(m && m.author) bits.push(`${t('fr_measured_by')} ${escapeHTML(m.author)}`);
    if(tgt) bits.push(`${t('fr_target_lbl')}: ${escapeHTML(tgt.label)}`);
    return bits.length?`<div class="frr-credit">${bits.join(" · ")}</div>`:"";
  };
  const legendHTML = (std,eqOn,alignOn,pbOn)=>{
    const {tgt,baseTgt}=frData(std);
    let tgtLabel;
    if(pbOn) tgtLabel = t('fr_pref_bounds');
    else if(alignOn) tgtLabel = (baseTgt?baseTgt.label:(tgt?tgt.label:t('fr_legend_target')));
    else tgtLabel = (tgt?tgt.label:t('fr_legend_target'));
    let l=`<span class="fr-legend"><i class="lg-dev"></i>${t('fr_legend_dev')} <i class="lg-tgt"></i>${escapeHTML(tgtLabel)}`;
    if(eqOn) l+=` <i class="lg-eq"></i>${escapeHTML(t('eq_legend'))}`;
    return l+`</span>`;
  };
  const buildSVG = (std,eqOn,alignOn,pbOn,curEq)=>{
    const {m,tgtSpl,baseKey,baseSpl}=frData(std);
    const aria=`${t('fr_title')} — ${it.name}`;
    if(pbOn && baseSpl){
      const b=frPrefBounds(baseKey);
      const eqSpl = eqOn ? (curEq||applyPEQ(m.spl,parsed)) : null;
      return frRealSVGAligned(m.spl, baseSpl, b&&b.upper, b&&b.lower, eqSpl, {aria});
    }
    if(alignOn){
      const eqSpl = eqOn ? (curEq||applyPEQ(m.spl,parsed)) : null;
      return frRealSVGAligned(m.spl, tgtSpl, null, null, eqSpl, {aria});
    }
    if(eqOn) return frRealSVGWithEQ(m.spl, curEq||applyPEQ(m.spl,parsed), tgtSpl, {aria});
    return frRealSVG(m.spl, tgtSpl, {aria});
  };
  const prefFor = (std,eqOn)=>{
    const {m,tgtSpl}=frData(std);
    if(eqOn && parsed && tgtSpl){
      const r=olivePref(applyPEQ(m.spl,parsed), tgtSpl, frIsOverEar(it.category));
      if(r) return Math.max(0,Math.min(100,Math.round(r.pref)));
    }
    return prefScore(it, tr);
  };
  const updatePref = (val,eqActive)=>{
    const pv=ov.querySelector(".pref-v"), pt=ov.querySelector(".pref-track");
    if(pv){ pv.innerHTML=`${val}<span class="mut3">/100</span>`; pv.classList.toggle("eq-active",eqActive); }
    if(pt){ pt.classList.toggle("eq-active",eqActive); const i=pt.querySelector("i"); if(i) i.style.width=val+"%"; }
  };

  function render(suppressDraw){
    const {m,tgtSpl,baseSpl}=frData(st.std);
    const metricTgt = (st.pbounds && baseSpl) ? baseSpl : tgtSpl;
    const spl = st.eq && parsed ? applyPEQ(m.spl,parsed) : m.spl;
    const mt = metricTgt ? frMetrics(spl,metricTgt) : null;
    view.classList.toggle("frr-animating", !!suppressDraw);
    view.innerHTML = buildSVG(st.std,st.eq,st.align,st.pbounds) + metricsHTML(mt) + creditHTML(st.std);
    const head=ov.querySelector(".viz-head .fr-legend");
    if(head) head.outerHTML = legendHTML(st.std,st.eq,st.align,st.pbounds);
    updatePref(prefFor(st.std,st.eq), st.eq);
  }

  let animRAF=0,disposed=false;
  function animateEQ(goingEq){
    const {m,tgtSpl,baseKey,baseSpl}=frData(st.std);
    if(!parsed){ st.eq=goingEq; render(); return; }
    if(matchMedia("(prefers-reduced-motion: reduce)").matches){ st.eq=goingEq; render(); return; }
    const metricTgt = (st.pbounds && baseSpl) ? baseSpl : tgtSpl;
    const raw=m.spl, eq=applyPEQ(m.spl,parsed);
    const rawM=metricTgt?frMetrics(raw,metricTgt):null, eqM=metricTgt?frMetrics(eq,metricTgt):null;
    const prefRaw=prefScore(it,tr), prefEq=prefFor(st.std,true);
    const dur=360, t0=performance.now();
    let lastPaint=0;
    view.classList.add("frr-animating");
    cancelAnimationFrame(animRAF);
    const step=(now)=>{
      if(disposed || !ov.isConnected) return;
      const p=Math.min(1,(now-t0)/dur), e=1-Math.pow(1-p,3);
      if(p<1 && now-lastPaint<32){ animRAF=requestAnimationFrame(step); return; }
      lastPaint=now;
      const blend=goingEq?e:1-e;
      const cur=raw.map((v,i)=>v+blend*(eq[i]-v));
      let svg;
      if(st.pbounds && baseSpl){ const b=frPrefBounds(baseKey); svg=frRealSVGAligned(raw,baseSpl,b&&b.upper,b&&b.lower,cur,{aria:it.name}); }
      else if(st.align){ svg=frRealSVGAligned(raw,tgtSpl,null,null,cur,{aria:it.name}); }
      else svg=frRealSVGWithEQ(raw,cur,tgtSpl,{aria:it.name});
      let mt=null;
      if(rawM&&eqM) mt={avg:lerp(rawM.avg,eqM.avg,blend),spread:lerp(rawM.spread,eqM.spread,blend),slope:lerp(rawM.slope,eqM.slope,blend)};
      view.innerHTML = svg + metricsHTML(mt) + creditHTML(st.std);
      updatePref(Math.round(lerp(prefRaw,prefEq,blend)), goingEq);
      if(p<1) animRAF=requestAnimationFrame(step);
      else { st.eq=goingEq; render(); }
    };
    // update legend once up-front to the target state
    const head=ov.querySelector(".viz-head .fr-legend");
    if(head) head.outerHTML = legendHTML(st.std,goingEq,st.align,st.pbounds);
    animRAF=requestAnimationFrame(step);
  }

  const prefBtn=ov.querySelector("[data-pref-toggle]");
  const updatePrefBtnState=(std)=>{
    if(!prefBtn) return;
    const avail = std==="5128";
    prefBtn.disabled = !avail;
    prefBtn.setAttribute("aria-disabled", String(!avail));
    prefBtn.classList.toggle("disabled", !avail);
    if(!avail && st.pbounds){ st.pbounds=false; prefBtn.classList.remove("active"); }
  };
  // standard toggle
  ov.querySelectorAll(".frr-std[data-frstd]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      ov.querySelectorAll(".frr-std").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      st.std=btn.dataset.frstd;
      updatePrefBtnState(st.std);
      render();
    });
  });
  // EQ toggle
  const eqBtn=ov.querySelector("[data-eq-toggle]");
  if(eqBtn) eqBtn.addEventListener("click",()=>{
    const goingEq=!st.eq;
    eqBtn.classList.toggle("active",goingEq);
    eqBtn.textContent = goingEq ? t('eq_hide') : t('eq_show');
    animateEQ(goingEq);
  });
  // alignment toggle
  const alignBtn=ov.querySelector("[data-align-toggle]");
  if(alignBtn) alignBtn.addEventListener("click",()=>{
    st.align=!st.align;
    alignBtn.classList.toggle("active",st.align);
    alignBtn.textContent = st.align ? t('fr_align_off') : t('fr_align_on');
    render();
  });
  // preference bounds toggle
  if(prefBtn) prefBtn.addEventListener("click",()=>{
    if(prefBtn.disabled) return;
    st.pbounds=!st.pbounds;
    prefBtn.classList.toggle("active",st.pbounds);
    render();
  });
  return ()=>{ disposed=true; cancelAnimationFrame(animRAF); };
}

let ACTIVE_MODAL=null;
function dismissActiveModal({restoreFocus=true,animate=true}={}){
  const active=ACTIVE_MODAL;
  if(!active) return;
  ACTIVE_MODAL=null;
  active.cleanup();
  active.ov.classList.remove("open");
  document.body.style.overflow="";
  const finish=()=>{
    active.ov.remove();
    if(restoreFocus && active.returnFocus?.focus) active.returnFocus.focus();
  };
  if(animate) setTimeout(finish,200); else finish();
}
function requestModalClose(){
  if(history.state?.device && !history.state?.direct){
    history.back();
    return;
  }
  const basePath=categoryPath(CUR_CAT);
  history.replaceState({device:null,direct:false},"",basePath);
  syncCanonical(basePath);
  dismissActiveModal();
}

function openModal(name, returnFocusOverride, options={}){
  const it=findItem(name); if(!it) return;
  const publicPath=categoryPath(CUR_CAT,it.name);
  if(ACTIVE_MODAL?.name===it.name){ syncCanonical(publicPath); return; }
  if(ACTIVE_MODAL) dismissActiveModal({restoreFocus:false,animate:false});
  const historyMode=options.historyMode||"push";
  if(historyMode==="push" && location.pathname!==publicPath){
    history.pushState({device:it.name,direct:false},"",publicPath);
  } else if(historyMode==="replace"){
    history.replaceState({device:it.name,direct:Boolean(history.state?.direct)},"",publicPath);
  }
  syncCanonical(publicPath);
  const returnFocus=returnFocusOverride||document.activeElement;
  const key=CUR_CAT; const tr=deviceTier(it,key), grade=tierGrade(it,key);
  // stable record id — the item's position in the category dataset (lab feel, design #15)
  const recIdx=(DB.data[key].items||[]).indexOf(it);
  const recId=recIdx>=0?`Record #${String(recIdx+1).padStart(3,"0")}`:"";
  const rows=fullSpecs(it,key);
  const specHTML=rows.length?`<div class="dd-specs cols3">${rows.map(([k,v])=>`<div class="spec"><span class="sk">${escapeHTML(k)}</span><span class="sv">${escapeHTML(v)}</span></div>`).join("")}</div>`:"";
  const noteText=localizedField(it,"note");
  const note=noteText?`<p class="dd-note">${escapeHTML(noteText)}</p>`:"";
  const bi=buyInfo(it);
  const buy=bi?`<a class="buy-btn" href="${escapeHTML(bi.url)}" target="_blank" rel="noopener">${ICO.cart}<span>${escapeHTML(bi.label)}</span>${ICO.ext}</a>`:"";

  // visualizations
  let vis="";
  if(key==="audio" && it.category!==AUDIO_SOURCES_CAT){
    const pref=prefScore(it,tr);
    // АЧХ: dynamic curve from an uploaded measurement (`fr` map, keyed by
    // standard) rendered on black with the accent colour; falls back to a
    // legacy screenshot (`fr_image`) then to the generated placeholder.
    const frVis = frBlock(it);
    // EQ preset buttons: enabled when preset text exists, disabled (gray) otherwise
    const dlBtn=(type,label,content)=>
      content
        ? `<a class="dl-btn" href="${escapeHTML('data:text/plain;charset=utf-8,'+encodeURIComponent(content))}" download="${escapeHTML(it.name+' '+type+'.txt')}">${ICO.dl} ${label}</a>`
        : `<button class="dl-btn" type="button" disabled aria-disabled="true" style="opacity:.4;cursor:not-allowed">${ICO.dl} ${label}</button>`;
    vis=`<div class="viz">
      ${frVis}
      <div class="eq-row">
        <div class="pref"><span class="mut3">${t('eq_pref')}</span><span class="pref-v num">${pref}<span class="mut3">/100</span></span>
          <span class="pref-track"><i style="width:${pref}%"></i></span></div>
        <div class="eq-dl"><div class="eq-dl-in"><span class="mut3">${t('eq_download')}</span>
          <div class="eq-btns">${dlBtn("PEQ",t('eq_peq'),it.peq)}
          ${dlBtn("GEQ",t('eq_geq'),it.geq)}</div></div></div>
      </div></div>`;
  } else if(key==="mice"){
    const shapeFigure=mouseShapeSVG(it);
    const shapePanel=shapeFigure?`<section class="mouse-shape-panel"><div class="mouse-section-title"><i></i><span>${escapeHTML(t('shape_title'))}</span></div>${shapeFigure}</section>`:"";
    vis=`<div class="mouse-profile ${shapeFigure?'with-shape':'without-shape'}">
      <div class="mouse-primary">${shapePanel}${mouseGripCards(it)}</div>
      ${mouseSpecTiles(it)}
    </div>`;
  }

  const rel=relatedDevices(it);
  const relCard=(x)=>`<button type="button" class="rel" data-modal-device="${escapeHTML(x.name)}"><span class="rel-tier t-${(deviceTier(x,CUR_CAT)||'x').toLowerCase()}">${escapeHTML(tierGrade(x,CUR_CAT)||'—')}</span><span class="rel-name">${escapeHTML(x.name)}</span><span class="rel-price num mut3">${escapeHTML(priceLabel(x.price))}</span></button>`;
  const relHTML = (label, arr)=> arr.length?`<div class="rel-sec"><h4>${label}</h4><div class="rel-grid">${arr.map(relCard).join("")}</div></div>`:"";

  const mouseMatches=key==="mice"?mouseShapeMatchesHTML(it):"";
  const modalBody=key==="mice"
    ? `${vis}${note?`<div class="mouse-note">${note}</div>`:""}<div class="dd-actions">${buy}</div>${mouseMatches}`
    : `${vis}<div class="modal-body">${specHTML}${note}</div><div class="dd-actions">${buy}</div>${relHTML(t('similar'), rel.similar)}`;

  const ov=document.createElement("div"); ov.className="modal-ov"; ov.id="modalOv";
  ov.innerHTML=`<div class="modal${key==='mice'?' modal-mouse':''}" role="dialog" aria-modal="true" aria-label="${escapeHTML(it.name)}">
    <button class="modal-x" id="modalX" aria-label="${t('close')}">✕</button>
    <div class="modal-head">
      <span class="dev-tier lg t-${(tr||'x').toLowerCase()}">${escapeHTML(grade||'—')}</span>
      <div><div class="modal-name">${escapeHTML(it.name)}</div>
      <div class="modal-sub mut3">${escapeHTML([catLabel(CUR_CAT), brandOf(it.name), recId].filter(Boolean).join(" · "))}</div></div>
      <div class="modal-price num">${escapeHTML(priceLabel(it.price))}</div>
    </div>
    ${modalBody}
  </div>`;
  document.body.appendChild(ov); document.body.style.overflow="hidden";
  requestAnimationFrame(()=>{ ov.classList.add("open"); ov.querySelector("#modalX")?.focus(); });
  let closed=false;
  let modalEffectCleanup=()=>{};
  const cleanup=()=>{ closed=true; modalEffectCleanup(); document.removeEventListener("keydown",esc); };
  ACTIVE_MODAL={name:it.name,ov,returnFocus,cleanup};
  const close=()=>{ if(!closed) requestModalClose(); };
  const showDevice=(nextName)=>{
    const next=findItem(nextName);
    if(closed || !next || next===it) return;
    openModal(next.name,returnFocus,{historyMode:"replace"});
  };
  ov.addEventListener("click",e=>{ if(e.target===ov) close(); });
  ov.querySelector("#modalX").addEventListener("click",close);
  function esc(e){ if(e.key==="Escape") close(); }
  document.addEventListener("keydown",esc);
  ov.querySelectorAll("[data-modal-device]").forEach(b=>b.addEventListener("click",()=>showDevice(b.dataset.modalDevice)));
  ov.querySelectorAll("[data-dl]").forEach(b=> b.addEventListener("click",()=>downloadPreset(it.name, b.dataset.dl, b.dataset.dl==="PEQ" ? it.peq : it.geq)));
  if(key==="audio" && it.category!==AUDIO_SOURCES_CAT) modalEffectCleanup=wireFRToggle(ov, it)||modalEffectCleanup;
}

if(!window.__terDeviceHistory){
  window.__terDeviceHistory=1;
  window.addEventListener("popstate",()=>{
    const route=routeFromPath();
    if(route.category===CUR_CAT && route.deviceSlug){
      const it=findItemBySlug(route.deviceSlug);
      if(it){ openModal(it.name,null,{historyMode:"none"}); return; }
    }
    dismissActiveModal({restoreFocus:true,animate:true});
    syncCanonical(categoryPath(CUR_CAT));
  });
}

initCategory();
