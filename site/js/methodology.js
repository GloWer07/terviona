/* ============================================================
   Terviona — single public methodology source.
   ============================================================ */
'use strict';

(function(){
  const UI={
    ru:{title:"Как формируются рекомендации",toc:"Содержание",principles:"Общие принципы",categories:"Методика по категориям",sources:"Источники данных",updated:"Обновлено",criteria:"Критерии",disclaimer:"Дисклеймер",open:"Открыть категорию",guide:"Гайд по эквализации"},
    en:{title:"How recommendations are built",toc:"Contents",principles:"Core principles",categories:"Category methodology",sources:"Evidence sources",updated:"Updated",criteria:"Criteria",disclaimer:"Disclaimer",open:"Open category",guide:"Equalization guide"},
    uk:{title:"Як формуються рекомендації",toc:"Зміст",principles:"Загальні принципи",categories:"Методика за категоріями",sources:"Джерела даних",updated:"Оновлено",criteria:"Критерії",disclaimer:"Застереження",open:"Відкрити категорію",guide:"Гайд з еквалізації"}
  };
  function lang(){return UI[window.LANG]?window.LANG:"ru";}
  function l(key){return UI[lang()][key]||key;}
  function esc(value){return escapeHTML(value==null?"":value);}
  function local(value){return value&&typeof value==="object"?(value[lang()]||value.ru||value.en||value.uk||""):String(value||"");}
  function fmtDate(value){
    const locale=lang()==="en"?"en-GB":lang()==="uk"?"uk-UA":"ru-RU";
    try{return new Intl.DateTimeFormat(locale,{day:"numeric",month:"long",year:"numeric"}).format(new Date(value));}catch(_){return value||"";}
  }
  function sectionTitle(id,index,title){return `<div class="methodology-section-head"><span class="mono">${String(index).padStart(2,"0")}</span><h2 id="${id}">${esc(title)}</h2></div>`;}
  function render(data){
    document.documentElement.lang=lang(); document.title=l("title")+" — Terviona";
    document.getElementById("methodologyTitle").textContent=l("title");
    document.getElementById("methodologyIntro").textContent=local(data.intro);
    document.getElementById("methodologyVersion").textContent=`v${data.version||"1.0"} · ${l("updated")} ${fmtDate(data.updated_at)}`;
    document.getElementById("methodologyTocLabel").textContent=l("toc").toUpperCase();
    document.querySelector(".methodology-toc")?.setAttribute("aria-label",l("toc"));
    const toc=document.getElementById("methodologyToc");
    const categoryKeys=Object.keys(data.categories||{});
    toc.innerHTML=`<a href="#principles">${esc(l("principles"))}</a>`+categoryKeys.map(key=>`<a href="#method-${key}">${esc(catLabel(key))}</a>`).join("")+`<a href="#sources">${esc(l("sources"))}</a>`;

    const principles=document.getElementById("methodologyPrinciples");
    principles.innerHTML=sectionTitle("principles",1,l("principles"))+`<div class="methodology-principle-grid">${(data.principles||[]).map((item,index)=>`<article class="methodology-principle"><span class="mono">P${String(index+1).padStart(2,"0")}</span><h3>${esc(local(item.title))}</h3><p>${esc(local(item.body))}</p></article>`).join("")}</div>`;

    const categories=document.getElementById("methodologyCategories");
    categories.innerHTML=sectionTitle("categories",2,l("categories"))+categoryKeys.map((key,index)=>{
      const method=data.categories[key]||{};
      const criteria=(method.criteria||[]).map(item=>`<li><strong class="mono">${esc(item.value)}</strong><span>${esc(item[lang()]||item.ru||item.en||item.uk||"")}</span></li>`).join("");
      return `<article class="methodology-category" id="method-${key}">
        <div class="methodology-category-title"><div><span class="mono">M-${String(index+1).padStart(2,"0")}</span><h3>${esc(catLabel(key))}</h3></div><a href="${categoryPath(key)}">${esc(l("open"))} ${ICO.arrow}</a></div>
        ${criteria?`<div class="methodology-category-grid"><div><h4>${esc(l("criteria"))}</h4><ul class="methodology-criteria-list">${criteria}</ul></div>`:"<div class=\"methodology-category-grid compact\">"}
        <div class="methodology-disclaimer"><h4>${esc(l("disclaimer"))}</h4><p>${esc(local(method.note))}</p>${method.link?`<a href="${esc(method.link)}" target="_blank" rel="noopener noreferrer">${esc(l("guide"))} ${ICO.ext}</a>`:""}</div></div>
      </article>`;
    }).join("");

    const sources=document.getElementById("methodologySources");
    sources.innerHTML=sectionTitle("sources",3,l("sources"))+`<ol>${(data.sources||[]).map(source=>`<li><span class="mono">${String((data.sources||[]).indexOf(source)+1).padStart(2,"0")}</span><p>${esc(local(source.label))}</p></li>`).join("")}</ol>`;
  }
  async function start(){
    await initGeoDefaults();initTheme();renderChrome("methodology");applyStaticI18n();wireGlobal();
    try{const data=await loadMethodology();render(data);}
    catch(error){console.error(error);document.getElementById("methodologyIntro").textContent="DATA_ERROR";}
    window.PAGE_RENDER=async()=>{renderChrome("methodology");wireGlobal();const data=DB.data.methodology||await loadMethodology();render(data);};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
