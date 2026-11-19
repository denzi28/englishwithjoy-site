// The watercolor intro: a student runs through a painted world as you scroll,
// reaches the classroom smart board, touches it, and the board turns 3D and becomes the site.
const $ = s => document.querySelector(s);
const run = $('#run'), cv = $('#paint'), ctx = cv.getContext('2d');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let seed = 11; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise1 = (x, s = 0) => Math.sin(x * 1.7 + s) * .5 + Math.sin(x * 3.1 + s * 2.3) * .3 + Math.sin(x * 7.3 + s * 1.1) * .2;

const C = { paper: '#f7efe8', rose: '#e58a9c', deep: '#b8506a', blush: '#f4c9cd', plum: '#5b3448', mauve: '#8c5a72',
  sage: '#9cbfa5', teal: '#5d968f', butter: '#f2d48b', cream: '#f3e3cf', wood: '#d4a074', woodD: '#a8724f', slate: '#2c3048' };

/* ---------- textures ---------- */
function noiseTile(n, a) { const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), d = g.createImageData(n, n);
  for (let i = 0; i < d.data.length; i += 4) { const v = 120 + Math.random() * 135; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = a; } g.putImageData(d, 0, 0); return c; }
const grain = noiseTile(256, 38);
const strokes = (() => { const c = document.createElement('canvas'); c.width = 600; c.height = 600; const g = c.getContext('2d');
  for (let i = 0; i < 900; i++) { const x = rnd() * 600, y = rnd() * 600, l = 20 + rnd() * 70; g.strokeStyle = `rgba(${rnd() < .5 ? '255,255,255' : '60,20,40'},${.04 + rnd() * .08})`;
    g.lineWidth = .6 + rnd() * 1.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + l * .42 + (rnd() - .5) * 6); g.stroke(); } return c; })();
let grainPat, strokePat;

/* a wobbly outline, like a brush edge */
function wobblePath(g, pts, amp, s0) { g.beginPath(); pts.forEach(([x, y], i) => { const n = noise1(i * .7, s0) * amp; i ? g.lineTo(x + n, y + n * .6) : g.moveTo(x + n, y); }); g.closePath(); }
function rectPts(x, y, w, h, r, step = 10) { const P = [], add = (a, b) => P.push([a, b]);
  for (let t = 0; t <= 1; t += step / w) add(x + r + (w - 2 * r) * t, y);
  for (let a = -Math.PI / 2; a <= 0; a += .3) add(x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r);
  for (let t = 0; t <= 1; t += step / h) add(x + w, y + r + (h - r) * t);
  for (let t = 0; t <= 1; t += step / w) add(x + w - w * t, y + h);
  for (let t = 0; t <= 1; t += step / h) add(x, y + h - (h - r) * t);
  for (let a = Math.PI; a <= Math.PI * 1.5; a += .3) add(x + r + Math.cos(a) * r, y + r + Math.sin(a) * r);
  return P; }
/* paint a shape as layered watercolor washes with a darker edge and paper grain */
function wash(g, pts, col, edge, s0, alpha = .5) {
  g.save(); g.fillStyle = col;
  for (let k = 0; k < 4; k++) { g.globalAlpha = alpha * (k ? .45 : 1); g.save(); g.translate((rnd() - .5) * 3, (rnd() - .5) * 3); wobblePath(g, pts, 2.2 + k, s0 + k); g.fill(); g.restore(); }
  g.globalAlpha = .35; g.strokeStyle = edge; g.lineWidth = 1.6; wobblePath(g, pts, 2, s0); g.stroke();
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .22; g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(-9999, -9999, 20000, 20000);
  g.restore(); }
function sprite(w, h, fn) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); fn(c.getContext('2d'), w, h); return c; }

