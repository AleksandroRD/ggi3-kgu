/* ------------------------------------------------------------------
   Add a new presentation: drop its .html next to this file and add one
   entry here. Everything else (shelf, animation, routing) is automatic.
------------------------------------------------------------------- */
const topics = [
  { id: 'scheduling', title: 'Process Scheduling', subtitle: 'How the OS shares the CPU',
    file: 'scheduling.html', color: '#d98200', height: 236, thickness: 56 },
];

const MIN_ROWS = 3;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const shelf = $('shelf'), stage = $('stage'), viewer = $('viewer'), frame = $('frame');

const DEFAULT_H = [236, 220, 244, 212, 230, 250];
topics.forEach((t, i) => {
  t.height = t.height || DEFAULT_H[i % DEFAULT_H.length];
  t.thickness = t.thickness || 54;
});

/* ---------- shelf ---------- */
function spineEl(t) {
  const s = document.createElement('div');
  s.className = 'spine';
  s.style.setProperty('--c', t.color);
  s.innerHTML = '<span></span>';
  s.firstChild.textContent = t.title;
  return s;
}

const buttons = topics.map(t => {
  const b = document.createElement('button');
  b.className = 'book';
  b.type = 'button';
  b.setAttribute('aria-label', 'Open: ' + t.title);
  b.style.setProperty('--h', t.height + 'px');
  b.style.setProperty('--t', t.thickness + 'px');
  b.appendChild(spineEl(t));
  b.addEventListener('click', () => openBook(t, b, true));
  return b;
});

let perRow = 0;
function layout() {
  const inner = shelf.clientWidth - 56;
  const avg = topics.reduce((a, t) => a + t.thickness, 0) / topics.length + 7;
  const n = Math.max(1, Math.floor(inner / avg));
  if (n === perRow) return;
  perRow = n;
  shelf.replaceChildren();
  const rows = Math.max(MIN_ROWS, Math.ceil(buttons.length / n));
  for (let r = 0; r < rows; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    buttons.slice(r * n, r * n + n).forEach(b => row.appendChild(b));
    shelf.appendChild(row);
  }
}
layout();
addEventListener('resize', () => { if (!current) layout(); });

/* ---------- open / close ---------- */
let current = null;   // { t, btn, anims }
let busy = false;

const nextFrame = () => new Promise(r => requestAnimationFrame(r));
const play = (el, keyframes, opts) => {
  const a = el.animate(keyframes, { fill: 'both', ...opts });   // 'both': also holds the start value after playing in reverse
  a.persist();   // otherwise the browser drops it once a later animation overrides it, and it can't be reversed
  return a;
};
const done = a => a.finished.catch(() => {});

function setHash(id) {
  try { history.replaceState(null, '', id ? '#' + id : location.pathname + location.search); } catch (e) {}
}

/* ---------- preloading (so the animation never competes with page loading) ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));
let viewerFor = null, viewerReady = Promise.resolve();
function preloadViewer(t) {
  if (viewerFor === t.id) return viewerReady;
  viewerFor = t.id;
  viewerReady = new Promise(res => {
    const on = () => {
      let ok = true;
      try { ok = frame.contentWindow.location.href.includes(t.file); } catch (e) {}
      if (ok) { frame.removeEventListener('load', on); res(); }
    };
    frame.addEventListener('load', on);
  });
  frame.src = t.file;
  frame.title = t.title;
  return viewerReady;
}
function resetViewer() { viewerFor = null; frame.src = 'about:blank'; }

function showViewer(t) {
  preloadViewer(t);
  document.title = t.title;
  document.body.classList.add('open');
  viewer.classList.add('show');
  viewerReady.then(() => { try { frame.focus(); } catch (e) {} });   // so the arrow keys reach the slides
}

/* ---------- the 3D book (built once per hover, destroyed after use) ---------- */
const backdrop = Object.assign(document.createElement('div'), { className: 'backdrop' });
stage.append(backdrop);
let prepared = null;   // single slot: { id, box, cover, page, live, W, H, T, vw, vh }

function destroyPrepared() { if (prepared) { prepared.box.remove(); prepared = null; } }

