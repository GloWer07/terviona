/* ============================================================
   Terviona — отзывы на девайсы (Supabase).
   Встраивает блок отзывов в модалку девайса (openModal в category.js),
   не трогая саму функцию: ловим появление .modal-ov через MutationObserver.
     · показываем одобренные (status='approved') отзывы + средний рейтинг
     · залогиненному даём форму (свой отзыв — создать/обновить/удалить)
     · гостю даём анонимную форму; запись всегда уходит на модерацию
   Привязка к девайсу: category (CUR_CAT) + deviceSlug(имя).
   Если Supabase не настроен — блок не рисуется.
   ============================================================ */
'use strict';

(function () {
  const Auth = window.TervAuth;
  const cfg = window.SUPABASE_CONFIG || {};
  const CONFIGURED = !!(cfg.url && cfg.anonKey &&
    !/YOUR-|YOUR_/.test(String(cfg.url) + String(cfg.anonKey)));
  if (!CONFIGURED) return;

  const L = {
    ru: { title:"Отзывы", none:"Пока нет отзывов. Будьте первым.",
      your:"Ваш отзыв", your_anon:"Анонимный отзыв", rating:"Оценка",
      placeholder:"Поделитесь опытом использования…", send:"Отправить", save:"Сохранить",
      del:"Удалить", pending:"Ваш отзыв на модерации.", sending:"Отправка…",
      err:"Не удалось сохранить. Попробуйте ещё раз.", loading:"Загрузка…",
      based:"на основе", reviews_n:"отзывов", too_short:"Отзыв слишком короткий.",
      confirm_del:"Удалить ваш отзыв?", anon:"Аноним",
      guest_note:"Имя и аккаунт не нужны · публикация после модерации",
      rate_limit:"Слишком много отправок. Попробуйте немного позже." },
    en: { title:"Reviews", none:"No reviews yet. Be the first.",
      your:"Your review", your_anon:"Anonymous review", rating:"Rating",
      placeholder:"Share your experience…", send:"Submit", save:"Save",
      del:"Delete", pending:"Your review is awaiting moderation.", sending:"Sending…",
      err:"Couldn't save. Please try again.", loading:"Loading…",
      based:"based on", reviews_n:"reviews", too_short:"Review is too short.",
      confirm_del:"Delete your review?", anon:"Anonymous",
      guest_note:"No name or account required · published after moderation",
      rate_limit:"Too many submissions. Please try again later." },
    uk: { title:"Відгуки", none:"Поки немає відгуків. Будьте першим.",
      your:"Ваш відгук", your_anon:"Анонімний відгук", rating:"Оцінка",
      placeholder:"Поділіться досвідом використання…", send:"Надіслати", save:"Зберегти",
      del:"Видалити", pending:"Ваш відгук на модерації.", sending:"Надсилання…",
      err:"Не вдалося зберегти. Спробуйте ще раз.", loading:"Завантаження…",
      based:"на основі", reviews_n:"відгуків", too_short:"Відгук занадто короткий.",
      confirm_del:"Видалити ваш відгук?", anon:"Анонім",
      guest_note:"Ім’я та акаунт не потрібні · публікація після модерації",
      rate_limit:"Забагато надсилань. Спробуйте трохи пізніше." },
  };
  function lang(){ return (window.LANG && L[window.LANG]) ? window.LANG : "ru"; }
  function tr(k){
    const gk = "rev_" + k;
    if (window.I18N && window.I18N[lang()] && window.I18N[lang()][gk]) return window.I18N[lang()][gk];
    return (L[lang()] && L[lang()][k]) || k;
  }
  const esc = (s) => (window.escapeHTML ? window.escapeHTML(s) : String(s == null ? "" : s));

  // стабильный slug девайса из имени (== колонка device_slug в БД)
  function deviceSlug(name){
    return String(name || "").toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");
  }
  window.deviceSlug = deviceSlug;

  function currentCategory(){
    try { if (typeof CUR_CAT !== "undefined" && CUR_CAT) return CUR_CAT; } catch(e){}
    return window.CUR_CAT || "";
  }
  function fmtDate(iso){
    try {
      return new Date(iso).toLocaleDateString(
        lang() === "en" ? "en-GB" : (lang() === "uk" ? "uk-UA" : "ru-RU"),
        { day: "numeric", month: "short", year: "numeric" });
    } catch(e){ return ""; }
  }
  function stars(n, interactive){
    n = Math.round(n || 0);
    let h = "";
    for (let i = 1; i <= 5; i++){
      const on = i <= n ? "on" : "";
      h += interactive
        ? `<button type="button" class="rv-star ${on}" data-v="${i}" aria-label="${i}">★</button>`
        : `<span class="rv-star ${on}">★</span>`;
    }
    return h;
  }

  // ---------------------------------------------------- монтирование в модалку
  async function mount(modal){
    if (!modal || modal.querySelector(".rv-block")) return;
    const nameEl = modal.querySelector(".modal-name");
    if (!nameEl) return;
    const deviceName = nameEl.textContent.trim();
    const category = currentCategory();
    const slug = deviceSlug(deviceName);
    if (!category || !slug) return;

    const block = document.createElement("div");
    block.className = "rv-block";
    block.innerHTML = `<div class="rv-head"><h3>${esc(tr("title"))}</h3>
      <span class="rv-summary mut3" id="rvSummary"></span></div>
      <div class="rv-compose" id="rvCompose"></div>
      <div class="rv-list" id="rvList"><div class="rv-empty mut3">${esc(tr("loading"))}</div></div>`;

    const anchor = modal.querySelector(".dd-actions");
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(block, anchor.nextSibling);
    else modal.appendChild(block);

    const ctx = { modal, block, category, slug, deviceName, mine: null, draftRating: 5 };
    await refresh(ctx);

    // перерисовываем композер при логине/логауте, пока модалка в DOM
    if (Auth && Auth.onChange){
      const sub = Auth.onChange(async () => {
        if (!document.body.contains(block)){
          if (Auth._subs) Auth._subs = Auth._subs.filter(f => f !== sub);
          return;
        }
        await refresh(ctx);
      });
    }
  }

  async function refresh(ctx){
    await loadMine(ctx);
    await loadList(ctx);
    renderCompose(ctx);
  }

  async function loadList(ctx){
    const listEl = ctx.block.querySelector("#rvList");
    const sumEl = ctx.block.querySelector("#rvSummary");
    try {
      const { data, error } = await Auth.client
        .from("reviews")
        .select("id, user_id, rating, body, status, created_at, profiles(username,avatar_url,public_id)")
        .eq("category", ctx.category).eq("device_slug", ctx.slug)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const approved = data || [];
      const mineIsListed = ctx.mine && approved.some(r => r.id === ctx.mine.id);
      const ownPending = ctx.mine && !mineIsListed ? [{
        ...ctx.mine,
        profiles: {
          username: (Auth.profile && Auth.profile.username) || (Auth.user.email || "").split("@")[0],
          avatar_url: Auth.profile && Auth.profile.avatar_url,
          public_id: Auth.profile && Auth.profile.public_id
        }
      }] : [];
      const rows = ownPending.concat(approved);
      if (!rows.length){
        listEl.innerHTML = `<div class="rv-empty mut3">${esc(tr("none"))}</div>`;
        sumEl.textContent = "";
        return;
      }
      if (approved.length){
        const avg = approved.reduce((a, r) => a + (r.rating || 0), 0) / approved.length;
        sumEl.innerHTML = `<span class="rv-stars sm">${stars(avg, false)}</span>` +
          `<b class="num">${avg.toFixed(1)}</b> · ${approved.length} ${esc(tr("reviews_n"))}`;
      } else sumEl.textContent = "";
      const roleMap = {};
      const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))];
      if (userIds.length){
        try {
          const { data: roleRows } = await Auth.client.from("profile_roles")
            .select("user_id,role_definitions(key,label,emoji,color)").in("user_id",userIds);
          (roleRows || []).forEach(x => {
            if (!x.role_definitions) return;
            (roleMap[x.user_id] || (roleMap[x.user_id]=[])).push(x.role_definitions);
          });
        } catch(roleError){ console.warn("[reviews] roles", roleError); }
      }
      listEl.innerHTML = rows.map(r => {
        const nm = (r.profiles && r.profiles.username) || tr("anon");
        const anonymous = !r.user_id;
        const own = !!(Auth && Auth.user && r.user_id === Auth.user.id);
        const pending = own && r.status === "pending";
        const profileId = r.profiles && r.profiles.public_id;
        const profileHref = profileId ? profilePath(profileId) : "";
        const avatar = r.profiles && r.profiles.avatar_url
          ? `<img src="${esc(r.profiles.avatar_url)}" alt="">` : esc((nm[0]||"?").toUpperCase());
        const badges = (roleMap[r.user_id] || []).map(role => roleMarkHTML(role,"rv-role")).join("");
        return `<div class="rv-item">
          <div class="rv-item-top">
            <div class="rv-author">
              ${profileHref ? `<a class="rv-profile-link" href="${profileHref}"><span class="rv-ava${anonymous ? " anon" : ""}">${avatar}</span><span class="rv-nm">${esc(nm)}</span></a>` : `<span class="rv-profile-link"><span class="rv-ava${anonymous ? " anon" : ""}">${avatar}</span><span class="rv-nm">${esc(nm)}</span></span>`}
              ${badges ? `<span class="rv-role-list">${badges}</span>` : ""}
            </div>
            <span class="rv-stars sm rv-review-rating">${stars(r.rating, false)}</span>
            <div class="rv-review-meta">
              ${pending ? `<span class="rv-own-status mut3">${esc(tr("pending"))}</span>` : ""}
              <span class="rv-date mut3 num">${esc(fmtDate(r.created_at))}</span>
              ${own ? `<button type="button" class="rv-item-del" data-rv-delete="${esc(r.id)}" aria-label="${esc(tr("del"))}" title="${esc(tr("del"))}">×</button>` : ""}
            </div>
          </div>
          <p class="rv-body">${esc(r.body)}</p>
        </div>`;
      }).join("");
      listEl.querySelectorAll("[data-rv-delete]").forEach(btn =>
        btn.addEventListener("click", () => remove(ctx)));
    } catch(e){
      console.error("[reviews] list", e);
      listEl.innerHTML = `<div class="rv-empty mut3">${esc(tr("none"))}</div>`;
    }
  }

  async function loadMine(ctx){
    ctx.mine = null;
    if (!Auth || !Auth.user) return;
    try {
      const { data, error } = await Auth.client
        .from("reviews")
        .select("id, user_id, rating, body, status, created_at")
        .eq("user_id", Auth.user.id)
        .eq("category", ctx.category).eq("device_slug", ctx.slug)
        .maybeSingle();
      if (error) throw error;
      ctx.mine = data || null;
    } catch(e){ console.error("[reviews] mine", e); }
  }

  function renderCompose(ctx){
    const host = ctx.block.querySelector("#rvCompose");
    if (!host) return;

    const guest = !Auth || !Auth.user;
    if (ctx.draftRating == null) ctx.draftRating = 5;

    host.innerHTML = `<div class="rv-form">
      <div class="rv-form-top"><span class="rv-lbl">${esc(tr(guest ? "your_anon" : "your"))}</span>
        <span class="rv-stars pick" id="rvPick">${stars(ctx.draftRating, true)}</span></div>
      <textarea id="rvText" class="rv-text" maxlength="4000" placeholder="${esc(tr("placeholder"))}"></textarea>
      <input class="rv-hp" id="rvWebsite" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      ${guest && cfg.turnstileSiteKey ? '<div class="cf-turnstile" id="rvCaptcha"></div>' : ''}
      <div class="rv-msg" id="rvMsg" hidden></div>
      <div class="rv-actions">
        <button class="buy-btn rv-send" id="rvSend">${esc(tr("send"))}</button>
        ${guest ? `<span class="rv-pending rv-guest-note mut3">${esc(tr("guest_note"))}</span>` :
          ""}
      </div></div>`;

    host.querySelectorAll("#rvPick .rv-star").forEach(st => {
      st.addEventListener("click", () => {
        ctx.draftRating = +st.dataset.v;
        host.querySelectorAll("#rvPick .rv-star").forEach(x =>
          x.classList.toggle("on", +x.dataset.v <= ctx.draftRating));
      });
    });
    if (guest && cfg.turnstileSiteKey) mountTurnstile(ctx);
    const send = host.querySelector("#rvSend");
    if (send) send.addEventListener("click", () => submit(ctx));
  }

  function loadTurnstile(){
    if (window.turnstile) return Promise.resolve();
    if (window.__tervionaTurnstile) return window.__tervionaTurnstile;
    window.__tervionaTurnstile = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.defer = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.__tervionaTurnstile;
  }

  async function mountTurnstile(ctx){
    try {
      await loadTurnstile();
      const target = ctx.block.querySelector("#rvCaptcha");
      if (!target || !window.turnstile) return;
      ctx.turnstileWidget = window.turnstile.render(target, {
        sitekey: cfg.turnstileSiteKey,
        callback: token => { ctx.turnstileToken = token; },
        "expired-callback": () => { ctx.turnstileToken = ""; },
        "error-callback": () => { ctx.turnstileToken = ""; },
      });
    } catch(e){ console.error("[reviews] turnstile", e); }
  }

  function msg(ctx, kind, text){
    const el = ctx.block.querySelector("#rvMsg");
    if (!el) return;
    el.hidden = false; el.textContent = text;
    el.className = "rv-msg " + (kind === "ok" ? "ok" : "err");
  }

  async function submit(ctx){
    const ta = ctx.block.querySelector("#rvText");
    const body = (ta && ta.value || "").trim();
    if (body.length < 3){ msg(ctx, "err", tr("too_short")); return; }
    const btn = ctx.block.querySelector("#rvSend");
    if (btn){ btn.disabled = true; btn.textContent = tr("sending"); }
    try {
      const guest = !Auth || !Auth.user;
      if (guest){
        if (!ctx.turnstileToken){ msg(ctx, "err", tr("err")); return; }
        const endpoint = cfg.reviewEndpoint || "/admin/api/public/reviews";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            category: ctx.category,
            device_slug: ctx.slug,
            device_name: ctx.deviceName,
            rating: ctx.draftRating,
            body,
            website: (ctx.block.querySelector("#rvWebsite") || {}).value || "",
            turnstile_token: ctx.turnstileToken,
          }),
        });
        const answer = await response.json().catch(() => ({}));
        if (!response.ok){
          const error = new Error(answer.message || answer.error || "anonymous review failed");
          error.code = answer.error;
          throw error;
        }
        ctx.draftRating = 5;
        renderCompose(ctx);
        msg(ctx, "ok", tr("pending"));
        return;
      }

      const endpoint = cfg.reviewEndpoint || "/admin/api/public/reviews";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json",
          ...(Auth.accessToken ? { "Authorization": `Bearer ${Auth.accessToken}` } : {}) },
        body: JSON.stringify({ category: ctx.category, device_slug: ctx.slug,
          device_name: ctx.deviceName, rating: ctx.draftRating, body }),
      });
      const answer = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(answer.error || "review failed"), { code: answer.error });
      // upsert по уникальному (user_id, category, device_slug):
      // повторная отправка обновляет свой отзыв и возвращает его на модерацию
      ctx.draftRating = 5;
      await loadMine(ctx);
      await loadList(ctx);
      renderCompose(ctx);
      msg(ctx, "ok", tr("pending"));
    } catch(e){
      console.error("[reviews] submit", e);
      msg(ctx, "err", tr(e && e.code === "rate_limited" ? "rate_limit" : "err"));
      if (btn){ btn.disabled = false; btn.textContent = tr("send"); }
    }
  }

  async function remove(ctx){
    if (!ctx.mine) return;
    if (!window.confirm(tr("confirm_del"))) return;
    try {
      const { error } = await Auth.client.from("reviews").delete().eq("id", ctx.mine.id);
      if (error) throw error;
      ctx.mine = null; ctx.draftRating = 5;
      await loadList(ctx);
      renderCompose(ctx);
    } catch(e){ console.error("[reviews] delete", e); msg(ctx, "err", tr("err")); }
  }

  // ---------------------------------------------------- ловим модалку девайса
  function scan(node){
    if (!(node instanceof HTMLElement)) return;
    if (node.classList && node.classList.contains("modal-ov") && !node.classList.contains("auth-ov")){
      const modal = node.querySelector(".modal:not(.auth-modal)");
      if (modal) mount(modal);
    }
  }
  const mo = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes && m.addedNodes.forEach(scan));
  });
  // Language switched while a device modal is open: the block was mounted in the
  // old language and won't re-mount on its own (the observer only fires for NEW
  // modals). Drop the stale block and re-mount so its labels follow window.LANG.
  // We listen to BOTH the dedicated lang event and the generic chrome re-render
  // (both fire on setLang); a guard re-mounts only when the language truly changed.
  let lastLang = (window.LANG || "ru");
  function relangOpenModals(){
    const cur = (window.LANG || "ru");
    if (cur === lastLang) return;
    lastLang = cur;
    document.querySelectorAll(".modal-ov:not(.auth-ov) .modal:not(.auth-modal)").forEach(modal => {
      const old = modal.querySelector(".rv-block");
      if (old) old.remove();
      mount(modal);
    });
  }
  window.addEventListener("terviona:lang", relangOpenModals);
  window.addEventListener("terviona:chrome", relangOpenModals);
  function start(){
    mo.observe(document.body, { childList: true });
    // модалка могла открыться до старта наблюдателя
    document.querySelectorAll(".modal-ov:not(.auth-ov)").forEach(scan);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})();