/* ---------- sprites (built per viewport size) ---------- */
let U = 80, S = {};
function buildSprites() {
  const u = U * DPR; S = {};
  S.pillar = [0, 1, 2].map(i => sprite(u * (1.1 + i * .3), u * 12, (g, w, h) => { const grd = g.createLinearGradient(0, 0, w, 0); grd.addColorStop(0, '#f3b5c0'); grd.addColorStop(.6, '#e993a4'); grd.addColorStop(1, '#d9798d');
    wash(g, rectPts(4, 4, w - 8, h, (w - 8) / 2, 14), grd, C.deep, i * 3, .55); }));
  S.arch = sprite(u * 5, u * 9, (g, w, h) => { const P = []; const r = w / 2 - u * .5;
    for (let a = Math.PI; a <= Math.PI * 2; a += .08) P.push([w / 2 + Math.cos(a) * r, r + Math.sin(a) * r + u * .4]);
    const inner = []; for (let a = Math.PI * 2; a >= Math.PI; a -= .08) inner.push([w / 2 + Math.cos(a) * (r - u * .55), r + Math.sin(a) * (r - u * .55) + u * .4]);
    const pts = [[u * .5, h], ...P, [w - u * .5, h], [w - u * .5 - u * .55, h], ...inner, [u * .5 + u * .55, h]];
    wash(g, pts, '#df7f95', C.deep, 4, .6); });
  S.stem = sprite(u * .5, u * 7, (g, w, h) => { wash(g, rectPts(w * .38, 0, w * .24, h, w * .12, 12), '#eaa3b1', C.deep, 9, .5);
    for (let i = 0; i < 4; i++) wash(g, rectPts(w * .5, h * (.15 + i * .2), w * .45, w * .08, w * .04, 6), '#eaa3b1', C.deep, i, .5); });
  S.bush = [0, 1, 2].map(i => sprite(u * 2.4, u * 1.6, (g, w, h) => { for (let k = 0; k < 7; k++) { const x = w * (.2 + rnd() * .6), y = h * (.45 + rnd() * .35), r = u * (.28 + rnd() * .3);
      const P = []; for (let a = 0; a < 6.3; a += .35) P.push([x + Math.cos(a) * r, y + Math.sin(a) * r * .85]); wash(g, P, ['#8fbf9f', '#6fa88f', '#a9cda3'][(k + i) % 3], '#3f6f60', k + i * 7, .45); } }));
  S.sprout = sprite(u * 1.2, u * 1.6, (g, w, h) => { g.strokeStyle = C.mauve; g.lineWidth = u * .05; g.beginPath(); g.moveTo(w / 2, h); g.quadraticCurveTo(w * .45, h * .6, w / 2, h * .35); g.stroke();
    for (const [a, s] of [[-.6, 1], [.6, 1], [0, 1.2]]) { const P = []; for (let t = 0; t < 6.3; t += .4) P.push([w / 2 + Math.sin(a) * u * .32 * s + Math.cos(t) * u * .14, h * .32 - Math.cos(a) * u * .3 * s + Math.sin(t) * u * .24]);
      wash(g, P, '#e7697f', C.deep, a * 10 + 3, .6); } });
  S.block = 'ABCDEF'.split('').map((L, i) => sprite(u * .9, u * .9, (g, w, h) => { wash(g, rectPts(4, 4, w - 8, h - 8, u * .12, 6), [C.butter, '#bfe0d6', '#f2b8c3', '#c9c3ef'][i % 4], C.plum, i * 5, .7);
    g.fillStyle = C.plum; g.globalAlpha = .85; g.font = `700 ${u * .56}px "Fraunces", Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(L, w / 2, h / 2 + u * .03); }));
  S.cloud = [0, 1].map(i => sprite(u * 6, u * 2.2, (g, w, h) => { for (let k = 0; k < 9; k++) { const x = w * (.15 + rnd() * .7), y = h * (.4 + rnd() * .3), r = u * (.5 + rnd() * .5);
      const P = []; for (let a = 0; a < 6.3; a += .3) P.push([x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * .7]); wash(g, P, '#fff7f5', '#f3d3d6', k + i * 9, .22); } }));
  // classroom pieces
  S.window = sprite(u * 3.2, u * 5.2, (g, w, h) => { wash(g, rectPts(6, 6, w - 12, h - 12, (w - 12) / 2, 12), '#fdf4ec', '#c9a98d', 21, .9);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#f8c9cf'); grd.addColorStop(1, '#fbe7dd'); wash(g, rectPts(u * .35, u * .35, w - u * .7, h - u * .75, (w - u * .7) / 2, 12), grd, '#d9a3a9', 22, .85);
    g.globalAlpha = .6; g.fillStyle = '#c9a98d'; g.fillRect(w / 2 - u * .05, u * .3, u * .1, h - u * .6); g.fillRect(u * .3, h * .55, w - u * .6, u * .09); });
  S.desk = sprite(u * 2.2, u * 1.4, (g, w, h) => { wash(g, rectPts(0, h * .2, w, u * .18, u * .05, 8), C.wood, C.woodD, 30, .8);
    wash(g, rectPts(w * .12, h * .2 + u * .12, u * .14, h * .78, u * .04, 8), C.woodD, C.plum, 31, .7); wash(g, rectPts(w * .8, h * .2 + u * .12, u * .14, h * .78, u * .04, 8), C.woodD, C.plum, 32, .7); });
  S.kid = ['#f2a1b5', '#8fc3e8', '#f2d48b', '#a9d3b8', '#c9b3ef'].map((shirt, i) => sprite(u * 1.4, u * 2.1, (g, w, h) => {
    wash(g, rectPts(w * .26, h * .42, w * .5, h * .4, u * .2, 8), shirt, C.plum, 40 + i, .75);
    const P = []; for (let a = 0; a < 6.3; a += .3) P.push([w * .5 + Math.cos(a) * u * .36, h * .27 + Math.sin(a) * u * .36]); wash(g, P, ['#f2cdb3', '#c99271', '#f6d9c2', '#a97352', '#e9be9b'][i], '#8a5a44', 50 + i, .85);
    const H = []; for (let a = Math.PI * .95; a <= Math.PI * 2.1; a += .25) H.push([w * .5 + Math.cos(a) * u * .39, h * .25 + Math.sin(a) * u * .37]); wash(g, H, ['#3a2418', '#6b3b1f', '#1b1410', '#d9a35a', '#2b1b12'][i], '#1b0f0a', 60 + i, .85);
    g.fillStyle = C.plum; g.beginPath(); g.arc(w * .63, h * .28, u * .045, 0, 7); g.fill(); g.fillStyle = 'rgba(240,120,140,.45)'; g.beginPath(); g.arc(w * .66, h * .34, u * .07, 0, 7); g.fill(); }));
  S.shelf = sprite(u * 2.6, u * 2.8, (g, w, h) => { wash(g, rectPts(0, 0, w, h, u * .1, 10), C.wood, C.woodD, 70, .8);
    for (let r = 0; r < 3; r++) for (let b = 0; b < 6; b++) wash(g, rectPts(u * .2 + b * u * .38, u * .2 + r * u * .85, u * .3, u * .62, u * .05, 6), [C.rose, C.sage, C.butter, '#8fc3e8', '#c9b3ef'][(b + r) % 5], C.plum, 71 + r * 6 + b, .7); });
  S.flag = [C.rose, C.butter, C.sage, '#8fc3e8', '#c9b3ef'].map((c, i) => sprite(u * .6, u * .7, (g, w, h) => wash(g, [[4, 4], [w - 4, 4], [w / 2, h - 4]], c, C.plum, 80 + i, .8)));
}

/* ---------- world ---------- */
const GP = [[-10, 2.2], [6, 2.2], [16.5, 4.6], [22, 4.4], [31, 2.1], [35.5, 1.8], [39.5, 1.6], [400, 1.6]];
function groundY(x) { let i = 0; while (i < GP.length - 2 && x > GP[i + 1][0]) i++; const [x0, y0] = GP[i], [x1, y1] = GP[i + 1], t = cl((x - x0) / (x1 - x0));
  return lerp(y0, y1, .5 - .5 * Math.cos(Math.PI * t)) + (x < 37 ? noise1(x * .5, 2) * .1 : 0); }
const INSIDE = 40, BOARDX = 76;
let BW = 6, BH = 3.4, BY = 3.4;   // board size in units, matched to the screen's aspect
const FAR = [], MID = [], NEAR = [], FG = [];
for (let x = -4; x < 100; x += 4 + rnd() * 5) FAR.push({ x, k: (rnd() * 3) | 0, y: rnd() * 1.5 });
for (let x = 2; x < 37; x += 4.5 + rnd() * 5) MID.push({ x, t: rnd() < .35 ? 'arch' : 'stem', s: .8 + rnd() * .4 });
for (let x = 3; x < 37; x += 1.8 + rnd() * 2.6) NEAR.push({ x, t: rnd() < .55 ? 'bush' : 'sprout', k: (rnd() * 3) | 0, s: .7 + rnd() * .5 });
for (let x = 6; x < 36; x += 6 + rnd() * 6) FG.push({ x, k: (rnd() * 3) | 0 });
const BLOCKS = [5, 10, 14.5, 19.5, 25, 30].map((x, i) => ({ x, y: groundY(x) + 2.4 + rnd() * 1.2, k: i, ph: rnd() * 6 }));
const DESKS = [46, 53, 60, 67].map((x, i) => ({ x, k: i % 5 }));

/* ---------- sizing ---------- */
let W = 0, H = 0, DPR = 1;
function resize() { DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  U = H / 10; BH = 3.3; BW = BH * W / H; BY = 1.6 + 1.25 + BH / 2; buildSprites();
  grainPat = ctx.createPattern(grain, 'repeat'); strokePat = ctx.createPattern(strokes, 'repeat'); }
addEventListener('resize', resize);

/* ---------- the student (Can), painted frames ---------- */
const CAN = {"cw": 350, "ch": 492, "cols": 4, "ax": 175, "ay": 486, "frames": {"run1": {"i": 0, "tipx": 130, "tipy": -241, "h": 442}, "run2": {"i": 1, "tipx": 137, "tipy": -213, "h": 419}, "run3": {"i": 2, "tipx": 91, "tipy": -394, "h": 447}, "run4": {"i": 3, "tipx": 151, "tipy": -243, "h": 443}, "run5": {"i": 4, "tipx": 131, "tipy": -249, "h": 447}, "run6": {"i": 5, "tipx": 131, "tipy": -210, "h": 417}, "run7": {"i": 6, "tipx": 94, "tipy": -11, "h": 449}, "run8": {"i": 7, "tipx": 146, "tipy": -246, "h": 445}, "idle1": {"i": 8, "tipx": 90, "tipy": -425, "h": 480}, "idle2": {"i": 9, "tipx": 90, "tipy": -425, "h": 480}, "crouch": {"i": 10, "tipx": 163, "tipy": -371, "h": 438}, "air": {"i": 11, "tipx": 151, "tipy": -371, "h": 472}, "touch1": {"i": 12, "tipx": 86, "tipy": -393, "h": 480}, "touch2": {"i": 13, "tipx": 150, "tipy": -369, "h": 480}, "touch3": {"i": 14, "tipx": 168, "tipy": -379, "h": 480}, "touch4": {"i": 15, "tipx": 160, "tipy": -381, "h": 480}}};
const canImg = new Image(); canImg.src = 'img/can.webp';
const RUNCYC = [1, 2, 3, 5, 6, 7];     // contact, down, passing x2, no double contacts
const KH = 2.6;                       // Can's height in world units
const tipU = CAN.frames.touch3.tipx / CAN.frames.touch3.h * KH, tipUy = -CAN.frames.touch3.tipy / CAN.frames.touch3.h * KH;
let jumpAt = -9;
function drawCan(g, name, x, y, u, lift = 0) {
  if (!canImg.complete || !canImg.naturalWidth) return;
  const f = CAN.frames[name], i = f.i, sx0 = (i % CAN.cols) * CAN.cw, sy0 = Math.floor(i / CAN.cols) * CAN.ch;
  const k = KH * u / 480;                 // pixels per sprite pixel
  g.imageSmoothingQuality = 'high';
  g.drawImage(canImg, sx0, sy0, CAN.cw, CAN.ch, x - CAN.ax * k, y - CAN.ay * k - lift * u, CAN.cw * k, CAN.ch * k);
}
/* ---------- painting ---------- */
function paint(P, t) {
  const g = ctx, u = U * DPR, w = cv.width, h = cv.height;
  const runP = cl(P / .78);
  const kidX = lerp(3, BOARDX - BW / 2 - tipU + .06, runP);
  const viewU = W / U, camX = cl(kidX - viewU * .36, -2, BOARDX + BW / 2 + .6 - viewU);
  const sx = wx => (wx - camX) * u, sy = wy => h - wy * u;
  const inside = sm(INSIDE - 6, INSIDE + 2, camX + viewU * .5);
  // paper sky
  let grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#fbf3ee'); grd.addColorStop(1, '#f6e4e2'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.save(); g.globalAlpha = .6;
  for (let i = 0; i < 5; i++) { const x = ((i * 7.3 - camX * .1) % 40 + 40) % 40 * u * .9 - u * 4, y = h * (.15 + (i % 3) * .08); g.drawImage(S.cloud[i % 2], x, y); }
  g.restore();
  // far pillars (slow)
  for (const f of FAR) { const x = (f.x - camX * .3) * u; if (x < -u * 2 || x > w + u) continue; const im = S.pillar[f.k]; g.globalAlpha = .5; g.drawImage(im, x, h * .02 + f.y * u, im.width, im.height); }
  g.globalAlpha = 1;
  // mid arches and stems
  for (const m of MID) { const x = (m.x - camX * .62) * u; const im = S[m.t]; if (x < -im.width || x > w + im.width) continue; const gy = sy(groundY(m.x * .62 + camX * .38) + .2);
    g.globalAlpha = .82; g.drawImage(im, x, gy - im.height * m.s, im.width * m.s, im.height * m.s); }
  g.globalAlpha = 1;
  // floating letter blocks
  for (const b of BLOCKS) { const x = sx(b.x), y = sy(b.y + Math.sin(t * 1.2 + b.ph) * .18); if (x < -u || x > w + u) continue; g.save(); g.translate(x, y); g.rotate(Math.sin(t * .9 + b.ph) * .12); const im = S.block[b.k]; g.drawImage(im, -im.width / 2, -im.height / 2); g.restore(); }
  // classroom interior: back wall, windows, bunting, shelves and the smart board
  if (camX + viewU > INSIDE - 6) {
    const x0 = sx(INSIDE - 2);
    g.save(); g.beginPath(); g.rect(x0, 0, w - x0 + 9999, h); g.clip();
    grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#f6e7d6'); grd.addColorStop(1, '#efd6c4'); g.fillStyle = grd; g.fillRect(x0, 0, w - x0, h);
    g.globalAlpha = .35; g.fillStyle = strokePat; g.fillRect(x0, 0, w - x0, h); g.globalAlpha = 1;
    for (const wx of [44, 52, 60, 68]) { const x = sx(wx); if (x > -u * 4 && x < w + u) { g.drawImage(S.window, x - S.window.width / 2, sy(7.6));
      const lg = g.createLinearGradient(x, sy(7), x + u * 3, sy(1.6)); lg.addColorStop(0, 'rgba(255,240,230,.55)'); lg.addColorStop(1, 'rgba(255,240,230,0)'); g.fillStyle = lg;
      g.beginPath(); g.moveTo(x - u * 1.2, sy(7.2)); g.lineTo(x + u * 1.2, sy(7.2)); g.lineTo(x + u * 3.6, sy(1.6)); g.lineTo(x + u * .6, sy(1.6)); g.fill(); } }
    for (let i = 0; i < 40; i++) { const wx = INSIDE + i * .9, x = sx(wx); if (x < -u || x > w + u) continue; const sag = Math.sin((i % 12) / 11 * Math.PI) * .35; g.drawImage(S.flag[i % 5], x, sy(8.9 - sag)); }
    g.drawImage(S.shelf, sx(INSIDE + 1.2), sy(1.6 + 2.8));
    // the board on the wall
    const bx = sx(BOARDX - BW / 2), by = sy(BY + BH / 2), bw = BW * u, bh = BH * u;
    g.fillStyle = 'rgba(70,40,50,.18)'; g.beginPath(); g.roundRect(bx + u * .12, by + u * .18, bw, bh, u * .25); g.fill();
    wash(g, rectPts(bx - u * .15, by - u * .15, bw + u * .3, bh + u * .3, u * .28, 16), '#3a3550', '#1d1a2a', 90, .95);
    const glow = sm(.805, .82, P);
    grd = g.createLinearGradient(bx, by, bx + bw, by + bh); grd.addColorStop(0, lerp(0, 1, glow) > .5 ? '#3d4f8f' : '#2b2f48'); grd.addColorStop(1, '#232740');
    g.fillStyle = grd; g.beginPath(); g.roundRect(bx, by, bw, bh, u * .14); g.fill();
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bw * .45, by); g.lineTo(bx + bw * .2, by + bh); g.lineTo(bx, by + bh); g.fill();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = `600 ${u * .42}px "Fraunces", Georgia, serif`; g.textAlign = 'center'; g.fillText(window.RUN_TEXT && RUN_TEXT.board || 'Touch me', bx + bw / 2, by + bh / 2 + u * .15);
    wash(g, rectPts(bx - u * .2, by + bh + u * .12, bw + u * .4, u * .2, u * .08, 12), '#4a4560', '#1d1a2a', 91, .9);
    g.restore();
  }
  // ground
  g.save(); g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w + 8; x += 8) g.lineTo(x, sy(groundY(camX + x / u)));
  g.lineTo(w, h); g.closePath();
  grd = g.createLinearGradient(0, h * .45, 0, h); grd.addColorStop(0, '#6a2a4a'); grd.addColorStop(.16, '#a84e72'); grd.addColorStop(.5, '#d7949f'); grd.addColorStop(.8, '#b9b6a2'); grd.addColorStop(1, '#6fa592');
  g.fillStyle = grd; g.fill(); g.clip();
  g.globalAlpha = .9; g.fillStyle = strokePat; g.save(); g.translate(-camX * u % 600, 0); g.fillRect(0, 0, w + 600, h); g.restore();
  if (inside > 0) { const xf = sx(INSIDE - 2); g.globalAlpha = 1; grd = g.createLinearGradient(0, sy(1.6), 0, h); grd.addColorStop(0, '#c99a77'); grd.addColorStop(1, '#a87656'); g.fillStyle = grd; g.fillRect(xf, 0, w - xf, h);
    g.globalAlpha = .25; g.strokeStyle = '#6e4630'; g.lineWidth = DPR; for (let i = 0; i < 6; i++) { const yy = sy(1.6) + i * u * .3 + u * .1; g.beginPath(); g.moveTo(xf, yy); g.lineTo(w, yy); g.stroke(); } }
  g.restore();
  // dark crest along the ground edge
  g.save(); g.strokeStyle = 'rgba(70,30,50,.55)'; g.lineWidth = u * .07; g.beginPath();
  for (let x = 0; x <= w + 8; x += 8) { const wx = camX + x / u; const y = sy(groundY(wx)) + noise1(wx * 2, 5) * u * .02; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore();
  // near plants
  for (const n of NEAR) { const x = sx(n.x); const im = n.t === 'bush' ? S.bush[n.k] : S.sprout; if (x < -im.width || x > w + im.width) continue;
    g.drawImage(im, x - im.width * n.s / 2, sy(groundY(n.x)) - im.height * n.s + u * .1, im.width * n.s, im.height * n.s); }
  // desks with kids, who turn to watch Can run past
  for (const d of DESKS) { const x = sx(d.x); if (x < -u * 3 || x > w + u * 3) continue; const gy = sy(1.6);
    const kidIm = S.kid[d.k], hop = sm(.835, .86, P) * Math.abs(Math.sin(t * 7 + d.k)) * u * .35;
    g.drawImage(kidIm, x - u * .2, gy - kidIm.height - u * .05 - hop); g.drawImage(S.desk, x + u * .4, gy - S.desk.height); }
  // the student
  const jt = t - jumpAt; let frame, lift = 0;
  if (jt < .75) { frame = jt < .12 || jt > .62 ? 'crouch' : 'air'; lift = jt > .12 && jt < .62 ? Math.sin((jt - .12) / .5 * Math.PI) * 1.1 : 0; }
  else if (P <= 0) frame = (t % 3.2) < .14 ? 'idle2' : 'idle1';
  else if (P < .78) frame = 'run' + RUNCYC[Math.floor(kidX * 1.45) % RUNCYC.length];
  else if (P < .792) frame = 'touch1'; else if (P < .804) frame = 'touch2'; else if (P < .9) frame = 'touch3'; else frame = 'touch4';
  const slope = P < .78 ? (groundY(kidX + .3) - groundY(kidX - .3)) / .6 : 0;
  g.save(); g.translate(sx(kidX), sy(groundY(kidX)) + u * .04); g.rotate(-Math.atan(slope) * .3); drawCan(g, frame, 0, 0, u, lift); g.restore();
  // touch ripple
  const rp = sm(.806, .86, P); if (rp > 0 && rp < 1) { const x = sx(kidX + tipU), y = sy(1.6 + tipUy); g.strokeStyle = `rgba(255,236,170,${1 - rp})`; g.lineWidth = u * .08 * (1 - rp); g.beginPath(); g.arc(x, y, rp * u * 3, 0, 7); g.stroke(); }
  // foreground silhouettes passing in front
  for (const f of FG) { const x = (f.x - camX * 1.35) * u; const im = S.bush[f.k]; if (x < -im.width * 2 || x > w + im.width) continue; g.globalAlpha = .55; g.drawImage(im, x, h - im.height * 1.1, im.width * 2, im.height * 2); }
  g.globalAlpha = 1;
  // floating motes
  for (let i = 0; i < 40; i++) { const x = ((i * 137.5 + t * 8 - camX * u * .2) % (w + 40) + w + 40) % (w + 40) - 20, y = (i * 61.7 % h) + Math.sin(t + i) * 10 * DPR;
    g.fillStyle = `rgba(255,255,255,${.35 + .35 * Math.sin(t * 2 + i)})`; g.beginPath(); g.arc(x, y, (1 + (i % 3)) * DPR, 0, 7); g.fill(); }
  // paper grain over everything
  g.globalCompositeOperation = 'multiply'; g.globalAlpha = .26; g.fillStyle = grainPat; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  return { bx: (BOARDX - BW / 2 - camX) * U, by: H - (BY + BH / 2) * U, bw: BW * U, bh: BH * U, kidX, camX };
}

/* ---------- the board turns 3D and becomes the site ---------- */
const B = $('#b3d'), face = $('#b3d .bface');
function board3d(P, r) {
  const q = sm(.84, 1, P);
  if (P < .835) { B.style.visibility = 'hidden'; return; }
  B.style.visibility = 'visible';
  const pop = sm(0, .45, q), fill = ease(sm(.35, 1, q));
  const s0 = r.bw / W, cx0 = r.bx + r.bw / 2, cy0 = r.by + r.bh / 2;
  const s = lerp(s0 * (1 + .12 * pop), 1, fill), cx = lerp(cx0 - pop * W * .04, W / 2, fill), cy = lerp(cy0 - pop * H * .04, H / 2, fill);
  const ry = lerp(0, -24, pop) * (1 - fill), rx = lerp(0, 9, pop) * (1 - fill), tz = pop * (1 - fill) * 220;
  B.style.transform = `translate(${(cx - W / 2).toFixed(1)}px,${(cy - H / 2).toFixed(1)}px) scale(${s.toFixed(4)}) translateZ(${tz.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
  B.style.setProperty('--depth', (lerp(0, 150, pop) * (1 - fill * .999)).toFixed(1) + 'px');
  B.style.setProperty('--bez', (lerp(26, 0, fill)).toFixed(1) + 'px');
  B.style.setProperty('--content', sm(.45, .85, q).toFixed(3));
  B.style.setProperty('--glow', (sm(0, .2, q) * (1 - sm(.4, .7, q))).toFixed(3));
}

/* ---------- the intro plays by itself ---------- */
const TL = [[0, 0], [.9, 0], [8.9, .78], [10.5, .84], [12.8, 1]];   // seconds -> story progress
const runEase = k => k < .1 ? k * k / .18 : k > .9 ? 1 - (1 - k) * (1 - k) / .18 : (k - .05) / .9;   // ease in, steady run, ease out
function progress(sec) { for (let i = 0; i < TL.length - 1; i++) { const [a, pa] = TL[i], [b, pb] = TL[i + 1]; if (sec <= b) { let k = cl((sec - a) / (b - a)); if (i === 1) k = runEase(k); return lerp(pa, pb, cl(k)); } } return 1; }
let last = performance.now(), clock = 0, ic = 0, pS = 0, playing = false, started = 0, rect = null, raf = 0;
const caps = [...document.querySelectorAll('.cap')], CAPS = [[0, .16], [.2, .4], [.46, .62], [.66, .8]];
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
  const sec = ic; pS = progress(sec);
  rect = paint(pS, clock);
  board3d(pS, rect);
  if (sec > TL[TL.length - 1][0] + .25) finish();
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
const start = () => { resize(); (canImg.decode ? canImg.decode().catch(() => {}) : Promise.resolve()).then(play); };
(document.fonts ? document.fonts.ready : Promise.resolve()).then(start, start);
window.__run = { get p() { return pS; }, play, finish };
