// The classroom intro: a low-poly 3D class that plays a small story as you scroll.
import * as THREE from './three.module.min.js';

const $ = s => document.querySelector(s);
const story = $('#story'), canvas = $('#scene');
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cl = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, v) => { const t = cl((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/* ---------- renderer ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfe0ff');
const camera = new THREE.PerspectiveCamera(38, 1, .05, 80);

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .82, metalness: 0, flatShading: true, ...o });
function mesh(g, m, x = 0, y = 0, z = 0, parent = scene) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

/* ---------- light ---------- */
scene.add(new THREE.HemisphereLight('#f2f7ff', '#e8c9a0', 2.1));
const sun = new THREE.DirectionalLight('#fff0d2', 3.6);
sun.position.set(-9, 9, 3); sun.target.position.set(0, 0, -1);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
scene.add(sun, sun.target);
const boardLight = new THREE.PointLight('#8fc8ff', 0, 9, 1.6);
boardLight.position.set(0, 2.4, -4.6); scene.add(boardLight);

/* ---------- room ---------- */
const W = 7, D = 6, H = 5;
function planks() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { const v = 228 + (rnd() * 14 | 0); g.fillStyle = `rgb(${v},${v - 34},${v - 82})`; g.fillRect(0, i * 64, 512, 64);
    g.fillStyle = 'rgba(120,80,40,.18)'; g.fillRect(0, i * 64, 512, 2); g.fillRect((rnd() * 512) | 0, i * 64, 2, 64); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const floor = mesh(new THREE.PlaneGeometry(W * 2, D * 2), new THREE.MeshStandardMaterial({ map: planks(), roughness: .9 }));
floor.rotation.x = -Math.PI / 2; floor.castShadow = false;

const wallM = M('#d6e6ff', { flatShading: false }), waisM = M('#9fbdf5', { flatShading: false });
function wall(w, x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; scene.add(g);
  const a = mesh(new THREE.PlaneGeometry(w, H), wallM, 0, H / 2, 0, g); a.castShadow = false;
  const b = mesh(new THREE.PlaneGeometry(w, 1.05), waisM, 0, .525, .005, g); b.castShadow = false;
  mesh(box(w, .07, .06), M('#ffffff'), 0, 1.06, .03, g);
  return g;
}
const back = wall(W * 2, 0, 0, -D, 0);
const left = wall(D * 2, -W, 0, 0, Math.PI / 2);
const right = wall(D * 2, W, 0, 0, -Math.PI / 2);
const front = wall(W * 2, 0, 0, D, Math.PI);

/* windows on the left wall, with light coming in */
const glassM = new THREE.MeshBasicMaterial({ color: '#cfeeff' });
for (const z of [-3.2, 0, 3.2]) {
  const f = new THREE.Group(); f.position.set(.02, 2.6, z); left.add(f);
  mesh(new THREE.PlaneGeometry(2.2, 2.1), glassM, 0, 0, .01, f).castShadow = false;
  const fr = M('#ffffff');
  mesh(box(2.4, .12, .1), fr, 0, 1.1, .05, f); mesh(box(2.4, .12, .1), fr, 0, -1.1, .05, f);
  mesh(box(.12, 2.3, .1), fr, -1.15, 0, .05, f); mesh(box(.12, 2.3, .1), fr, 1.15, 0, .05, f); mesh(box(.08, 2.2, .08), fr, 0, 0, .05, f);
  mesh(box(2.6, .1, .3), fr, 0, -1.2, .12, f);
  const pot = mesh(new THREE.CylinderGeometry(.14, .11, .22, 7), M('#ff8f6b'), .6, -1.04, .2, f);
  mesh(new THREE.IcosahedronGeometry(.2, 0), M('#3cc58f'), .6, -.82, .2, f);
}

/* bunting across the back wall */
{ const cols = ['#ff5d8f', '#ffc23d', '#3ccb9a', '#7cc4ff', '#b28cff'];
  for (let i = 0; i < 17; i++) { const x = -6.4 + i * .8, y = 4.55 - Math.sin(i / 16 * Math.PI) * .35;
    const tri = new THREE.Mesh(new THREE.ConeGeometry(.2, .36, 3), M(cols[i % 5])); tri.rotation.z = Math.PI; tri.rotation.y = Math.PI / 6;
    tri.position.set(x, y, -5.93); tri.scale.z = .2; scene.add(tri); } }

/* cork board and alphabet on the right wall */
{ const g = new THREE.Group(); g.position.set(0, 2.7, .02); right.add(g);
  mesh(box(3.4, 1.9, .06), M('#c98d56'), 0, 0, 0, g);
  const cols = ['#ffffff', '#ffe08a', '#ffc2d6', '#bfe9d6', '#cfe3ff'];
  for (let i = 0; i < 9; i++) { const p = mesh(box(.6 + rnd() * .3, .5 + rnd() * .2, .02), M(cols[i % 5]), -1.25 + (i % 3) * 1.25 + rnd() * .1, .5 - Math.floor(i / 3) * .55, .05, g); p.rotation.z = (rnd() - .5) * .2; }
}

/* front wall: door and cubbies with backpacks */
{ const g = new THREE.Group(); front.add(g);
  mesh(box(1.5, 2.9, .1), M('#e3a35c'), -4.5, 1.45, .05, g); mesh(new THREE.SphereGeometry(.07, 8, 6), M('#ffd46b', { metalness: .6, roughness: .3 }), -4, 1.4, .14, g);
  mesh(box(4.8, 1.2, .5), M('#ffffff'), 2.2, .6, .25, g);
  const bp = ['#ff8f6b', '#5b8def', '#ffc23d', '#3ccb9a', '#ff5d8f'];
  for (let i = 0; i < 5; i++) mesh(box(.5, .55, .3), M(bp[i]), .5 + i * .85, .5, .45, g);
}

/* smart board */
const BW = 4.3, BH = 2.42, BY = 2.55, BZ = -D + .125;
mesh(box(BW + .36, BH + .36, .12), M('#262c3b', { roughness: .5 }), 0, BY, -D + .06);
mesh(box(BW + .5, .08, .22), M('#3a4256'), 0, BY - BH / 2 - .26, -D + .12);
mesh(new THREE.SphereGeometry(.025, 8, 6), M('#10141d'), 0, BY + BH / 2 + .1, -D + .13);
const bc = document.createElement('canvas'); bc.width = 1600; bc.height = 900; const bg = bc.getContext('2d');
const btex = new THREE.CanvasTexture(bc); btex.colorSpace = THREE.SRGBColorSpace; btex.anisotropy = 8;
const screen = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), new THREE.MeshBasicMaterial({ map: btex, toneMapped: false }));
screen.position.set(0, BY, BZ); scene.add(screen);

/* teacher's desk */
{ const g = new THREE.Group(); g.position.set(-4.4, 0, -4.2); g.rotation.y = .35; scene.add(g);
  mesh(box(2, .1, 1), M('#d99a55'), 0, .82, 0, g); mesh(box(1.9, .7, .1), M('#c8874a'), 0, .45, .4, g);
  mesh(box(.1, .78, .9), M('#c8874a'), -.92, .4, 0, g); mesh(box(.1, .78, .9), M('#c8874a'), .92, .4, 0, g);
  mesh(new THREE.IcosahedronGeometry(.11, 1), M('#ff4d4d'), .6, .97, -.1, g);
  const bk = ['#5b8def', '#ffc23d', '#3ccb9a']; bk.forEach((c, i) => mesh(box(.5, .08, .36), M(c), -.4, .9 + i * .08, -.1, g));
  mesh(new THREE.CylinderGeometry(.08, .07, .2, 8), M('#7cc4ff'), .1, .97, .15, g);
}

/* ---------- desks, chairs and kids ---------- */
const deskM = M('#ecb876'), legM = M('#9aa6c2');
const SEATS = [[-3.1, -1.4], [0, -1.4], [3.1, -1.4], [-3.1, 1.9], [0, 1.9], [3.1, 1.9]];
const chairCols = ['#5b8def', '#ff8f6b', '#3ccb9a', '#ffc23d', '#b28cff', '#ff5d8f'];
SEATS.forEach(([x, z], i) => {
  mesh(box(1.7, .09, .95), deskM, x, .76, z);
  for (const [a, b] of [[-.78, -.4], [.78, -.4], [-.78, .4], [.78, .4]]) mesh(new THREE.CylinderGeometry(.035, .035, .74, 6), legM, x + a, .37, z + b);
  const cz = z + .85;
  mesh(box(.62, .07, .55), M(chairCols[i]), x, .45, cz);
  mesh(box(.62, .55, .07), M(chairCols[i]), x, .78, cz + .28);
  for (const [a, b] of [[-.27, -.23], [.27, -.23], [-.27, .23], [.27, .23]]) mesh(new THREE.CylinderGeometry(.025, .025, .45, 6), legM, x + a, .22, cz + b);
  const bk = mesh(box(.5, .06, .36), M(['#ffffff', '#fff3c4', '#ffe0ea'][i % 3]), x - .3 + rnd() * .2, .82, z + .05); bk.rotation.y = (rnd() - .5) * .6;
  mesh(new THREE.CylinderGeometry(.02, .02, .4, 6), M('#ffc23d'), x + .45, .82, z + .1).rotation.z = Math.PI / 2;
});

const SKIN = ['#f1c7a5', '#c98a62', '#f6d2b4', '#a76b47', '#e7b48e', '#f3cdb0'];
const KIDS_DEF = [
  { name: 'Ece', shirt: '#ff7aa8', hair: '#3a2418', buns: true, skin: SKIN[0], pants: '#5b6fd6' },
  { name: 'Can', shirt: '#5aa7ff', stripe: '#ffffff', hair: '#2a1d16', skin: SKIN[4], pants: '#283a6b', pack: '#ff8f3d' },
  { name: '', shirt: '#3ccb9a', hair: '#6b3b1f', skin: SKIN[1], pants: '#36406b', curly: true },
  { name: '', shirt: '#ffc23d', hair: '#1b1410', skin: SKIN[3], pants: '#2f6b5a', pony: true },
  { name: '', shirt: '#b28cff', hair: '#d9a35a', skin: SKIN[2], pants: '#403a6b' },
  { name: '', shirt: '#ff8f6b', hair: '#2b1b12', skin: SKIN[5], pants: '#2b4b7a', cap: '#3ccb9a' }];

function kid(def, x, z) {
  const root = new THREE.Group(); root.position.set(x, .48, z + .85); scene.add(root);
  const body = new THREE.Group(); root.add(body);
  const skin = M(def.skin), shirt = M(def.shirt), hair = M(def.hair), pants = M(def.pants);
  const torso = mesh(new THREE.CylinderGeometry(.24, .29, .56, 8), shirt, 0, .3, 0, body);
  if (def.stripe) for (const y of [.18, .36]) mesh(new THREE.CylinderGeometry(.245 + (.5 - y) * .05, .25 + (.5 - y) * .05, .05, 8), M(def.stripe), 0, y, 0, body);
  if (def.pack) { mesh(box(.42, .42, .16), M(def.pack), 0, .3, .28, body); }
  const neck = new THREE.Group(); neck.position.y = .62; body.add(neck);
  const head = new THREE.Group(); head.position.y = .3; neck.add(head);
  const skull = mesh(new THREE.IcosahedronGeometry(.36, 1), skin, 0, 0, 0, head);
  const hairCap = mesh(new THREE.IcosahedronGeometry(.385, 1), hair, 0, .07, .05, head); hairCap.scale.set(1, .86, 1);
  mesh(box(.5, .12, .2), hair, 0, .24, -.26, head).rotation.x = -.35;
  if (def.buns) for (const s of [-1, 1]) mesh(new THREE.IcosahedronGeometry(.14, 0), hair, s * .3, .3, .05, head);
  if (def.pony) { const p = mesh(new THREE.ConeGeometry(.1, .4, 5), hair, 0, .02, .42, head); p.rotation.x = -2.4; }
  if (def.curly) for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mesh(new THREE.IcosahedronGeometry(.11, 0), hair, Math.cos(a) * .3, .2 + Math.sin(i) * .05, Math.sin(a) * .3, head); }
  if (def.cap) { mesh(new THREE.CylinderGeometry(.37, .39, .16, 10), M(def.cap), 0, .27, .02, head); mesh(box(.42, .03, .3), M(def.cap), 0, .2, -.32, head); }
  const eyeM = M('#1b1f33', { roughness: .3 }), hiM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const eyes = [];
  for (const s of [-1, 1]) { const e = mesh(new THREE.SphereGeometry(.05, 10, 8), eyeM, s * .13, .02, -.33, head); e.castShadow = false;
    mesh(new THREE.SphereGeometry(.016, 6, 4), hiM, .015, .02, -.04, e).castShadow = false; eyes.push(e);
    const ck = mesh(new THREE.SphereGeometry(.055, 8, 6), M('#ff9fae', { roughness: 1 }), s * .2, -.09, -.3, head); ck.scale.set(1, .6, .3); ck.castShadow = false; }
  const mouth = mesh(new THREE.TorusGeometry(.065, .02, 6, 14, Math.PI), M('#7a2f2f'), 0, -.11, -.345, head); mouth.rotation.z = Math.PI; mouth.castShadow = false;
  const arms = [];
  for (const s of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(s * .3, .5, 0); body.add(sh);
    mesh(new THREE.CapsuleGeometry(.075, .3, 2, 6), shirt, 0, -.2, 0, sh); mesh(new THREE.IcosahedronGeometry(.085, 0), skin, 0, -.42, 0, sh); arms.push(sh); }
  const legs = [];
  for (const s of [-1, 1]) { const hip = new THREE.Group(); hip.position.set(s * .12, 0, 0); body.add(hip);
    mesh(new THREE.CapsuleGeometry(.09, .2, 2, 6), pants, 0, -.17, 0, hip);
    const knee = new THREE.Group(); knee.position.y = -.32; hip.add(knee);
    mesh(new THREE.CapsuleGeometry(.08, .18, 2, 6), pants, 0, -.14, 0, knee);
    mesh(box(.16, .1, .26), M('#ffffff'), 0, -.3, -.05, knee); legs.push({ hip, knee }); }
  root.rotation.y = 0;
  const k = { def, root, body, neck, head, eyes, mouth, arms, legs, x, z, seat: root.position.clone(), poke: -9, phase: rnd() * 6.3, hitboxes: [skull, torso, hairCap] };
  k.hitboxes.forEach(h => h.userData.kid = k);
  return k;
}
const KIDS = KIDS_DEF.map((d, i) => kid(d, SEATS[i][0], SEATS[i][1]));
const CAN = KIDS[1], ECE = KIDS[0];

/* ---------- confetti ---------- */
const CN = 420, cgeo = new THREE.PlaneGeometry(.07, .11), cmat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
const conf = new THREE.InstancedMesh(cgeo, cmat, CN); conf.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(conf);
const CC = ['#ff5d8f', '#ffc23d', '#3ccb9a', '#7cc4ff', '#b28cff', '#ffffff'].map(c => new THREE.Color(c));
const P = Array.from({ length: CN }, (_, i) => ({ p: new THREE.Vector3(0, -50, 0), v: new THREE.Vector3(), r: new THREE.Euler(), rv: new THREE.Vector3(), life: 0 }));
P.forEach((q, i) => conf.setColorAt(i, CC[i % CC.length]));
const dummy = new THREE.Object3D();
let cIdx = 0;
function burst(x, y, z, n, spread = 1) {
  for (let i = 0; i < n; i++) { const q = P[cIdx++ % CN]; q.p.set(x + (Math.random() - .5) * .4 * spread, y, z + (Math.random() - .5) * .4 * spread);
    q.v.set((Math.random() - .5) * 3.2 * spread, 2.6 + Math.random() * 2.6, (Math.random() - .5) * 3.2 * spread); q.rv.set(Math.random() * 9, Math.random() * 9, Math.random() * 9); q.life = 3.6 + Math.random() * 1.5; }
}
function stepConfetti(dt) {
  for (let i = 0; i < CN; i++) { const q = P[i];
    if (q.life > 0) { q.life -= dt; q.v.y -= 4.2 * dt; q.v.multiplyScalar(1 - 1.2 * dt); q.p.addScaledVector(q.v, dt); if (q.p.y < .02) { q.p.y = .02; q.v.set(0, 0, 0); q.rv.multiplyScalar(.9); }
      q.r.x += q.rv.x * dt; q.r.y += q.rv.y * dt; q.r.z += q.rv.z * dt; }
    dummy.position.copy(q.life > 0 ? q.p : new THREE.Vector3(0, -50, 0)); dummy.rotation.copy(q.r); dummy.updateMatrix(); conf.setMatrixAt(i, dummy.matrix); }
  conf.instanceMatrix.needsUpdate = true;
}

/* ---------- the smart board screen ---------- */
const PROJ = window.BOARD_TILES || [];
const IMGS = {}; PROJ.forEach(p => { if (p.img) { const im = new Image(); im.src = 'img/' + p.img + '.webp'; IMGS[p.img] = im; } });
function rr(x, y, w, h, r) { bg.beginPath(); bg.moveTo(x + r, y); bg.arcTo(x + w, y, x + w, y + h, r); bg.arcTo(x + w, y + h, x, y + h, r); bg.arcTo(x, y + h, x, y, r); bg.arcTo(x, y, x + w, y, r); bg.closePath(); }
const DISP = '"Fraunces", Georgia, serif', BODY = '"Atkinson Hyperlegible", system-ui, sans-serif';
function drawBoard(S, t) {
  const w = bc.width, h = bc.height, L = window.BOARD_TEXT || {};
  bg.fillStyle = '#121826'; bg.fillRect(0, 0, w, h);
  if (S.on < .01) { const g = bg.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.07)'); g.addColorStop(.45, 'rgba(255,255,255,0)'); bg.fillStyle = g; bg.fillRect(0, 0, w, h); return; }
  bg.globalAlpha = S.on;
  // question screen
  if (S.launch < 1) {
    bg.save(); bg.translate(0, -S.launch * h * .25); bg.globalAlpha = S.on * (1 - S.launch);
    const g = bg.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4d8dff'); g.addColorStop(1, '#8fd3ff'); bg.fillStyle = g; bg.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) { bg.fillStyle = 'rgba(255,255,255,.16)'; bg.beginPath(); bg.arc((i * 330 + t * 20) % (w + 300) - 150, 120 + (i % 3) * 60, 70 + (i % 2) * 30, 0, 7); bg.fill(); }
    bg.fillStyle = '#ffffff'; bg.font = `600 64px ${BODY}`; bg.textAlign = 'center'; bg.fillText(L.game || 'Months Race', w / 2, 130);
    bg.font = `700 96px ${DISP}`; bg.fillText(L.q || 'What comes after March?', w / 2, 300);
    const opts = L.opts || ['May', 'April', 'June'], cols = ['#ffc23d', '#3ccb9a', '#ff5d8f'];
    opts.forEach((o, i) => { const bw = 400, bx = w / 2 - 660 + i * 460, by = 430 + Math.sin(t * 2 + i) * 6 * (1 - S.ans);
      const right = i === 1, a = S.ans;
      const col = right && a > 0 ? '#22b37a' : cols[i];
      bg.globalAlpha = S.on * (1 - S.launch) * (right ? 1 : 1 - a * .6);
      bg.fillStyle = 'rgba(20,30,70,.25)'; rr(bx, by + 16, bw, 190, 40); bg.fill();
      bg.fillStyle = col; rr(bx, by + (right ? a * 10 : 0), bw, 190, 40); bg.fill();
      bg.fillStyle = '#1c2340'; bg.font = `700 84px ${BODY}`; bg.fillText(o, bx + bw / 2, by + 125 + (right ? a * 10 : 0)); });
    bg.globalAlpha = S.on * (1 - S.launch);
    // timer
    bg.fillStyle = 'rgba(255,255,255,.35)'; rr(200, 740, w - 400, 26, 13); bg.fill();
    bg.fillStyle = '#ffffff'; rr(200, 740, (w - 400) * (1 - S.timer), 26, 13); bg.fill();
    if (S.ans > 0) { const a = S.ans; bg.globalAlpha = S.on * a * (1 - S.launch);
      bg.font = `700 ${120 + 20 * Math.sin(t * 6)}px ${DISP}`; bg.fillStyle = '#ffffff'; bg.fillText(L.ok || 'Great job!', w / 2, 830 - a * 30);
      for (let i = 0; i < 12; i++) { const ang = i / 12 * Math.PI * 2 + t, r = 300 + 40 * Math.sin(t * 3 + i); star(w / 2 + Math.cos(ang) * r * 1.6, 480 + Math.sin(ang) * r * .7, 26 + 10 * Math.sin(t * 5 + i), '#ffe27a'); } }
    bg.restore();
  }
  // launcher: my games and projects
  if (S.launch > 0) {
    bg.globalAlpha = S.on * S.launch; bg.fillStyle = '#1b2340'; bg.fillRect(0, 0, w, h);
    bg.textAlign = 'left'; bg.fillStyle = '#ffffff'; bg.font = `700 76px ${DISP}`; bg.fillText(L.launch || 'Games and projects', 110, 150);
    bg.fillStyle = 'rgba(255,255,255,.6)'; bg.font = `400 40px ${BODY}`; bg.fillText(L.launchSub || 'Tap one to open it', 112, 212);
    const n = Math.min(PROJ.length, 8), cols = 4, tw = 320, th = 250, gx = 56, gy = 46, x0 = (w - (cols * tw + (cols - 1) * gx)) / 2;
    for (let i = 0; i < n; i++) { const p = PROJ[i], cx = x0 + (i % cols) * (tw + gx), cy = 280 + Math.floor(i / cols) * (th + gy) + (1 - ease(cl(S.launch * 1.6 - i * .06))) * 120;
      bg.globalAlpha = S.on * cl(S.launch * 1.6 - i * .06);
      bg.fillStyle = p.color; rr(cx, cy, tw, th - 60, 34); bg.fill();
      const im = IMGS[p.img]; if (im && im.complete && im.naturalWidth) { bg.save(); rr(cx + 12, cy + 12, tw - 24, th - 84, 24); bg.clip(); const s = Math.max((tw - 24) / im.naturalWidth, (th - 84) / im.naturalHeight); bg.drawImage(im, cx + 12, cy + 12, im.naturalWidth * s, im.naturalHeight * s); bg.restore(); }
      bg.fillStyle = '#ffffff'; bg.font = `700 34px ${BODY}`; bg.textAlign = 'center'; bg.fillText(p.short || p.title, cx + tw / 2, cy + th - 8); bg.textAlign = 'left'; }
  }
  bg.globalAlpha = 1;
  const g = bg.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.09)'); g.addColorStop(.4, 'rgba(255,255,255,0)'); bg.fillStyle = g; bg.fillRect(0, 0, w, h);
}
function star(x, y, r, c) { bg.fillStyle = c; bg.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; bg.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } bg.closePath(); bg.fill(); }

