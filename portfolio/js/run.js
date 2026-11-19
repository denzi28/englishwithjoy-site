// The watercolor intro: Can runs along the painted road to school, enters the classroom,
// touches the smart board, and the board turns 3D and becomes the site. It plays by itself.
const $ = s => document.querySelector(s);
const run = $('#run'), cv = $('#paint'), ctx = cv.getContext('2d');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const img = src => { const i = new Image(); i.src = src; return i; };

/* ---------- the two paintings (coordinates are image pixels) ---------- */
const ROAD = { im: img('img/bg-road.webp'), w: 2425, h: 940,
  path: [[0, 703], [243, 709], [485, 734], [606, 764], [728, 794], [849, 810], [970, 815], [1091, 816], [1213, 803], [1334, 788], [1455, 774], [1698, 761], [1940, 754], [2183, 748], [2226, 744]],
  x0: 150, door: 2226 };
const CLASS = { im: img('img/bg-class.webp'), w: 2390, h: 932, floor: 806, x0: -260, stop: 1742,
  screen: [[1850, 212], [2306, 128], [2304, 584], [1850, 590]] };
function pathY(x) { const P = ROAD.path; let i = 0; while (i < P.length - 2 && x > P[i + 1][0]) i++;
  const [x0, y0] = P[i], [x1, y1] = P[i + 1], t = cl((x - x0) / (x1 - x0)); return lerp(y0, y1, t); }