function prepare(t) {
  if (prepared && prepared.id === t.id) return prepared;
  destroyPrepared();
  const T = t.thickness, H = t.height, W = Math.round(H * 0.72);   // a real, portrait book
  const box = document.createElement('div');
  box.className = 'box';
  box.style.cssText = `width:${W}px;height:${H}px;--c:${t.color};--W:${W}px;`;
  const spine = spineEl(t);
  spine.style.width = T + 'px'; spine.style.height = H + 'px';
  const backcover = Object.assign(document.createElement('div'), { className: 'backcover' });
  const page = Object.assign(document.createElement('div'), { className: 'page' });
  page.style.transform = `translateZ(${T - 3}px)`;
  const thumb = Object.assign(document.createElement('div'), { className: 'thumb' });  // the small slide
  const live = document.createElement('iframe');                    // live presentation inside it
  live.src = t.file;
  live.tabIndex = -1;
  live.setAttribute('aria-hidden', 'true');
  thumb.appendChild(live);
  page.appendChild(thumb);
  const cover = Object.assign(document.createElement('div'), { className: 'cover' });
  cover.style.transform = `translateZ(${T}px)`;
  cover.innerHTML = '<div class="cover-front"><div class="chip"></div><div><h2></h2><p></p></div></div><div class="cover-back"><h3></h3><p></p></div>';
  cover.querySelector('h2').textContent = cover.querySelector('h3').textContent = t.title;
  cover.querySelectorAll('p').forEach(el => el.textContent = t.subtitle || '');
  box.append(backcover, spine, page, cover);
  stage.append(box);
  prepared = { id: t.id, box, cover, page, thumb, live, W, H, T, vw: 0, vh: 0 };
  return prepared;
}

/* the miniature slide has the screen's shape and sits centred on the right-hand page */
function configure(p) {
  const vw = innerWidth, vh = innerHeight;
  if (p.vw === vw && p.vh === vh) return;
  p.vw = vw; p.vh = vh;
  p.sw = p.W * 0.84;                       // slide width on the page
  p.sh = p.sw * vh / vw;
  Object.assign(p.thumb.style, { width: p.sw + 'px', height: p.sh + 'px',
                                 left: (p.W - p.sw) / 2 + 'px', top: (p.H - p.sh) / 2 + 'px' });
  p.live.style.cssText = `width:${vw}px;height:${vh}px;transform:scale(${p.sw / vw});`;
}

let coolTimer;
function warm(t) { clearTimeout(coolTimer); if (current || busy) return; prepare(t); preloadViewer(t); }
function cool() {
  clearTimeout(coolTimer);
  coolTimer = setTimeout(() => { if (!current && !busy) { destroyPrepared(); resetViewer(); } }, 4000);
}
buttons.forEach((b, i) => {
  const t = topics[i];
  b.addEventListener('pointerenter', () => warm(t));
  b.addEventListener('focus', () => warm(t));
  b.addEventListener('pointerleave', cool);
  b.addEventListener('blur', cool);
});

async function openBook(t, btn, animate) {
  if (busy || current) return;
  busy = true;
  clearTimeout(coolTimer);
  current = { t, btn, anims: [] };
  setHash(t.id);

  if (!animate || reduced) {
    showViewer(t);
    btn.style.visibility = 'hidden';
    busy = false;
    return;
  }

  const p = prepare(t);
  configure(p);
  preloadViewer(t);
  const { box, cover, live, W, H, T, sw, vw, vh } = p;

  const r = btn.getBoundingClientRect();
  const lift = -new DOMMatrixReadOnly(getComputedStyle(btn).transform).m42 || 0;   // hover raise currently applied
  const cx = r.left + r.width / 2, cy = r.top + lift + r.height / 2;               // resting centre on the shelf
  const dx = vw / 2 - cx, dy = vh / 2 - cy;
  const fit = Math.min(vw * 0.44 / W, vh * 0.78 / H);           // the open book (two pages) fits the screen
  const fill = vw / sw;                                         // the miniature slide fills the screen

  // Position/size and rotation are animated separately (CSS translate / scale / rotate),
  // so the book can be spine-on for the part of the trip that is near the shelf.
  const tr = (x, y, z) => `${x}px ${y}px ${z}px`;
  const P0 = tr(-T / 2, 0, -W / 2);                             // spine exactly over the shelf book (resting)
  const Pr = tr(-T / 2, -lift, -W / 2);                         // ...as it is while hovered
  const Po = tr(-T / 2, -lift, -W / 2 + W * 0.9);               // slid straight out of the shelf
  // the book is scaled in depth too, so push it back until the page sits exactly in the screen plane
  const P2 = tr(dx, dy, -(T - 3) * fit);                        // centred in front of the screen
  const Pb = tr(dx + fit * W / 2, dy, -(T - 3) * fit);         // open: the two-page spread is centred
  const P3 = tr(dx, dy, -(T - 3) * fill);                       // zoomed into the slide (it sits at the page centre)

  box.style.left = (cx - W / 2) + 'px';
  box.style.top = (cy - H / 2) + 'px';
  Object.assign(box.style, { transform: 'none', translate: Pr, rotate: 'y 90deg', scale: '1 1 1' });
  stage.style.perspectiveOrigin = `${cx}px ${cy}px`;            // look straight at the spine, like the flat book
  stage.classList.add('on');
  btn.style.visibility = 'hidden';
  await nextFrame();

  const ease = 'cubic-bezier(.45,0,.2,1)';
  // 1) slide straight out, 2) fly toward the centre spine-first, 3) turn the cover to us.
  // Played in reverse on close: the book turns away first, travels spine-on, and slides straight in.
  const DA = 1400, s1 = 0.3, r1 = s1 + 0.5 * (1 - s1), seg = 'cubic-bezier(.45,0,.25,1)';
  const A = play(box, [
    { translate: Pr, scale: '1 1 1', easing: 'ease-in-out' },
    { translate: Po, scale: '1 1 1', easing: seg, offset: s1 },
    { translate: P2, scale: `${fit} ${fit} ${fit}` },
  ], { duration: DA });
  const Ar = play(box, [
    { rotate: 'y 90deg' },
    { rotate: 'y 90deg', easing: 'cubic-bezier(.4,0,.2,1)', offset: r1 },
    { rotate: 'y 0deg' },
  ], { duration: DA });
  // the viewpoint rides along with the spine, so its sides stay edge-on (invisible) while it travels
  const Apo = play(stage, [
    { perspectiveOrigin: `${cx}px ${cy}px` },
    { perspectiveOrigin: `${cx}px ${cy}px`, easing: seg, offset: s1 },
    { perspectiveOrigin: `${vw / 2 + fit * T / 2}px ${vh / 2}px` },
  ], { duration: DA });
  Object.assign(current, { apo: Apo, ar: Ar, box, P0, Pr, lift });
  const Abd = play(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: DA });
  current.anims = [A, Abd];
  await done(A);

  // open the book fully, pause on the spread, then zoom into the small slide
  const cz = `translateZ(${T}px)`, S = s => `${s} ${s} ${s}`;
  const Bo = play(box, [{ translate: P2, scale: S(fit) }, { translate: Pb, scale: S(fit) }], { duration: 900, easing: 'ease-in-out' });
  const Bc = play(cover, [{ transform: `${cz} rotateY(0deg)` }, { transform: `${cz} rotateY(-180deg)` }],
                  { duration: 900, easing: 'ease-in-out' });
  current.anims.push(Bo, Bc);
  await done(Bo);
  await sleep(350);
  const Bz = play(box, [{ translate: Pb, scale: S(fit) }, { translate: P3, scale: S(fill) }], { duration: 1100, easing: ease });
  current.anims.push(Bz);
  await done(Bz);

  await Promise.race([viewerReady, sleep(1500)]);               // never show an unloaded viewer
  showViewer(t);
  await sleep(380);
  stage.classList.remove('on');
  busy = false;
}

