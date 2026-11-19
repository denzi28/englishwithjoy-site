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
const CLASS = { im: img('img/bg-class.webp'), w: 2390, h: 932, floor: 770, x0: -260, edge: 1866,
  screen: [[1850, 212], [2306, 128], [2304, 584], [1850, 590]] };
function pathY(x) { const P = ROAD.path; let i = 0; while (i < P.length - 2 && x > P[i + 1][0]) i++;
  const [x0, y0] = P[i], [x1, y1] = P[i + 1], t = cl((x - x0) / (x1 - x0)); return lerp(y0, y1, t); }

let DPR = 1, W = 0, H = 0;
function resize() { DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
addEventListener('resize', resize);
// cover the viewport, keep the bottom of the painting (the ground) in view
function fit(S) { const s = Math.max(H / S.h, W / S.w); return { s, vw: W / s, oy: H - S.h * s }; }

/* ---------- the student (Can): a painted cut-out puppet, so both legs and arms really alternate ---------- */
const RIG = {"S":0.75,"parts":{"body":{"sx":0,"sy":0,"w":338,"h":630,"ox":0.0,"oy":0.0},"sleeve":{"sx":342,"sy":0,"w":135,"h":154,"ox":82.5,"oy":315.0},"uarm":{"sx":481,"sy":0,"w":112,"h":172,"ox":97.5,"oy":405.0},"farm":{"sx":597,"sy":0,"w":120,"h":134,"ox":97.5,"oy":540.8},"shoe":{"sx":721,"sy":0,"w":120,"h":82,"ox":127.5,"oy":847.5},"pants":{"sx":845,"sy":0,"w":68,"h":165,"ox":0.0,"oy":0.0}},"j":{"hip":[178.5,603.8],"shoulder":[152.2,433.5],"elbow":[154.5,558.8],"hand":[171.0,660.0],"ankle":[178.5,870.0],"sole":924.0,"top":18.8,"knee_len":133.5,"shin_len":129.0,"thigh_w":84.0,"shin_w":75.0}};
const rigImg = img('img/can-rig.webp');
let rigDark = null, patN = null, patD = null;
function prepRig() {                       // a shaded copy for the far arm and leg, and the trouser cloth as patterns
  rigDark = document.createElement('canvas'); rigDark.width = rigImg.naturalWidth; rigDark.height = rigImg.naturalHeight;
  const d = rigDark.getContext('2d'); d.drawImage(rigImg, 0, 0); d.globalCompositeOperation = 'source-atop'; d.fillStyle = 'rgba(52,36,70,.3)'; d.fillRect(0, 0, rigDark.width, rigDark.height);
  const p = RIG.parts.pants, tile = src => { const c = document.createElement('canvas'); c.width = p.w; c.height = p.h; c.getContext('2d').drawImage(src, p.sx, p.sy, p.w, p.h, 0, 0, p.w, p.h); return ctx.createPattern(c, 'repeat'); };
  patN = tile(rigImg); patD = tile(rigDark);
}
const J = RIG.j, D2R = Math.PI / 180, ORX = J.hip[0], ORY = J.sole, STAND = J.sole - J.top;
const LU = J.elbow[1] - J.shoulder[1], LF = J.hand[1] - J.elbow[1] + 14;
const wrap = v => v - Math.floor(v + .5);           // to -.5 .. .5
// poses are joint angles in degrees: forward is positive
function gait(ph) {
  const leg = p => { const th = 38 * Math.sin(2 * Math.PI * p), d = wrap(p - .86), kick = Math.abs(d) < .27 ? Math.cos(Math.PI * d / .54) : 0;
    return { th, kn: 14 + 92 * kick * kick, ft: 0 }; };
  const arm = p => ({ a: 8 - 46 * Math.sin(2 * Math.PI * p), e: 78 + 14 * Math.sin(2 * Math.PI * p) });
  return { lean: 7, bob: 0, nl: leg(ph), fl: leg(ph + .5), na: arm(ph), fa: arm(ph + .5) };
}
const STANDP = { lean: 0, bob: 0, nl: { th: 1, kn: 3, ft: 0 }, fl: { th: -1, kn: 3, ft: 0 }, na: { a: 3, e: 6 }, fa: { a: -3, e: 6 } };
const TOUCHP = { lean: 2, bob: 0, nl: { th: 6, kn: 4, ft: 0 }, fl: { th: -8, kn: 6, ft: 0 }, na: { a: 118, e: 8 }, fa: { a: -6, e: 14 } };
const TUCKP = { lean: 4, bob: 0, nl: { th: 52, kn: 96, ft: 0 }, fl: { th: 30, kn: 104, ft: 0 }, na: { a: 150, e: 30 }, fa: { a: 130, e: 40 } };
const mixO = (A, B, t) => { const o = {}; for (const k in A) o[k] = typeof A[k] === 'number' ? lerp(A[k], B[k], t) : mixO(A[k], B[k], t); return o; };
function limbs(p) {                         // joint positions in rig space for a pose
  const c = Math.cos(p.lean * D2R), s = Math.sin(p.lean * D2R);
  const rot = (x, y) => { const dx = x - J.hip[0], dy = y - J.hip[1]; return [J.hip[0] + dx * c - dy * s, J.hip[1] + dx * s + dy * c]; };
  const legP = L => { const t = L.th * D2R, sh = (L.th - L.kn) * D2R, K = [J.hip[0] + J.knee_len * Math.sin(t), J.hip[1] + J.knee_len * Math.cos(t)];
    return { K, A: [K[0] + J.shin_len * Math.sin(sh), K[1] + J.shin_len * Math.cos(sh)], ft: (L.th - L.kn) * .45 + L.ft }; };
  const armP = R => { const S = rot(J.shoulder[0], J.shoulder[1]), a = R.a * D2R + p.lean * D2R, f = (R.a + R.e) * D2R + p.lean * D2R;
    const E = [S[0] + LU * Math.sin(a), S[1] + LU * Math.cos(a)]; return { S, E, a, f, T: [E[0] + LF * Math.sin(f), E[1] + LF * Math.cos(f)] }; };
  return { nl: legP(p.nl), fl: legP(p.fl), na: armP(p.na), fa: armP(p.fa) };
}
function soleDrop(L) { return Math.max(L.nl.A[1], L.fl.A[1]) + (J.sole - J.ankle[1]) - J.sole; }   // >0: feet below the ground line
// draws the puppet with its feet on the ground point (0,0) of the current transform, scaled to rig pixels
function puppet(g, p, lift) {
  const L = limbs(p), drop = soleDrop(L);
  g.save(); g.translate(-ORX, -ORY - drop - lift);
  const part = (src, n, x, y, ang, px, py) => { const q = RIG.parts[n]; g.save(); g.translate(x, y); g.rotate(-ang); g.drawImage(src, q.sx, q.sy, q.w, q.h, q.ox - px, q.oy - py, q.w, q.h); g.restore(); };
  const leg = (Lg, src, pat, ink) => {
    part(src, 'shoe', Lg.A[0], Lg.A[1], -Lg.ft * D2R, J.ankle[0], J.ankle[1]);
    const segs = [[J.hip, Lg.K, J.thigh_w], [Lg.K, Lg.A, J.shin_w]];
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const pass of [0, 1]) for (const [P0, P1, w] of segs) {     // ink edge for the whole leg first, then the cloth
      g.beginPath(); g.moveTo(P0[0], P0[1]); g.lineTo(P1[0], P1[1]);
      if (!pass) { g.strokeStyle = ink; g.lineWidth = w + 5; }
      else { pat.setTransform && pat.setTransform(new DOMMatrix().translate(P0[0], P0[1]).rotate(Math.atan2(P1[1] - P0[1], P1[0] - P0[0]) * 57.3 - 90).translate(-34, 0)); g.strokeStyle = pat; g.lineWidth = w; }
      g.stroke(); }
  };
  const arm = (R, src) => { part(src, 'farm', R.E[0], R.E[1], R.f, J.elbow[0], J.elbow[1]); part(src, 'uarm', R.S[0], R.S[1], R.a, J.shoulder[0], J.shoulder[1]); };
  arm(L.fa, rigDark);
  leg(L.fl, rigDark, patD, '#2a2440');
  leg(L.nl, rigImg, patN, '#352f52');
  g.save(); g.translate(J.hip[0], J.hip[1]); g.rotate(p.lean * D2R); g.translate(-J.hip[0], -J.hip[1]);
  const b = RIG.parts.body; g.drawImage(rigImg, b.sx, b.sy, b.w, b.h, b.ox, b.oy, b.w, b.h); g.restore();
  arm(L.na, rigImg);
  g.save(); g.translate(J.hip[0], J.hip[1]); g.rotate(p.lean * D2R); g.translate(-J.hip[0], -J.hip[1]);
  const sl = RIG.parts.sleeve; g.drawImage(rigImg, sl.sx, sl.sy, sl.w, sl.h, sl.ox, sl.oy, sl.w, sl.h); g.restore();
  g.restore();
  return L;
}
// fingertip of the touch pose, relative to the feet, in rig pixels
const TIP = (() => { const L = limbs(TOUCHP), d = soleDrop(L); return [L.na.T[0] - ORX, L.na.T[1] - ORY - d]; })();