let DPR = 1, W = 0, H = 0;
function resize() { DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
addEventListener('resize', resize);
// cover the viewport, keep the bottom of the painting (the ground) in view
function fit(S) { const s = Math.max(H / S.h, W / S.w); return { s, vw: W / s, oy: H - S.h * s }; }

/* ---------- the student (Can), painted frames ---------- */
const CAN = {"cw":350,"ch":494,"cols":6,"ax":175,"ay":488,"frames":{"r1":{"i":0,"tipx":128,"tipy":-224,"h":448},"r2":{"i":1,"tipx":130,"tipy":-207,"h":415},"r3":{"i":2,"tipx":94,"tipy":-214,"h":428},"r4":{"i":3,"tipx":149,"tipy":-220,"h":440},"r5":{"i":4,"tipx":126,"tipy":-226,"h":452},"r6":{"i":5,"tipx":131,"tipy":-207,"h":413},"r7":{"i":6,"tipx":101,"tipy":-213,"h":426},"r8":{"i":7,"tipx":152,"tipy":-223,"h":447},"r9":{"i":8,"tipx":131,"tipy":-224,"h":449},"r10":{"i":9,"tipx":124,"tipy":-210,"h":420},"r11":{"i":10,"tipx":101,"tipy":-214,"h":428},"r12":{"i":11,"tipx":147,"tipy":-224,"h":449},"r13":{"i":12,"tipx":131,"tipy":-224,"h":449},"r14":{"i":13,"tipx":126,"tipy":-211,"h":422},"r15":{"i":14,"tipx":100,"tipy":-214,"h":428},"r16":{"i":15,"tipx":147,"tipy":-224,"h":448},"idle1":{"i":16,"tipx":90,"tipy":-425,"h":480},"idle2":{"i":17,"tipx":90,"tipy":-425,"h":480},"crouch":{"i":18,"tipx":163,"tipy":-371,"h":438},"air":{"i":19,"tipx":151,"tipy":-371,"h":472},"touch1":{"i":20,"tipx":86,"tipy":-393,"h":480},"touch2":{"i":21,"tipx":150,"tipy":-369,"h":480},"touch3":{"i":22,"tipx":168,"tipy":-379,"h":480},"touch4":{"i":23,"tipx":160,"tipy":-381,"h":480}}};
const canImg = img('img/can.webp');
const RUNN = 16;
function drawCan(g, name, x, y, hp, alpha = 1) {      // hp: height in css px of a 480px standing frame
  const f = CAN.frames[name], i = f.i, sx0 = (i % CAN.cols) * CAN.cw, sy0 = Math.floor(i / CAN.cols) * CAN.ch, k = hp / 480;
  g.globalAlpha = alpha; g.imageSmoothingQuality = 'high';
  g.drawImage(canImg, sx0, sy0, CAN.cw, CAN.ch, x - CAN.ax * k, y - CAN.ay * k, CAN.cw * k, CAN.ch * k); g.globalAlpha = 1;
}
const T3 = CAN.frames.touch3;
let jumpAt = -9;

/* ---------- story beats (P is 0..1) ---------- */
const P_ROAD = .40, P_DOOR = .46, P_RUN = .78;
const easeIn = k => k < .14 ? k * k / .28 : k - .07;              // accelerate, then steady (normalised below)
const easeOut = k => k > .8 ? k - (k - .8) * (k - .8) / .4 : k;      // steady, then slow down to a stop
const roadK = k => easeIn(k) / easeIn(1), classK = k => easeOut(k) / easeOut(1);
const H_ROAD = .245, H_CLASS = .375;                              // Can's height as a share of the painting

function frameFor(P, t, dist) {
  const jt = t - jumpAt;
  if (jt < .75) return [jt < .12 || jt > .62 ? 'crouch' : 'air', jt > .12 && jt < .62 ? Math.sin((jt - .12) / .5 * Math.PI) : 0];
  if (P <= 0) return [(t % 3.2) < .14 ? 'idle2' : 'idle1', 0];
  if (P < P_RUN) return ['r' + (1 + Math.floor(dist * 4.3) % RUNN), 0];
  return [P < .792 ? 'touch1' : P < .804 ? 'touch2' : P < .9 ? 'touch3' : 'touch4', 0];
}

function paint(P, t) {
  const g = ctx; g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, W, H);
  const fade = sm(P_ROAD, P_DOOR, P);
  let rect = null;
  // road scene
  if (fade < 1) {
    const F = fit(ROAD), k = cl(P / P_ROAD), x = lerp(ROAD.x0, ROAD.door, roadK(k));
    const cam = cl(x - F.vw * .36, 0, ROAD.w - F.vw);
    const z = 1 + fade * .35, zx = (ROAD.door - cam) * F.s, zy = F.oy + 700 * F.s;   // push in towards the door
    g.save(); g.translate(zx, zy); g.scale(z, z); g.translate(-zx, -zy);
    g.drawImage(ROAD.im, -cam * F.s, F.oy, ROAD.w * F.s, ROAD.h * F.s);
    const near = sm(1500, ROAD.door, x), hp = ROAD.h * F.s * lerp(H_ROAD, .15, near);
    const [fr, lift] = frameFor(P, t, (x - ROAD.x0) / 230);
    const a = 1 - sm(ROAD.door - 70, ROAD.door, x);
    if (a > 0) drawCan(g, fr, (x - cam) * F.s, F.oy + pathY(x) * F.s - lift * hp * .45, hp, a);
    g.restore();
  }
  // classroom scene
  if (fade > 0) {
    const F = fit(CLASS), k = cl((P - P_DOOR) / (P_RUN - P_DOOR)), x = P < P_DOOR ? CLASS.x0 : lerp(CLASS.x0, CLASS.stop, classK(k));
    const cam = cl(x - F.vw * .3, 0, CLASS.w - F.vw), X = v => (v - cam) * F.s, Y = v => F.oy + v * F.s;
    g.globalAlpha = fade; g.drawImage(CLASS.im, -cam * F.s, F.oy, CLASS.w * F.s, CLASS.h * F.s); g.globalAlpha = 1;
    // the smart board's screen: label, then a glow when Can touches it
    const Q = CLASS.screen.map(([a, b]) => [X(a), Y(b)]);
    const cx = (Math.max(Q[0][0], 0) + Math.min(Q[2][0], W)) / 2, cy = (Q[0][1] + Q[3][1]) / 2 + (Q[1][1] - Q[0][1]) * .25, qh = Q[3][1] - Q[0][1];
    const glow = sm(.805, .82, P) * (1 - sm(.9, .96, P));
    g.save(); g.beginPath(); Q.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.clip();
    if (glow > 0) { const rg = g.createRadialGradient(Q[0][0], Q[3][1] - qh * .3, 0, Q[0][0], Q[3][1] - qh * .3, qh * 1.4);
      rg.addColorStop(0, `rgba(255,238,190,${.75 * glow})`); rg.addColorStop(1, `rgba(255,220,160,${.25 * glow})`); g.fillStyle = rg; g.fillRect(Q[0][0], Q[1][1], Q[1][0] - Q[0][0], qh * 1.2); }
    g.globalAlpha = fade * .85 * (1 - glow); g.fillStyle = '#f3ecf6'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 500 ${Math.round(qh * .15)}px Fraunces, Georgia, serif`; g.fillText((window.RUN_TEXT && RUN_TEXT.board) || 'Dokun', cx, cy);
    g.restore(); g.globalAlpha = 1;
    // Can
    const hp = CLASS.h * F.s * H_CLASS;
    const [fr, lift] = frameFor(P, t, (ROAD.door - ROAD.x0) / 230 + (x - CLASS.x0) / 360);
    if (P >= P_DOOR || fr.startsWith('touch')) drawCan(g, fr, X(x), Y(CLASS.floor) - lift * hp * .45, hp, cl((P - P_DOOR) / .015));
    // ripple at the fingertip
    const rp = sm(.806, .86, P);
    if (rp > 0 && rp < 1) { const kk = hp / 480, tx = X(x) + T3.tipx * kk, ty = Y(CLASS.floor) + T3.tipy * kk;
      g.strokeStyle = `rgba(255,236,170,${1 - rp})`; g.lineWidth = hp * .02 * (1 - rp); g.beginPath(); g.arc(tx, ty, rp * hp * .7, 0, 7); g.stroke(); }
    const xs = Q.map(q => q[0]), ys = Q.map(q => q[1]);
    rect = { bx: Math.min(...xs), by: (Q[0][1] + Q[1][1]) / 2, bw: Math.max(...xs) - Math.min(...xs), bh: (Q[2][1] + Q[3][1]) / 2 - (Q[0][1] + Q[1][1]) / 2 };
  }
  // floating motes
  for (let i = 0; i < 26; i++) { const x = ((i * 137.5 + t * 9) % (W + 40) + W + 40) % (W + 40) - 20, y = (i * 61.7 % H) + Math.sin(t + i) * 10;
    g.fillStyle = `rgba(255,255,255,${.25 + .25 * Math.sin(t * 2 + i)})`; g.beginPath(); g.arc(x, y, 1 + (i % 3), 0, 7); g.fill(); }
  return rect;
}

/* ---------- the board turns 3D and becomes the site ---------- */
const B = $('#b3d');
function board3d(P, r) {
  const q = sm(.84, 1, P);
  if (P < .835 || !r) { B.style.visibility = 'hidden'; return; }
  B.style.visibility = 'visible';
  const pop = sm(0, .45, q), fill = ease(sm(.35, 1, q));
  const cx0 = r.bx + r.bw / 2, cy0 = r.by + r.bh / 2;
  const sx = lerp(r.bw / W * (1 + .12 * pop), 1, fill), sy = lerp(r.bh / H * (1 + .12 * pop), 1, fill);
  const cx = lerp(cx0 - pop * W * .04, W / 2, fill), cy = lerp(cy0 - pop * H * .04, H / 2, fill);
  const ry = lerp(0, -24, pop) * (1 - fill), rx = lerp(0, 9, pop) * (1 - fill), tz = pop * (1 - fill) * 220;
  B.style.transform = `translate(${(cx - W / 2).toFixed(1)}px,${(cy - H / 2).toFixed(1)}px) scale(${sx.toFixed(4)},${sy.toFixed(4)}) translateZ(${tz.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
  B.style.setProperty('--depth', (lerp(0, 150, pop) * (1 - fill * .999)).toFixed(1) + 'px');
  B.style.setProperty('--bez', (lerp(26, 0, fill)).toFixed(1) + 'px');
  B.style.setProperty('--fill', fill.toFixed(3));
  B.style.setProperty('--content', sm(.45, .85, q).toFixed(3));
  B.style.setProperty('--glow', (sm(0, .2, q) * (1 - sm(.4, .7, q))).toFixed(3));
}

/* ---------- the intro plays by itself ---------- */
const TL = [[0, 0], [.5, 0], [3.9, P_ROAD], [4.4, P_DOOR], [6.4, P_RUN], [7.4, .84], [9, 1]];   // seconds -> story progress
function progress(sec) {
  for (let i = 1; i < TL.length; i++) if (sec <= TL[i][0]) { const [s0, p0] = TL[i - 1], [s1, p1] = TL[i]; return lerp(p0, p1, (sec - s0) / (s1 - s0)); }
  return 1;
}
let last = performance.now(), clock = 0, ic = 0, pS = 0, playing = false, rect = null, raf = 0;
cv.addEventListener('click', () => { jumpAt = clock; });
function finish() {
  playing = false; cancelAnimationFrame(raf);
  document.documentElement.classList.remove('intro'); run.classList.add('done'); scrollTo(0, 0);
  document.getElementById('board').focus({ preventScroll: true });
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now; clock += Math.min(.05, raw);
  if (!playing) return;
  ic += Math.min(.25, raw);            // intro time follows the real clock on slow devices
  pS = progress(ic);
  rect = paint(pS, clock);
  board3d(pS, rect);
  if (ic > TL[TL.length - 1][0] + .25) finish();
}
function play() {
  if (RM) { run.classList.add('done'); return; }
  document.documentElement.classList.add('intro'); run.classList.remove('done'); scrollTo(0, 0);
  playing = true; ic = 0; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
}
$('#skip').addEventListener('click', finish);
document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (playing && a && !a.classList.contains('name')) finish(); }, true);
addEventListener('keydown', e => { if (playing && (e.key === 'Escape' || e.key === 'Enter')) finish(); });
document.querySelector('.name').addEventListener('click', e => { e.preventDefault(); play(); });
const ready = i => i.decode ? i.decode().catch(() => {}) : Promise.resolve();
const start = () => { resize(); Promise.all([canImg, ROAD.im, CLASS.im].map(ready)).then(play); };
(document.fonts ? document.fonts.ready : Promise.resolve()).then(start, start);
window.__run = { get p() { return pS; }, play, finish };
