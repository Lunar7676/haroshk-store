/* ═════════════════════════════ HAROSHK STORE ═════════════════════════════
   app.js — каталог, карусели, карточки, корзина, настройки, Telegram API
   ═══════════════════════════════════════════════════════════════════════════*/

window.__HS_BUILD = "v4-20261101"; // маркер версии для отладки кеша

const tg = window.Telegram?.WebApp;

/* ── SVG-иконки ── */
const ICONS = {
  cubes:  '<path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/>',
  figure: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  lamp:   '<path d="M9 21h6"/><path d="M12 17v4"/><path d="M5 11a7 7 0 0 1 14 0v2H5z"/>',
  waves:  '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  grid:   '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  key:    '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  send:   '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  cart:   '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M1 2h4l2.6 13.5a1.5 1.5 0 0 0 1.48 1.25h10.14a1.5 1.5 0 0 0 1.47-1.18L23 7H6"/>',
  trash:  '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  plus:   '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  minus:  '<line x1="5" y1="12" x2="19" y2="12"/>',
  check:  '<polyline points="20 6 9 17 4 12"/>'
};
const icon = (name, cls='') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24">${ICONS[name]||ICONS.cubes}</svg>`;

/* ═════════════════ НАСТРОЙКИ (реально работающие) ═════════════════ */
const settings = { anim: true, haptic: true, currency: 'uah', theme: null };

function loadSettings(){
  try{
    const s = JSON.parse(localStorage.getItem('hs-set')||'{}');
    Object.assign(settings, s, {theme: localStorage.getItem('hs-theme')==='dark' ? true : (localStorage.getItem('hs-theme')==='light' ? false : null)});
  }catch(e){}
}
function saveSettings(){ localStorage.setItem('hs-set', JSON.stringify(settings)); }

/* Валюта */
function fmt(v){
  if(v==null) return null;
  if(settings.currency==='usd') return `$${(v/CONFIG.usdRate).toFixed(2)}`;
  return `${v} ₴`;
}
function priceHTML(item){
  const p = fmt(item.price);
  return p ? `Ціна: <b>${p}</b>` : `<span class="soon">Ціна незабаром</span>`;
}

/* Применение настроек */
function applySettings({rerender=true}={}){
  document.body.classList.toggle('no-anim', !settings.anim);
  if(!settings.anim) document.querySelectorAll('.reveal').forEach(el=>el.classList.add('vis'));

  // тумблеры в шитке
  document.querySelectorAll('[data-switch]').forEach(r=>{
    const on = !!settings[r.dataset.switch];
    r.querySelector('.sw')?.classList.toggle('on', on);
  });
  document.getElementById('swTheme').classList.toggle('on',
    document.documentElement.classList.contains('dark'));
  const curVal = document.getElementById('curVal');
  if(curVal) curVal.textContent = settings.currency==='usd' ? '$ USD' : '₴ ГРН';

  if(rerender){
    renderCatalog();
    renderCart(); updateCartBadge();
    if(pv().classList.contains('show')) closeProduct(); // пересчитать цены в открытом товаре
  }
}
function toggleSetting(key){
  settings[key] = !settings[key];
  saveSettings();
  applySettings({rerender:key==='anim'});
  tgHaptic('success');
}
function cycleCurrency(){
  settings.currency = settings.currency==='uah' ? 'usd' : 'uah';
  saveSettings();
  applySettings();
  tgHaptic('success');
}

/* ═════════════════ КОШИК ═════════════════ */
let cart = [];
function loadCart(){ try{ cart = JSON.parse(localStorage.getItem('hs-cart')||'[]'); }catch(e){ cart=[]; } }
function saveCart(){ localStorage.setItem('hs-cart', JSON.stringify(cart)); }