/* ---------- camera path ---------- */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function boardShot() { const a = camera.aspect, th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), d = Math.min((BH / 2) / th, (BW / 2) / (th * a)) * .985; return V(0, BY, BZ + d); }
const SHOTS = [
  { p: 0, pos: V(5.2, 3.1, -4.9), at: V(-.3, 1.05, .9) },
  { p: .16, pos: V(6.2, 3.0, -.4), at: V(-.8, 1.6, -3.2) },
  { p: .3, pos: V(0, 3.2, -4.75), at: V(0, 1.0, .9) },
  { p: .44, pos: V(1.9, 2.5, -4.5), at: V(.2, 1.1, -1.4) },
  { p: .54, pos: V(3.6, 2.1, -1.8), at: V(.4, 1.7, -5.3) },
  { p: .63, pos: V(-3.6, 3.1, -4.5), at: V(.4, 1.05, .8) },
  { p: .73, pos: V(0, 3.4, 5.8), at: V(0, 1.6, -3) },
  { p: .84, pos: V(0, 2.7, 1.2), at: V(0, BY, -D) },
  { p: .94, pos: null, at: V(0, BY, -D) }];
const camPos = V(0, 0, 0), camAt = V(0, 0, 0);
function shotAt(p) {
  let i = 0; while (i < SHOTS.length - 2 && p > SHOTS[i + 1].p) i++;
  const A = SHOTS[i], B = SHOTS[i + 1], t = ease(cl((p - A.p) / (B.p - A.p)));
  camPos.lerpVectors(A.pos || boardShot(), B.pos || boardShot(), t); camAt.lerpVectors(A.at, B.at, t);
}