// off-screen canvases: Can is painted there first, then laid into the scene with an ink edge and a shadow
const oc = document.createElement('canvas'), og = oc.getContext('2d'), sc = document.createElement('canvas'), sg = sc.getContext('2d');
function drawCan(g, pose, x, y, hp, alpha = 1, lift = 0, tint = null) {
  if (!rigDark || alpha <= 0) return;
  const k = hp / STAND, pad = hp * .5, w = Math.ceil(hp * 1.3 * DPR), h = Math.ceil(hp * 1.8 * DPR);
  if (oc.width !== w || oc.height !== h) { oc.width = sc.width = w; oc.height = sc.height = h; }
  og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, w, h);
  og.setTransform(k * DPR, 0, 0, k * DPR, w / 2, h - pad * .4 * DPR); og.imageSmoothingQuality = 'high';
  puppet(og, pose, lift / k);
  if (tint) { og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-atop'; og.fillStyle = tint; og.fillRect(0, 0, w, h); og.globalCompositeOperation = 'source-over'; }
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, w, h); sg.drawImage(oc, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#4b2e38'; sg.fillRect(0, 0, w, h); sg.globalCompositeOperation = 'source-over';
  const ox = x - w / DPR / 2, oy = y - (h / DPR - pad * .4);
  // soft contact shadow, smaller and lighter while in the air
  const sw = hp * .26 * (1 - Math.min(.5, lift / hp)), sh = hp * .045;
  const rg = g.createRadialGradient(x, y, 0, x, y, sw); rg.addColorStop(0, `rgba(70,35,45,${.34 * alpha * (1 - Math.min(.6, lift / hp * 2))})`); rg.addColorStop(1, 'rgba(70,35,45,0)');
  g.save(); g.translate(x, y); g.scale(1, sh / sw); g.translate(-x, -y); g.fillStyle = rg; g.beginPath(); g.arc(x, y, sw, 0, 7); g.fill(); g.restore();
  g.globalAlpha = alpha * .7; const e = Math.max(.8, hp / 380);
  for (const [dx, dy] of [[e, 0], [-e, 0], [0, e], [0, -e], [e * .7, e * .7], [-e * .7, e * .7], [e * .7, -e * .7], [-e * .7, -e * .7]]) g.drawImage(sc, ox + dx, oy + dy, w / DPR, h / DPR);
  g.globalAlpha = alpha; g.drawImage(oc, ox, oy, w / DPR, h / DPR); g.globalAlpha = 1;
}
let jumpAt = -9;
// the pose for this moment of the story
function poseFor(P, t, dist) {
  let p;
  if (P <= 0) { p = mixO(STANDP, STANDP, 0); p.na.a = 3 + Math.sin(t * 2) * 2; p.fa.a = -3 - Math.sin(t * 2) * 2; }
  else if (P < P_RUN) { const ph = dist / 1.05; p = gait(ph); const st = sm(0, .02, P) * (1 - sm(P_RUN - .015, P_RUN, P)); p = mixO(STANDP, p, st); }
  else p = mixO(STANDP, TOUCHP, sm(P_RUN, .804, P));
  let lift = 0; const jt = t - jumpAt;
  if (jt < .75) { const up = jt > .12 && jt < .62 ? Math.sin((jt - .12) / .5 * Math.PI) : 0; p = mixO(p, TUCKP, jt < .12 ? jt / .12 * .5 : jt > .62 ? (.75 - jt) / .13 * .5 : .5 + up * .5); lift = up; }
  return [p, lift];
}