function findItem(id){
  for(const c of CATEGORIES) for(const it of c.items) if(it.id===id) return it;
  return null;
}
function cartTotalQty(){ return cart.reduce((s,l)=>s+l.qty,0); }
function cartSum(){
  return cart.reduce((s,l)=>{
    const it = findItem(l.id);
    return s + (it?.price ? it.price*l.qty : 0);
  },0);
}
function addToCart(id, qty=1){
  const line = cart.find(l=>l.id===id);
  if(line) line.qty += qty; else cart.push({id, qty});
  saveCart(); updateCartBadge(); renderCart();
}
function setQty(id, qty){
  const line = cart.find(l=>l.id===id);
  if(!line) return;
  line.qty = qty;
  if(line.qty<=0) cart = cart.filter(l=>l.id!==id);
  saveCart(); updateCartBadge(); renderCart();
}
function removeFromCart(id){
  cart = cart.filter(l=>l.id!==id);
  saveCart(); updateCartBadge(); renderCart();
}

function updateCartBadge(){
  const n = cartTotalQty();
  const b = document.getElementById('cartCount');
  b.hidden = n===0;
  b.textContent = n>99 ? '99+' : n;
}

/* Рендер корзины */
function renderCart(){
  const list = document.getElementById('cartList');
  const totalRow = document.getElementById('cartTotalRow');
  const orderBtn = document.getElementById('cartOrder');

  if(!cart.length){
    list.innerHTML = `
      <div class="cart-empty">
        ${icon('cart')}
        <p>Кошик порожній</p>
        <a class="btn btn-white" href="#catalog" data-close-cart>До каталогу</a>
      </div>`;
    totalRow.hidden = true;
    orderBtn.style.display = 'none';
    return;
  }

  list.innerHTML = cart.map(l=>{
    const it = findItem(l.id);
    if(!it) return '';
    return `
      <div class="cart-row">
        <span class="row-icon">${icon(it.icon||'cubes')}</span>
        <div class="cart-info"><b>${it.name}</b><span class="row-sub">${fmt(it.price)||'ціна уточнюється'}</span></div>
        <div class="qty">
          <button data-dec="${it.id}" aria-label="Менше">${icon('minus')}</button>
          <span>${l.qty}</span>
          <button data-inc="${it.id}" aria-label="Більше">${icon('plus')}</button>
        </div>
        <button class="cart-rm" data-rm="${it.id}" aria-label="Прибрати">${icon('trash')}</button>
      </div>`;
  }).join('');

  const sum = cartSum();
  totalRow.hidden = false;
  document.getElementById('cartTotal').textContent = sum>0 ? fmt(sum) : 'ціна уточнюється';
  orderBtn.style.display = '';
}

/* Заказ → в Telegram */
function orderCart(){
  if(!cart.length) return;
  const lines = cart.map(l=>{
    const it = findItem(l.id);
    if(!it) return '';
    const pr = it.price ? `${fmt(it.price)} × ${l.qty} = ${fmt(it.price*l.qty)}` : `ціна уточнюється × ${l.qty}`;
    return `• ${it.name} — ${pr}`;
  }).filter(Boolean);
  const sum = cartSum();
  const msg =
    `🛒 *Замовлення Haroshk Store*\n\n${lines.join('\n')}\n\n` +
    (sum>0 ? `*Разом: ${fmt(sum)}*\n\n` : '') +
    `Напишіть, будь ласка, деталі замовлення кольори/розміри.`;
  const deep = encodeURIComponent(msg);
  const url = `https://t.me/${CONFIG.tgUser}?text=${deep}`;
  try{ tg?.openTelegramLink?.(url); }catch(e){ window.open(url,'_blank'); }
  // сохранить черновик и очистить
  cart = [];
  saveCart(); updateCartBadge(); renderCart();
  closeCart();
  tgHaptic('success');
}

