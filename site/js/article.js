/* ============================================================
   Terviona Journal — article reader, reactions and comments.
   ============================================================ */
'use strict';

(function(){
  const UI={
    ru:{back:"Все публикации",analysis:"Разбор",guide:"Гайд",review:"Обзор",read:"мин чтения",updated:"Обновлено",translation_fallback:"Перевод ещё не готов — показан исходный язык.",
      helpful:"Материал был полезен?",like:"Полезно",dislike:"Не помогло",share:"Поделиться",copy:"Скопировать ссылку",copied:"Ссылка скопирована",methodology:"Методология",related:"Читайте также",
      comments:"Комментарии",comments_sub:"Обсуждение доступно всем, участвовать могут авторизованные пользователи.",write:"Написать комментарий…",send:"Опубликовать",sending:"Публикация…",login:"Войдите, чтобы оставить комментарий или оценку.",login_btn:"Войти",none:"Комментариев пока нет.",unavailable:"Комментарии временно недоступны.",edited:"изменён",edit:"Изменить",save:"Сохранить",cancel:"Отмена",delete:"Удалить",confirm_delete:"Удалить комментарий?",error:"Не удалось выполнить действие. Попробуйте ещё раз.",too_short:"Комментарий должен содержать от 3 до 4000 символов.",
      best:"Лучшие",worst:"Худшие",newest:"Самые новые",oldest:"Самые старые",updated_new:"Обновлённые недавно",updated_old:"Обновлённые давно",controversial:"Наиболее спорные",uncontroversial:"Наименее спорные"},
    en:{back:"All publications",analysis:"Analysis",guide:"Guide",review:"Review",read:"min read",updated:"Updated",translation_fallback:"This translation is not ready yet — the source language is shown.",
      helpful:"Was this article useful?",like:"Useful",dislike:"Not useful",share:"Share",copy:"Copy link",copied:"Link copied",methodology:"Methodology",related:"Read next",
      comments:"Comments",comments_sub:"Everyone can read the discussion; an account is required to participate.",write:"Write a comment…",send:"Publish",sending:"Publishing…",login:"Log in to comment or vote.",login_btn:"Log in",none:"No comments yet.",unavailable:"Comments are temporarily unavailable.",edited:"edited",edit:"Edit",save:"Save",cancel:"Cancel",delete:"Delete",confirm_delete:"Delete this comment?",error:"The action failed. Please try again.",too_short:"A comment must contain 3–4000 characters.",
      best:"Best",worst:"Worst",newest:"Newest",oldest:"Oldest",updated_new:"Recently updated",updated_old:"Updated long ago",controversial:"Most controversial",uncontroversial:"Least controversial"},
    uk:{back:"Усі публікації",analysis:"Розбір",guide:"Гайд",review:"Огляд",read:"хв читання",updated:"Оновлено",translation_fallback:"Переклад ще не готовий — показано мову оригіналу.",
      helpful:"Матеріал був корисним?",like:"Корисно",dislike:"Не допомогло",share:"Поділитися",copy:"Скопіювати посилання",copied:"Посилання скопійовано",methodology:"Методологія",related:"Читайте також",
      comments:"Коментарі",comments_sub:"Обговорення доступне всім, брати участь можуть авторизовані користувачі.",write:"Написати коментар…",send:"Опублікувати",sending:"Публікація…",login:"Увійдіть, щоб залишити коментар або оцінку.",login_btn:"Увійти",none:"Коментарів поки немає.",unavailable:"Коментарі тимчасово недоступні.",edited:"змінено",edit:"Змінити",save:"Зберегти",cancel:"Скасувати",delete:"Видалити",confirm_delete:"Видалити коментар?",error:"Не вдалося виконати дію. Спробуйте ще раз.",too_short:"Коментар має містити від 3 до 4000 символів.",
      best:"Найкращі",worst:"Найгірші",newest:"Найновіші",oldest:"Найстаріші",updated_new:"Оновлені нещодавно",updated_old:"Оновлені давно",controversial:"Найбільш суперечливі",uncontroversial:"Найменш суперечливі"}
  };
  const SORT_KEYS=["best","worst","newest","oldest","updated_new","updated_old","controversial","uncontroversial"];
  const state={article:null,allArticles:[],social:{reaction:0,reactions:[],comments:[],votes:[],ownVotes:{},sort:localStorage.getItem("article_comment_sort")||"best",editing:null,busy:false}};
  function lang(){return UI[window.LANG]?window.LANG:"ru";}
  function l(key){return UI[lang()][key]||key;}
  function esc(value){return escapeHTML(value==null?"":value);}
  function locale(){return lang()==="en"?"en-GB":lang()==="uk"?"uk-UA":"ru-RU";}
  function fmtDate(value,withTime=false){try{return new Intl.DateTimeFormat(locale(),withTime?{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}:{day:"numeric",month:"long",year:"numeric"}).format(new Date(value));}catch(_){return "";}}
  function safeAsset(src){const value=String(src||"").trim();if(!value)return "/img/og.png";if(/^https:\/\//i.test(value)||value.startsWith("/"))return value;return "/"+value.replace(/^\.\//,"");}
  function safeUrl(url){try{const parsed=new URL(url,location.origin);return ["http:","https:","mailto:"].includes(parsed.protocol)?parsed.href:"";}catch(_){return "";}}
  function sanitizeInline(value){
    const tpl=document.createElement("template");tpl.innerHTML=String(value||"");
    const allowed=new Set(["B","STRONG","I","EM","U","S","CODE","A","BR"]);
    [...tpl.content.querySelectorAll("*")].forEach(node=>{
      if(!allowed.has(node.tagName)){node.replaceWith(document.createTextNode(node.textContent||""));return;}
      const originalHref=node.tagName==="A"?node.getAttribute("href")||"":"";
      [...node.attributes].forEach(attr=>node.removeAttribute(attr.name));
      if(node.tagName==="A"){
        const href=safeUrl(originalHref);
        if(href){node.setAttribute("href",href);node.setAttribute("target","_blank");node.setAttribute("rel","noopener noreferrer");}
        else node.replaceWith(document.createTextNode(node.textContent||""));
      }
    });
    return tpl.innerHTML;
  }
  function translation(article){
    const map=article.translations||{}, requested=map[lang()];
    if(requested)return {data:requested,fallback:false,code:lang()};
    const code=article.source_language&&map[article.source_language]?article.source_language:(map.ru?"ru":map.en?"en":"uk");
    return {data:map[code]||{},fallback:true,code};
  }
  function plainText(value){const host=document.createElement("div");host.innerHTML=String(value||"");return host.textContent||"";}
  function readMinutes(article,tr){
    const text=[tr.title,tr.excerpt].concat((tr.blocks||[]).flatMap(block=>[block.html,block.title,block.caption,block.cite,...(block.items||[])])).map(plainText).join(" ");
    const words=(text.match(/[\p{L}\p{N}]+/gu)||[]).length;return Math.max(1,Math.ceil(words/(lang()==="en"?220:180)));
  }
  function categoryLabel(category){return l(category);}
  function articleSlug(){
    const match=location.pathname.match(/^\/articles\/([^/]+)\/?$/);return match?decodeURIComponent(match[1]):new URLSearchParams(location.search).get("slug");
  }
  function blockHTML(block,index){
    const type=block&&block.type;
    if(type==="heading"){
      const level=Number(block.level)===3?3:2;return `<h${level} id="section-${index}">${sanitizeInline(block.html)}</h${level}>`;
    }
    if(type==="paragraph")return `<p>${sanitizeInline(block.html)}</p>`;
    if(type==="image"){
      const src=safeAsset(block.src),alt=esc(block.alt||block.caption||"");
      return `<figure class="article-figure${block.wide?' wide':''}"><img src="${esc(src)}" alt="${alt}" loading="lazy" decoding="async">${block.caption?`<figcaption>${esc(block.caption)}</figcaption>`:""}</figure>`;
    }
    if(type==="quote")return `<blockquote><p>${sanitizeInline(block.html)}</p>${block.cite?`<cite>${esc(block.cite)}</cite>`:""}</blockquote>`;
    if(type==="callout")return `<aside class="article-callout tone-${esc(block.tone||"signal")}"><span class="mono">SIGNAL_NOTE</span>${block.title?`<h3>${esc(block.title)}</h3>`:""}<p>${sanitizeInline(block.html)}</p></aside>`;
    if(type==="list"){
      const tag=block.ordered?"ol":"ul";return `<${tag}>${(block.items||[]).map(item=>`<li>${sanitizeInline(typeof item==="string"?item:item.html)}</li>`).join("")}</${tag}>`;
    }
    if(type==="table"){
      const rows=Array.isArray(block.rows)?block.rows:[];return rows.length?`<div class="article-table-wrap"><table>${rows.map((row,ri)=>`<tr>${(row||[]).map(cell=>ri===0?`<th>${sanitizeInline(cell)}</th>`:`<td>${sanitizeInline(cell)}</td>`).join("")}</tr>`).join("")}</table></div>`:"";
    }
    if(type==="divider")return `<hr>`;
    return "";
  }
  function updateMeta(article,tr){
    const title=plainText(tr.title||article.slug),desc=plainText(tr.seo_description||tr.excerpt||"").slice(0,200),canonical=new URL("/articles/"+article.slug,location.origin).href;
    document.title=title+" — Terviona";
    const set=(selector,value)=>{const node=document.querySelector(selector);if(node)node.setAttribute("content",value);};
    set('meta[name="description"]',desc);set('meta[property="og:title"]',title);set('meta[property="og:description"]',desc);set('meta[property="og:url"]',canonical);set('meta[property="og:image"]',new URL(safeAsset((article.cover||{}).src),location.origin).href);
    const canonicalNode=document.querySelector('link[rel="canonical"]');if(canonicalNode)canonicalNode.href=canonical;
    let structured=document.getElementById("articleStructuredData");if(!structured){structured=document.createElement("script");structured.type="application/ld+json";structured.id="articleStructuredData";document.head.appendChild(structured);}
    structured.textContent=JSON.stringify({"@context":"https://schema.org","@type":"Article",headline:title,description:desc,datePublished:article.published_at,dateModified:article.updated_at||article.published_at,author:{"@type":"Person",name:(article.author||{}).name||"Terviona"},image:new URL(safeAsset((article.cover||{}).src),location.origin).href,mainEntityOfPage:canonical});
  }
  function relatedHTML(article){
    const rows=state.allArticles.filter(item=>item.id!==article.id).sort((a,b)=>(a.category===article.category?-1:0)-(b.category===article.category?-1:0)).slice(0,3);
    if(!rows.length)return "";
    return `<section class="article-related wrap"><div class="sec-head"><h2>${esc(l("related"))}</h2><span class="rule"></span></div><div class="article-grid compact">${rows.map((item,index)=>{
      const localized=translation(item),tr=localized.data,cover=item.cover||{},alt=cover.alt?.[lang()]||cover.alt?.[localized.code]||tr.title||"";
      return `<article class="article-card"><a class="article-card-cover" href="/articles/${encodeURIComponent(item.slug)}"><img src="${esc(safeAsset(cover.src))}" alt="${esc(alt)}" width="1600" height="900" loading="lazy" decoding="async"><span class="article-card-index mono">${String(index+1).padStart(2,"0")}</span></a><div class="article-card-body"><div class="article-card-category mono">// ${esc(categoryLabel(item.category))}</div><h2><a href="/articles/${encodeURIComponent(item.slug)}">${esc(tr.title||item.slug)}</a></h2><p>${esc(tr.excerpt||"")}</p><div class="article-card-meta mono"><time>${esc(fmtDate(item.published_at))}</time><i>·</i><span>${readMinutes(item,tr)} ${esc(l("read"))}</span></div></div></article>`;
    }).join("")}</div></section>`;
  }
  function render(){
    const article=state.article,root=document.getElementById("articleRoot");if(!article||!root)return;
    const localized=translation(article),tr=localized.data,cover=article.cover||{},coverAlt=(cover.alt&&cover.alt[lang()])||(cover.alt&&cover.alt[localized.code])||plainText(tr.title||"");
    updateMeta(article,tr);document.documentElement.lang=lang();
    const author=article.author||{},authorLink=author.profile_id?`<a href="${profilePath(author.profile_id)}">${esc(author.name||"Terviona")}</a>`:`<span>${esc(author.name||"Terviona")}</span>`;
    root.innerHTML=`
      <article>
        <header class="article-hero wrap">
          <div class="article-hero-top">
            <a class="article-back mono" href="/articles">${ICO.arrow}<span>${esc(l("back"))}</span></a>
            <div class="article-category mono">// JOURNAL · ${esc(categoryLabel(article.category).toUpperCase())}</div>
          </div>
          <h1>${esc(plainText(tr.title||article.slug))}</h1>
          <p class="article-deck">${esc(tr.excerpt||"")}</p>
          ${localized.fallback?`<div class="article-translation-note">${esc(l("translation_fallback"))}</div>`:""}
          <div class="article-byline mono">
            <span>${authorLink}</span><i>·</i><time datetime="${esc(article.published_at||"")}">${esc(fmtDate(article.published_at))}</time><i>·</i><span>${readMinutes(article,tr)} ${esc(l("read"))}</span>
            ${article.updated_at&&article.updated_at!==article.published_at?`<i>·</i><span>${esc(l("updated"))} ${esc(fmtDate(article.updated_at))}</span>`:""}
          </div>
          <figure class="article-cover"><img src="${esc(safeAsset(cover.src))}" alt="${esc(coverAlt)}" width="1600" height="900" decoding="async"></figure>
        </header>
        <div class="article-layout wrap">
          <aside class="article-rail">
            <div class="article-rail-inner">
              <span class="mono">ARTICLE_SIGNAL</span>
              <button type="button" id="copyArticleLink">${ICO.ext}<span>${esc(l("copy"))}</span></button>
              <a href="/methodology">${ICO.list}<span>${esc(l("methodology"))}</span></a>
            </div>
          </aside>
          <div class="article-main">
            <div class="article-content">${(tr.blocks||[]).map(blockHTML).join("")}</div>
            <section class="article-reactions" id="articleReactions"></section>
            <section class="article-comments" id="articleComments"></section>
          </div>
        </div>
      </article>${relatedHTML(article)}`;
    const copy=document.getElementById("copyArticleLink");if(copy)copy.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);const span=copy.querySelector("span");span.textContent=l("copied");setTimeout(()=>span.textContent=l("copy"),1800);}catch(_){}});
    renderReactions();renderComments();initReadingProgress();
  }
  function initReadingProgress(){
    const bar=document.querySelector("#readingProgress span");if(!bar)return;
    const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;bar.style.transform=`scaleX(${max>0?Math.max(0,Math.min(1,scrollY/max)):0})`;};
    window.removeEventListener("scroll",window.__articleProgress);window.__articleProgress=update;window.addEventListener("scroll",update,{passive:true});update();
  }
  function socialReady(){const auth=window.TervAuth;return !!(auth&&auth.ready&&auth.client);}
  function currentUser(){return window.TervAuth&&TervAuth.user;}
  function reactionCounts(){return state.social.reactions.reduce((out,row)=>{if(row.value===1)out.up++;if(row.value===-1)out.down++;return out;},{up:0,down:0});}
  function renderReactions(){
    const host=document.getElementById("articleReactions");if(!host)return;const counts=reactionCounts(),own=state.social.reaction;
    host.innerHTML=`<div><span class="mono">ARTICLE_FEEDBACK</span><h2>${esc(l("helpful"))}</h2></div><div class="article-reaction-actions">
      <button type="button" data-reaction="1" class="article-reaction${own===1?' active':''}" aria-pressed="${own===1}">${ICO.arrow}<span>${esc(l("like"))}</span><b class="mono">${counts.up}</b></button>
      <button type="button" data-reaction="-1" class="article-reaction negative${own===-1?' active':''}" aria-pressed="${own===-1}"><span class="reaction-down">${ICO.arrow}</span><span>${esc(l("dislike"))}</span><b class="mono">${counts.down}</b></button>
    </div>`;
    host.querySelectorAll("[data-reaction]").forEach(button=>button.addEventListener("click",()=>setReaction(Number(button.dataset.reaction))));
  }
  async function setReaction(value){
    if(!socialReady()){if(window.TervAuth&&TervAuth.openAuth)TervAuth.openAuth("login");return;}
    if(!currentUser()){TervAuth.openAuth("login");return;}
    try{
      if(state.social.reaction===value){const {error}=await TervAuth.client.from("article_reactions").delete().eq("article_id",state.article.id).eq("user_id",currentUser().id);if(error)throw error;state.social.reaction=0;}
      else{const {error}=await TervAuth.client.from("article_reactions").upsert({article_id:state.article.id,user_id:currentUser().id,value},{onConflict:"article_id,user_id"});if(error)throw error;state.social.reaction=value;}
      await loadReactions();renderReactions();
    }catch(error){console.error("[article reaction]",error);}
  }
  async function loadReactions(){
    if(!socialReady())return;
    const {data,error}=await TervAuth.client.from("article_reactions").select("value").eq("article_id",state.article.id);if(error)throw error;state.social.reactions=data||[];
    state.social.reaction=0;if(currentUser()){const {data:mine}=await TervAuth.client.from("article_reactions").select("value").eq("article_id",state.article.id).eq("user_id",currentUser().id).maybeSingle();state.social.reaction=mine?mine.value:0;}
  }
  function voteMap(){
    const map={};state.social.votes.forEach(row=>{const target=map[row.comment_id]||(map[row.comment_id]={up:0,down:0});row.value===1?target.up++:target.down++;});return map;
  }
  function sortedComments(){
    const votes=voteMap();const rows=[...state.social.comments];const score=row=>{const v=votes[row.id]||{up:0,down:0};return v.up-v.down;};const controversy=row=>{const v=votes[row.id]||{up:0,down:0};return Math.min(v.up,v.down)*Math.log10(v.up+v.down+1);};
    const time=(row,key)=>Date.parse(row[key]||row.created_at)||0;
    return rows.sort((a,b)=>{switch(state.social.sort){case"worst":return score(a)-score(b)||time(b,"created_at")-time(a,"created_at");case"newest":return time(b,"created_at")-time(a,"created_at");case"oldest":return time(a,"created_at")-time(b,"created_at");case"updated_new":return time(b,"updated_at")-time(a,"updated_at");case"updated_old":return time(a,"updated_at")-time(b,"updated_at");case"controversial":return controversy(b)-controversy(a)||score(b)-score(a);case"uncontroversial":return controversy(a)-controversy(b)||score(b)-score(a);default:return score(b)-score(a)||time(b,"created_at")-time(a,"created_at");}});
  }
  function avatarHTML(comment){
    const profile=comment.profiles||{},name=profile.username||"Terviona user";return profile.avatar_url?`<img src="${esc(profile.avatar_url)}" alt="">`:esc((name[0]||"?").toUpperCase());
  }
  function commentHTML(comment,votes){
    const profile=comment.profiles||{},name=profile.username||"Terviona user",mine=currentUser()&&comment.user_id===currentUser().id,vote=votes[comment.id]||{up:0,down:0},ownVote=state.social.ownVotes[comment.id]||0,editing=state.social.editing===comment.id;
    const author=profile.public_id?`<a href="${profilePath(profile.public_id)}">${esc(name)}</a>`:`<span>${esc(name)}</span>`;
    return `<article class="article-comment" data-comment-id="${comment.id}">
      <div class="article-comment-head"><span class="article-comment-avatar">${avatarHTML(comment)}</span><div><strong>${author}</strong><span class="mono"><time datetime="${esc(comment.created_at)}">${esc(fmtDate(comment.created_at,true))}</time>${comment.updated_at&&comment.updated_at!==comment.created_at?` · ${esc(l("edited"))}`:""}</span></div></div>
      ${editing?`<div class="article-comment-edit"><textarea maxlength="4000">${esc(comment.body)}</textarea><div><button type="button" data-comment-save>${esc(l("save"))}</button><button type="button" data-comment-cancel>${esc(l("cancel"))}</button></div></div>`:`<p>${esc(comment.body)}</p>`}
      <div class="article-comment-actions">
        <button type="button" data-comment-vote="1" class="${ownVote===1?'active':''}" aria-label="${esc(l("like"))}" aria-pressed="${ownVote===1}">${ICO.arrow}<span class="mono">${vote.up}</span></button>
        <button type="button" data-comment-vote="-1" class="negative ${ownVote===-1?'active':''}" aria-label="${esc(l("dislike"))}" aria-pressed="${ownVote===-1}"><span>${ICO.arrow}</span><span class="mono">${vote.down}</span></button>
        ${mine&&!editing?`<button type="button" data-comment-edit>${esc(l("edit"))}</button><button type="button" data-comment-delete>${esc(l("delete"))}</button>`:""}
      </div>
    </article>`;
  }
  function renderComments(){
    const host=document.getElementById("articleComments");if(!host)return;const votes=voteMap(),rows=sortedComments(),user=currentUser();
    host.innerHTML=`<div class="article-comments-head"><div><span class="mono">COMMUNITY_SIGNAL</span><h2>${esc(l("comments"))} <b class="mono">${rows.length}</b></h2><p>${esc(l("comments_sub"))}</p></div>
      <label class="comment-sort"><span class="sr-only">${esc(l("comments"))}</span><select id="commentSort">${SORT_KEYS.map(key=>`<option value="${key}"${state.social.sort===key?' selected':''}>${esc(l(key))}</option>`).join("")}</select></label></div>
      <div class="article-comment-compose">${user?`<textarea id="articleCommentText" maxlength="4000" placeholder="${esc(l("write"))}"></textarea><div><span class="comment-message" id="commentMessage" role="status"></span><button type="button" id="articleCommentSend">${esc(l("send"))}</button></div>`:`<div class="comment-login"><p>${esc(l("login"))}</p><button type="button" id="commentLogin">${esc(l("login_btn"))}</button></div>`}</div>
      <div class="article-comment-list">${rows.length?rows.map(row=>commentHTML(row,votes)).join(""):`<div class="journal-empty comment-empty"><span class="mono">FIRST_SIGNAL</span><p>${esc(socialReady()?l("none"):l("unavailable"))}</p></div>`}</div>`;
    const sort=document.getElementById("commentSort");if(sort)sort.addEventListener("change",()=>{state.social.sort=sort.value;localStorage.setItem("article_comment_sort",sort.value);renderComments();});
    const login=document.getElementById("commentLogin");if(login)login.addEventListener("click",()=>TervAuth&&TervAuth.openAuth&&TervAuth.openAuth("login"));
    const send=document.getElementById("articleCommentSend");if(send)send.addEventListener("click",submitComment);
    host.querySelectorAll(".article-comment").forEach(card=>{
      const id=Number(card.dataset.commentId);
      card.querySelectorAll("[data-comment-vote]").forEach(button=>button.addEventListener("click",()=>voteComment(id,Number(button.dataset.commentVote))));
      const edit=card.querySelector("[data-comment-edit]");if(edit)edit.addEventListener("click",()=>{state.social.editing=id;renderComments();card.querySelector("textarea")?.focus();});
      const cancel=card.querySelector("[data-comment-cancel]");if(cancel)cancel.addEventListener("click",()=>{state.social.editing=null;renderComments();});
      const save=card.querySelector("[data-comment-save]");if(save)save.addEventListener("click",()=>saveComment(id,card.querySelector("textarea").value));
      const del=card.querySelector("[data-comment-delete]");if(del)del.addEventListener("click",()=>deleteComment(id));
    });
  }
  function commentMessage(text,error=false){const node=document.getElementById("commentMessage");if(node){node.textContent=text;node.classList.toggle("error",error);}}
  async function submitComment(){
    const input=document.getElementById("articleCommentText"),button=document.getElementById("articleCommentSend"),body=(input&&input.value||"").trim();if(body.length<3||body.length>4000){commentMessage(l("too_short"),true);return;}
    if(!socialReady()||!currentUser()){TervAuth&&TervAuth.openAuth&&TervAuth.openAuth("login");return;}
    button.disabled=true;button.textContent=l("sending");
    try{const {error}=await TervAuth.client.from("article_comments").insert({article_id:state.article.id,user_id:currentUser().id,body,status:"published"});if(error)throw error;input.value="";await loadComments();renderComments();}
    catch(error){console.error("[article comment]",error);button.disabled=false;button.textContent=l("send");commentMessage(l("error"),true);}
  }
  async function saveComment(id,body){
    body=String(body||"").trim();if(body.length<3||body.length>4000)return;
    try{const {error}=await TervAuth.client.from("article_comments").update({body,updated_at:new Date().toISOString()}).eq("id",id).eq("user_id",currentUser().id);if(error)throw error;state.social.editing=null;await loadComments();renderComments();}catch(error){console.error(error);}
  }
  async function deleteComment(id){
    if(!confirm(l("confirm_delete")))return;try{const {error}=await TervAuth.client.from("article_comments").delete().eq("id",id).eq("user_id",currentUser().id);if(error)throw error;await loadComments();renderComments();}catch(error){console.error(error);}
  }
  async function voteComment(id,value){
    if(!socialReady()||!currentUser()){TervAuth&&TervAuth.openAuth&&TervAuth.openAuth("login");return;}
    try{if(state.social.ownVotes[id]===value){const {error}=await TervAuth.client.from("article_comment_votes").delete().eq("comment_id",id).eq("user_id",currentUser().id);if(error)throw error;}
      else{const {error}=await TervAuth.client.from("article_comment_votes").upsert({comment_id:id,user_id:currentUser().id,value},{onConflict:"comment_id,user_id"});if(error)throw error;}await loadVotes();renderComments();}catch(error){console.error(error);}
  }
  async function loadVotes(){
    if(!socialReady())return;const ids=state.social.comments.map(row=>row.id);state.social.votes=[];state.social.ownVotes={};if(!ids.length)return;
    const {data,error}=await TervAuth.client.from("article_comment_votes").select("comment_id,user_id,value").in("comment_id",ids);if(error)throw error;state.social.votes=data||[];
    if(currentUser())state.social.votes.filter(row=>row.user_id===currentUser().id).forEach(row=>state.social.ownVotes[row.comment_id]=row.value);
  }
  async function loadComments(){
    if(!socialReady())return;const {data,error}=await TervAuth.client.from("article_comments").select("id,user_id,parent_id,body,status,created_at,updated_at,profiles(username,avatar_url,public_id)").eq("article_id",state.article.id).eq("status","published");if(error)throw error;state.social.comments=data||[];await loadVotes();
  }
  async function refreshSocial(){
    if(!socialReady()){renderReactions();renderComments();return;}
    try{await Promise.all([loadReactions(),loadComments()]);}catch(error){console.warn("[article social]",error);}renderReactions();renderComments();
  }
  async function loadArticle(){
    const response=await fetch("/data/articles.json",{cache:"no-cache"});if(!response.ok)throw new Error("articles "+response.status);const data=await response.json();state.allArticles=(data.articles||[]).filter(item=>item.status==="published");state.article=state.allArticles.find(item=>item.slug===articleSlug());if(!state.article)throw Object.assign(new Error("not found"),{code:404});
  }
  function renderError(error){
    const root=document.getElementById("articleRoot"),notFound=error&&error.code===404;
    root.innerHTML=`<section class="wrap article-not-found"><span class="mono">${notFound?'404 / NO_SIGNAL':'DATA_ERROR'}</span><h1>${notFound?(lang()==='en'?'Publication not found':lang()==='uk'?'Публікацію не знайдено':'Публикация не найдена'):l('unavailable')}</h1><a href="/articles">${esc(l("back"))}</a></section>`;
  }
  async function start(){
    await initGeoDefaults();initTheme();renderChrome("articles");applyStaticI18n();wireGlobal();
    try{await loadArticle();render();}catch(error){console.error(error);renderError(error);return;}
    const auth=window.TervAuth;if(auth&&auth.onChange)auth.onChange(refreshSocial);else refreshSocial();
    window.PAGE_RENDER=()=>{renderChrome("articles");wireGlobal();render();refreshSocial();};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
