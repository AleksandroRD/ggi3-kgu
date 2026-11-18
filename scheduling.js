(() => {
/* ================= NAVIGATION ================= */
const slides = [...document.querySelectorAll('.slide')];
const names = slides.map(s => s.dataset.name);
const dots = document.getElementById('dots');
let cur = -1;
slides.forEach((s, i) => {
  const b = document.createElement('button');
  b.title = s.querySelector('h1,h2').textContent.replace(/\s+/g,' ').trim();
  b.onclick = () => go(i);
  dots.appendChild(b);
});
function go(i){
  i = Math.max(0, Math.min(slides.length - 1, i));
  if (i === cur) return;
  cur = i;
  slides.forEach((s, k) => s.classList.toggle('active', k === i));
  [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
  document.getElementById('prev').disabled = i === 0;
  document.getElementById('next').disabled = i === slides.length - 1;
  document.getElementById('counter').textContent = (i + 1) + ' / ' + slides.length;
  if (location.hash.slice(1) !== names[i]) { try { location.hash = names[i]; } catch(e){} }
  requestAnimationFrame(resizeAll);
}
document.getElementById('prev').onclick = () => go(cur - 1);
document.getElementById('next').onclick = () => go(cur + 1);
window.addEventListener('hashchange', () => { const k = names.indexOf(location.hash.slice(1)); if (k >= 0) go(k); });
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape' && window.parent !== window) { window.parent.postMessage('close-book', '*'); return; }
  if (e.key === 'ArrowRight' || e.key === 'PageDown') go(cur + 1);
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(cur - 1);
  else if (e.key === ' ' && sims[names[cur]]) { e.preventDefault(); sims[names[cur]].togglePause(); }
});

/* canvas helper */
function fitCanvas(cv){
  const r = cv.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (r.width === 0) return null;
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W: r.width, H: r.height };
}
function rr(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/* ================= SLIDE 1: time-sharing demo ================= */
const apps = [
  { n:'System', c:'#0f9d8f', p:12 },
  { n:'Firefox',   c:'#e0486a', p:47 },
  { n:'VSCode',  c:'#6f58e0', p:78 },
];
const appsEl = document.getElementById('apps');
apps.forEach(a => {
  const row = document.createElement('div');
  row.className = 'app';
  row.innerHTML = `<span>${a.n}</span><div class="bar"><i style="background:${a.c}"></i></div><b>0%</b>`;
  appsEl.appendChild(row);
  a.row = row; a.fill = row.querySelector('i'); a.pct = row.querySelector('b');
});
const demo = { cur:0, left:0.06, slow:false, hist:[{a:0, d:0}] };
const slowBtn = document.getElementById('slowBtn');
slowBtn.onclick = () => {
  demo.slow = !demo.slow;
  slowBtn.textContent = demo.slow ? 'Back to real speed' : 'Slow down time';
};
function demoStep(rawDt){
  const q = 0.06;
  const dt = rawDt * (demo.slow ? 0.06 : 2);   // slow-motion = same simulation, slower clock
  demo.left -= dt;
  if (demo.left <= 0){
    demo.cur = (demo.cur + 1) % apps.length;
    demo.left = q;
    demo.hist.push({a:demo.cur, d:0});
    if (demo.hist.length > 400) demo.hist.splice(0, 200);
  }
  demo.hist[demo.hist.length - 1].d += dt;
  const a = apps[demo.cur];
  a.p = (a.p + dt * 33) % 100;
  apps.forEach((x, i) => {
    x.fill.style.width = x.p.toFixed(1) + '%';
    x.pct.textContent = Math.floor(x.p) + '%';
    x.row.classList.toggle('on', i === demo.cur);
  });
  document.getElementById('nowRun').textContent = a.n;
  document.getElementById('nowRun').style.color = a.c;
  drawTimeline(q);
}
function drawTimeline(q){
  const f = fitCanvas(document.getElementById('tl')); if (!f) return;
  const { ctx, W, H } = f;
  ctx.clearRect(0, 0, W, H);
  const win = q * 24;
  let x = W;
  for (let i = demo.hist.length - 1; i >= 0 && x > 0; i--){
    const s = demo.hist[i]; const w = s.d / win * W;
    x -= w;
    ctx.fillStyle = apps[s.a].c;
    ctx.globalAlpha = i === demo.hist.length - 1 ? 1 : 0.8;
    ctx.fillRect(x, 8, Math.max(w - 1, 0.5), H - 16);
    if (w > 46){
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
      ctx.font = '600 11px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(apps[s.a].n, x + w / 2, H / 2);
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1a2233'; ctx.fillRect(W - 2, 4, 2, H - 8);
}

/* ================= SLIDE 2: state diagram ================= */
const INFO = {
  new:     ['New', 'The process is being created: the OS allocates memory and a Process Control Block (PCB).'],
  ready:   ['Ready', 'The process has everything it needs except the CPU. It waits in the <b>ready queue</b>. This is the queue the scheduler picks from.'],
  running: ['Running', 'The process is executing instructions on the CPU. On a single core, only one process can be in this state at a time.'],
  waiting: ['Waiting (blocked)', 'The process is waiting for something other than the CPU, such as disk, network or keyboard input. It cannot run even if the CPU is free.'],
  term:    ['Terminated', 'The process has finished. The OS frees its resources.'],
  admit:   ['admitted', 'The OS accepts the new process and puts it in the ready queue.'],
  dispatch:['dispatch: the scheduler\'s decision', 'The scheduler picks one process from the ready queue and gives it the CPU. A <b>context switch</b> loads that process\'s saved state. <b>Which</b> process gets picked is exactly what a scheduling algorithm decides.'],
  preempt: ['interrupt / time slice over', 'In <b>preemptive</b> algorithms the OS can take the CPU away, for example when a time slice ends, and send the process back to Ready. FCFS never does this.'],
  io:      ['I/O wait', 'The process asks for I/O (reading a file, say) and gives up the CPU voluntarily while it waits.'],
  iodone:  ['I/O done', 'The I/O finishes. The process does not run immediately. It goes back to the ready queue.'],
  exit:    ['exit', 'The process finishes its work and leaves the system.'],
};
const infoEl = document.getElementById('info');
function showInfo(k){
  document.querySelectorAll('#sd .node, #sd .edge').forEach(g => g.classList.toggle('sel', g.dataset.k === k));
  infoEl.innerHTML = `<b>${INFO[k][0]}</b><p>${INFO[k][1]}</p>`;
}
document.querySelectorAll('#sd .node, #sd .edge').forEach(g => g.addEventListener('click', () => showInfo(g.dataset.k)));

/* story: one process (a video player) walks through the diagram */
const LIFE = [
  { k:'new',      cap:'You double-click a video player. The OS starts creating the process: it reserves memory and fills in a Process Control Block.', who:'os' },
  { k:'admit',    cap:'The OS accepts it. The player now has everything except the CPU, so it joins the ready queue with the other waiting programs.', who:'os' },
  { k:'dispatch', cap:'The CPU is free. The scheduler looks at the ready queue and picks the player. A context switch loads its saved state.', who:'sched' },
  { k:'preempt',  cap:'Its time slice is over (or something more important arrived). The OS takes the CPU back and the player returns to the ready queue.', who:'sched' },
  { k:'dispatch', cap:'The scheduler picks the player again, and it continues exactly where it stopped.', who:'sched' },
  { k:'io',       cap:'The player asks the disk for the next part of the video. It cannot go on without it, so it gives up the CPU and waits.', who:'proc' },
  { k:'iodone',   cap:'The disk is done. The player does not jump onto the CPU: it goes back to the ready queue and waits for its turn.', who:'os' },
  { k:'dispatch', cap:'The scheduler picks it once more, and the video plays.', who:'sched' },
  { k:'exit',     cap:'You close the player. It finishes, the OS frees its memory, and the process is gone.', who:'proc' },
];
const LIFE_WHO = { os:'the OS decides', proc:'the process decides', sched:'the SCHEDULER decides here' };
const LIFE_EDGE = { admit:['new','ready'], dispatch:['ready','running'], preempt:['running','ready'], io:['running','waiting'], iodone:['waiting','ready'], exit:['running','term'] };
const LIFE_C = { new:[75,60], ready:[191,160], running:[431,160], waiting:[311,264], term:[560,60] };
const life = { i:0, t:0, playing:false, stepping:false, active:false };
const tokEl = document.getElementById('tok'), lifePlay = document.getElementById('lifePlay');
function lifeSel(k){ document.querySelectorAll('#sd .node, #sd .edge').forEach(g => g.classList.toggle('sel', g.dataset.k === k)); }
function lifeEnter(){
  const s = LIFE[life.i];
  lifeSel(s.k);
  infoEl.innerHTML = `<b>Step ${life.i + 1} of ${LIFE.length}: ${INFO[s.k][0]}</b><p>${s.cap}</p><span class="who ${s.who}">${LIFE_WHO[s.who]}</span>`;
}
function lifePos(s, t){
  if (s.k === 'new') return LIFE_C.new;
  const [a, b] = LIFE_EDGE[s.k], path = document.querySelector(`#sd .edge[data-k=${s.k}] path.vis`), L = path.getTotalLength();
  const A = LIFE_C[a], B = LIFE_C[b], P0 = path.getPointAtLength(0), P1 = path.getPointAtLength(L);
  const mix = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  if (t < 0.3) return mix(A, [P0.x, P0.y], t / 0.3);
  if (t < 1.5){ const u = (t - 0.3) / 1.2, e = u * u * (3 - 2 * u), P = path.getPointAtLength(L * e); return [P.x, P.y]; }
  if (t < 1.8) return mix([P1.x, P1.y], B, (t - 1.5) / 0.3);
  return B;
}

/* other programs moving around the diagram, so the main process is not alone */
const AMB_COLS = ['#3a7bd5', '#e0486a', '#6f58e0', '#0f9d8f'];
const AMB_SLOT = { running:[431,160], waiting:[311,264], term:[560,60], new:[75,60] };
const ambG = document.getElementById('amb');
const amb = AMB_COLS.map((col, n) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  el.setAttribute('r', 9); el.setAttribute('fill', col); el.setAttribute('stroke', '#fff'); el.setAttribute('stroke-width', 2);
  ambG.appendChild(el);
  return { el, st:'ready', x:114 - n * 26, y:160, a:1, t:0, dwell:1 + n * 0.8, qt:n, edge:null, to:null, from:null };
});
let ambQ = amb.length;
function ambGo(a, key){
  const to = LIFE_EDGE[key] ? LIFE_EDGE[key][1] : (key === 'admit' ? 'ready' : null);
  a.edge = key; a.to = key === 'admit' ? 'ready' : to; a.from = [a.x, a.y]; a.t = 0; a.st = 'moving';
}
function ambStep(dt){
  const s = LIFE[life.i];
  const mainCpu = s.k === 'dispatch' || ((s.k === 'preempt' || s.k === 'io' || s.k === 'exit') && life.t < 0.6);
  const cpuBusy = amb.some(a => a.st === 'running' || (a.st === 'moving' && a.to === 'running'));
  const readyQ = amb.filter(a => a.st === 'ready').sort((p, q) => p.qt - q.qt);
  const k = Math.min(1, dt * 6);
  amb.forEach(a => {
    if (a.st === 'ready'){
      const i = readyQ.indexOf(a), sx = 114 - i * 26;
      a.x += (sx - a.x) * k; a.y += (160 - a.y) * k; a.a = 1; a.dwell -= dt;
      if (i === 0 && a.dwell <= 0 && !cpuBusy && !mainCpu){ ambGo(a, 'dispatch'); a.dwell = 1.6 + Math.random() * 1.6; }
    } else if (a.st === 'running'){
      a.x += (AMB_SLOT.running[0] - a.x) * k; a.y += (AMB_SLOT.running[1] - a.y) * k; a.dwell -= dt;
      const forced = s.k === 'dispatch' && life.t > 0.3;       // the main process was dispatched: this one is preempted
      if (a.dwell <= 0 || forced){
        const r = Math.random();
        ambGo(a, forced || r < 0.5 ? 'preempt' : r < 0.85 ? 'io' : 'exit');
      }
    } else if (a.st === 'waiting'){
      a.x += (AMB_SLOT.waiting[0] - a.x) * k; a.y += (AMB_SLOT.waiting[1] - a.y) * k; a.dwell -= dt;
      if (a.dwell <= 0) ambGo(a, 'iodone');
    } else if (a.st === 'term'){
      a.dwell -= dt; a.a = Math.max(0, a.dwell / 1.2);
      if (a.dwell <= 0){ a.st = 'new'; a.x = AMB_SLOT.new[0]; a.y = AMB_SLOT.new[1]; a.dwell = 1.4; }
    } else if (a.st === 'new'){
      a.a = Math.min(1, a.a + dt * 2); a.dwell -= dt;
      if (a.dwell <= 0) ambGo(a, 'admit');
    } else if (a.st === 'moving'){
      a.t += dt;
      const path = document.querySelector(`#sd .edge[data-k=${a.edge}] path.vis`), L = path.getTotalLength(), T = 1.3;
      const u = Math.min(1, a.t / T), P0 = path.getPointAtLength(0);
      if (u < 0.15){ const v = u / 0.15; a.x = a.from[0] + (P0.x - a.from[0]) * v; a.y = a.from[1] + (P0.y - a.from[1]) * v; }
      else { const w = (u - 0.15) / 0.85, e = w * w * (3 - 2 * w), P = path.getPointAtLength(L * e); a.x = P.x; a.y = P.y; }
      if (u >= 1){
        a.st = a.to;
        if (a.st === 'ready'){ a.qt = ambQ++; a.dwell = 0.8 + Math.random() * 1.2; }
        if (a.st === 'waiting') a.dwell = 2 + Math.random() * 1.8;
        if (a.st === 'running') a.dwell = 1.6 + Math.random() * 1.6;
        if (a.st === 'term') a.dwell = 1.2;
      }
    }
    a.el.setAttribute('cx', a.x.toFixed(1)); a.el.setAttribute('cy', a.y.toFixed(1)); a.el.setAttribute('opacity', a.a);
  });
}
function lifeStep(dt){
  ambStep(dt);
  if (!life.active){ life.active = true; life.i = 0; life.t = 0; life.stepping = false; life.playing = false; lifePlay.textContent = 'Play'; lifeEnter(); }
  const s = LIFE[life.i], dur = s.k === 'new' ? 3.4 : 4.2;
  if (life.playing || life.stepping){
    life.t += dt;
    if (life.stepping && life.t >= 1.8) life.stepping = false;
    if (life.playing && life.t >= dur){ life.i = (life.i + 1) % LIFE.length; life.t = 0; lifeEnter(); }
  }
  const s2 = LIFE[life.i];
  if (s2.k !== 'new' && life.t >= 1.8) lifeSel(LIFE_EDGE[s2.k][1]);
  const p = lifePos(s2, life.t);
  tokEl.setAttribute('transform', `translate(${p[0]},${p[1]})`);
}
function lifePause(){ life.playing = false; life.stepping = false; lifePlay.textContent = 'Play'; }
document.querySelectorAll('#sd .node, #sd .edge').forEach(g => g.addEventListener('click', lifePause));
lifePlay.onclick = () => {
  if (life.playing) lifePause(); else { life.playing = true; lifePlay.textContent = 'Pause'; lifeEnter(); }
};
document.getElementById('lifeBack').onclick = () => {
  life.i = (life.i + LIFE.length - 1) % LIFE.length; life.t = 1.8; life.stepping = false; lifePause(); lifeEnter();
};
document.getElementById('lifeStep').onclick = () => {
  life.i = (life.i + 1) % LIFE.length; life.t = 0; life.stepping = true; lifeEnter();
};

/* ================= SLIDE 3: newspaper queue (top view) ================= */
const PCOLS = ['#0f9d8f','#e0486a','#6f58e0','#d98200','#3a7bd5','#d93c3c'];
const paper = { people:[], spawnIn:0.3, n:0, W:0, H:0 };
function paperGeom(W, H){
  const colX = W - 150, counterY = H - 150;
  return { colX, counterY, frontY: counterY - 50, gap: 52 };
}
function paperStep(dt){
  const cv = document.getElementById('paper');
  const f = fitCanvas(cv); if (!f) return;
  const { W, H } = f; paper.W = W; paper.H = H;
  const g = paperGeom(W, H), P = paper.people;
  const inLine = P.filter(p => p.st !== 'leaving');
  const maxQ = Math.max(2, Math.floor((g.frontY + 10) / g.gap));
  paper.spawnIn -= dt;
  if (paper.spawnIn <= 0 && inLine.length < maxQ){
    P.push({ id: ++paper.n, x: g.colX, y: -16, st:'queue', t:0, need: 2.2 + Math.random() * 1.2,
             col: PCOLS[paper.n % PCOLS.length] });
    paper.spawnIn = 1.7 + Math.random() * 0.8;
  }
  inLine.forEach((p, i) => {                 // queue order = array order
    const ty = g.frontY - i * g.gap;
    const d = ty - p.y;
    p.y += Math.sign(d) * Math.min(Math.abs(d), 80 * dt);
    p.x = g.colX;
    if (i === 0 && p.st === 'queue' && Math.abs(d) < 0.5) p.st = 'serving';
    if (p.st === 'serving'){
      p.t += dt;
      if (p.t >= p.need){ p.st = 'leaving'; }
    }
  });
  paper.people = P.filter(p => !(p.st === 'leaving' && p.x < -20));
  paper.people.forEach(p => { if (p.st === 'leaving') p.x -= 120 * dt; });
  // keep leavers out of the queue ordering but still drawn
  paper.people.sort((a, b) => (a.st === 'leaving') - (b.st === 'leaving') || a.id - b.id);
  drawPaper();
}
function paperIcon(ctx, x, y){   // newspaper centred at x,y, 24x17 with text lines
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#55627c'; ctx.lineWidth = 1;
  rr(ctx, x - 12, y - 8.5, 24, 17, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#55627c'; ctx.fillRect(x - 9, y - 6, 18, 2.5);        // headline
  ctx.fillStyle = '#8591a8';
  for (let i = 0; i < 3; i++){ ctx.fillRect(x - 9, y - 1 + i * 3.5, 8, 1.2); ctx.fillRect(x + 1, y - 1 + i * 3.5, 8, 1.2); }
}
function drawPaper(){
  const cv = document.getElementById('paper');
  const f = fitCanvas(cv); if (!f) return;
  const { ctx, W, H } = f;
  const g = paperGeom(W, H);
  ctx.clearRect(0, 0, W, H);
  // kiosk counter
  const kw = 200, kx = g.colX - kw / 2;
  ctx.fillStyle = '#c9ab7a'; rr(ctx, kx, g.counterY, kw, 46, 8); ctx.fill();
  ctx.fillStyle = '#b48f5c'; ctx.fillRect(kx + 8, g.counterY + 8, kw - 16, 4);
  // newspapers on the counter
  [[-62, 0], [-38, 3]].forEach(([dx, dy]) => {
    paperIcon(ctx, g.colX + dx, g.counterY + 28 + dy);
  });
  // seller (behind the counter)
  ctx.fillStyle = '#1a2233'; ctx.beginPath(); ctx.arc(g.colX, g.counterY + 78, 24, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CPU', g.colX, g.counterY + 78);
  // people
  paper.people.forEach(p => {
    const r = 20;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 3, r, 0, 7); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    if (p.st === 'serving'){
      ctx.strokeStyle = '#1a2233'; ctx.lineWidth = 3; ctx.beginPath();
      const u = Math.min(1, p.t / p.need), ease = v => v * v * (3 - 2 * v);
      ctx.arc(p.x, p.y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); ctx.stroke();
      const sy = g.counterY + 78, hx = g.colX - 38, hy = g.counterY + 28;
      if (u > .05 && u < .4){                      // pays: dollar goes to the seller
        const k = ease((u - .05) / .3), dy = p.y + (sy - p.y) * k;
        ctx.fillStyle = '#2e9e5b'; ctx.strokeStyle = '#1f7a43'; ctx.lineWidth = 1;
        rr(ctx, p.x - 13, dy - 8, 26, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', p.x, dy + .5);
      }
      if (u >= .5){                                // takes a newspaper from the counter
        const k = ease(Math.min(1, (u - .5) / .35));
        paperIcon(ctx, hx + (p.x - hx) * k, hy + (p.y - r - 6 - hy) * k);
      }
    }
    if (p.st === 'leaving'){
      paperIcon(ctx, p.x, p.y - r - 6);
    }
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ================= SJF overview: express checkout lane ================= */
const shop = { people:[], spawnIn:0.3, n:0 };
const ITEM_CHOICES = [2, 3, 4, 5, 8, 12, 16];
function shopGeom(W, H){
  const colX = W - 150, counterY = H - 150;
  return { colX, counterY, frontY: counterY - 50, gap: 46 };
}
function checkoutStep(dt){
  const f = fitCanvas(document.getElementById('checkout')); if (!f) return;
  const { W, H } = f, g = shopGeom(W, H), P = shop.people;
  const waiting = P.filter(p => p.st === 'queue').sort((a, b) => a.items - b.items || a.id - b.id);
  const serving = P.find(p => p.st === 'serving');
  const maxQ = Math.max(3, Math.floor((g.frontY + 10) / g.gap));
  shop.spawnIn -= dt;
  if (shop.spawnIn <= 0 && waiting.length + (serving ? 1 : 0) < maxQ){
    const items = ITEM_CHOICES[Math.floor(Math.random() * ITEM_CHOICES.length)];
    P.push({ id: ++shop.n, x: g.colX + 60, y: -16, st:'queue', t:0, items, need: 0.7 + 0.28 * items, col: PCOLS[shop.n % PCOLS.length] });
    shop.spawnIn = 1.1 + Math.random() * 0.8;
  }
  if (!serving && waiting.length){ waiting[0].st = 'serving'; waiting.shift(); }   // smallest basket goes first
  const k = Math.min(1, dt * 6);
  waiting.forEach((p, i) => { p.x += (g.colX - p.x) * k; p.y += (g.frontY - g.gap * (i + 1) - p.y) * k; });
  P.forEach(p => {
    if (p.st === 'serving'){
      p.x += (g.colX - p.x) * k; p.y += (g.frontY - p.y) * k;
      if (Math.abs(p.x - g.colX) < 2 && Math.abs(p.y - g.frontY) < 2){ p.t += dt; if (p.t >= p.need) p.st = 'leaving'; }
    } else if (p.st === 'leaving') p.x -= 130 * dt;
  });
  shop.people = P.filter(p => !(p.st === 'leaving' && p.x < -80));
  drawCheckout();
}
function basketIcon(ctx, x, y, items, total){   // basket whose size shows the burst; `items` still inside
  const w = 14 + total * 2.2, h = 16;
  ctx.fillStyle = '#c9ab7a'; ctx.strokeStyle = '#8f6f3e'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x, y - h / 2); ctx.lineTo(x + w, y - h / 2); ctx.lineTo(x + w - 3, y + h / 2); ctx.lineTo(x + 3, y + h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  const cols = ['#e0486a', '#0f9d8f', '#d98200', '#6f58e0'];
  for (let i = 0; i < items; i++){
    const row = Math.floor(i / 8), c = i % 8, per = Math.min(8, total);
    ctx.fillStyle = cols[i % 4];
    ctx.fillRect(x + 3 + c * ((w - 8) / per), y - h / 2 - 5 - row * 5, Math.max(3, (w - 8) / per - 1), 5);
  }
}
function drawCheckout(){
  const f = fitCanvas(document.getElementById('checkout')); if (!f) return;
  const { ctx, W, H } = f, g = shopGeom(W, H);
  ctx.clearRect(0, 0, W, H);
  const kw = 200, kx = g.colX - kw / 2;
  const cy = g.counterY, t = performance.now() / 1000, busy = shop.people.some(p => p.st === 'serving');
  // lane sign
  const sx = kx - 62;
  ctx.fillStyle = '#8a93a6'; ctx.fillRect(sx - 2, cy - 40, 4, 98);
  ctx.fillStyle = '#e0486a'; rr(ctx, sx - 46, cy - 66, 92, 26, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 13px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('EXPRESS', sx, cy - 53);
  // counter body
  ctx.fillStyle = '#d9dee8'; rr(ctx, kx - 6, cy - 4, kw + 12, 62, 8); ctx.fill();
  ctx.fillStyle = '#b6bfcf'; ctx.fillRect(kx - 6, cy + 46, kw + 12, 12);
  // conveyor belt (moving rollers while serving)
  ctx.fillStyle = '#2b3347'; rr(ctx, kx, cy, kw - 52, 36, 6); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.rect(kx + 4, cy + 3, kw - 60, 30); ctx.clip();
  ctx.fillStyle = '#434d66';
  const off = busy ? (t * 30) % 14 : 0;
  for (let x = kx - 14 + off; x < kx + kw; x += 14) ctx.fillRect(x, cy + 3, 4, 30);
  ctx.restore();
  // scanner strip + laser
  ctx.fillStyle = '#9aa5ba'; ctx.fillRect(kx + kw - 74, cy - 2, 22, 40);
  ctx.fillStyle = busy && Math.floor(t * 6) % 2 ? '#ff3b4e' : '#7a1f2b'; ctx.fillRect(kx + kw - 70, cy + 16, 14, 3);
  // cash register
  ctx.fillStyle = '#3a455f'; rr(ctx, kx + kw - 48, cy - 26, 44, 56, 6); ctx.fill();
  ctx.fillStyle = busy ? '#6fe3b3' : '#3d7a63'; rr(ctx, kx + kw - 42, cy - 20, 32, 14, 3); ctx.fill();
  ctx.fillStyle = '#9aa5ba';
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) ctx.fillRect(kx + kw - 42 + c * 11, cy + 2 + r * 9, 8, 6);
  // cashier = CPU
  ctx.fillStyle = '#1a2233'; ctx.beginPath(); ctx.arc(g.colX, cy + 88, 24, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CPU', g.colX, cy + 88);
  shop.people.forEach(p => {
    const r = 18;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 3, r, 0, 7); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    let left = p.items;
    if (p.st === 'serving'){
      const u = Math.min(1, p.t / p.need);
      left = Math.ceil(p.items * (1 - u));
      ctx.strokeStyle = '#1a2233'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); ctx.stroke();
    } else if (p.st === 'leaving') left = 0;
    basketIcon(ctx, p.x + r + 4, p.y, left, p.items);
    ctx.fillStyle = '#fff'; ctx.font = '700 12px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.items, p.x, p.y + .5);
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ================= Priority overview: hospital emergency room ================= */
const er = { people:[], spawnIn:0.3, n:0 };
const ER_COL = ['', '#d93c3c', '#e8730c', '#d4a300', '#2e9e5b'];
const ER_TXT = ['', 'critical', 'urgent', 'normal', 'minor'];
function erStep(dt){
  const f = fitCanvas(document.getElementById('er')); if (!f) return;
  const { W, H } = f, g = shopGeom(W, H), P = er.people;
  const waiting = P.filter(p => p.st === 'queue').sort((a, b) => a.prio - b.prio || a.id - b.id);
  const serving = P.find(p => p.st === 'serving');
  const maxQ = Math.max(3, Math.floor((g.frontY + 10) / g.gap));
  er.spawnIn -= dt;
  if (er.spawnIn <= 0 && waiting.length + (serving ? 1 : 0) < maxQ){
    const r = Math.random(), prio = r < .15 ? 1 : r < .4 ? 2 : r < .7 ? 3 : 4;
    P.push({ id: ++er.n, x: g.colX + 60, y: -16, st:'queue', t:0, prio, need: 1.6 + Math.random() * 0.8, col: PCOLS[er.n % PCOLS.length] });
    er.spawnIn = 1.2 + Math.random() * 0.8;
  }
  if (!serving && waiting.length){ waiting[0].st = 'serving'; waiting.shift(); }   // most urgent first
  const k = Math.min(1, dt * 6);
  waiting.forEach((p, i) => { p.x += (g.colX - p.x) * k; p.y += (g.frontY - g.gap * (i + 1) - p.y) * k; });
  P.forEach(p => {
    if (p.st === 'serving'){
      p.x += (g.colX - p.x) * k; p.y += (g.frontY - p.y) * k;
      if (Math.abs(p.x - g.colX) < 2 && Math.abs(p.y - g.frontY) < 2){ p.t += dt; if (p.t >= p.need) p.st = 'leaving'; }
    } else if (p.st === 'leaving') p.x -= 130 * dt;
  });
  er.people = P.filter(p => !(p.st === 'leaving' && p.x < -80));
  drawER();
}
function drawER(){
  const f = fitCanvas(document.getElementById('er')); if (!f) return;
  const { ctx, W, H } = f, g = shopGeom(W, H);
  ctx.clearRect(0, 0, W, H);
  const kw = 200, kx = g.colX - kw / 2;
  ctx.fillStyle = '#e9eef5'; rr(ctx, kx, g.counterY, kw, 46, 8); ctx.fill();
  ctx.fillStyle = '#d93c3c'; ctx.fillRect(g.colX - 4, g.counterY + 10, 8, 26); ctx.fillRect(g.colX - 13, g.counterY + 19, 26, 8);   // red cross
  ctx.fillStyle = '#1a2233'; ctx.beginPath(); ctx.arc(g.colX, g.counterY + 78, 24, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CPU', g.colX, g.counterY + 78);
  er.people.forEach(p => {
    const r = 18;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 3, r, 0, 7); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    if (p.st === 'serving'){
      const u = Math.min(1, p.t / p.need);
      ctx.strokeStyle = '#1a2233'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * u); ctx.stroke();
    }
    ctx.fillStyle = ER_COL[p.prio]; rr(ctx, p.x + r + 6, p.y - 11, 78, 22, 11); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('P' + p.prio + ' ' + ER_TXT[p.prio], p.x + r + 45, p.y + .5);
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ================= Round Robin overview: poker table ================= */
// The dealer (CPU) gives ONE card (= one quantum) to each player in turn. After a full round,
// players who have all the cards they need leave and new players sit down.
const pk = { seats:[null, null, null, null, null], order:[], fly:null, wait:0.4, spawnIn:0.2, n:0, out:[] };
const PK_ANG = [-30, 30, 90, 150, 210].map(a => a * Math.PI / 180);
function pkGeom(W, H){
  const rx = Math.max(110, Math.min(190, W * 0.14)), ry = rx * 0.62;
  return { rx, ry, cx: W - rx * 1.25 - 50, cy: H / 2 + 40 };
}
function pkSeat(g, i, s){ return { x: g.cx + g.rx * s * Math.cos(PK_ANG[i]), y: g.cy + g.ry * s * Math.sin(PK_ANG[i]) }; }
function rrStep(dt){
  const f = fitCanvas(document.getElementById('rrcv')); if (!f) return;
  const { W, H } = f, g = pkGeom(W, H);
  pk.spawnIn -= dt;
  const free = pk.seats.map((p, i) => p ? -1 : i).filter(i => i >= 0);
  if (pk.spawnIn <= 0 && free.length){
    const i = free[Math.floor(Math.random() * free.length)];
    pk.seats[i] = { id: ++pk.n, need: 2 + Math.floor(Math.random() * 4), cards: 0, a: 0, col: PCOLS[pk.n % PCOLS.length] };
    pk.spawnIn = 1.2 + Math.random() * 1.6;
  }
  pk.seats.forEach(p => { if (p) p.a = Math.min(1, p.a + dt * 3); });
  pk.out.forEach(p => { p.t += dt; });
  pk.out = pk.out.filter(p => p.t < 1.2);
  if (pk.fly){
    pk.fly.t += dt;
    if (pk.fly.t >= 0.45){
      const p = pk.seats[pk.fly.seat]; if (p) p.cards++;
      pk.fly = null; pk.wait = 0.2;
    }
  } else if ((pk.wait -= dt) <= 0){
    if (!pk.order.length){
      pk.order = pk.seats.map((p, i) => p && p.a >= 1 ? i : -1).filter(i => i >= 0);
      if (!pk.order.length){ pk.wait = 0.3; }
    }
    if (pk.order.length){
      pk.fly = { seat: pk.order.shift(), t: 0 };
      if (!pk.order.length) pk.roundEnd = true;
    }
  }
  if (!pk.fly && pk.roundEnd && pk.wait > 0 && pk.order.length === 0){
    // round finished: whoever has all their cards leaves
    pk.seats.forEach((p, i) => {
      if (p && p.cards >= p.need){
        const s = pkSeat(g, i, 1.25);
        pk.out.push({ x: s.x, y: s.y, dx: Math.cos(PK_ANG[i]), dy: Math.sin(PK_ANG[i]), col: p.col, t: 0 });
        pk.seats[i] = null;
      }
    });
    pk.roundEnd = false; pk.wait = 0.7;
  }
  drawRR();
}
function drawRR(){
  const f = fitCanvas(document.getElementById('rrcv')); if (!f) return;
  const { ctx, W, H } = f, g = pkGeom(W, H);
  ctx.clearRect(0, 0, W, H);
  // table
  ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rx + 14, g.ry + 14, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#0e7a55'; ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rx, g.ry, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(g.cx, g.cy, g.rx - 12, g.ry - 12, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('1 card per turn', g.cx, g.cy - 4);
  // dealer
  const dx = g.cx, dy = g.cy - g.ry - 44;
  ctx.fillStyle = '#1a2233'; ctx.beginPath(); ctx.arc(dx, dy, 24, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.fillText('CPU', dx, dy);
  ctx.fillStyle = '#fff'; rr(ctx, dx + 30, g.cy - g.ry + 4, 14, 20, 3); ctx.fill();       // deck
  ctx.fillStyle = '#e0486a'; rr(ctx, dx + 33, g.cy - g.ry + 7, 8, 14, 2); ctx.fill();
  // players
  pk.seats.forEach((p, i) => {
    if (!p) return;
    const s = pkSeat(g, i, 1.25), c = pkSeat(g, i, 0.58);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(s.x + 2, s.y + 3, 18, 0, 7); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(s.x, s.y, 18, 0, 7); ctx.fill();
    const w = p.need * 15, x0 = c.x - w / 2;
    for (let k = 0; k < p.need; k++){
      if (k < p.cards){ ctx.fillStyle = '#fff'; rr(ctx, x0 + k * 15, c.y - 10, 12, 18, 2); ctx.fill(); ctx.fillStyle = p.col; rr(ctx, x0 + k * 15 + 2, c.y - 8, 8, 14, 1.5); ctx.fill(); }
      else { ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); rr(ctx, x0 + k * 15, c.y - 10, 12, 18, 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    ctx.globalAlpha = 1;
  });
  // flying card
  if (pk.fly){
    const c = pkSeat(g, pk.fly.seat, 0.58), p = pk.seats[pk.fly.seat], u = Math.min(1, pk.fly.t / 0.45), e = u * u * (3 - 2 * u);
    const tx = p ? c.x - p.need * 7.5 + p.cards * 15 + 6 : c.x, ty = c.y - 1;
    const fx = dx + 37, fy = g.cy - g.ry + 14;
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1a2233'; ctx.lineWidth = 1;
    ctx.save(); ctx.translate(fx + (tx - fx) * e, fy + (ty - fy) * e); ctx.rotate(e * 6.28);
    rr(ctx, -6, -9, 12, 18, 2); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  // players leaving
  pk.out.forEach(p => {
    const u = p.t / 1.2;
    ctx.globalAlpha = 1 - u; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x + p.dx * 120 * u, p.y + p.dy * 80 * u, 18, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ================= CFS overview: bar, serve whoever had the fewest drinks ================= */
const bar = { stools:[null, null, null, null, null], fly:null, wait:0.4, spawnIn:0.2, n:0, out:[] };
function barGeom(W, H){
  const rx = Math.max(110, Math.min(190, W * 0.14));
  return { rx, cx: W - rx - 60, cy: H / 2 + 20, sp: 2 * rx / 5 };
}
function barPos(g, i){ return { x: g.cx - g.rx + (i + 0.5) * g.sp, y: g.cy + 62 }; }
function cfsStep(dt){
  const f = fitCanvas(document.getElementById('cfscv')); if (!f) return;
  const { W, H } = f, g = barGeom(W, H);
  bar.spawnIn -= dt;
  const free = bar.stools.map((p, i) => p ? -1 : i).filter(i => i >= 0);
  if (bar.spawnIn <= 0 && free.length){
    const i = free[Math.floor(Math.random() * free.length)];
    bar.stools[i] = { id: ++bar.n, limit: 3 + Math.floor(Math.random() * 3), drinks: 0, a: 0, sip: 0, done: 0, col: PCOLS[bar.n % PCOLS.length] };
    bar.spawnIn = 1.5 + Math.random() * 1.8;
  }
  bar.stools.forEach((p, i) => {
    if (!p) return;
    p.a = Math.min(1, p.a + dt * 3); p.sip = Math.max(0, p.sip - dt);
    if (p.drinks >= p.limit && !(bar.fly && bar.fly.seat === i)){          // drunk enough: leave
      p.done += dt;
      if (p.done > 0.9){ const s = barPos(g, i); bar.out.push({ x: s.x, y: s.y, col: p.col, t: 0, ph: i }); bar.stools[i] = null; }
    }
  });
  bar.out.forEach(p => { p.t += dt; });
  bar.out = bar.out.filter(p => p.t < 1.8);
  if (bar.fly){
    bar.fly.t += dt;
    if (bar.fly.t >= 0.5){
      const p = bar.stools[bar.fly.seat]; if (p){ p.drinks++; p.sip = 0.5; }
      bar.fly = null; bar.wait = 0.35;
    }
  } else if ((bar.wait -= dt) <= 0){
    // the bartender serves whoever has had the FEWEST drinks so far
    const cand = bar.stools.map((p, i) => ({ p, i })).filter(o => o.p && o.p.a >= 1 && o.p.drinks < o.p.limit)
      .sort((a, b) => a.p.drinks - b.p.drinks || a.p.id - b.p.id)[0];
    if (cand) bar.fly = { seat: cand.i, t: 0 }; else bar.wait = 0.2;
  }
  drawCFS();
}
function drawCFS(){
  const f = fitCanvas(document.getElementById('cfscv')); if (!f) return;
  const { ctx, W, H } = f, g = barGeom(W, H), t = performance.now() / 1000;
  ctx.clearRect(0, 0, W, H);
  const bx = g.cx - g.rx - 20, bw = 2 * g.rx + 40;
  // back shelf with bottles
  ctx.fillStyle = '#6b4a2b'; ctx.fillRect(bx, g.cy - 112, bw, 6);
  const bc = ['#0f9d8f', '#d98200', '#e0486a', '#6f58e0', '#3a7bd5'];
  for (let k = 0; k < 9; k++){ ctx.fillStyle = bc[k % 5]; rr(ctx, bx + 12 + k * (bw - 36) / 8, g.cy - 140, 12, 28, 3); ctx.fill(); }
  // bartender
  ctx.fillStyle = '#1a2233'; ctx.beginPath(); ctx.arc(g.cx, g.cy - 52, 24, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CPU', g.cx, g.cy - 52);
  // counter
  ctx.fillStyle = '#8a5a2e'; rr(ctx, bx, g.cy - 16, bw, 34, 8); ctx.fill();
  ctx.fillStyle = '#a8713a'; rr(ctx, bx, g.cy - 16, bw, 10, 6); ctx.fill();
  ctx.fillStyle = '#5e3d1e'; ctx.fillRect(bx + 10, g.cy + 18, bw - 20, 10);
  // customers
  bar.stools.forEach((p, i) => {
    if (!p) return;
    const s = barPos(g, i), amp = 5 * p.drinks / p.limit, sw = Math.sin(t * 3 + i) * amp * (p.drinks ? 1 : 0);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = '#3a455f'; ctx.fillRect(s.x - 2, s.y + 24, 4, 24); ctx.fillRect(s.x - 14, s.y + 46, 28, 4);   // stool
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(s.x + sw + 2, s.y + 3, 18, 0, 7); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(s.x + sw, s.y, 18, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(224,72,106,' + (0.55 * p.drinks / p.limit) + ')'; ctx.beginPath(); ctx.arc(s.x + sw - 8, s.y + 4, 4, 0, 7); ctx.arc(s.x + sw + 8, s.y + 4, 4, 0, 7); ctx.fill();   // flushed cheeks
    if (p.sip > 0){ ctx.fillStyle = '#e8a53a'; rr(ctx, s.x + sw + 14, s.y - 22 - p.sip * 6, 10, 14, 2); ctx.fill(); }
    for (let k = 0; k < p.limit; k++){                      // drinks so far / how many until drunk
      ctx.fillStyle = k < p.drinks ? '#e8a53a' : 'rgba(26,34,51,.15)';
      ctx.beginPath(); ctx.arc(s.x - (p.limit - 1) * 6 + k * 12, s.y + 66, 4, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  // flying glass
  if (bar.fly){
    const s = barPos(g, bar.fly.seat), u = Math.min(1, bar.fly.t / 0.5), gx = g.cx + (s.x - g.cx) * u;
    ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(ctx, gx - 5, g.cy - 34, 10, 16, 2); ctx.fill();
    ctx.fillStyle = '#e8a53a'; ctx.fillRect(gx - 4, g.cy - 28, 8, 9);
  }
  // drunk customers staggering away
  bar.out.forEach(p => {
    const u = p.t / 1.8;
    ctx.globalAlpha = 1 - u * u; ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x - 220 * u + Math.sin(p.t * 6 + p.ph) * 12, p.y + Math.sin(p.t * 4) * 4, 18, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = '#8591a8'; ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
  ctx.fillText('fewest drinks so far is served next  ·  dots = drinks until drunk', W - 40, 24);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ================= SIMULATION (FCFS + SJF + Priority) ================= */
function createSim(sfx, policy){
const $ = id => document.getElementById(id + sfx);
const cv = $('fcfs');
const stageEl = $('stage');
const MAXQ = 10;
const cfg = { speed:2, rate:0.16, cs:0.3, quantum:4 };
const BASE_RATE = 0.16;
let S;
const NAMES = ['System','Chrome','WhatsApp','Spotify','VS Code','Terminal','Slack','Zoom','Discord','Steam','Firefox','Telegram','Outlook','Word','Excel','Photoshop','Docker','Finder','Notes','Updater'];
const nameOf = pid => NAMES[(pid - 1) % NAMES.length];
const fitText = (ctx, t, maxW) => { if (ctx.measureText(t).width <= maxW) return t; while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; };
const color = pid => `hsl(${(pid * 67) % 360} 68% 50%)`;
const randBurst = () => 2 + Math.floor(Math.random() * 7);          // 2..8
const expRand = () => -Math.log(1 - Math.random()) / cfg.rate;

function resetSim(){
  S = { t:0, nextPid:1, queue:[], cpu:null, mode:'idle', csLeft:0, qLeft:0, slice:1, minVr:0, done:[], vis:[],
        completed:0, sumWait:0, sumTurn:0, switches:0, busy:0, csTime:0, gantt:[], nextArrival:1.5,
        beltOff:0, animUntil:0, dirty:true };
  if (policy === 'prio'){ spawn(0, 5, 3); spawn(0, 3, 2); spawn(0, 7, 1); }
  else if (policy === 'cfs'){ spawn(0, 5, 1, 0); spawn(0, 6, 1, -5); spawn(0, 4, 1, 5); }
  else { spawn(0, 5); spawn(0, 3); spawn(0, 7); }
}
const PRIO_COL = ['', '#d93c3c', '#e8730c', '#d4a300', '#2e9e5b'];
const randPrio = () => 1 + Math.floor(Math.random() * 4);
let aging = false;
const NICE_W = { '-5':3121, '0':1024, '5':335 };       // Linux weights for nice -5 / 0 / +5
const randNice = () => [-5, 0, 0, 5][Math.floor(Math.random() * 4)];
const CFS_LATENCY = 12, CFS_MIN_GRAN = 1;                // target latency and minimum slice (ms)
function cfsSlice(){
  const all = S.queue.concat(S.cpu ? [S.cpu] : []);
  const sum = all.reduce((a, q) => a + q.weight, 0) || 1;
  return Math.max(CFS_MIN_GRAN, CFS_LATENCY * S.cpu.weight / sum);
}
function newSlice(){ return policy === 'cfs' ? cfsSlice() : cfg.quantum; }
function sortQueue(){   // stable: by priority number (or vruntime for CFS), then arrival
  if (policy === 'cfs') S.queue.sort((a, b) => a.vr - b.vr || a.pid - b.pid);
  else S.queue.sort((a, b) => a.prio - b.prio || a.pid - b.pid);
}
function spawn(at, burst, prio = randPrio(), nice = randNice()){
  if (S.queue.length >= MAXQ) return false;
  const p = { pid:S.nextPid++, name:nameOf(S.nextPid - 1), arrival:at, burst, remaining:burst, start:null, finish:null,
              color:color(S.nextPid - 1), prio, basePrio:prio, nice, weight:NICE_W[nice], vr:S.minVr, x:null, y:-30, w:60, a:0, state:'ready' };
  if (policy === 'sjf'){ let i = S.queue.length; while (i > 0 && S.queue[i - 1].burst > burst) i--; S.queue.splice(i, 0, p); } else if (policy === 'prio' || policy === 'cfs'){ S.queue.push(p); sortQueue(); } else S.queue.push(p);
  S.vis.push(p); S.dirty = true;
  return true;
}
function dispatch(t){
  const p = S.queue.shift();
  S.cpu = p; S.switches++; S.dirty = true;
  if (cfg.cs > 0){ S.mode = 'cs'; S.csLeft = cfg.cs; p.state = 'cs'; S.gantt.push({cs:true, s:t, e:t}); }
  else startRun(t);
}
function startRun(t){
  const p = S.cpu; S.mode = 'run'; p.state = 'run'; if (p.start === null) p.start = t; S.qLeft = S.slice = newSlice();
  S.gantt.push({pid:p.pid, name:p.name, color:p.color, s:t, e:t}); S.dirty = true;
}
function finish(t){
  const p = S.cpu;
  p.finish = t; p.state = 'done'; p.remaining = 0;
  p.turn = t - p.arrival; p.wait = p.turn - p.burst;
  S.completed++; S.sumWait += p.wait; S.sumTurn += p.turn;
  S.done.unshift(p); if (S.done.length > 3) S.done.pop();
  S.cpu = null; S.mode = 'idle'; S.dirty = true;
}
function tick(h){
  const end = S.t + h;
  if (policy === 'prio' && aging){   // every 8 ms of waiting raises priority by one level
    let ch = false;
    S.queue.forEach(p => { const n = Math.max(1, p.basePrio - Math.floor((S.t - p.arrival) / 8)); if (n !== p.prio){ p.prio = n; ch = true; } });
    if (ch) sortQueue();
  }
  while (S.nextArrival <= end){ spawn(+S.nextArrival.toFixed(2), randBurst()); S.nextArrival += expRand(); }
  if (S.mode === 'idle' && S.queue.length) dispatch(S.t);
  const g = S.gantt[S.gantt.length - 1];
  if (S.mode === 'cs'){
    S.csTime += Math.min(h, S.csLeft); S.csLeft -= h; g.e = end;
    if (S.csLeft <= 0){ g.e = end + S.csLeft; startRun(end + S.csLeft); }
  } else if (S.mode === 'run'){
    S.cpu.remaining -= h; S.busy += h; g.e = end;
    const sliced = policy === 'rr' || policy === 'cfs';
    if (sliced) S.qLeft -= h;
    if (policy === 'cfs') S.cpu.vr += h * 1024 / S.cpu.weight;
    if (S.cpu.remaining <= 0){ g.e = end + S.cpu.remaining; finish(end + S.cpu.remaining); }
    else if (sliced && S.qLeft <= 0){
      if (S.queue.length){            // quantum used up: back of the line, next process in
        const over = -S.qLeft, p = S.cpu;
        p.remaining += over; S.busy -= over; g.e = end - over;
        if (policy === 'cfs') p.vr -= over * 1024 / p.weight;
        p.state = 'ready'; S.queue.push(p); if (policy === 'cfs') sortQueue(); S.cpu = null; S.mode = 'idle';
        dispatch(end - over);
      } else S.qLeft = S.slice = newSlice();   // nobody waiting: keep running
    }
  }
  S.t = end;
  if (policy === 'cfs'){ const all = S.queue.concat(S.cpu ? [S.cpu] : []); if (all.length) S.minVr = Math.max(S.minVr, Math.min(...all.map(q => q.vr))); }
  while (S.gantt.length && S.gantt[0].e < S.t - 60) S.gantt.shift();
}
function simAdvance(dtSim){
  let left = dtSim;
  while (left > 1e-9){ const h = Math.min(0.05, left); tick(h); left -= h; }
}

let paused = false;
const playBtn = $('playBtn');
function togglePause(){
  paused = !paused;
  playBtn.textContent = paused ? 'Play' : 'Pause';
  stageEl.classList.toggle('paused', paused);
  renderTable();
}
playBtn.onclick = togglePause;
$('resetBtn').onclick = () => { resetSim(); renderTable(); };
let $rate = $('rateSlider');
$rate.oninput = () => { const m = +$rate.value; cfg.rate = BASE_RATE * m; $('rateVal').textContent = m.toFixed(1) + '×'; };
if ($('longBtn')) $('longBtn').onclick = () => { spawn(+S.t.toFixed(2), 18); S.animUntil = performance.now() + 700; renderTable(); };
if ($('quantumSlider')) $('quantumSlider').oninput = () => { cfg.quantum = +$('quantumSlider').value; $('quantumVal').textContent = cfg.quantum + ' ms'; };
if ($('hiBtn')) $('hiBtn').onclick = () => { spawn(+S.t.toFixed(2), randBurst(), 1, -5); S.animUntil = performance.now() + 700; renderTable(); };
if ($('loBtn')) $('loBtn').onclick = () => { spawn(+S.t.toFixed(2), randBurst(), 4, 5); S.animUntil = performance.now() + 700; renderTable(); };
if ($('agingBtn')) $('agingBtn').onclick = () => { aging = !aging; $('agingBtn').textContent = 'Aging: ' + (aging ? 'on' : 'off'); $('agingBtn').classList.toggle('primary', aging); };
if ($('shortBtn')) $('shortBtn').onclick = () => { spawn(+S.t.toFixed(2), 1 + Math.floor(Math.random() * 2)); S.animUntil = performance.now() + 700; renderTable(); };
/* ---- table & stats ---- */
const f1 = v => v.toFixed(1);
function heat(el, v, th){   // thresholds: yellow, orange, red (ms)
  el.style.color = v >= th[2] ? '#d93c3c' : v >= th[1] ? '#e8730c' : v >= th[0] ? '#d4a300' : '';
}
function renderTable(){
  S.dirty = false;
  $('mW').innerHTML = S.completed ? f1(S.sumWait / S.completed) + '<span class="u">ms</span>' : '-';
  $('mTA').innerHTML = S.completed ? f1(S.sumTurn / S.completed) + '<span class="u">ms</span>' : '-';
  heat($('mW'), S.completed ? S.sumWait / S.completed : 0, [8, 15, 30]);
  heat($('mTA'), S.completed ? S.sumTurn / S.completed : 0, [13, 20, 35]);
  $('mCS').textContent = S.switches;
  $('mDone').textContent = S.completed;
  $('mOH').textContent = (S.t > 0 ? 100 * S.csTime / S.t : 0).toFixed(1) + '%';
}

/* ---- drawing ---- */
let L = {};
function layout(W, H){
  const cpuW = 132, trayW = 64;
  const cpuX = W - cpuW - trayW - 22;
  L = { W, H, cpuX, cpuW, cpuY:64, cpuH:150, cpuCx:cpuX + cpuW / 2, cpuCy:139,
        beltL:16, beltR:cpuX - 12, beltY:166, boxH:44,
        trayX:W - trayW - 8, trayW, ganttY:270, ganttH:36 };
}
function updateVisuals(dt){
  const k = Math.min(1, dt * 7);
  const n = S.queue.length;
  const slot = Math.min(76, (L.beltR - L.beltL - 6) / Math.max(n, 1));
  const bw = Math.max(26, Math.min(62, slot - 8));
  S.queue.forEach((p, i) => {
    const tx = L.beltR - slot * (i + 0.5), ty = L.beltY - L.boxH / 2 - 2;
    if (p.x === null){ p.x = Math.max(L.beltL + bw / 2, tx); p.y = 10; }
    p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; p.w += (bw - p.w) * k;
    p.a = Math.min(1, p.a + dt * 3);
  });
  if (S.cpu){
    const p = S.cpu;
    if (p.x === null){ p.x = L.beltR; p.y = L.beltY - L.boxH / 2 - 2; }
    p.x += (L.cpuCx - p.x) * k; p.y += (L.cpuCy - 8 - p.y) * k; p.w += (78 - p.w) * k; p.a = 1;
  }
  S.vis.forEach(p => {
    if (p.state !== 'done') return;
    const tx = L.trayX + L.trayW / 2, ty = L.cpuCy + 40;
    p.x += (tx - p.x) * k; p.y += (ty - p.y) * k; p.w += (40 - p.w) * k;
    if (Math.abs(tx - p.x) < 6) p.a -= dt * 1.4;
  });
  S.vis = S.vis.filter(p => !(p.state === 'done' && p.a <= 0));
}
function drawBox(ctx, p, big){
  if (p.x === null) return;
  const w = p.w, h = big ? 52 : L.boxH * (p.state === 'done' ? 0.75 : 1);
  ctx.globalAlpha = Math.max(0, p.a);
  ctx.fillStyle = p.color;
  rr(ctx, p.x - w / 2, p.y - h / 2, w, h, 8); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  rr(ctx, p.x - w / 2, p.y + h / 2 - 12, w, 12, 0); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const fs = w < 40 ? 9 : big ? 13 : 11;
  ctx.font = `700 ${fs}px "JetBrains Mono", monospace`;
  ctx.fillText(fitText(ctx, p.name, w - 6), p.x, p.y - 5);
  if (w >= 40 && p.state !== 'done'){
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillText(policy === 'rr' ? 'left ' + Math.ceil(p.remaining - 1e-6) : policy === 'cfs' ? 'vr ' + p.vr.toFixed(1) : 'b=' + p.burst, p.x, p.y + h / 2 - 6);
  }
  if (policy === 'cfs' && p.state !== 'done' && w >= 30){
    ctx.fillStyle = p.nice < 0 ? '#0f9d8f' : p.nice > 0 ? '#e8730c' : '#8591a8'; ctx.beginPath(); ctx.arc(p.x + w / 2 - 3, p.y - h / 2 + 3, 10, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 9px "JetBrains Mono", monospace'; ctx.fillText((p.nice > 0 ? '+' : '') + p.nice, p.x + w / 2 - 3, p.y - h / 2 + 3.5);
  }
  if (policy === 'prio' && p.state !== 'done' && w >= 30){
    ctx.fillStyle = PRIO_COL[p.prio]; ctx.beginPath(); ctx.arc(p.x + w / 2 - 3, p.y - h / 2 + 3, 9, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 10px "JetBrains Mono", monospace'; ctx.fillText(p.prio, p.x + w / 2 - 3, p.y - h / 2 + 3.5);
  }
  if ((policy === 'sjf' || policy === 'prio') && p.state === 'ready'){
    const wt = S.t - p.arrival;
    if (wt >= 6){
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = wt >= 30 ? '#d93c3c' : wt >= 15 ? '#e8730c' : '#d4a300';
      ctx.fillText('wait ' + Math.round(wt) + 'ms', p.x, p.y - h / 2 - 5);
    }
  }
  ctx.globalAlpha = 1;
}
function draw(){
  const f = fitCanvas(cv); if (!f) return;
  const { ctx, W, H } = f; layout(W, H);
  ctx.clearRect(0, 0, W, H);

  // labels
  ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = '#8591a8';
  ctx.fillText('NEW ARRIVALS ↓', L.beltL, 18);

  // belt (side view of a real conveyor: frame, legs, rubber belt with moving treads, spinning end rollers)
  const bL = L.beltL, bR = L.beltR, bY = L.beltY, bH = 16, rad = bH / 2 + 3, cy = bY + bH / 2;
  // legs + feet
  ctx.fillStyle = '#9aa0ab';
  for (let x = bL + 30; x < bR - 20; x += 96){
    ctx.fillRect(x - 3, bY + bH + 6, 6, 40);
    ctx.fillRect(x - 12, bY + bH + 44, 24, 4);
  }
  // steel side frame under the belt
  ctx.fillStyle = '#b9bec7'; rr(ctx, bL + 4, bY + bH + 2, bR - bL - 8, 7, 2); ctx.fill();
  ctx.fillStyle = '#9aa0ab'; ctx.fillRect(bL + 4, bY + bH + 7, bR - bL - 8, 2);
  // belt body
  ctx.save(); rr(ctx, bL, bY, bR - bL, bH, bH / 2); ctx.clip();
  ctx.fillStyle = '#3d4351'; ctx.fillRect(bL, bY, bR - bL, bH);
  const off = S.beltOff % 24;
  ctx.fillStyle = '#566074';
  for (let x = bL - 24 + off; x < bR + 24; x += 24) ctx.fillRect(x, bY + 3, 5, bH - 6);   // treads
  ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(bL, bY, bR - bL, 2);              // top highlight
  ctx.restore();
  // end rollers
  [bL + bH / 2, bR - bH / 2].forEach(x => {
    ctx.fillStyle = '#9aa0ab'; ctx.beginPath(); ctx.arc(x, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#6f7683'; ctx.lineWidth = 1.5; ctx.stroke();
    const ang = S.beltOff / rad;
    ctx.strokeStyle = '#6f7683'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++){
      const t = ang + k * Math.PI / 3;
      ctx.beginPath(); ctx.moveTo(x - Math.cos(t) * (rad - 3), cy - Math.sin(t) * (rad - 3));
      ctx.lineTo(x + Math.cos(t) * (rad - 3), cy + Math.sin(t) * (rad - 3)); ctx.stroke();
    }
    ctx.fillStyle = '#4a5060'; ctx.beginPath(); ctx.arc(x, cy, 3, 0, Math.PI * 2); ctx.fill();
  });

  // CPU body
  const { cpuX, cpuY, cpuW, cpuH } = L;
  const active = S.mode !== 'idle';
  const csCol = '#d93c3c';
  const edge = S.mode === 'cs' ? csCol : S.mode === 'run' ? '#d98200' : '#d0d0cc';
  ctx.strokeStyle = '#d0d0cc'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++){
    const x = cpuX + 16 + i * (cpuW - 32) / 5;
    ctx.beginPath(); ctx.moveTo(x, cpuY - 10); ctx.lineTo(x, cpuY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, cpuY + cpuH); ctx.lineTo(x, cpuY + cpuH + 10); ctx.stroke();
  }
  ctx.fillStyle = '#f4f4f2'; rr(ctx, cpuX, cpuY, cpuW, cpuH, 14); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = edge; rr(ctx, cpuX, cpuY, cpuW, cpuH, 14); ctx.stroke();
  if (active){ ctx.save(); ctx.shadowColor = edge; ctx.shadowBlur = 18; rr(ctx, cpuX, cpuY, cpuW, cpuH, 14); ctx.stroke(); ctx.restore(); }
  ctx.fillStyle = '#55627c'; ctx.font = '700 12px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
  ctx.fillText('CPU', L.cpuCx, cpuY + 20);

  // process boxes (queue + done), CPU process on top
  S.vis.forEach(p => { if (p !== S.cpu) drawBox(ctx, p, false); });
  if (S.cpu) drawBox(ctx, S.cpu, true);

  // CPU status text
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  if (S.mode === 'run'){
    const p = S.cpu, frac = 1 - Math.max(p.remaining, 0) / p.burst;
    const bx = cpuX + 16, bw = cpuW - 32, by = cpuY + cpuH - 30;
    ctx.fillStyle = '#e5e5e2'; rr(ctx, bx, by, bw, 7, 3.5); ctx.fill();
    ctx.fillStyle = '#d98200'; rr(ctx, bx, by, Math.max(7, bw * frac), 7, 3.5); ctx.fill();
    ctx.fillStyle = '#55627c'; ctx.font = '500 10.5px "JetBrains Mono", monospace';
    ctx.fillText(f1(Math.max(p.remaining, 0)) + ' / ' + p.burst + ' left', L.cpuCx, by + 20);
    if (policy === 'rr' || policy === 'cfs'){   // time-slice meter
      ctx.fillStyle = '#e5e5e2'; rr(ctx, bx, by - 12, bw, 5, 2.5); ctx.fill();
      ctx.fillStyle = '#0f9d8f'; rr(ctx, bx, by - 12, Math.max(5, bw * Math.max(S.qLeft, 0) / S.slice), 5, 2.5); ctx.fill();
    }
  } else if (S.mode === 'cs'){
    const blink = (Math.floor(performance.now() / 220) % 2) ? 1 : .55;
    ctx.globalAlpha = paused ? 1 : blink;
    ctx.fillStyle = csCol; ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText('CONTEXT', L.cpuCx, cpuY + cpuH - 28);
    ctx.fillText('SWITCH', L.cpuCx, cpuY + cpuH - 14);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = '#8591a8'; ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillText('idle', L.cpuCx, L.cpuCy + 4);
  }

  // done tray
  ctx.strokeStyle = '#e5e5e2'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
  rr(ctx, L.trayX, L.cpuCy + 12, L.trayW, 56, 10); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#8591a8'; ctx.font = '500 10.5px "JetBrains Mono", monospace';
  ctx.fillText('DONE', L.trayX + L.trayW / 2, L.cpuCy + 84);
  ctx.strokeStyle = '#d0d0cc'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cpuX + cpuW + 4, L.cpuCy + 10); ctx.quadraticCurveTo(L.trayX + 10, L.cpuCy + 8, L.trayX + L.trayW / 2, L.cpuCy + 18); ctx.stroke();

  drawGantt(ctx, W);
}
function drawGantt(ctx, W){
  const x0 = 16, x1 = W - 16, y = L.ganttY, h = L.ganttH, win = 40;
  const tEnd = Math.max(S.t, win), tStart = tEnd - win;
  const X = t => x0 + (t - tStart) / win * (x1 - x0);
  ctx.textAlign = 'left'; ctx.fillStyle = '#8591a8'; ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillText('CPU TIMELINE', x0, y - 10);
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#e5e5e2'; ctx.lineWidth = 1;
  rr(ctx, x0, y, x1 - x0, h, 6); ctx.fill(); ctx.stroke();
  ctx.save(); rr(ctx, x0, y, x1 - x0, h, 6); ctx.clip();
  S.gantt.forEach(g => {
    if (g.e < tStart) return;
    const a = X(Math.max(g.s, tStart)), b = X(g.e), w = b - a;
    if (g.cs){
      ctx.fillStyle = 'rgba(217,60,60,.85)'; ctx.fillRect(a, y, Math.max(w, 1.5), h);
    } else {
      ctx.fillStyle = g.color; ctx.fillRect(a, y + 1, Math.max(w - 1, 0.5), h - 2);
      if (w > 26){ ctx.fillStyle = '#fff'; ctx.font = '700 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(fitText(ctx, g.name, w - 4), a + w / 2, y + h / 2 + 4); ctx.textAlign = 'left'; }
    }
  });
  ctx.restore();
  ctx.fillStyle = '#8591a8'; ctx.font = '500 10px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
  for (let t = Math.ceil(tStart / 5) * 5; t <= tEnd; t += 5){
    const x = X(t); ctx.fillRect(x, y + h, 1, 4); ctx.fillText(t, x, y + h + 16);
  }
  // legend
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(217,60,60,.85)'; ctx.fillRect(x1 - 108, y - 20, 10, 10);
  ctx.fillStyle = '#55627c'; ctx.fillText('context switch', x1, y - 11);
  ctx.textAlign = 'left';
}


let lastTable = 0;
function step(dt, now){
  const f = fitCanvas(cv); if (!f) return;
  layout(f.W, f.H);                         // layout must exist before positions are animated, else x/y become NaN (invisible)
  if (!paused){ simAdvance(dt * cfg.speed); S.beltOff += dt * 26; }
  if (!paused || now < S.animUntil) updateVisuals(dt);
  draw();
  if (!paused && now - lastTable > 120){ renderTable(); lastTable = now; }
}
resetSim(); renderTable();
return { step, draw, togglePause };
}
const sims = { fcfs: createSim('', 'fcfs'), sjf: createSim('J', 'sjf'), prio: createSim('P', 'prio'), rr: createSim('R', 'rr'), cfs: createSim('C', 'cfs') };

/* ================= MAIN LOOP ================= */
function resizeAll(){ if (sims[names[cur]]) sims[names[cur]].draw(); if (names[cur] === 'sjf-info') drawCheckout(); if (names[cur] === 'prio-info') drawER(); if (names[cur] === 'rr-info') drawRR(); if (names[cur] === 'cfs-info') drawCFS(); if (names[cur] === 'intro') drawTimeline(.06); if (names[cur] === 'fcfs-info') drawPaper(); }
window.addEventListener('resize', resizeAll);

let last = performance.now();
function frame(now){
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const name = names[cur];
  if (name === 'intro') demoStep(dt);
  if (name === 'lifecycle') lifeStep(dt); else life.active = false;
  if (name === 'fcfs-info') paperStep(dt);
  if (sims[name]) sims[name].step(dt, now);
  if (name === 'sjf-info') checkoutStep(dt);
  if (name === 'prio-info') erStep(dt);
  if (name === 'rr-info') rrStep(dt);
  if (name === 'cfs-info') cfsStep(dt);
  requestAnimationFrame(frame);
}

const startIdx = names.indexOf(location.hash.slice(1));
go(startIdx >= 0 ? startIdx : 0);
requestAnimationFrame(frame);
})();