function orderOne(item){
  const pr = fmt(item.price) || 'ціна уточнюється';
  const msg = `🛒 *Замовлення Haroshk Store*\n\n• ${item.name} — ${pr}\n\nНапишіть, будь ласка, деталі замовлення кольори/розміри.`;
  const url = `https://t.me/${CONFIG.tgUser}?text=${encodeURIComponent(msg)}`;
  try{ tg?.openTelegramLink?.(url); }catch(e){ window.open(url,'_blank'); }
  tgHaptic('success');
}

/* Корзина-шит */
const cartSheet = ()=> document.getElementById('cartSheet');
function openCart(){
  renderCart();
  cartSheet().classList.add('show');
  cartSheet().setAttribute('aria-hidden','false');
  tgHaptic('light');
}
function closeCart(){
  cartSheet().classList.remove('show');
  cartSheet().setAttribute('aria-hidden','true');
}

/* ── Telegram Web App ── */
function tgInit(){
  if(!tg) return;
  try{
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#f4f5f7');
    tg.setBackgroundColor('#f4f5f7');
    if(tg.enableClosingConfirmation) tg.enableClosingConfirmation();
  }catch(e){}
}
function tgHaptic(type='light'){
  if(!settings.haptic) return;
  try{
    const h = tg?.HapticFeedback;
    if(!h) return;
    if(type==='light'||type==='medium'||type==='heavy') h.impactOccurred(type);
    else h.notificationOccurred(type);
  }catch(e){}
}

/* ── Тема ── */
function applyTheme(dark, save=true){
  document.documentElement.classList.toggle('dark', dark);
  if(save){ settings.theme = dark; localStorage.setItem('hs-theme', dark?'dark':'light'); saveSettings(); }
  try{
    tg?.setHeaderColor?.(dark?'#0f1114':'#f4f5f7');
    tg?.setBackgroundColor?.(dark?'#0f1114':'#f4f5f7');
  }catch(e){}
  document.getElementById('swTheme').classList.toggle('on', dark);
}
function initTheme(){
  if(settings.theme===null){
    applyTheme(tg?.colorScheme==='dark', false);
  }else{
    applyTheme(settings.theme, false);
  }
}
function toggleTheme(){
  applyTheme(!document.documentElement.classList.contains('dark'));
  tgHaptic('success');
}

/* ── Слайды карусели ── */
function slidesHTML(item){
  if(item.images.length){
    const labels = item.labels?.length ? item.labels : ['фото'];
    return item.images.map((src,i)=>{
      const lbl = labels[Math.min(i, labels.length-1)];
      return `
        <div class="car-slide">
          <img src="${src}" alt="${item.name} — ${lbl}" loading="lazy">
          <span class="car-label">${lbl}</span>
        </div>`;
    }).join('');
  }
  return `<div class="car-slide"><span class="car-ph">${icon(item.icon||'cubes')}</span></div>`;
}
function dotHTML(item){
  const n = item.images.length;
  if(n < 2) return '';
  return `<div class="car-dots">${Array.from({length:n},(_ ,i)=>
    `<span class="car-dot ${i===0?'on':''}" data-dot="${i}"></span>`).join('')}</div>`;
}

/* ── Карусель со свайпом ── */
function initCarousels(root=document){
  root.querySelectorAll('.carousel, .pv-carousel').forEach(car=>{
    if(car.dataset.carouselInit) return;
    car.dataset.carouselInit = '1';
    const track = car.querySelector('.car-track');
    const dots = car.querySelectorAll('.car-dot');
    let index = 0, startX = 0, delta = 0, dragging = false;

    const goTo = (i)=>{
      index = Math.max(0, Math.min(i, track.children.length-1));
      track.classList.remove('dragging');
      track.style.transform = `translateX(${-index*100}%)`;
      dots.forEach((d,di)=> d.classList.toggle('on', di===index));
    };

    car.addEventListener('pointerdown', e=>{
      dragging = true; startX = e.clientX; delta = 0;
      track.classList.add('dragging');
      car.setPointerCapture?.(e.pointerId);
    });
    car.addEventListener('pointermove', e=>{
      if(!dragging) return;
      delta = e.clientX - startX;
      track.style.transform = `translateX(calc(${-index*100}% + ${delta}px))`;
    });
    const end = ()=>{
      if(!dragging) return;
      dragging = false;
      track.classList.remove('dragging');
      const w = car.clientWidth || 1;
      if(Math.abs(delta) > w*0.18){ goTo(index + (delta<0?1:-1)); tgHaptic('light'); }
      else goTo(index);
    };
    car.addEventListener('pointerup', end);
    car.addEventListener('pointercancel', end);
    car.addEventListener('pointerleave', end);
  });
}

