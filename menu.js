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
  const a = el.animate(keyframes, { fill: 'forwards', ...opts });
  return a;
};
const done = a => a.finished.catch(() => {});

function setHash(id) {
  try { history.replaceState(null, '', id ? '#' + id : location.pathname + location.search); } catch (e) {}
}

function showViewer(t) {
  frame.src = t.file;
  frame.title = t.title;
  document.title = t.title;
  document.body.classList.add('open');
  viewer.classList.add('show');
}

async function openBook(t, btn, animate) {
  if (busy || current) return;
  busy = true;
  current = { t, btn, anims: [] };
  setHash(t.id);

  if (!animate || reduced) {
    showViewer(t);
    btn.style.visibility = 'hidden';
    busy = false;
    return;
  }

  const r = btn.getBoundingClientRect();
  const T = t.thickness, H = Math.round(r.height), W = Math.round(H * 0.72);
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const vw = innerWidth, vh = innerHeight;
  const dx = vw / 2 - cx, dy = vh / 2 - cy;
  const fit = Math.min(vw * 0.55 / W, vh * 0.8 / H);          // book "in front of the screen"
  const fill = Math.max(vw / W, vh / H) * 1.04;                // page fills the viewport

  const tf = (x, y, z, ry, s) => `translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) scale(${s})`;
  const k0 = tf(-T / 2, 0, -W / 2, 90, 1);                     // spine exactly over the shelf book
  const k1 = tf(-T / 2, -14, 90 - W / 2, 90, 1);               // pulled toward the viewer
  const k2 = tf(dx, dy, 0, 0, fit);                            // centred, cover facing us
  const k3 = tf(dx, dy, 0, 0, fill);                           // zoomed onto the first page

  // build overlay
  stage.replaceChildren();
  const backdrop = Object.assign(document.createElement('div'), { className: 'backdrop' });
  const box = document.createElement('div');
  box.className = 'box';
  box.style.cssText = `left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;--c:${t.color};--W:${W}px;` +
                      `transform:${k0}`;
  const spine = spineEl(t);
  spine.style.width = T + 'px'; spine.style.height = H + 'px';
  spine.style.left = '0px';
  const backcover = Object.assign(document.createElement('div'), { className: 'backcover' });
  const page = Object.assign(document.createElement('div'), { className: 'page' });
  page.style.transform = `translateZ(${T - 3}px)`;
  const cover = Object.assign(document.createElement('div'), { className: 'cover' });
  cover.style.transform = `translateZ(${T}px)`;
  cover.innerHTML = '<div class="cover-front"><div class="chip"></div><div><h2></h2><p></p></div></div><div class="cover-back"></div>';
  cover.querySelector('h2').textContent = t.title;
  cover.querySelector('p').textContent = t.subtitle || '';
  box.append(backcover, spine, page, cover);
  stage.append(backdrop, box);
  stage.classList.add('on');
  btn.style.visibility = 'hidden';
  await nextFrame();

  const A = play(box, [{ transform: k0 }, { transform: k1, offset: .28 }, { transform: k2 }],
                 { duration: 1100, easing: 'cubic-bezier(.45,0,.2,1)' });
  const Abd = play(backdrop, [{ opacity: 0 }, { opacity: 1 }], { duration: 1100 });
  current.anims = [A, Abd];
  await done(A);

  const cz = `translateZ(${T}px)`;
  const B = play(box, [{ transform: k2 }, { transform: k3 }], { duration: 950, easing: 'cubic-bezier(.55,0,.8,.4)' });
  const Bc = play(cover, [{ transform: `${cz} rotateY(0deg)` }, { transform: `${cz} rotateY(-168deg)` }],
                  { duration: 800, easing: 'ease-in-out' });
  current.anims.push(B, Bc);
  await done(B);

  showViewer(t);
  await new Promise(r => setTimeout(r, 380));
  stage.classList.remove('on');
  busy = false;
}

async function closeBook() {
  if (busy || !current) return;
  busy = true;
  const { t, btn, anims } = current;
  setHash('');
  document.title = 'Library';
  viewer.classList.remove('show');

  if (!anims.length) {                       // opened without animation
    await new Promise(r => setTimeout(r, reduced ? 0 : 360));
    finishClose(btn);
    return;
  }

  stage.classList.add('on');
  await new Promise(r => setTimeout(r, 360)); // let the viewer fade out
  const [A, Abd, B, Bc] = anims;
  B.reverse(); Bc.reverse();
  await done(B);
  B.cancel(); Bc.cancel();
  A.reverse(); Abd.reverse();
  await done(A);
  finishClose(btn);
}

function finishClose(btn) {
  anims_cancel();
  stage.classList.remove('on');
  stage.replaceChildren();
  btn.style.visibility = '';
  frame.src = 'about:blank';
  document.body.classList.remove('open');
  current = null;
  busy = false;
  layout();
}
function anims_cancel() { (current?.anims || []).forEach(a => { try { a.cancel(); } catch (e) {} }); }

/* ---------- controls ---------- */
$('back').addEventListener('click', closeBook);
addEventListener('keydown', e => { if (e.key === 'Escape') closeBook(); });
addEventListener('message', e => { if (e.source === frame.contentWindow && e.data === 'close-book') closeBook(); });

/* ---------- deep link: index.html#scheduling opens straight away ---------- */
function fromHash() {
  const t = topics.find(x => x.id === location.hash.slice(1));
  if (t && !current) openBook(t, buttons[topics.indexOf(t)], false);
  else if (!t && current && !busy) closeBook();
}
addEventListener('hashchange', fromHash);
fromHash();