/* ---------- interaction ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(9, 9);
let mx = 0, my = 0, tmx = 0, tmy = 0;
const hits = KIDS.flatMap(k => k.hitboxes);
canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  tmx = ptr.x; tmy = ptr.y; ray.setFromCamera(ptr, camera); canvas.style.cursor = ray.intersectObjects(hits, false).length ? 'pointer' : ''; });
canvas.addEventListener('click', () => { ray.setFromCamera(ptr, camera); const h = ray.intersectObjects(hits, false)[0];
  if (h) { const k = h.object.userData.kid; k.poke = clock; const p = new THREE.Vector3(); k.head.getWorldPosition(p); burst(p.x, p.y + .2, p.z, 40, .5); } });

/* ---------- resize ---------- */
function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < .8 ? 52 : 38; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

/* ---------- the story ---------- */
let clock = 0, last = performance.now(), pS = RM ? .0 : 0, visible = true, burstDone = false, cheerAt = 0;
new IntersectionObserver(es => visible = es[0].isIntersecting).observe(story);
const caps = [...document.querySelectorAll('.cap')], dots = [...document.querySelectorAll('.dots i')];
const CAPS = [[0, .13], [.15, .28], [.3, .41], [.43, .56], [.58, .69], [.72, .9]];
const tmpV = new THREE.Vector3();