/* ── Бейдж статуса ── */
function badgeHTML(status){
  if(status==='soon')  return `<span class="badge"><i></i>Скоро у продажу</span>`;
  if(status==='order') return `<span class="badge hot"><i></i>Можна замовити</span>`;
  if(status==='sold')  return `<span class="badge"><i></i>Немає в наявності</span>`;
  return '';
}

/* ── Рендер каталога ── */
function cardHTML(item){
  const addable = item.status !== 'sold';
  return `
    <article class="p-card card" data-open="${item.id}">
      <div class="p-card-top"><span class="p-tag">${item.tag||''}</span></div>
      <div class="carousel">
        <div class="car-track">${slidesHTML(item)}</div>
        ${dotHTML(item)}
      </div>
      <div class="p-body">
        <div class="p-name">${item.name}</div>
        <div class="p-foot">
          <div class="p-price">${priceHTML(item)}</div>
          ${addable ? `<button class="add-btn" data-add="${item.id}" aria-label="В кошик">${icon('plus')}</button>` : ''}
        </div>
      </div>
    </article>`;
}
function renderCatalog(){
  document.getElementById('catalogList').innerHTML = CATEGORIES.map((cat,ci)=>`
    <div class="cat-section">
      <div class="cat-title">0${ci+1} · ${cat.title}</div>
      <div class="grid">${cat.items.map(cardHTML).join('')}</div>
    </div>`).join('');
}

/* ── Полный обзор товара ── */
const pv = ()=> document.getElementById('productView');

function openProduct(id){
  const item = findItem(id);
  if(!item) return;
  tgHaptic('medium');

  const addable = item.status !== 'sold';
  pv().querySelector('.pv-inner').innerHTML = `
    <div class="pv-head">
      <button class="pv-back" data-close-pv>
        <svg class="ic" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Назад
      </button>
      ${badgeHTML(item.status)}
    </div>

    <div class="pv-bigcard">
      <div class="pv-carousel">
        <div class="car-track">${slidesHTML(item)}</div>
        ${dotHTML(item)}
      </div>
      <div class="pv-ctl">
        <div class="pv-pager">
          <button class="pv-btn on" data-view="front">Спереду</button>
          <button class="pv-btn" data-view="back">Заду</button>
        </div>
      </div>

      <div class="pv-tag">${item.tag||'Haroshk Store'}</div>
      <h1 class="pv-name">${item.name}</h1>
      <p class="pv-desc">${item.desc||''}</p>
    </div>

    <div class="pv-price-row">
      <div class="pv-price">Ціна<b>${fmt(item.price)||'Незабаром'}</b></div>
      ${badgeHTML(item.status)}
    </div>

    <div class="pv-order">
      ${addable ? `<button class="btn btn-white" data-add="${item.id}">${icon('cart')} В кошик</button>` : ''}
      <button class="btn btn-grad" data-order="${item.id}">${icon('send')} Замовити</button>
    </div>

    <div class="pv-backcard">
      <div class="cap">Haroshk Store • Оригінальний друк</div>
      <div class="phs">${CATEGORIES.flatMap(c=>c.items).slice(0,4).map(i=>icon(i.icon||'cubes')).join('')}</div>
    </div>
  `;

  initCarousels(pv());

  // Кнопки СПЕРЕДУ / ЗАДУ
  const track = pv().querySelector('.pv-carousel .car-track');
  const btnFront = pv().querySelector('[data-view="front"]');
  const btnBack  = pv().querySelector('[data-view="back"]');
  let curIndex = 0;
  const carGo = (i)=>{
    curIndex = i;
    track.style.transform = `translateX(${-i*100}%)`;
    btnFront.classList.toggle('on', i===0);
    btnBack.classList.toggle('on', i!==0);
    pv().querySelectorAll('.car-dot').forEach((d,di)=> d.classList.toggle('on', di===i));
  };
  if(track.children.length > 1){
    btnFront.addEventListener('click', ()=>{ carGo(0); tgHaptic('light'); });
    btnBack.addEventListener('click', ()=>{ carGo(1); tgHaptic('light'); });
    new MutationObserver(()=>{
      const tx = new DOMMatrix(getComputedStyle(track).transform).m41;
      const w = track.parentElement.clientWidth || 1;
      const i = Math.max(0, Math.min(track.children.length-1, Math.round(-tx / w)));
      if(i !== curIndex){ curIndex = i;
        btnFront.classList.toggle('on', i===0);
        btnBack.classList.toggle('on', i!==0);
      }
    }).observe(track, {attributes:true, attributeFilter:['style']});
  }else{
    pv().querySelector('.pv-pager').style.opacity = .5;
  }

  pv().classList.add('show');
  pv().setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  pv().scrollTop = 0;
  try{ tg?.BackButton?.show(); }catch(e){}
}
function closeProduct(){
  pv().classList.remove('show');
  pv().setAttribute('aria-hidden','true');
  document.body.style.overflow='';
  try{ tg?.BackButton?.hide(); }catch(e){}
}

