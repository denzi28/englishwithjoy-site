// The watercolor intro: one continuous painting. Can starts on the hill path, runs into the open
// school and along the classroom, stops at the smart board and touches it. The screen switches on
// with the site inside it, the board pulls out of the wall in 3D and becomes the page. It plays by itself.
const $ = s => document.querySelector(s);
const run = $('#run'), cv = $('#paint'), ctx = cv.getContext('2d');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const img = src => { const i = new Image(); i.src = src; return i; };

/* ---------- the painting (image pixels) ---------- */
const PANO = { im: img('img/bg-pano.webp'), w: 2940, h: 1190, viewH: 800, bottom: 1055,
  ground: [[-10, 878], [200, 863], [400, 870], [600, 900], [800, 955], [1000, 978], [1150, 985], [1200, 983], [2940, 983]],
  screen: [[2620, 613], [2898, 567], [2898, 855], [2620, 857]], edge: 2640, can: 285 };
function groundY(x) { const P = PANO.ground; let i = 0; while (i < P.length - 2 && x > P[i + 1][0]) i++;
  const [x0, y0] = P[i], [x1, y1] = P[i + 1], t = cl((x - x0) / (x1 - x0)); return lerp(y0, y1, t); }

let DPR = 1, W = 0, H = 0;
function resize() { DPR = Math.min(devicePixelRatio || 1, 1.75); W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
addEventListener('resize', resize);
function fit() { const s = Math.max(H / PANO.viewH, W / PANO.w); return { s, vw: W / s, oy: H - PANO.bottom * s }; }

/* ---------- Can: frames cut from the painted animation videos ---------- */
const CAN = {"cw": 257, "ch": 415, "cols": 8, "ax": 122.9, "ay": 409.4, "stand": 400, "start": 12, "cycle": 23, "join": 14, "stop": 21, "stride": 0.785, "tip": [123.6, -308.4]};
const canImg = img('img/can-run.webp');
let canInk = null;                         // the atlas with a soft ink edge baked in, made once
function prepCan() {
  const c = document.createElement('canvas'); c.width = canImg.naturalWidth; c.height = canImg.naturalHeight; const g = c.getContext('2d');
  const sil = document.createElement('canvas'); sil.width = c.width; sil.height = c.height; const sg = sil.getContext('2d');
  sg.drawImage(canImg, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = 'rgba(75,46,56,.75)'; sg.fillRect(0, 0, c.width, c.height);
  for (const [dx, dy] of [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6], [1.1, 1.1], [-1.1, 1.1], [1.1, -1.1], [-1.1, -1.1]]) g.drawImage(sil, dx, dy);
  g.drawImage(canImg, 0, 0); canInk = c;
}
function drawCan(g, i, x, y, hp, alpha = 1) {         // i: atlas frame, (x,y): feet, hp: standing height in css px
  if (!canInk) return;
  const k = hp / CAN.stand, sx = (i % CAN.cols) * CAN.cw, sy = Math.floor(i / CAN.cols) * CAN.ch;
  // soft contact shadow
  const sw = hp * .24; g.save(); g.translate(x, y); g.scale(1, .17);
  const rg = g.createRadialGradient(0, 0, 0, 0, 0, sw); rg.addColorStop(0, `rgba(80,45,50,${.3 * alpha})`); rg.addColorStop(1, 'rgba(80,45,50,0)');
  g.fillStyle = rg; g.beginPath(); g.arc(0, 0, sw, 0, 7); g.fill(); g.restore();
  g.globalAlpha = alpha; g.imageSmoothingQuality = 'high';
  g.drawImage(canInk, sx, sy, CAN.cw, CAN.ch, x - CAN.ax * k, y - CAN.ay * k, CAN.cw * k, CAN.ch * k); g.globalAlpha = 1;
}

/* ---------- the story, in seconds ---------- */
const V = 1.4;                                   // running speed in body heights per second
const T_IDLE = .4, T_START = .8, STOP_FPS = 12, SWITCH = 12, STOP0 = CAN.start + CAN.cycle + 1;
const RUN_T = ((7 - 1 / CAN.cycle) * CAN.stride) / V;       // whole strides, so the stop starts on a matching frame
const T_RUN = T_IDLE + T_START, T_SW = T_RUN + RUN_T, T_DEC = 4 / STOP_FPS;
const T_TOUCH = T_SW + 8 / STOP_FPS, T_ON = T_TOUCH + .1, T_POP = T_ON + .55, T_END = T_POP + 1.65;
const bodies = sec => {                          // distance run, in body heights
  if (sec < T_IDLE) return 0;
  if (sec < T_RUN) { const u = sec - T_IDLE; return V * u * u / (2 * T_START); }
  const d0 = V * T_START / 2;
  if (sec < T_SW) return d0 + V * (sec - T_RUN);
  const u = Math.min(sec - T_SW, T_DEC); return d0 + V * RUN_T + V * (u - u * u / (2 * T_DEC));
};
const TOTAL = bodies(T_END);
const STOPX = PANO.edge - CAN.tip[0] * PANO.can / CAN.stand, X0 = STOPX - TOTAL * PANO.can;
function frameAt(sec) {
  if (sec < T_IDLE) return 0;
  if (sec < T_RUN) return Math.min(CAN.start - 1, Math.floor((sec - T_IDLE) / T_START * CAN.start));
  if (sec < T_SW) { const ph = (CAN.join + (bodies(sec) - bodies(T_RUN)) / CAN.stride * CAN.cycle) % CAN.cycle; return CAN.start + Math.floor(ph); }
  return Math.min(CAN.start + CAN.cycle + CAN.stop - 1, STOP0 + Math.floor((sec - T_SW) * STOP_FPS));
}

function paint(sec, t) {
  const g = ctx; g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const F = fit(), x = X0 + bodies(sec) * PANO.can;
  const camEnd = PANO.w - F.vw, cam = cl(Math.min(x - F.vw * .35, camEnd), 0, camEnd);
  const X = v => (v - cam) * F.s, Y = v => F.oy + v * F.s;
  // only the visible part of the painting
  const sx0 = cam, sw = Math.min(F.vw, PANO.w - cam), sy0 = Math.max(0, -F.oy / F.s), sh = Math.min(PANO.h - sy0, H / F.s);
  g.fillStyle = '#f7efe8'; g.fillRect(0, 0, W, H);
  g.drawImage(PANO.im, sx0, sy0, sw, sh, 0, Y(sy0), sw * F.s, sh * F.s);
  // the smart board's screen: a label, a warm glow when it is touched
  const Q = PANO.screen.map(([a, b]) => [X(a), Y(b)]), qh = Q[3][1] - Q[0][1];
  const on = sm(T_ON, T_ON + .45, sec), glow = sm(T_TOUCH - .05, T_TOUCH + .1, sec);
  g.save(); g.beginPath(); Q.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.clip();
  if (glow > 0) { const rg = g.createRadialGradient(Q[0][0], Q[3][1] - qh * .3, 0, Q[0][0], Q[3][1] - qh * .3, qh * 1.4);
    rg.addColorStop(0, `rgba(255,238,190,${.75 * glow})`); rg.addColorStop(1, `rgba(255,220,160,${.25 * glow})`); g.fillStyle = rg; g.fillRect(Q[0][0], Q[1][1], Q[1][0] - Q[0][0], qh * 1.2); }
  g.globalAlpha = .85 * (1 - glow); g.fillStyle = '#f3ecf6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `italic 500 ${Math.round(qh * .16)}px Fraunces, Georgia, serif`;
  g.fillText((window.RUN_TEXT && RUN_TEXT.board) || 'Dokun', (Math.max(Q[0][0], 0) + Math.min(Q[2][0], W)) / 2, (Q[0][1] + Q[3][1]) / 2 + (Q[1][1] - Q[0][1]) * .25);
  g.restore(); g.globalAlpha = 1;
  // Can
  const hp = PANO.can * F.s;
  drawCan(g, frameAt(sec), X(x), Y(groundY(x)), hp);
  // ripple at the fingertip
  const rp = sm(T_TOUCH, T_TOUCH + .45, sec);
  if (rp > 0 && rp < 1) { const k = hp / CAN.stand, tx = X(x) + CAN.tip[0] * k, ty = Y(groundY(x)) + CAN.tip[1] * k;
    g.strokeStyle = `rgba(255,236,170,${1 - rp})`; g.lineWidth = hp * .025 * (1 - rp); g.beginPath(); g.arc(tx, ty, rp * hp * .7, 0, 7); g.stroke(); }
  // floating motes
  for (let i = 0; i < 26; i++) { const mx = ((i * 137.5 + t * 9) % (W + 40) + W + 40) % (W + 40) - 20, my = (i * 61.7 % H) + Math.sin(t + i) * 10;
    g.fillStyle = `rgba(255,255,255,${.25 + .25 * Math.sin(t * 2 + i)})`; g.beginPath(); g.arc(mx, my, 1 + (i % 3), 0, 7); g.fill(); }
  const xs = Q.map(q => q[0]);
  return { on, rect: { quad: Q, bx: Math.min(...xs), by: (Q[0][1] + Q[1][1]) / 2, bw: Math.max(...xs) - Math.min(...xs), bh: (Q[2][1] + Q[3][1]) / 2 - (Q[0][1] + Q[1][1]) / 2 } };
}

/* ---------- the board turns 3D and becomes the site ---------- */
// 1) the touch switches the painted screen on: the site appears inside it, warped onto the painted screen
// 2) the board pulls out of the wall in 3D  3) it grows until it is the page
const B = $('#b3d');
B.style.transformOrigin = '0 0';
function homography(w, h, q) {             // CSS matrix mapping the box (0,0)-(w,h) onto quad q
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1, g = (sx * dy2 - dx2 * sy) / den, hh = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
  return [a / w, d / w, 0, g / w, b / h, e / h, 0, hh / h, 0, 0, 1, 0, x0, y0, 0, 1];
}
function popMatrix(r, q) {
  const pop = sm(0, .45, q), fill = ease(sm(.35, 1, q));
  const cx0 = r.bx + r.bw / 2, cy0 = r.by + r.bh / 2;
  const sx = lerp(r.bw / W * (1 + .12 * pop), 1, fill), sy = lerp(r.bh / H * (1 + .12 * pop), 1, fill);
  const cx = lerp(cx0 - pop * W * .04, W / 2, fill), cy = lerp(cy0 - pop * H * .04, H / 2, fill);
  const ry = lerp(0, -24, pop) * (1 - fill), rx = lerp(0, 9, pop) * (1 - fill), tz = pop * (1 - fill) * 220;
  const m = new DOMMatrix().translate(cx, cy).scale(sx, sy).translate(0, 0, tz).rotateAxisAngle(0, 1, 0, ry).rotateAxisAngle(1, 0, 0, rx).translate(-W / 2, -H / 2);
  return { m: Array.from(m.toFloat64Array()), pop, fill };
}
function board3d(on, q, r) {
  if (on <= 0 || !r) { B.style.visibility = 'hidden'; return; }
  B.style.visibility = 'visible';
  const blend = sm(0, .25, q);
  const H0 = homography(W, H, r.quad), { m, pop, fill } = popMatrix(r, q);
  const M = H0.map((v, i) => lerp(v / H0[15], m[i] / m[15], blend));
  B.style.transform = `matrix3d(${M.map(v => +v.toFixed(6)).join(',')})`;
  B.style.setProperty('--depth', (lerp(0, 150, pop) * blend * (1 - fill * .999)).toFixed(1) + 'px');
  B.style.setProperty('--bez', (26 * blend * (1 - fill)).toFixed(1) + 'px');
  B.style.setProperty('--fill', on.toFixed(3));
  B.style.setProperty('--content', on.toFixed(3));
  B.style.setProperty('--glow', (sm(0, .25, q) * (1 - sm(.35, .65, q))).toFixed(3));
}

/* ---------- the intro plays by itself ---------- */
let frozen = false, last = performance.now(), clock = 0, ic = 0, pS = 0, playing = false, raf = 0;
function finish() {
  playing = false; cancelAnimationFrame(raf);
  document.documentElement.classList.remove('intro'); run.classList.add('done'); scrollTo(0, 0);
  document.getElementById('board').focus({ preventScroll: true });
}
function draw(sec) {
  pS = cl(sec / T_END);
  const r = paint(sec, clock);
  board3d(r.on, sm(T_POP, T_END, sec), r.rect);
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now; clock += Math.min(.05, raw);
  if (!playing || frozen) return;
  ic += Math.min(.25, raw);            // intro time follows the real clock, even on slow devices
  draw(ic);
  if (ic > T_END + .25) finish();
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
const start = () => { resize(); Promise.all([canImg, PANO.im].map(ready)).then(() => { prepCan(); play(); }); };
(document.fonts ? document.fonts.ready : Promise.resolve()).then(start, start);
window.__run = { get p() { return pS; }, get T() { return T_END; }, play, finish, seek(sec) { frozen = true; ic = sec; clock = sec; draw(sec); } };