/* ---------- story beats (P is 0..1) ---------- */
const P_ROAD = .40, P_DOOR = .46, P_RUN = .78;
const easeIn = k => k < .14 ? k * k / .28 : k - .07;              // accelerate, then steady (normalised below)
const easeOut = k => k > .8 ? k - (k - .8) * (k - .8) / .4 : k;      // steady, then slow down to a stop
const roadK = k => easeIn(k) / easeIn(1), classK = k => easeOut(k) / easeOut(1);
const H_ROAD = .25, H_CLASS = .43;                              // Can's height as a share of the painting

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
    const [pose, lift] = poseFor(P, t, (x - ROAD.x0) / (ROAD.h * H_ROAD));
    const a = 1 - sm(ROAD.door - 70, ROAD.door, x);
    drawCan(g, pose, (x - cam) * F.s, F.oy + pathY(x) * F.s, hp, a, lift * hp * .45, 'rgba(255,236,240,.06)');
    g.restore();
  }
  // classroom scene
  if (fade > 0) {
    const F = fit(CLASS), k = cl((P - P_DOOR) / (P_RUN - P_DOOR)), stop = CLASS.edge - TIP[0] * CLASS.h * H_CLASS / STAND, x = P < P_DOOR ? CLASS.x0 : lerp(CLASS.x0, stop, classK(k));
    const cam = cl(x - F.vw * .3, 0, CLASS.w - F.vw), X = v => (v - cam) * F.s, Y = v => F.oy + v * F.s;
    g.globalAlpha = fade; g.drawImage(CLASS.im, -cam * F.s, F.oy, CLASS.w * F.s, CLASS.h * F.s); g.globalAlpha = 1;
    // the smart board's screen: label, then a glow when Can touches it
    const Q = CLASS.screen.map(([a, b]) => [X(a), Y(b)]);
    const cx = (Math.max(Q[0][0], 0) + Math.min(Q[2][0], W)) / 2, cy = (Q[0][1] + Q[3][1]) / 2 + (Q[1][1] - Q[0][1]) * .25, qh = Q[3][1] - Q[0][1];
    const glow = sm(.8, .81, P);
    g.save(); g.beginPath(); Q.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.closePath(); g.clip();
    if (glow > 0) { const rg = g.createRadialGradient(Q[0][0], Q[3][1] - qh * .3, 0, Q[0][0], Q[3][1] - qh * .3, qh * 1.4);
      rg.addColorStop(0, `rgba(255,238,190,${.75 * glow})`); rg.addColorStop(1, `rgba(255,220,160,${.25 * glow})`); g.fillStyle = rg; g.fillRect(Q[0][0], Q[1][1], Q[1][0] - Q[0][0], qh * 1.2); }
    g.globalAlpha = fade * .85 * (1 - glow); g.fillStyle = '#f3ecf6'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 500 ${Math.round(qh * .15)}px Fraunces, Georgia, serif`; g.fillText((window.RUN_TEXT && RUN_TEXT.board) || 'Dokun', cx, cy);
    g.restore(); g.globalAlpha = 1;
    // Can
    const hp = CLASS.h * F.s * H_CLASS;
    const [pose, lift] = poseFor(P, t, (ROAD.door - ROAD.x0) / (ROAD.h * H_ROAD) + (x - CLASS.x0) / (CLASS.h * H_CLASS));
    if (P >= P_DOOR) drawCan(g, pose, X(x), Y(CLASS.floor), hp, cl((P - P_DOOR) / .015), lift * hp * .45, 'rgba(255,214,206,.07)');
    // ripple at the fingertip
    const rp = sm(.806, .86, P);
    if (rp > 0 && rp < 1) { const kk = hp / STAND, tx = X(x) + TIP[0] * kk, ty = Y(CLASS.floor) + TIP[1] * kk;
      g.strokeStyle = `rgba(255,236,170,${1 - rp})`; g.lineWidth = hp * .02 * (1 - rp); g.beginPath(); g.arc(tx, ty, rp * hp * .7, 0, 7); g.stroke(); }
    const xs = Q.map(q => q[0]), ys = Q.map(q => q[1]);
    rect = { quad: Q, bx: Math.min(...xs), by: (Q[0][1] + Q[1][1]) / 2, bw: Math.max(...xs) - Math.min(...xs), bh: (Q[2][1] + Q[3][1]) / 2 - (Q[0][1] + Q[1][1]) / 2 };
  }
  // floating motes
  for (let i = 0; i < 26; i++) { const x = ((i * 137.5 + t * 9) % (W + 40) + W + 40) % (W + 40) - 20, y = (i * 61.7 % H) + Math.sin(t + i) * 10;
    g.fillStyle = `rgba(255,255,255,${.25 + .25 * Math.sin(t * 2 + i)})`; g.beginPath(); g.arc(x, y, 1 + (i % 3), 0, 7); g.fill(); }
  return rect;
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
function board3d(P, r) {
  if (P < .806 || !r) { B.style.visibility = 'hidden'; return; }
  B.style.visibility = 'visible';
  const on = sm(.806, .84, P), q = sm(.86, 1, P), blend = sm(.86, .9, P);
  const H0 = homography(W, H, r.quad), { m, pop, fill } = popMatrix(r, q);
  const M = H0.map((v, i) => lerp(v / H0[15], m[i] / m[15], blend));
  B.style.transform = `matrix3d(${M.map(v => +v.toFixed(6)).join(',')})`;
  B.style.setProperty('--depth', (lerp(0, 150, pop) * blend * (1 - fill * .999)).toFixed(1) + 'px');
  B.style.setProperty('--bez', (26 * blend * (1 - fill)).toFixed(1) + 'px');
  B.style.setProperty('--fill', on.toFixed(3));
  B.style.setProperty('--content', on.toFixed(3));
  B.style.setProperty('--glow', (sm(.86, .9, P) * (1 - sm(.92, .97, P))).toFixed(3));
}

/* ---------- the intro plays by itself ---------- */
const TL = [[0, 0], [.5, 0], [3.9, P_ROAD], [4.4, P_DOOR], [6.4, P_RUN], [7.4, .84], [9, 1]];   // seconds -> story progress
function progress(sec) {
  for (let i = 1; i < TL.length; i++) if (sec <= TL[i][0]) { const [s0, p0] = TL[i - 1], [s1, p1] = TL[i]; return lerp(p0, p1, (sec - s0) / (s1 - s0)); }
  return 1;
}
let frozen = false, last = performance.now(), clock = 0, ic = 0, pS = 0, playing = false, rect = null, raf = 0;
cv.addEventListener('click', () => { jumpAt = clock; });
function finish() {
  playing = false; cancelAnimationFrame(raf);
  document.documentElement.classList.remove('intro'); run.classList.add('done'); scrollTo(0, 0);
  document.getElementById('board').focus({ preventScroll: true });
}
function frame(now) {
  raf = requestAnimationFrame(frame);
  const raw = (now - last) / 1000; last = now; clock += Math.min(.05, raw);
  if (!playing || frozen) return;
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
const start = () => { resize(); Promise.all([rigImg, ROAD.im, CLASS.im].map(ready)).then(() => { prepRig(); play(); }); };
(document.fonts ? document.fonts.ready : Promise.resolve()).then(start, start);
window.__run = { get p() { return pS; }, play, finish, seek(sec) { frozen = true; ic = sec; clock = sec; pS = progress(sec); rect = paint(pS, clock); board3d(pS, rect); } };