/* ── Шиты ── */
const sheet = ()=> document.getElementById('settingsSheet');
function openSettings(){ applySettings({rerender:false}); sheet().classList.add('show'); sheet().setAttribute('aria-hidden','false'); tgHaptic('light'); }
function closeSettings(){ sheet().classList.remove('show'); sheet().setAttribute('aria-hidden','true'); }

/* ── Reveal-анимация ── */
function initReveal(){
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target); } });
  },{threshold:.12});
  document.querySelectorAll('.reveal:not(.vis)').forEach(el=>io.observe(el));
}

/* ── Scroll-spy: активная навигация следует за скроллом ──
   Не по IntersectionObserver (моргает на быстрых пролётах),
   а по позиции: активна та секция, которую пересекает линия
   под хедером + навом. Плюс дебаунс 70мс и блокировка на время
   плавного скролла после клика — никакого мелькания. */
function initNavSpy(){
  const pills = [...document.querySelectorAll('.nav-pill')];
  const sections = ['catalog','how','about','support']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const LINE = 150;           // зона «активности»: сразу под хедером+навом
  let current = null;         // текущая секция
  let raf = null;             // pending rAF
  let settle = null;          // таймер дебаунса
  let locked = false;         // блокировка на время программного скролла

  function setActive(hash){
    if(hash === current) return;
    current = hash;
    pills.forEach(p => p.classList.toggle('is-active',
      p.getAttribute('href') === '#'+hash));
  }

  function compute(){
    // какая секция лежит под линией LINE — та и активна
    let id = 'catalog';
    for(const s of sections){
      if(s.getBoundingClientRect().top <= LINE) id = s.id;
      else break;
    }
    // доскроллили до самого низа — набираем последнюю секцию
    if(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4){
      id = sections[sections.length-1].id;
    }
    setActive(id);
  }

  let unlockTimer = null;
  let clickTarget = null;   // секция, куда ведёт плавный скролл после клика

  function onScroll(){
    if(raf) return;
    raf = requestAnimationFrame(()=>{
      raf = null;
      if(locked){
        // достигли цели клика? → блокировку снять и пересчитать
        if(clickTarget && Math.abs(clickTarget.getBoundingClientRect().top - LINE) < 130){
          clearTimeout(unlockTimer);
          locked = false;
          clickTarget = null;
          compute();
          return;
        }
        // скролл после клика ещё едет — держим выбранную пилюлю;
        // страховка: если прокрутка остановилась (прервана пальцем),
        // снимаем блокировку после 180мс тишины
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(()=>{ locked = false; clickTarget = null; compute(); }, 180);
        return;
      }
      // сбросить незакрытый дебаунс: ждём, пока скролл реально остановился
      clearTimeout(settle);
      settle = setTimeout(()=>{ if(!locked) compute(); }, 70);
    });
  }

  // клик по пилюле: сразу подсветить выбранную и держать всю дорогу
  // плавного скролла — без показа промежуточных секций
  pills.forEach(p=>{
    p.addEventListener('click', ()=>{
      const hash = p.getAttribute('href').slice(1);
      setActive(hash);
      clearTimeout(settle);
      locked = true;
      clickTarget = document.getElementById(hash) || null;
    });
  });

  window.addEventListener('scroll', onScroll, {passive:true});
  compute();
}

