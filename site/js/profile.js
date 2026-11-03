/* Terviona public profiles: editing, follows, roles, owned gear and review analytics. */
'use strict';

(function () {
  const Auth = window.TervAuth;
  const root = document.getElementById('profileRoot');
  if (!root) return;

  const COPY = {
    ru: {
      loading:'Загрузка профиля…', unavailable:'Профили пока не подключены', loginRequired:'Войдите, чтобы открыть свой профиль', migration:'Примените файл profile-system-migration.sql в Supabase, затем обновите страницу.', notFound:'Профиль не найден.',
      profile:'Профиль', edit:'Редактировать профиль', follow:'Подписаться', following:'Вы подписаны', followers:'подписчиков', follows:'подписок', member:'участник с',
      bioEmpty:'Описание пока не добавлено.', gear:'Девайсы', gearSub:'Техника, на которую пользователь написал отзыв', addGear:'Добавить девайс', noGear:'Пока нет добавленных девайсов.',
      review:'Отзыв', reviews:'Отзывы', reviewsSub:'Распределение оценок и все опубликованные отзывы', total:'Всего', all:'Все', noReviews:'Отзывов с такой оценкой пока нет.',
      pending:'На модерации', rejected:'Отклонён', openDevice:'Открыть девайс', remove:'Удалить',
      editTitle:'Настройка профиля', avatar:'Аватар', avatarHint:'JPG, PNG, WebP или GIF — до 3 МБ', username:'Никнейм', nickHint:'2–32 символа. Можно использовать кириллицу, латиницу, цифры, пробелы, _ и -.', nickChecking:'Проверяем ник…', nickAvailable:'Ник свободен', nickTaken:'Этот ник уже занят', nickInvalid:'Введите корректный ник длиной от 2 до 32 символов.', bio:'Описание', bioHint:'До 320 символов', cancel:'Отмена', save:'Сохранить', saving:'Сохраняем…', saved:'Профиль обновлён.',
      addTitle:'Добавить в мои девайсы', chooseReview:'Выберите девайс, на который уже написан отзыв.', noEligible:'Все девайсы с вашими отзывами уже добавлены.', add:'Добавить',
      login:'Войдите в аккаунт, чтобы подписаться.', error:'Не удалось выполнить действие. Попробуйте ещё раз.', invalidImage:'Выберите изображение JPG, PNG, WebP или GIF размером до 3 МБ.', confirmRemove:'Удалить девайс из профиля?'
    },
    en: {
      loading:'Loading profile…', unavailable:'Profiles are not connected yet', loginRequired:'Log in to open your profile', migration:'Apply profile-system-migration.sql in Supabase, then refresh this page.', notFound:'Profile not found.',
      profile:'Profile', edit:'Edit profile', follow:'Follow', following:'Following', followers:'followers', follows:'following', member:'member since',
      bioEmpty:'No bio yet.', gear:'Gear', gearSub:'Devices this member has reviewed', addGear:'Add device', noGear:'No devices added yet.',
      review:'Review', reviews:'Reviews', reviewsSub:'Rating distribution and published reviews', total:'Total', all:'All', noReviews:'No reviews with this rating yet.',
      pending:'Pending moderation', rejected:'Rejected', openDevice:'Open device', remove:'Remove',
      editTitle:'Edit profile', avatar:'Avatar', avatarHint:'JPG, PNG, WebP or GIF — up to 3 MB', username:'Username', nickHint:'2–32 characters. Letters, numbers, spaces, _ and - are allowed.', nickChecking:'Checking username…', nickAvailable:'Username is available', nickTaken:'This username is already taken', nickInvalid:'Enter a valid username between 2 and 32 characters.', bio:'Bio', bioHint:'Up to 320 characters', cancel:'Cancel', save:'Save', saving:'Saving…', saved:'Profile updated.',
      addTitle:'Add to my gear', chooseReview:'Choose a device you have already reviewed.', noEligible:'All reviewed devices have already been added.', add:'Add',
      login:'Log in to follow this account.', error:'Could not complete the action. Try again.', invalidImage:'Choose a JPG, PNG, WebP or GIF image up to 3 MB.', confirmRemove:'Remove this device from your profile?'
    },
    uk: {
      loading:'Завантаження профілю…', unavailable:'Профілі ще не підключено', loginRequired:'Увійдіть, щоб відкрити свій профіль', migration:'Застосуйте profile-system-migration.sql у Supabase та оновіть сторінку.', notFound:'Профіль не знайдено.',
      profile:'Профіль', edit:'Редагувати профіль', follow:'Підписатися', following:'Ви підписані', followers:'підписників', follows:'підписок', member:'учасник з',
      bioEmpty:'Опис ще не додано.', gear:'Девайси', gearSub:'Техніка, на яку користувач написав відгук', addGear:'Додати девайс', noGear:'Поки немає доданих девайсів.',
      review:'Відгук', reviews:'Відгуки', reviewsSub:'Розподіл оцінок і всі опубліковані відгуки', total:'Усього', all:'Усі', noReviews:'Відгуків із такою оцінкою ще немає.',
      pending:'На модерації', rejected:'Відхилено', openDevice:'Відкрити девайс', remove:'Видалити',
      editTitle:'Налаштування профілю', avatar:'Аватар', avatarHint:'JPG, PNG, WebP або GIF — до 3 МБ', username:'Нікнейм', nickHint:'2–32 символи. Можна використовувати кирилицю, латиницю, цифри, пробіли, _ та -.', nickChecking:'Перевіряємо нік…', nickAvailable:'Нік вільний', nickTaken:'Цей нік уже зайнятий', nickInvalid:'Введіть коректний нік довжиною від 2 до 32 символів.', bio:'Опис', bioHint:'До 320 символів', cancel:'Скасувати', save:'Зберегти', saving:'Зберігаємо…', saved:'Профіль оновлено.',
      addTitle:'Додати до моїх девайсів', chooseReview:'Оберіть девайс, на який уже написано відгук.', noEligible:'Усі девайси з вашими відгуками вже додано.', add:'Додати',
      login:'Увійдіть в акаунт, щоб підписатися.', error:'Не вдалося виконати дію. Спробуйте ще раз.', invalidImage:'Оберіть JPG, PNG, WebP або GIF до 3 МБ.', confirmRemove:'Видалити девайс із профілю?'
    }
  };

  const state = { profile:null, roles:[], followers:0, following:0, isFollowing:false, gear:[], reviews:[], filter:0, own:false };
  const lang = () => COPY[window.LANG] ? window.LANG : 'ru';
  const tr = key => COPY[lang()][key] || key;
  const esc = value => window.escapeHTML ? window.escapeHTML(value == null ? '' : value) : String(value == null ? '' : value);
  const fmtDate = value => new Intl.DateTimeFormat(lang()==='uk'?'uk-UA':lang()==='en'?'en-GB':'ru-RU', {year:'numeric', month:'short', day:'numeric'}).format(new Date(value));
  const categoryName = key => typeof CATEGORIES !== 'undefined' && CATEGORIES[key] ? catLabel(key) : String(key || '').replaceAll('_',' ');
  const stars = n => `<span class="profile-stars" aria-label="${n} / 5">${[1,2,3,4,5].map(x=>`<span class="${x<=n?'on':''}" aria-hidden="true">★</span>`).join('')}</span>`;

  function waitForAuth(){
    return new Promise(resolve => {
      if (Auth && Auth.ready) return resolve();
      if (!Auth) return resolve();
      const fn = Auth.onChange(() => { if (Auth.ready) resolve(); });
      setTimeout(() => resolve(), 6000);
    });
  }

  async function init(){
    await initGeoDefaults();
    initTheme(); renderChrome('profile'); applyStaticI18n(); wireGlobal();
    root.innerHTML = `<div class="profile-loading"><span class="profile-loader" aria-hidden="true"></span><span>${esc(tr('loading'))}</span></div>`;
    await waitForAuth();
    if (!Auth || !Auth.client){ return renderUnavailable(); }
    const requested = routeFromPath().profileId || new URLSearchParams(location.search).get('id');
    if (!requested && !Auth.user){ Auth.openAuth('login'); return renderLoginRequired(); }
    try { await loadProfile(requested); }
    catch (error){
      console.error(error);
      const missing = /public_id|profile_roles|profile_follows|user_devices|schema cache/i.test(error.message || '');
      if (missing) renderUnavailable(); else renderError(tr('notFound'));
    }
  }

  function renderUnavailable(showMigration=true){
    root.innerHTML = `<section class="profile-state-card"><span class="profile-state-code mono">PROFILE::OFFLINE</span><h1>${esc(tr('unavailable'))}</h1>${showMigration?`<p>${esc(tr('migration'))}</p>`:''}</section>`;
  }
  function renderLoginRequired(){
    root.innerHTML = `<section class="profile-state-card"><span class="profile-state-code mono">PROFILE::AUTH</span><h1>${esc(tr('loginRequired'))}</h1></section>`;
  }
  function renderError(message){ root.innerHTML = `<section class="profile-state-card"><span class="profile-state-code mono">PROFILE::404</span><h1>${esc(message)}</h1></section>`; }

  async function loadProfile(requested){
    let query = Auth.client.from('profiles').select('id,public_id,username,avatar_url,bio,created_at');
    query = requested ? query.eq('public_id', requested) : query.eq('id', Auth.user.id);
    const { data, error } = await query.single();
    if (error) throw error;
    state.profile = data;
    state.own = !!(Auth.user && Auth.user.id === data.id);
    document.title = `${data.username} — Terviona`;
    const publicPath=profilePath(data.public_id);
    if(location.pathname!==publicPath || location.search) history.replaceState({},'',publicPath);
    syncCanonical(publicPath);
    const [roles, followerCount, followingCount, gear, reviews] = await Promise.all([
      loadRoles(data.id), countFollows('following_id', data.id), countFollows('follower_id', data.id), loadGear(data.id), loadReviews(data.id)
    ]);
    state.roles=roles; state.followers=followerCount; state.following=followingCount; state.gear=gear; state.reviews=reviews;
    if (Auth.user && !state.own){
      const { data: f } = await Auth.client.from('profile_follows').select('follower_id').eq('follower_id',Auth.user.id).eq('following_id',data.id).maybeSingle();
      state.isFollowing=!!f;
    }
    render();
  }

  async function loadRoles(userId){
    const { data, error } = await Auth.client.from('profile_roles').select('role_key,role_definitions(key,label,emoji,color)').eq('user_id',userId);
    if (error) throw error;
    return (data||[]).map(x=>x.role_definitions).filter(Boolean);
  }
  async function countFollows(column,userId){
    const { count, error } = await Auth.client.from('profile_follows').select('*',{count:'exact',head:true}).eq(column,userId);
    if (error) throw error; return count||0;
  }
  async function loadReviews(userId){
    const { data, error } = await Auth.client.from('reviews').select('id,category,device_slug,device_name,rating,body,status,created_at').eq('user_id',userId).order('created_at',{ascending:false});
    if (error) throw error; return data||[];
  }
  async function loadGear(userId){
    const { data, error } = await Auth.client.from('user_devices').select('id,category,device_slug,device_name,sort_order,created_at').eq('user_id',userId).order('sort_order').order('created_at');
    if (error) throw error; return data||[];
  }

  function avatar(profile, cls=''){
    if (profile.avatar_url) return `<span class="profile-avatar ${cls}"><img src="${esc(profile.avatar_url)}" alt="${esc(profile.username)}"></span>`;
    return `<span class="profile-avatar ${cls}" aria-hidden="true">${esc((profile.username[0]||'?').toUpperCase())}</span>`;
  }
  function roleBadges(){
    if (!state.roles.length) return '';
    return `<span class="profile-role-list">${state.roles.map(r=>roleMarkHTML(r,'profile-role')).join('')}</span>`;
  }
  function render(){
    const p=state.profile;
    root.innerHTML = `
      <section class="profile-hero" aria-labelledby="profileName">
        <div class="profile-signal mono" aria-hidden="true"><span>USER::${String(p.public_id).padStart(4,'0')}</span><i></i><span>STATUS::ONLINE</span></div>
        <div class="profile-identity">
          ${avatar(p,'xl')}
          <div class="profile-copy">
            <div class="profile-kicker mono">${esc(tr('profile'))} / ID #${esc(p.public_id)}</div>
            <div class="profile-name-line"><h1 id="profileName">${esc(p.username)}</h1>${roleBadges()}</div>
            <p class="profile-bio ${p.bio?'':'mut3'}">${esc(p.bio || tr('bioEmpty'))}</p>
            <div class="profile-meta">
              <span><b>${state.followers}</b> ${esc(tr('followers'))}</span>
              <span><b>${state.following}</b> ${esc(tr('follows'))}</span>
              <span>${esc(tr('member'))} ${esc(fmtDate(p.created_at))}</span>
            </div>
          </div>
          <div class="profile-actions">
            ${state.own?`<button class="profile-btn primary" id="editProfileBtn">${esc(tr('edit'))}</button>`:`<button class="profile-btn ${state.isFollowing?'active':''}" id="followBtn" aria-pressed="${state.isFollowing}">${esc(state.isFollowing?tr('following'):tr('follow'))}</button>`}
          </div>
        </div>
      </section>
      <section class="profile-panel" aria-labelledby="gearTitle">
        <div class="profile-section-head"><div><span class="profile-section-code mono">GEAR::RACK</span><h2 id="gearTitle">${esc(tr('gear'))}</h2><p>${esc(tr('gearSub'))}</p></div>${state.own?`<button class="profile-btn quiet" id="addGearBtn">＋ ${esc(tr('addGear'))}</button>`:''}</div>
        <div class="profile-gear-grid">${renderGear()}</div>
      </section>
      <section class="profile-panel profile-reviews" aria-labelledby="reviewsTitle">
        <div class="profile-section-head"><div><span class="profile-section-code mono">REVIEWS::SIGNAL</span><h2 id="reviewsTitle">${esc(tr('reviews'))}</h2><p>${esc(tr('reviewsSub'))}</p></div><div class="profile-total"><span>${esc(tr('total'))}</span><strong>${state.reviews.length}</strong></div></div>
        ${renderAnalytics()}
        <div class="profile-review-list" id="profileReviewList">${renderReviewList()}</div>
      </section>`;
    wire();
  }

  function renderGear(){
    if (!state.gear.length) return `<div class="profile-empty">${esc(tr('noGear'))}</div>`;
    return state.gear.map((g,index)=>{
      const rv=state.reviews.find(r=>r.category===g.category && r.device_slug===g.device_slug);
      return `<article class="gear-card">
        <div class="gear-index mono">${String(index+1).padStart(2,'0')}</div>
        <div class="gear-type mono">${esc(categoryName(g.category))}</div>
        <h3>${esc(g.device_name)}</h3>
        ${rv?`<div class="gear-rating">${stars(rv.rating)} <b>${rv.rating}.0</b>${rv.status!=='approved'?`<span class="profile-status ${rv.status}">${esc(rv.status==='pending'?tr('pending'):tr('rejected'))}</span>`:''}</div><p>${esc(rv.body)}</p>`:''}
        <div class="gear-card-actions"><a href="${categoryPath(g.category,g.device_name)}">${esc(tr('openDevice'))} →</a>${state.own?`<button data-remove-gear="${g.id}" aria-label="${esc(tr('remove'))}">×</button>`:''}</div>
      </article>`;
    }).join('');
  }

  function counts(){ return [1,2,3,4,5].map(r=>state.reviews.filter(x=>x.rating===r).length); }
  function renderAnalytics(){
    const c=counts(), max=Math.max(...c,1);
    return `<div class="review-distribution" role="group" aria-label="${esc(tr('reviews'))}">
      <button class="rating-total ${state.filter===0?'active':''}" data-rating="0"><span class="mono">ALL</span><strong>${state.reviews.length}</strong><small>${esc(tr('all'))}</small></button>
      ${[5,4,3,2,1].map(r=>`<button class="rating-cell ${state.filter===r?'active':''}" data-rating="${r}" aria-pressed="${state.filter===r}"><span class="rating-label">${r} ★</span><strong>${c[r-1]}</strong><span class="rating-track"><i style="--level:${(c[r-1]/max)*100}%"></i></span></button>`).join('')}
    </div>`;
  }
  function renderReviewList(){
    const list=state.filter?state.reviews.filter(r=>r.rating===state.filter):state.reviews;
    if (!list.length) return `<div class="profile-empty">${esc(tr('noReviews'))}</div>`;
    return list.map(r=>`<article class="profile-review-card">
      <div class="profile-review-top"><div><span class="profile-review-category mono">${esc(categoryName(r.category))}</span><h3><a href="${categoryPath(r.category,r.device_name)}">${esc(r.device_name)}</a></h3></div><div class="profile-review-score">${stars(r.rating)}<b>${r.rating}.0</b></div></div>
      <p>${esc(r.body)}</p><div class="profile-review-foot"><time datetime="${esc(r.created_at)}">${esc(fmtDate(r.created_at))}</time>${r.status!=='approved'?`<span class="profile-status ${r.status}">${esc(r.status==='pending'?tr('pending'):tr('rejected'))}</span>`:''}</div>
    </article>`).join('');
  }

  function wire(){
    document.getElementById('editProfileBtn')?.addEventListener('click',openEdit);
    document.getElementById('followBtn')?.addEventListener('click',toggleFollow);
    document.getElementById('addGearBtn')?.addEventListener('click',openGear);
    root.querySelectorAll('[data-remove-gear]').forEach(b=>b.addEventListener('click',()=>removeGear(b.dataset.removeGear)));
    root.querySelectorAll('[data-rating]').forEach(b=>b.addEventListener('click',()=>{
      state.filter=Number(b.dataset.rating); render(); document.getElementById('profileReviewList')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    }));
  }

  async function toggleFollow(){
    if (!Auth.user){ Auth.openAuth('login'); announce(tr('login'),'err'); return; }
    const b=document.getElementById('followBtn'); if(b)b.disabled=true;
    try{
      if(state.isFollowing){
        const {error}=await Auth.client.from('profile_follows').delete().eq('follower_id',Auth.user.id).eq('following_id',state.profile.id); if(error)throw error;
        state.isFollowing=false; state.followers=Math.max(0,state.followers-1);
      }else{
        const {error}=await Auth.client.from('profile_follows').insert({follower_id:Auth.user.id,following_id:state.profile.id}); if(error)throw error;
        state.isFollowing=true; state.followers++;
      }
      render();
    }catch(e){console.error(e);announce(tr('error'),'err'); if(b)b.disabled=false;}
  }

  function modalShell(content){
    closeModal();
    const ov=document.createElement('div'); ov.className='modal-ov profile-modal-ov'; ov.id='profileModal';
    ov.innerHTML=`<div class="modal profile-modal" role="dialog" aria-modal="true">${content}</div>`;
    document.body.appendChild(ov); document.body.style.overflow='hidden'; requestAnimationFrame(()=>ov.classList.add('open'));
    ov.addEventListener('click',e=>{if(e.target===ov)closeModal();});
    document.addEventListener('keydown',onModalKey); return ov;
  }
  function onModalKey(e){if(e.key==='Escape')closeModal();}
  function closeModal(){const ov=document.getElementById('profileModal');if(!ov)return;document.removeEventListener('keydown',onModalKey);ov.remove();document.body.style.overflow='';}

  function openEdit(){
    const p=state.profile;
    const ov=modalShell(`<button class="modal-x" data-close aria-label="${esc(tr('cancel'))}">×</button><span class="profile-section-code mono">PROFILE::CONFIG</span><h2>${esc(tr('editTitle'))}</h2>
      <form class="profile-edit-form" id="profileEditForm">
        <div class="avatar-editor"><div id="avatarPreview">${avatar(p,'edit')}</div><label class="profile-file"><span>${esc(tr('avatar'))}</span><input id="avatarFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><small>${esc(tr('avatarHint'))}</small></label></div>
        <label><span>${esc(tr('username'))}</span><input name="username" value="${esc(p.username)}" minlength="2" maxlength="32" autocomplete="nickname" aria-describedby="nickHint nickStatus" required><small id="nickHint">${esc(tr('nickHint'))}</small><small class="profile-nick-status" id="nickStatus" aria-live="polite"></small></label>
        <label><span>${esc(tr('bio'))}</span><textarea name="bio" maxlength="320" rows="5">${esc(p.bio||'')}</textarea><small><span id="bioCount">${(p.bio||'').length}</span>/320 · ${esc(tr('bioHint'))}</small></label>
        <div class="profile-form-msg" id="profileFormMsg" aria-live="polite"></div>
        <div class="profile-modal-actions"><button type="button" class="profile-btn quiet" data-close>${esc(tr('cancel'))}</button><button class="profile-btn primary" id="profileSaveBtn">${esc(tr('save'))}</button></div>
      </form>`);
    ov.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
    const bio=ov.querySelector('[name=bio]');bio.addEventListener('input',()=>ov.querySelector('#bioCount').textContent=bio.value.length);
    const nick=ov.querySelector('[name=username]'); let nickTimer=0, nickRequest=0;
    const checkNick=()=>{clearTimeout(nickTimer);const request=++nickRequest;const value=cleanNickname(nick.value);const status=ov.querySelector('#nickStatus');
      if(!validNickname(value)){setNickStatus(status,'err',tr('nickInvalid'));return;}
      setNickStatus(status,'checking',tr('nickChecking'));
      nickTimer=setTimeout(async()=>{try{const available=await nicknameAvailable(value);if(request!==nickRequest)return;setNickStatus(status,available?'ok':'err',tr(available?'nickAvailable':'nickTaken'));}catch(error){if(request===nickRequest)setNickStatus(status,'','');}},350);
    };
    nick.addEventListener('input',checkNick); checkNick();
    const file=ov.querySelector('#avatarFile');file.addEventListener('change',()=>previewFile(file.files[0],ov));
    ov.querySelector('#profileEditForm').addEventListener('submit',saveProfile);
    ov.querySelector('[name=username]').focus();
  }
  function validImage(file){return !file || (file.size<=3145728 && ['image/jpeg','image/png','image/webp','image/gif'].includes(file.type));}
  function cleanNickname(value){return String(value||'').trim().replace(/\s+/g,' ');}
  function validNickname(value){const length=Array.from(value).length;return length>=2&&length<=32&&!/[\u0000-\u001f\u007f/\\@?#%]/u.test(value);}
  function setNickStatus(node,kind,text){if(!node)return;node.textContent=text;node.className='profile-nick-status '+kind;}
  async function nicknameAvailable(value){
    if(value.toLocaleLowerCase()===String(state.profile.username||'').toLocaleLowerCase())return true;
    try{const {data,error}=await Auth.client.rpc('username_available',{candidate:value});if(error)throw error;return data===true;}
    catch(rpcError){
      const escaped=value.replace(/([%_\\])/g,'\\$1');
      const {data,error}=await Auth.client.from('profiles').select('id').ilike('username',escaped).neq('id',Auth.user.id).limit(1);
      if(error)throw error;return !(data&&data.length);
    }
  }
  function previewFile(file,ov){
    const msg=ov.querySelector('#profileFormMsg');msg.textContent='';msg.className='profile-form-msg';
    if(!validImage(file)){msg.textContent=tr('invalidImage');msg.classList.add('err');return;}
    if(file){const url=URL.createObjectURL(file);ov.querySelector('#avatarPreview').innerHTML=`<span class="profile-avatar edit"><img src="${url}" alt=""></span>`;}
  }
  async function saveProfile(e){
    e.preventDefault();const form=e.currentTarget,file=form.querySelector('#avatarFile').files[0],msg=form.querySelector('#profileFormMsg'),btn=form.querySelector('#profileSaveBtn');
    if(!validImage(file)){msg.textContent=tr('invalidImage');msg.className='profile-form-msg err';return;}
    const nickname=cleanNickname(form.elements.username.value),nickStatus=form.querySelector('#nickStatus');
    form.elements.username.value=nickname;
    if(!validNickname(nickname)){setNickStatus(nickStatus,'err',tr('nickInvalid'));form.elements.username.focus();return;}
    btn.disabled=true;btn.textContent=tr('saving');msg.textContent='';
    try{
      if(!await nicknameAvailable(nickname)){setNickStatus(nickStatus,'err',tr('nickTaken'));form.elements.username.focus();btn.disabled=false;btn.textContent=tr('save');return;}
      let avatarUrl=state.profile.avatar_url;
      if(file){
        const ext={"image/jpeg":"jpg","image/png":"png","image/webp":"webp","image/gif":"gif"}[file.type];
        const path=`${Auth.user.id}/avatar-${Date.now()}.${ext}`;
        const {error}=await Auth.client.storage.from('avatars').upload(path,file,{cacheControl:'3600',upsert:false});if(error)throw error;
        avatarUrl=Auth.client.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      }
      const changes={username:nickname,bio:form.elements.bio.value.trim(),avatar_url:avatarUrl};
      const {data,error}=await Auth.client.from('profiles').update(changes).eq('id',Auth.user.id).select('id,public_id,username,avatar_url,bio,created_at').single();if(error)throw error;
      state.profile=data;Auth.profile={...(Auth.profile||{}),...changes,public_id:data.public_id};closeModal();render();window.dispatchEvent(new CustomEvent('terviona:chrome',{detail:{active:'profile'}}));announce(tr('saved'),'ok');
    }catch(err){console.error(err);const duplicate=err&&((err.code==='23505')||/duplicate|already exists|unique/i.test(err.message||''));if(duplicate){setNickStatus(nickStatus,'err',tr('nickTaken'));form.elements.username.focus();}else{msg.textContent=err.message||tr('error');msg.className='profile-form-msg err';}btn.disabled=false;btn.textContent=tr('save');}
  }

  function openGear(){
    const used=new Set(state.gear.map(g=>`${g.category}:${g.device_slug}`));
    const eligible=state.reviews.filter(r=>!used.has(`${r.category}:${r.device_slug}`));
    const ov=modalShell(`<button class="modal-x" data-close aria-label="${esc(tr('cancel'))}">×</button><span class="profile-section-code mono">GEAR::ADD</span><h2>${esc(tr('addTitle'))}</h2><p class="profile-modal-copy">${esc(tr('chooseReview'))}</p>
      ${eligible.length?`<form id="gearForm"><div class="gear-choice-list">${eligible.map((r,i)=>`<label class="gear-choice"><input type="radio" name="gear" value="${i}" ${i===0?'checked':''}><span><b>${esc(r.device_name)}</b><small>${esc(categoryName(r.category))} · ${r.rating} ★</small></span></label>`).join('')}</div><div class="profile-form-msg" id="gearMsg"></div><div class="profile-modal-actions"><button type="button" class="profile-btn quiet" data-close>${esc(tr('cancel'))}</button><button class="profile-btn primary">${esc(tr('add'))}</button></div></form>`:`<div class="profile-empty">${esc(tr('noEligible'))}</div>`}`);
    ov.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeModal));
    ov.querySelector('#gearForm')?.addEventListener('submit',async e=>{
      e.preventDefault();const index=Number(new FormData(e.currentTarget).get('gear')),rv=eligible[index],btn=e.currentTarget.querySelector('.primary');btn.disabled=true;
      try{const {data,error}=await Auth.client.from('user_devices').insert({user_id:Auth.user.id,category:rv.category,device_slug:rv.device_slug,device_name:rv.device_name,sort_order:state.gear.length}).select().single();if(error)throw error;state.gear.push(data);closeModal();render();}
      catch(err){console.error(err);const msg=e.currentTarget.querySelector('#gearMsg');msg.textContent=err.message||tr('error');msg.className='profile-form-msg err';btn.disabled=false;}
    });
  }
  async function removeGear(id){
    if(!confirm(tr('confirmRemove')))return;
    const {error}=await Auth.client.from('user_devices').delete().eq('id',id).eq('user_id',Auth.user.id);
    if(error){console.error(error);announce(tr('error'),'err');return;}state.gear=state.gear.filter(x=>String(x.id)!==String(id));render();
  }
  function announce(text,kind){let n=document.getElementById('profileToast');if(n)n.remove();n=document.createElement('div');n.id='profileToast';n.className=`profile-toast ${kind||''}`;n.setAttribute('role','status');n.textContent=text;document.body.appendChild(n);setTimeout(()=>n.classList.add('show'),10);setTimeout(()=>n.remove(),3200);}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
