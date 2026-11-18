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
showInfo('dispatch');

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
  ctx.fillStyle = '#c9ab7a'; rr(ctx, kx, g.counterY, kw, 46, 8); ctx.fill();
  ctx.fillStyle = '#b48f5c'; ctx.fillRect(kx + 8, g.counterY + 8, kw - 16, 4);
  ctx.fillStyle = '#1a2233'; ctx.beginPath(); ctx.arc(g.colX, g.counterY + 78, 24, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px "Space Grotesk", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CPU', g.colX, g.counterY + 78);
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

/* ================= Round Robin overview: sharing a game console ================= */
const RRQ = 1.4;   // quantum of the animation (seconds)
const rrA = { q:[], cur:null, out:[], spawnIn:0.2, n:0 };
function rrStep(dt){
  const f = fitCanvas(document.getElementById('rrcv')); if (!f) return;
  const { W, H } = f, g = shopGeom(W, H);
  const maxQ = Math.min(5, Math.max(3, Math.floor((g.frontY + 10) / g.gap)));
  rrA.spawnIn -= dt;
  if (rrA.spawnIn <= 0 && rrA.q.length + (rrA.cur ? 1 : 0) < maxQ){
    const need = 1.2 + Math.random() * 3.6;
    rrA.q.push({ id: ++rrA.n, x: g.colX + 60, y: -16, need, rem: need, t:0, col: PCOLS[rrA.n % PCOLS.length] });
    rrA.spawnIn = 2.6 + Math.random() * 1.2;
  }
  if (!rrA.cur && rrA.q.length){ rrA.cur = rrA.q.shift(); rrA.cur.t = 0; }
  const k = Math.min(1, dt * 6);
  rrA.q.forEach((p, i) => { p.x += (g.colX - p.x) * k; p.y += (g.frontY - g.gap * (i + 1) - p.y) * k; });
  const c = rrA.cur;
  if (c){
    c.x += (g.colX - c.x) * k; c.y += (g.frontY - c.y) * k;
    if (Math.abs(c.x - g.colX) < 2 && Math.abs(c.y - g.frontY) < 2){
      const use = Math.min(dt, c.rem); c.t += dt; c.rem -= use;
      if (c.rem <= 0.001){ rrA.out.push(c); rrA.cur = null; }
      else if (c.t >= RRQ){ rrA.q.push(c); rrA.cur = null; }     // quantum over: back of the line
    }
  }
  rrA.out.forEach(p => { p.x -= 130 * dt; });
  rrA.out = rrA.out.filter(p => p.x > -80);
  drawRR();
}
function drawRR(){
  const f = fitCanvas(document.getElementById('rrcv')); if (!f) return;
  const { ctx, W, H } = f, g = shopGeom(W, H);
  ctx.clearRect(0, 0, W, H);
  const kw = 200, kx = g.colX - kw / 2;
  ctx.fillStyle = '#2b3347'; rr(ctx, kx, g.counterY, kw, 46, 8); ctx.fill();      // console
  ctx.fillStyle = '#0f9d8f'; rr(ctx, g.colX - 44, g.counterY + 12, 88, 22, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('quantum ' + RRQ.toFixed(1), g.colX, g.counterY + 23);
  ctx.fillStyle = '#1a2233'; ctx.beginPath(); ctx.arc(g.colX, g.counterY + 78, 24, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px "Space Grotesk", sans-serif';
  ctx.fillText('CPU', g.colX, g.counterY + 78);
  [...rrA.q, ...rrA.out, ...(rrA.cur ? [rrA.cur] : [])].forEach(p => {
    const r = 18;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 3, r, 0, 7); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    if (p === rrA.cur){                       // quantum ring
      ctx.strokeStyle = '#1a2233'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.t / RRQ)); ctx.stroke();
    }
    const bw = 60, bx = p.x + r + 8;          // work still to do
    ctx.fillStyle = '#e5e5e2'; rr(ctx, bx, p.y - 4, bw, 8, 4); ctx.fill();
    ctx.fillStyle = p.col; rr(ctx, bx, p.y - 4, Math.max(0, bw * p.rem / p.need), 8, 4); ctx.fill();
  });
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ================= CFS overview: always serve whoever got the least ================= */
const cfsA = { ps:null, cur:null, t:0 };
const CFS_SLICE = 1.3;
function cfsStep(dt){
  const f = fitCanvas(document.getElementById('cfscv')); if (!f) return;
  const { W, H } = f, g = shopGeom(W, H);
  if (!cfsA.ps){
    const ws = [1, 2, 1, 0.5, 1];
    cfsA.ps = ws.map((w, i) => ({ id:i + 1, w, vr: Math.random() * 0.6, x:g.colX, y:-20, col: PCOLS[(i + 1) % PCOLS.length] }));
  }
  const P = cfsA.ps;
  if (!cfsA.cur){ cfsA.cur = P.filter(p => p !== cfsA.cur).sort((a, b) => a.vr - b.vr || a.id - b.id)[0]; cfsA.t = 0; }
  const waiting = P.filter(p => p !== cfsA.cur).sort((a, b) => a.vr - b.vr || a.id - b.id);
  const k = Math.min(1, dt * 6);
  waiting.forEach((p, i) => { p.x += (g.colX - p.x) * k; p.y += (g.frontY - g.gap * (i + 1) - p.y) * k; });
  const c = cfsA.cur; c.x += (g.colX - c.x) * k; c.y += (g.frontY - c.y) * k;
  if (Math.abs(c.y - g.frontY) < 2){
    cfsA.t += dt; c.vr += dt / c.w * 0.5;                    // heavier process: vruntime grows slower
    if (cfsA.t >= CFS_SLICE) cfsA.cur = null;
  }
  drawCFS();
}
function drawCFS(){
  const f = fitCanvas(document.getElementById('cfscv')); if (!f || !cfsA.ps) return;
  const { ctx, W, H } = f, g = shopGeom(W, H);
  ctx.clearRect(0, 0, W, H);
  const kw = 200, kx = g.colX - kw / 2;
  ctx.fillStyle = '#e9eef5'; rr(ctx, kx, g.counterY, kw, 46, 8); ctx.fill();
  ctx.fillStyle = '#55627c'; ctx.font = '700 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('least CPU so far goes next', g.colX, g.counterY + 23);
  ctx.fillStyle = '#1a2233'; ctx.beginPath(); ctx.arc(g.colX, g.counterY + 78, 24, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '600 14px "Space Grotesk", sans-serif';
  ctx.fillText('CPU', g.colX, g.counterY + 78);
  const minVr = Math.min(...cfsA.ps.map(p => p.vr));
  cfsA.ps.forEach(p => {
    const r = 18;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 3, r, 0, 7); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
    if (p === cfsA.cur){
      ctx.strokeStyle = '#1a2233'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, cfsA.t / CFS_SLICE)); ctx.stroke();
    }
    ctx.fillStyle = '#fff'; ctx.font = '700 11px "JetBrains Mono", monospace';
    ctx.fillText(p.w === 1 ? 'x1' : p.w === 2 ? 'x2' : 'x0.5', p.x, p.y + .5);
    const bx = p.x + r + 8, bl = Math.min(100, 14 + (p.vr - minVr) * 70);       // vruntime bar
    ctx.fillStyle = '#e5e5e2'; rr(ctx, bx, p.y - 4, 100, 8, 4); ctx.fill();
    ctx.fillStyle = p.col; rr(ctx, bx, p.y - 4, bl, 8, 4); ctx.fill();
  });
  ctx.fillStyle = '#8591a8'; ctx.font = '500 11px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
  ctx.fillText('vruntime bars  ·  x2 = double weight', W - 40, 24);
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