/* ═══ INIT ═══ */
document.addEventListener('DOMContentLoaded', ()=>{
  tgInit();
  loadSettings();
  loadCart();
  initTheme();
  renderCatalog();
  initReveal();
  initCarousels();
  initNavSpy();
  updateCartBadge();

  /* хедер */
  document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('cartBtn').addEventListener('click', openCart);

  /* настройки (реальные действия) */
  document.getElementById('setThemeRow').addEventListener('click', toggleTheme);
  document.getElementById('curRow').addEventListener('click', cycleCurrency);
  document.querySelectorAll('[data-switch]').forEach(r=>{
    r.addEventListener('click', ()=> toggleSetting(r.dataset.switch));
  });
  document.querySelectorAll('[data-close]').forEach(el=> el.addEventListener('click', closeSettings));
  document.querySelectorAll('[data-close-cart]').forEach(el=> el.addEventListener('click', closeCart));

  /* корзина */
  document.getElementById('cartOrder').addEventListener('click', orderCart);
  document.addEventListener('click', e=>{
    // открыть карточку (но не по кнопке добавить)
    const addBtn = e.target.closest('[data-add]');
    const card = e.target.closest('[data-open]');
    if(addBtn){
      e.stopPropagation();
      addToCart(addBtn.dataset.add);
      tgHaptic('success');
      if(addBtn.classList.contains('btn')){ // кнопка в обзоре
        addBtn.innerHTML = `${icon('check')} Додано`;
        setTimeout(()=>{
          addBtn.innerHTML = `${icon('cart')} В кошик`;
        }, 1200);
      }else{ // плюсик на карточке
        addBtn.innerHTML = icon('check');
        setTimeout(()=>{ addBtn.innerHTML = icon('plus'); }, 1000);
      }
      return;
    }
    const orderBtn = e.target.closest('[data-order]');
    if(orderBtn){ orderOne(findItem(orderBtn.dataset.order)); return; }
    if(card){ openProduct(card.dataset.open); return; }
    if(e.target.closest('[data-close-pv]')){ closeProduct(); return; }
    if(e.target.classList.contains('product-view')) closeProduct();

    // шаги количества в корзине
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const rm  = e.target.closest('[data-rm]');
    if(inc){ tgHaptic('light'); setQty(inc.dataset.inc, (cart.find(l=>l.id===inc.dataset.inc)?.qty||0)+1); }
    else if(dec){ tgHaptic('light'); setQty(dec.dataset.dec, (cart.find(l=>l.id===dec.dataset.dec)?.qty||0)-1); }
    else if(rm){ tgHaptic('medium'); removeFromCart(rm.dataset.rm); }
  });

  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ closeProduct(); closeSettings(); closeCart(); }
  });

  try{ tg?.BackButton?.onClick?.(closeProduct); }catch(e){}
});
