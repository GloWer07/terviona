/* ============================================================
   Terviona — авторизация (Supabase Auth).
   Работает на всех страницах. Даёт:
     · window.TervAuth — общий объект: client, user, helpers, события
     · кнопку аккаунта в шапке (рядом с настройками/языком)
     · модалку входа / регистрации
   Если ключи в supabase-config.js не заполнены — тихо выключается,
   сайт продолжает работать без авторизации.
   Зависит от глобалей app.js: escapeHTML(), window.LANG, window.I18N.
   ============================================================ */
'use strict';

(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const CONFIGURED = !!(cfg.url && cfg.anonKey &&
    !/YOUR-|YOUR_/.test(String(cfg.url) + String(cfg.anonKey)));

  // локальные строки — работают даже без ключей в i18n.js.
  const L = {
    ru: { account:"Аккаунт", profile:"Профиль", login:"Войти", register:"Регистрация", logout:"Выйти",
      email:"Email", password:"Пароль", username:"Никнейм",
      have:"Уже есть аккаунт? Войти", need:"Нет аккаунта? Зарегистрироваться",
      submit_login:"Войти", submit_reg:"Создать аккаунт",
      wait:"Секунду…", check_email:"Готово. Проверьте почту для подтверждения.",
      bad_cred:"Неверный email или пароль.", exists:"Такой email уже зарегистрирован.",
      weak:"Пароль слишком короткий (мин. 6 символов).",
      uname_short:"Никнейм: от 2 до 32 символов.", err:"Ошибка. Попробуйте ещё раз." },
    en: { account:"Account", profile:"Profile", login:"Log in", register:"Sign up", logout:"Log out",
      email:"Email", password:"Password", username:"Username",
      have:"Already have an account? Log in", need:"No account? Sign up",
      submit_login:"Log in", submit_reg:"Create account",
      wait:"One sec…", check_email:"Done. Check your email to confirm.",
      bad_cred:"Wrong email or password.", exists:"This email is already registered.",
      weak:"Password too short (min 6 characters).",
      uname_short:"Username: 2–32 characters.", err:"Something went wrong. Try again." },
    uk: { account:"Акаунт", profile:"Профіль", login:"Увійти", register:"Реєстрація", logout:"Вийти",
      email:"Email", password:"Пароль", username:"Нікнейм",
      have:"Вже є акаунт? Увійти", need:"Немає акаунта? Зареєструватися",
      submit_login:"Увійти", submit_reg:"Створити акаунт",
      wait:"Секунду…", check_email:"Готово. Перевірте пошту для підтвердження.",
      bad_cred:"Невірний email або пароль.", exists:"Такий email вже зареєстровано.",
      weak:"Пароль закороткий (мін. 6 символів).",
      uname_short:"Нікнейм: від 2 до 32 символів.", err:"Помилка. Спробуйте ще раз." },
  };
  function lang(){ return (window.LANG && L[window.LANG]) ? window.LANG : "ru"; }
  function tr(k){
    const gk = "auth_" + k;
    if (window.I18N && window.I18N[lang()] && window.I18N[lang()][gk]) return window.I18N[lang()][gk];
    return (L[lang()] && L[lang()][k]) || k;
  }
  const esc = (s) => (window.escapeHTML ? window.escapeHTML(s) : String(s == null ? "" : s));

  // --------------------------------------------------- публичный объект
  const Auth = {
    client: null,
    user: null,       // { id, email }
    accessToken: null,
    profile: null,    // { username, avatar_url, public_id, bio }
    ready: false,
    configured: CONFIGURED,
    _subs: [],
    onChange(fn){ this._subs.push(fn); if (this.ready) { try { fn(this.user); } catch(e){} } return fn; },
    _emit(){ this._subs.forEach(fn => { try { fn(this.user); } catch(e){ console.error(e); } }); },
    openAuth(mode){ openAuthModal(mode || "login"); },
  };
  window.TervAuth = Auth;

  // --------------------------------------------------- загрузка SDK
  function loadSDK(){
    return new Promise((resolve, reject) => {
      if (window.supabase && window.supabase.createClient) return resolve();
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js";
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error("supabase sdk load failed"));
      document.head.appendChild(s);
    });
  }

  async function init(){
    if (!CONFIGURED){
      Auth.ready = true; Auth._emit();
      console.info("[TervAuth] Supabase не настроен (заполни js/supabase-config.js) — авторизация выключена.");
      return;
    }
    try { await loadSDK(); }
    catch(e){ console.error(e); Auth.ready = true; Auth._emit(); return; }

    Auth.client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });

    try {
      const { data: { session } } = await Auth.client.auth.getSession();
      await applySession(session);
    } catch(e){ console.error(e); }

    Auth.client.auth.onAuthStateChange(async (_evt, sess) => {
      await applySession(sess);
      renderAccountUI();
      Auth._emit();
    });

    Auth.ready = true;
    renderAccountUI();
    Auth._emit();
  }

  async function applySession(session){
    if (session && session.user){
      Auth.user = { id: session.user.id, email: session.user.email };
      Auth.accessToken = session.access_token || null;
      try {
        const { data } = await Auth.client
          .from("profiles").select("username, avatar_url, public_id, bio").eq("id", Auth.user.id).single();
        Auth.profile = data || null;
      } catch(e){ Auth.profile = null; }
    } else {
      Auth.user = null; Auth.accessToken = null; Auth.profile = null;
    }
  }

  // --------------------------------------------------- UI: кнопка в шапке
  function displayName(){
    if (Auth.profile && Auth.profile.username) return Auth.profile.username;
    if (Auth.user && Auth.user.email) return Auth.user.email.split("@")[0];
    return "";
  }

  function avatarMarkup(name, large){
    const cls = "acc-ava" + (large ? " lg" : "");
    if (Auth.profile && Auth.profile.avatar_url){
      return `<span class="${cls}"><img src="${esc(Auth.profile.avatar_url)}" alt=""></span>`;
    }
    return `<span class="${cls}">${esc((name[0]||"?").toUpperCase())}</span>`;
  }

  // рисуем кнопку аккаунта в .nav-right; вызывается после каждого renderChrome.
  function renderAccountUI(){
    const right = document.querySelector(".nav-right");
    if (!right || !CONFIGURED) return;
    let host = right.querySelector(".acc-wrap");
    if (!host){
      host = document.createElement("div");
      host.className = "pop-sel acc-wrap";
      right.appendChild(host);
    }
    if (Auth.user){
      const name = displayName();
      const profileHref = Auth.profile && Auth.profile.public_id
        ? profilePath(Auth.profile.public_id) : profilePath();
      host.innerHTML =
        `<button class="acc-btn" id="accBtn" aria-label="${esc(tr('account'))}">` +
          avatarMarkup(name, false) +
          `<span class="acc-name">${esc(name)}</span><span class="acc-caret" aria-hidden="true">▾</span></button>` +
        `<div class="pop-menu acc-menu" id="accMenu">` +
          `<div class="acc-head">${avatarMarkup(name, true)}` +
            `<div><div class="acc-nm">${esc(name)}</div>` +
            `<div class="acc-em mut3">${esc(Auth.user.email||"")}</div></div></div>` +
          `<a class="acc-menu-link" href="${profileHref}">${esc(tr('profile'))}</a>` +
          `<button data-acc="logout">${esc(tr('logout'))}</button>` +
        `</div>`;
      wirePopLocal("accBtn","accMenu");
      const lo = host.querySelector('[data-acc="logout"]');
      if (lo) lo.addEventListener("click", async () => { await Auth.client.auth.signOut(); });
    } else {
      host.innerHTML = `<button class="lang-btn acc-login" id="accLoginBtn">${esc(tr('login'))}</button>`;
      const b = host.querySelector("#accLoginBtn");
      if (b) b.addEventListener("click", () => openAuthModal("login"));
    }
  }

  // локальный аналог wirePop из app.js (не завязываемся на порядок загрузки)
  function wirePopLocal(btnId, menuId){
    const b = document.getElementById(btnId), m = document.getElementById(menuId);
    if (!b || !m) return;
    b.addEventListener("click", e => {
      e.stopPropagation();
      document.querySelectorAll(".pop-menu.open").forEach(x => { if (x !== m) x.classList.remove("open"); });
      m.classList.toggle("open");
    });
    m.addEventListener("click", e => e.stopPropagation());
    document.addEventListener("click", () => m.classList.remove("open"));
  }

  // --------------------------------------------------- модалка входа/регистрации
  let mode = "login";
  function openAuthModal(m){
    mode = m || "login";
    closeAuthModal();
    const ov = document.createElement("div");
    ov.className = "modal-ov auth-ov"; ov.id = "authOv";
    ov.innerHTML = `<div class="modal auth-modal" role="dialog" aria-modal="true">
      <button class="modal-x" id="authX" aria-label="✕">✕</button>
      <div class="auth-head"><span class="brand-txt auth-logo">Terviona</span>
        <h3 id="authTitle"></h3></div>
      <form id="authForm" class="auth-form" novalidate>
        <label class="auth-field" data-reg>
          <span>${esc(tr('username'))}</span>
          <input type="text" name="username" autocomplete="username" maxlength="32">
        </label>
        <label class="auth-field">
          <span>${esc(tr('email'))}</span>
          <input type="email" name="email" autocomplete="email" required>
        </label>
        <label class="auth-field">
          <span>${esc(tr('password'))}</span>
          <input type="password" name="password" autocomplete="current-password" required minlength="6">
        </label>
        <div class="auth-msg" id="authMsg" hidden></div>
        <button type="submit" class="buy-btn auth-submit" id="authSubmit"></button>
      </form>
      <button class="auth-switch" id="authSwitch"></button>
    </div>`;
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => ov.classList.add("open"));

    ov.addEventListener("click", e => { if (e.target === ov) closeAuthModal(); });
    ov.querySelector("#authX").addEventListener("click", closeAuthModal);
    document.addEventListener("keydown", escClose);
    ov.querySelector("#authSwitch").addEventListener("click", () => {
      mode = mode === "login" ? "register" : "login"; syncModal();
    });
    ov.querySelector("#authForm").addEventListener("submit", onSubmit);
    syncModal();
    setTimeout(() => { const f = ov.querySelector(mode === "register" ? '[name=username]' : '[name=email]'); if (f) f.focus(); }, 60);
  }
  function escClose(e){ if (e.key === "Escape") closeAuthModal(); }
  function closeAuthModal(){
    const ov = document.getElementById("authOv");
    if (!ov) return;
    document.removeEventListener("keydown", escClose);
    ov.classList.remove("open");
    document.body.style.overflow = "";
    setTimeout(() => ov.remove(), 200);
  }
  function syncModal(){
    const ov = document.getElementById("authOv"); if (!ov) return;
    const reg = mode === "register";
    ov.querySelector("#authTitle").textContent = reg ? tr("register") : tr("login");
    ov.querySelector("#authSubmit").textContent = reg ? tr("submit_reg") : tr("submit_login");
    ov.querySelector("#authSwitch").textContent = reg ? tr("have") : tr("need");
    ov.querySelector("[data-reg]").style.display = reg ? "" : "none";
    ov.querySelector('[name=username]').required = reg;
    ov.querySelector('[name=password]').setAttribute("autocomplete", reg ? "new-password" : "current-password");
    const msg = ov.querySelector("#authMsg"); msg.hidden = true; msg.textContent = "";
  }
  function showMsg(kind, text){
    const msg = document.getElementById("authMsg"); if (!msg) return;
    msg.hidden = false; msg.textContent = text;
    msg.className = "auth-msg " + (kind === "ok" ? "ok" : "err");
  }

  async function onSubmit(e){
    e.preventDefault();
    if (!Auth.client) { showMsg("err", tr("err")); return; }
    const f = e.target;
    const email = f.email.value.trim();
    const password = f.password.value;
    const username = (f.username.value || "").trim().replace(/\s+/g, " ");
    const btn = document.getElementById("authSubmit");
    const reg = mode === "register";

    if (password.length < 6){ showMsg("err", tr("weak")); return; }
    if (reg && (Array.from(username).length < 2 || Array.from(username).length > 32 || /[\u0000-\u001f\u007f/\\@?#%]/u.test(username))){ showMsg("err", tr("uname_short")); return; }

    btn.disabled = true; const old = btn.textContent; btn.textContent = tr("wait");
    try {
      if (reg){
        const { data, error } = await Auth.client.auth.signUp({
          email, password, options: { data: { username } },
        });
        if (error) throw error;
        // если email-подтверждение включено — сессии сразу нет
        if (!data.session){ showMsg("ok", tr("check_email")); btn.disabled = false; btn.textContent = old; return; }
        closeAuthModal();
      } else {
        const { error } = await Auth.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        closeAuthModal();
      }
    } catch(err){
      const m = (err && err.message || "").toLowerCase();
      if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) showMsg("err", tr("exists"));
      else if (m.includes("invalid login") || m.includes("invalid credentials")) showMsg("err", tr("bad_cred"));
      else showMsg("err", err && err.message ? err.message : tr("err"));
      btn.disabled = false; btn.textContent = old;
    }
  }

  // при смене языка перерисовываем кнопку (app.js вызывает setLang -> renderChrome)
  window.addEventListener("terviona:chrome", renderAccountUI);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
