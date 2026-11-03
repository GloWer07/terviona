/* ============================================================
   Terviona Journal — catalogue of published analysis, guides and reviews.
   ============================================================ */
'use strict';

(function () {
  const UI = {
    ru: {
      title:"Статьи и обзоры", subtitle:"Разбираем технологии, проверяем утверждения и объясняем, как выбирать устройства осознанно.",
      all:"Все", analysis:"Разбор", guide:"Гайд", review:"Обзор", newest:"Сначала новые", oldest:"Сначала старые",
      count_one:"публикация", count_few:"публикации", count_many:"публикаций", empty:"В этой категории пока нет публикаций.",
      read:"мин чтения", by:"Автор", filters_label:"Фильтры публикаций", sort_label:"Порядок публикаций", load_error:"Не удалось загрузить публикации. Попробуйте обновить страницу."
    },
    en: {
      title:"Articles & reviews", subtitle:"We break down technology, verify claims and explain how to choose devices with context.",
      all:"All", analysis:"Analysis", guide:"Guide", review:"Review", newest:"Newest first", oldest:"Oldest first",
      count_one:"publication", count_few:"publications", count_many:"publications", empty:"There are no publications in this category yet.",
      read:"min read", by:"By", filters_label:"Publication filters", sort_label:"Publication order", load_error:"Publications could not be loaded. Please refresh the page."
    },
    uk: {
      title:"Статті та огляди", subtitle:"Розбираємо технології, перевіряємо твердження й пояснюємо, як обирати пристрої усвідомлено.",
      all:"Усі", analysis:"Розбір", guide:"Гайд", review:"Огляд", newest:"Спочатку нові", oldest:"Спочатку старі",
      count_one:"публікація", count_few:"публікації", count_many:"публікацій", empty:"У цій категорії поки немає публікацій.",
      read:"хв читання", by:"Автор", filters_label:"Фільтри публікацій", sort_label:"Порядок публікацій", load_error:"Не вдалося завантажити публікації. Оновіть сторінку."
    }
  };
  const state = { articles:[], filter:"all", sort:"newest" };

  function lang(){ return UI[window.LANG] ? window.LANG : "ru"; }
  function l(key){ return UI[lang()][key] || key; }
  function esc(value){ return window.escapeHTML ? escapeHTML(value) : String(value == null ? "" : value); }
  function safeAsset(src){
    const value=String(src||"").trim();
    if(!value) return "/img/og.png";
    if(/^https:\/\//i.test(value) || value.startsWith("/")) return value;
    return "/"+value.replace(/^\.\//,"");
  }
  function translation(article){
    const translations=article.translations||{};
    return translations[lang()] || translations[article.source_language||"ru"] || translations.ru || translations.en || translations.uk || {};
  }
  function plainText(value){
    const host=document.createElement("div"); host.innerHTML=String(value||""); return host.textContent||"";
  }
  function readingMinutes(article, tr){
    const text=[tr.title,tr.excerpt].concat((tr.blocks||[]).flatMap(block=>[
      block.html,block.title,block.caption,block.cite,...(block.items||[])
    ])).map(plainText).join(" ").trim();
    const words=(text.match(/[\p{L}\p{N}]+/gu)||[]).length;
    const speed=lang()==="en"?220:180;
    return Math.max(1,Math.ceil(words/speed));
  }
  function categoryLabel(category){ return l(category); }
  function fmtDate(iso){
    const locale=lang()==="en"?"en-GB":lang()==="uk"?"uk-UA":"ru-RU";
    try{return new Intl.DateTimeFormat(locale,{day:"numeric",month:"long",year:"numeric"}).format(new Date(iso));}
    catch(_){return "";}
  }
  function articleHref(article){ return "/articles/"+encodeURIComponent(article.slug); }
  function articleCard(article,index=0){
    const tr=translation(article), cover=article.cover||{}, alt=(cover.alt&&cover.alt[lang()])||(cover.alt&&cover.alt[article.source_language])||tr.title||"";
    const author=article.author||{};
    const authorHtml=author.profile_id
      ? `<a class="article-card-author" href="${profilePath(author.profile_id)}" aria-label="${esc(l('by'))}: ${esc(author.name||'Terviona')}">${esc(author.name||"Terviona")}</a>`
      : `<span>${esc(author.name||"Terviona")}</span>`;
    return `<article class="article-card reveal" style="--rd:${Math.min(index*55,330)}ms">
      <a class="article-card-cover" href="${articleHref(article)}" aria-label="${esc(tr.title||article.slug)}">
        <img src="${esc(safeAsset(cover.src))}" alt="${esc(alt)}" width="1600" height="900" loading="lazy" decoding="async">
        <span class="article-card-index mono">${String(index+1).padStart(2,"0")}</span>
      </a>
      <div class="article-card-body">
        <div class="article-card-category mono">// ${esc(categoryLabel(article.category))}</div>
        <h2><a href="${articleHref(article)}">${esc(tr.title||article.slug)}</a></h2>
        <p>${esc(tr.excerpt||"")}</p>
        <div class="article-card-meta mono">
          <time datetime="${esc(article.published_at||"")}">${esc(fmtDate(article.published_at))}</time><i>·</i>
          <span>${readingMinutes(article,tr)} ${esc(l("read"))}</span><i>·</i>${authorHtml}
        </div>
      </div>
    </article>`;
  }
  function pluralCount(n){
    if(lang()!=="ru"&&lang()!=="uk") return l(n===1?"count_one":"count_many");
    const mod10=n%10,mod100=n%100;
    return l(mod10===1&&mod100!==11?"count_one":mod10>=2&&mod10<=4&&(mod100<12||mod100>14)?"count_few":"count_many");
  }
  function syncQuery(){
    const url=new URL(location.href);
    state.filter==="all"?url.searchParams.delete("category"):url.searchParams.set("category",state.filter);
    state.sort==="newest"?url.searchParams.delete("sort"):url.searchParams.set("sort",state.sort);
    history.replaceState(null,"",url.pathname+url.search);
  }
  function filtered(){
    const rows=state.filter==="all"?state.articles:state.articles.filter(a=>a.category===state.filter);
    return [...rows].sort((a,b)=>{
      const av=Date.parse(a.published_at||0)||0,bv=Date.parse(b.published_at||0)||0;
      return state.sort==="oldest"?av-bv:bv-av;
    });
  }
  function render(){
    document.documentElement.lang=lang();
    document.title=l("title")+" — Terviona";
    const title=document.getElementById("journalTitle"), sub=document.getElementById("journalSubtitle");
    if(title) title.textContent=l("title"); if(sub) sub.textContent=l("subtitle");
    const controls=document.querySelector(".journal-controls"), sortLabel=document.getElementById("journalSortLabel");
    if(controls) controls.setAttribute("aria-label",l("filters_label"));
    if(sortLabel) sortLabel.textContent=l("sort_label");
    const filters=document.getElementById("journalFilters");
    if(filters){
      filters.innerHTML=["all","analysis","guide","review"].map(key=>`<button type="button" class="journal-filter${state.filter===key?' active':''}" data-category="${key}" aria-pressed="${state.filter===key}">${esc(l(key))}</button>`).join("");
      filters.querySelectorAll("button").forEach(button=>button.addEventListener("click",()=>{state.filter=button.dataset.category;syncQuery();render();}));
    }
    const sort=document.getElementById("journalSort");
    if(sort){
      sort.innerHTML=`<option value="newest">${esc(l("newest"))}</option><option value="oldest">${esc(l("oldest"))}</option>`;
      sort.value=state.sort; sort.onchange=()=>{state.sort=sort.value;syncQuery();render();};
    }
    const rows=filtered(), count=document.getElementById("journalCount"), grid=document.getElementById("articleGrid");
    if(count) count.textContent=`${String(rows.length).padStart(2,"0")} ${pluralCount(rows.length)}`;
    if(grid) grid.innerHTML=rows.length?rows.map(articleCard).join(""):`<div class="journal-empty"><span class="mono">NO_SIGNAL</span><p>${esc(l("empty"))}</p></div>`;
    if(window.initReveal) initReveal();
  }
  async function load(){
    const response=await fetch("/data/articles.json",{cache:"no-cache"});
    if(!response.ok) throw new Error("articles "+response.status);
    const data=await response.json();
    state.articles=(data.articles||[]).filter(article=>article.status==="published");
  }
  async function start(){
    await initGeoDefaults(); initTheme(); renderChrome("articles"); applyStaticI18n(); wireGlobal();
    const params=new URLSearchParams(location.search);
    if(["analysis","guide","review"].includes(params.get("category"))) state.filter=params.get("category");
    if(params.get("sort")==="oldest") state.sort="oldest";
    try{await load();render();}
    catch(error){
      console.error(error);
      const grid=document.getElementById("articleGrid");
      if(grid) grid.innerHTML=`<div class="journal-empty"><span class="mono">DATA_ERROR</span><p>${esc(l("load_error"))}</p></div>`;
    }
    window.PAGE_RENDER=()=>{renderChrome("articles");wireGlobal();render();};
  }
  window.TervionaJournal={articleCard,readingMinutes,translation,safeAsset};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true}); else start();
})();
