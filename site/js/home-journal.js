/* Latest Journal publications on the home page. */
'use strict';
(function(){
  const L={
    ru:{title:"Журнал",all:"Все публикации →",sub:"Разборы, гайды и обзоры от редакции Terviona.",analysis:"Разбор",guide:"Гайд",review:"Обзор",read:"мин чтения"},
    en:{title:"Journal",all:"All publications →",sub:"Analysis, guides and reviews from the Terviona team.",analysis:"Analysis",guide:"Guide",review:"Review",read:"min read"},
    uk:{title:"Журнал",all:"Усі публікації →",sub:"Розбори, гайди та огляди від редакції Terviona.",analysis:"Розбір",guide:"Гайд",review:"Огляд",read:"хв читання"}
  };
  let rows=[];
  const lang=()=>L[window.LANG]?window.LANG:"ru";
  const text=key=>L[lang()][key]||key;
  const esc=value=>escapeHTML(value==null?"":value);
  const translation=article=>article.translations?.[lang()]||article.translations?.[article.source_language]||article.translations?.ru||{};
  function date(value){try{return new Intl.DateTimeFormat(lang()==="en"?"en-GB":lang()==="uk"?"uk-UA":"ru-RU",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value));}catch(_){return "";}}
  function minutes(tr){const host=document.createElement("div");host.innerHTML=[tr.title,tr.excerpt,...(tr.blocks||[]).flatMap(block=>[block.html,block.title,...(block.items||[])])].join(" ");const count=(host.textContent.match(/[\p{L}\p{N}]+/gu)||[]).length;return Math.max(1,Math.ceil(count/(lang()==="en"?220:180)));}
  function render(){
    const title=document.getElementById("homeJournalTitle"),all=document.getElementById("homeJournalAll"),sub=document.getElementById("homeJournalSubtitle"),grid=document.getElementById("homeArticleGrid");if(!grid)return;
    title.textContent=text("title");all.textContent=text("all");sub.textContent=text("sub");
    grid.innerHTML=rows.map((article,index)=>{const tr=translation(article),cover=article.cover||{},alt=cover.alt?.[lang()]||cover.alt?.[article.source_language]||tr.title||"";return `<article class="article-card reveal" style="--rd:${index*55}ms"><a class="article-card-cover" href="/articles/${encodeURIComponent(article.slug)}"><img src="/${esc(String(cover.src||'img/og.png').replace(/^\//,''))}" alt="${esc(alt)}" width="1600" height="900" loading="lazy" decoding="async"><span class="article-card-index mono">${String(index+1).padStart(2,"0")}</span></a><div class="article-card-body"><div class="article-card-category mono">// ${esc(text(article.category))}</div><h2><a href="/articles/${encodeURIComponent(article.slug)}">${esc(tr.title||article.slug)}</a></h2><p>${esc(tr.excerpt||"")}</p><div class="article-card-meta mono"><time>${esc(date(article.published_at))}</time><i>·</i><span>${minutes(tr)} ${esc(text("read"))}</span><i>·</i><span>${esc(article.author?.name||"Terviona")}</span></div></div></article>`;}).join("");
    if(window.initReveal)initReveal();
  }
  async function start(){try{const response=await fetch("/data/articles.json",{cache:"no-cache"});const data=await response.json();rows=(data.articles||[]).filter(article=>article.status==="published").sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)).slice(0,3);render();}catch(error){console.warn("[home journal]",error);}}
  window.addEventListener("terviona:lang",render);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
