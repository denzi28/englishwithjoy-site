/* Joy of English voice: the site's sentences are recorded (voice/*.mp3), so read-aloud works on every board, tablet and phone.
   Pages keep calling speechSynthesis as before. A sentence with a recording plays the recording, anything else uses the
   browser's own voice. Load this file first in <head>, before the page's own scripts. */
(() => {
  const W = window, BASE = '/voice/';
  const key = (t) => String(t).toLowerCase().replace(/<[^>]+>/g, ' ').replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = (t) => (String(t).replace(/<[^>]+>/g, ' ').match(/[^.!?]+[.!?]*/g) || []).map((s) => s.trim()).filter(Boolean);
  let map = {};
  const ready = fetch(BASE + 'index.json').then((r) => (r.ok ? r.json() : {})).then((m) => { map = m || {}; }).catch(() => {});

  /* recordings play through Web Audio, unlocked by the first tap anywhere on the page */
  let ac = null; const bufs = new Map();
  function ctx() { if (!ac) { try { ac = new (W.AudioContext || W.webkitAudioContext)(); } catch (e) {} } return ac; }
  function unlock() { const a = ctx(); if (!a) return; if (a.state !== 'running') a.resume().catch(() => {});
    if (!a._u) { a._u = 1; try { const s = a.createBufferSource(); s.buffer = a.createBuffer(1, 1, 22050); s.connect(a.destination); s.start(0); } catch (e) {} } }
  ['pointerdown', 'touchend', 'mousedown', 'keydown'].forEach((ev) => addEventListener(ev, unlock, { capture: true, passive: true }));
  function load(f) { if (!bufs.has(f)) bufs.set(f, fetch(BASE + f).then((r) => { if (!r.ok) throw new Error(f); return r.arrayBuffer(); })
      .then((b) => new Promise((ok, no) => ctx().decodeAudioData(b, ok, no))).catch((e) => { bufs.delete(f); throw e; }));
    return bufs.get(f); }

  /* the browser's own voice, used only for sentences without a recording */
  const N = W.speechSynthesis || null;
  const nSpeak = N ? N.speak.bind(N) : null, nCancel = N ? N.cancel.bind(N) : null;
  const proto = N ? Object.getPrototypeOf(N) : null;
  const nativeGet = (p) => { try { return Object.getOwnPropertyDescriptor(proto, p).get.call(N); } catch (e) { return false; } };
  let bestVoice = null;
  function pickVoice() { if (!N) return null; const vs = N.getVoices() || []; let best = null, bs = -1;
    vs.forEach((v) => { let s = /^en[-_]GB/i.test(v.lang) ? 30 : /^en[-_](US|IE|AU|NZ|CA)/i.test(v.lang) ? 20 : /^en/i.test(v.lang) ? 10 : -1;
      if (s < 0) return; if (v.localService) s += 4; if (s > bs) { bs = s; best = v; } });
    return (bestVoice = best); }
  if (N) { try { N.addEventListener('voiceschanged', pickVoice); } catch (e) {} pickVoice(); }
  function nativeQueue(u) { if (!N) return; try {
      if (!u.voice) { const v = bestVoice || pickVoice(); if (v) { u.voice = v; u.lang = v.lang; } else if (!u.lang) u.lang = 'en-GB'; }
      if (nativeGet('speaking') || nativeGet('pending')) { nCancel(); setTimeout(() => { try { N.resume(); nSpeak(u); } catch (e) {} }, 80); }
      else { N.resume(); nSpeak(u); }
    } catch (e) {} }
  const NU = W.SpeechSynthesisUtterance;
  function nativeSay(t, base) { return new Promise((done) => { if (!N || !NU) return done(); let fin = false;
    const end = () => { if (!fin) { fin = true; clearTimeout(to); done(); } }, to = setTimeout(end, 1500 + t.length * 110);
    try { const u = new NU(t); u.rate = (base && base.rate) || 0.85; u.lang = (base && base.lang) || 'en-GB'; if (base && base.voice) u.voice = base.voice;
      u.onend = end; u.onerror = end; nativeQueue(u); } catch (e) { end(); } }); }

  /* one call to speak(): the whole sentence as one recording, or sentence by sentence */
  let gen = 0, srcs = [], playing = false;
  function stopClips() { gen++; srcs.forEach((s) => { try { s.stop(); } catch (e) {} }); srcs = []; playing = false; }
  function plan(text) { const k = key(text); if (!k) return null; if (map[k]) return [{ f: map[k], t: text }];
    const ss = sentences(text); if (ss.length < 2) return null;
    const p = ss.map((s) => ({ f: map[key(s)], t: s })); return p.some((x) => x.f) ? p : null; }
  const fire = (u, type) => { try { u.dispatchEvent ? u.dispatchEvent(new Event(type)) : (u['on' + type] && u['on' + type]()); } catch (e) {} };
  async function run(p, u, my) {
    playing = true; fire(u, 'start');
    for (const step of p) {
      if (my !== gen) return;
      let b = null;
      if (step.f) { try { b = await load(step.f); } catch (e) {} }
      if (my !== gen) return;
      const a = ctx();
      if (b && a && a.state !== 'running') { try { await a.resume(); } catch (e) {} }
      if (b && a && a.state === 'running') {
        await new Promise((ok) => { const s = a.createBufferSource(); s.buffer = b; s.connect(a.destination); s.onended = ok; srcs.push(s); s.start();
          setTimeout(ok, b.duration * 1000 + 400); });
      } else await nativeSay(step.t, u);
    }
    if (my === gen) { playing = false; srcs = []; fire(u, 'end'); }
  }
  function speak(u) {
    stopClips(); const my = gen; const text = (u && u.text) || '';
    ready.then(() => { if (my !== gen) return; const p = plan(text);
      if (p) run(p, u, my); else if (N) nativeQueue(u); });
  }
  function cancel() { stopClips(); if (nCancel) { try { nCancel(); } catch (e) {} } }

  if (N) {
    N.speak = speak; N.cancel = cancel;
    try { Object.defineProperty(N, 'speaking', { configurable: true, get: () => playing || nativeGet('speaking') }); } catch (e) {}
  } else {
    // no browser voice at all: give the pages a speechSynthesis that plays the recordings
    if (!W.SpeechSynthesisUtterance) W.SpeechSynthesisUtterance = class { constructor(t) { this.text = t || ''; this.lang = ''; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; } };
    W.speechSynthesis = { get speaking() { return playing; }, pending: false, paused: false, onvoiceschanged: null,
      speak, cancel, pause() {}, resume() {}, getVoices: () => [], addEventListener() {}, removeEventListener() {} };
  }
  // the old "this browser can't read aloud" notes are not true any more
  const st = document.createElement('style'); st.textContent = '#toast,#kitToast{display:none!important}';
  (document.head || document.documentElement).appendChild(st);
})();