function poseKid(k, P, t, i) {
  const lookBoard = sm(.12, .2, P) * (1 - sm(.64, .7, P));
  const handUp = sm(.3 + i * .012, .35 + i * .012, P) * (1 - sm(.42, .46, P));
  const cheer = sm(.57, .6, P) * (1 - sm(.74, .8, P));
  const poked = cl(1 - (t - k.poke) / 1.1);
  // idle chatter: turn to a neighbour now and then
  const chat = Math.sin(t * .7 + k.phase) * .45 * (1 - lookBoard);
  let yaw = chat, pitch = -.05 + Math.sin(t * 1.3 + k.phase) * .03;
  if (lookBoard > 0) { k.head.getWorldPosition(tmpV); const dx = 0 - tmpV.x, dz = BZ - tmpV.z; yaw = lerp(yaw, Math.atan2(-dx, -dz) * .8, lookBoard); pitch = lerp(pitch, -.22, lookBoard); }
  k.neck.rotation.set(pitch, yaw, Math.sin(t * 1.1 + k.phase) * .04);
  // arms: rest on desk, one up for the question, both up when cheering
  const rest = 1.05, up = 3.0;
  const wave = Math.sin(t * 9 + i) * .25;
  k.arms[0].rotation.set(lerp(lerp(rest, up, handUp * (i % 2 ? 0 : 1)), up + wave, cheer), 0, lerp(.15, .5, cheer) * -1 + .1);
  k.arms[1].rotation.set(lerp(lerp(rest, up, handUp * (i % 2 ? 1 : 0)), up - wave, cheer), 0, lerp(-.15, -.5, cheer) * -1 - .1);
  // happiness: bigger smile and bounce
  const happy = Math.max(cheer, poked, .25 + .25 * lookBoard);
  k.mouth.scale.set(1 + happy * .6, 1 + happy * 1.1, 1);
  const hop = Math.max(cheer * Math.abs(Math.sin(t * 7 + i * 1.3)) * .35, poked * Math.abs(Math.sin((t - k.poke) * 9)) * .4);
  k.body.position.y = hop; k.body.rotation.y = poked > 0 ? ease(cl((t - k.poke) / .9)) * Math.PI * 2 : 0;
  // blink
  const b = (Math.sin(t * .9 + k.phase * 3) > .985) ? .1 : 1; k.eyes.forEach(e => e.scale.y = b);
  // seated legs
  if (k !== CAN || P < .43 || P > .7) k.legs.forEach(l => { l.hip.rotation.x = Math.PI / 2 * .92; l.knee.rotation.x = -Math.PI / 2 * .92; });
}
function poseCan(P, t) {
  // Can gets up at .43, runs to the board, taps at .54, cheers, and is back by .7
  const go = sm(.43, .52, P), back = sm(.64, .7, P), stand = sm(.42, .45, P) * (1 - sm(.68, .7, P));
  const seat = CAN.seat, spot = V(1.15, .62, -5.05);
  const path = t2 => V(lerp(seat.x, spot.x, t2), lerp(seat.y, spot.y, Math.min(1, t2 * 4)), lerp(seat.z, spot.z, t2));
  const k = go * (1 - back);
  const pos = path(k); pos.y = lerp(seat.y, .62, stand);
  CAN.root.position.copy(pos);
  const moving = (P > .43 && P < .52) || (P > .64 && P < .7);
  const face = P < .6 ? Math.atan2(-(spot.x - seat.x), -(spot.z - seat.z)) * 0 + (P > .52 ? -.25 : 0) : 0;
  CAN.root.rotation.y = lerp(0, face, stand);
  if (stand > 0) {
    const sw = moving ? Math.sin(t * 14) * .7 : 0;
    CAN.legs[0].hip.rotation.x = lerp(Math.PI / 2 * .92, sw, stand); CAN.legs[1].hip.rotation.x = lerp(Math.PI / 2 * .92, -sw, stand);
    CAN.legs.forEach(l => l.knee.rotation.x = lerp(-Math.PI / 2 * .92, moving ? -.3 : 0, stand));
    // tap the right answer
    const tap = sm(.52, .545, P) * (1 - sm(.56, .6, P));
    CAN.arms[1].rotation.set(lerp(CAN.arms[1].rotation.x, 2.45, tap), 0, -.35 * tap);
    CAN.neck.rotation.x = lerp(CAN.neck.rotation.x, -.45, sm(.5, .54, P) * (1 - sm(.6, .66, P)));
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now; clock += dt;
  const r = story.getBoundingClientRect(), raw = cl(-r.top / Math.max(1, r.height - innerHeight));
  pS = RM ? raw : pS + (raw - pS) * Math.min(1, dt * 6);
  const P = pS;
  if (!visible) return;
  // story beats
  CAPS.forEach(([a, b], i) => { const o = (i ? sm(a, a + .025, P) : 1) * (1 - sm(b - .025, b, P)); caps[i].style.opacity = o.toFixed(3); caps[i].style.transform = `translateY(${((1 - o) * 18).toFixed(1)}px)`; dots[i] && dots[i].classList.toggle('on', P >= a && (i === CAPS.length - 1 || P < CAPS[i + 1][0])); });
  $('#hint').style.opacity = (1 - sm(.01, .05, P)).toFixed(2);
  const S = { on: sm(.13, .19, P), ans: sm(.545, .565, P), timer: sm(.2, .54, P), launch: sm(.73, .82, P) };
  drawBoard(S, clock); btex.needsUpdate = true;
  boardLight.intensity = S.on * 6;
  if (P > .55 && !burstDone) { burstDone = true; burst(1.0, 2.2, -5.2, 160, 1); KIDS.forEach(k => { k.head.getWorldPosition(tmpV); burst(tmpV.x, tmpV.y + .3, tmpV.z, 30, .6); }); cheerAt = clock; }
  if (P < .5) burstDone = false;
  if (P > .58 && P < .72 && clock - cheerAt > 1.4) { cheerAt = clock; const k = KIDS[(Math.random() * 6) | 0]; k.head.getWorldPosition(tmpV); burst(tmpV.x, tmpV.y + .3, tmpV.z, 26, .5); }
  KIDS.forEach((k, i) => poseKid(k, P, clock, i)); poseCan(P, clock);
  stepConfetti(dt);
  // camera
  shotAt(P); mx += (tmx - mx) * .05; my += (tmy - my) * .05;
  const sway = 1 - sm(.78, .9, P);
  camera.position.set(camPos.x + mx * .35 * sway + Math.sin(clock * .3) * .05 * sway, camPos.y + my * .2 * sway, camPos.z);
  camera.lookAt(camAt);
  renderer.render(scene, camera);
  document.body.classList.toggle('past-story', r.bottom < innerHeight * .6);
}
document.fonts && document.fonts.ready.then(() => {});
requestAnimationFrame(frame);
window.__class = { scene, camera, KIDS, get p() { return pS; } };