async function closeBook() {
  if (busy || !current) return;
  busy = true;
  const { btn, anims, box, P0, Pr, lift } = current;
  setHash('');
  document.title = 'Library';
  viewer.classList.remove('show');

  if (!anims.length) {                       // opened without animation
    await sleep(reduced ? 0 : 360);
    finishClose(btn);
    return;
  }

  // the miniature on the book's page shows the slide you were on (messages also work on file://)
  if (current.slide && prepared) prepared.live.contentWindow.postMessage({ type: 'goto', name: current.slide }, '*');
  stage.classList.add('on');
  await sleep(380);                           // let the viewer fade out
  const [A, Abd, Bo, Bc, Bz] = anims;
  Bz.reverse();
  await done(Bz);
  Bz.cancel();
  await sleep(300);
  Bo.reverse(); Bc.reverse();
  await done(Bo);
  Bo.cancel(); Bc.cancel();
  A.reverse(); Abd.reverse(); current.ar.reverse(); current.apo.reverse();
  await done(A);
  if (lift > 0.5) await done(play(box, [{ translate: Pr }, { translate: P0 }], { duration: 160, easing: 'ease-out' }));
  finishClose(btn);
}

function finishClose(btn) {
  [...(current?.anims || []), current?.apo, current?.ar].forEach(a => { try { a && a.cancel(); } catch (e) {} });
  stage.style.perspectiveOrigin = '';
  stage.classList.remove('on');
  destroyPrepared();
  btn.style.visibility = '';
  resetViewer();
  document.body.classList.remove('open');
  current = null;
  busy = false;
  layout();
}

/* ---------- controls ---------- */
$('back').addEventListener('click', closeBook);
const NAV_KEYS = ['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', ' '];
addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeBook(); return; }
  // after a reload the focus is here, not in the presentation frame, so pass navigation keys on
  if (current && !busy && NAV_KEYS.includes(e.key)) {
    e.preventDefault();
    frame.contentWindow.postMessage({ type: 'key', key: e.key }, '*');
    try { frame.focus(); } catch (err) {}   // later keys then go straight to the frame
  }
});
addEventListener('message', e => {
  if (e.source !== frame.contentWindow) return;
  if (e.data === 'close-book') closeBook();
  else if (e.data && e.data.type === 'slide' && current) current.slide = e.data.name;   // remember the open slide
});

/* ---------- deep link: index.html#scheduling opens straight away ---------- */
function fromHash() {
  const t = topics.find(x => x.id === location.hash.slice(1));
  if (t && !current) openBook(t, buttons[topics.indexOf(t)], false);
  else if (!t && current && !busy) closeBook();
}
addEventListener('hashchange', fromHash);
fromHash();
