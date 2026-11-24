// AIR JORDAN 1 · NO HAY EMPATE · coreografía cinematográfica (refinamiento)
import { Stage, LIGHTS, mixLights, sweep } from './stage.js';
import * as THREE from 'three';
import { Pista } from './pista.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eout = x => 1 - Math.pow(1 - clamp(x), 3);
const ein = x => Math.pow(clamp(x), 3);
const range = (x, a, b) => clamp((x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const L3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const mob = () => innerWidth <= 760;
const W = () => innerWidth, H = () => innerHeight;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const O = Stage.orient;
const { gsap, ScrollTrigger } = window;
gsap.registerPlugin(ScrollTrigger);

const stage = new Stage($('#stage'));

/* ---------- progreso de scroll ---------- */
const S = { intro: RM ? 1 : 0, q1: 0, q2in: 0, q2: 0, htin: 0, ht: 0, q3in: 0, q3: 0, q4in: 0, q4: 0, otin: 0, ot: 0 };
const scrub = true; // la inercia la da el scroll suavizado: página y 3D van a la vez

/* ---------- scroll suavizado único: la rueda mueve la página con inercia y la página y el 3D leen la misma posición ---------- */
if (!RM) {
  let tgt = scrollY, cur = scrollY, ours = false, raf = 0;
  const maxS = () => document.documentElement.scrollHeight - innerHeight;
  const step = () => {
    cur += (tgt - cur) * .12;
    if (Math.abs(tgt - cur) < .5) cur = tgt;
    ours = true; window.scrollTo(0, cur);
    raf = cur !== tgt ? requestAnimationFrame(step) : 0;
  };
  addEventListener('wheel', e => {
    if (e.ctrlKey || e.defaultPrevented) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? innerHeight : 1;
    if (!raf) cur = tgt = scrollY;
    tgt = Math.max(0, Math.min(maxS(), tgt + e.deltaY * k));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: false });
  // teclado, barra de desplazamiento, enlaces o táctil: se respeta el scroll nativo y se resincroniza
  addEventListener('scroll', () => { if (ours) { ours = false; return; } if (!raf) cur = tgt = scrollY; }, { passive: true });
}

const R = { ...S };
const prog = (key, trigger, start = 'top top', end = 'bottom bottom') => ScrollTrigger.create({ trigger, start, end, onUpdate: s => { R[key] = s.progress; if (RM) S[key] = s.progress; } });
const SMOOTH = Object.keys(S).filter(k => k !== 'intro');
prog('q1', '#q1');
prog('q2in', '#q2', 'top bottom', 'top top'); prog('q2', '#q2');
prog('htin', '#ht', 'top bottom', 'top top'); prog('ht', '#ht');
prog('q3in', '#q3', 'top bottom', 'top top'); prog('q3', '#q3');
prog('q4in', '#q4', 'top bottom', 'top top'); prog('q4', '#q4');
prog('otin', '#ot', 'top bottom', 'top top'); prog('ot', '#ot');

// Q1: la foto empuja, las dos líneas del titular se separan en profundidad y al final todo cae a negro
gsap.timeline({ scrollTrigger: { trigger: '#q1', start: 'top top', end: 'bottom bottom', scrub } })
  .to('.ph-hero img.b', { scale: 1.22, ease: 'none' }, 0)
  .to('.q1-back', { xPercent: -14, ease: 'none' }, 0)
  .to('.q1-front', { xPercent: 10, y: () => mob() ? -20 : 40, ease: 'none' }, 0)
  .to('.q1-black', { opacity: 1, ease: 'power2.in', duration: .25 }, .75);

// Q3: recorrido horizontal con pausas, cortinilla roja diagonal y golpe de zoom en cada foto
const row = $('#q3row');
const wipe = $('#wipe');
const q3tl = gsap.timeline({ scrollTrigger: { trigger: '#q3', start: 'top top', end: 'bottom bottom', scrub, invalidateOnRefresh: true } });
for (let i = 1; i <= 3; i++) {
  q3tl.to({}, { duration: .3 })
    .to(row, { x: () => -i * W(), ease: 'expo.inOut', duration: 1 })
    .fromTo(wipe, { x: () => W() * 1.3 }, { x: () => -W() * .7, ease: 'expo.inOut', duration: 1, immediateRender: false }, '<')
    .fromTo(`.panel:nth-child(${i + 1}) .ph img.b`, { scale: 1.35 }, { scale: 1, ease: 'expo.out', duration: .9, immediateRender: false }, '<.35');
}
q3tl.to({}, { duration: .3 });
gsap.fromTo('.arc', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none',
  scrollTrigger: { trigger: '#q3', start: () => 'top+=' + W() * .55 + ' top', end: () => 'top+=' + W() * 1.25 + ' top', scrub } });

/* ---------- apertura ---------- */
const iw = $('#iw'), ic = $('#ic'), il = $('#il');
const ready = stage.load(p => { il.textContent = String(Math.round(p * 100)).padStart(2, '0'); });
function scramble(word, dur = .22) {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  iw.innerHTML = [...word].map(c => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  const spans = $$('span', iw);
  spans.forEach(s => { s.style.width = s.getBoundingClientRect().width + 'px'; s.style.textAlign = 'center'; });
  return gsap.to({ t: 0 }, { t: 1, duration: dur, ease: 'none',
    onComplete() { spans.forEach((s, i) => { if (word[i] !== ' ') s.textContent = word[i]; }); },
    onUpdate() { const t = this.targets()[0].t; spans.forEach((s, i) => { if (word[i] !== ' ') s.textContent = t > (i + 1) / spans.length ? word[i] : A[(Math.random() * A.length) | 0]; }); } });
}
async function runIntro() {
  const imgs = $$('.intro-flash img');
  if (RM) { $('#intro').remove(); document.body.classList.remove('is-intro'); return; }
  const tl = gsap.timeline();
  tl.to({ c: 2880 }, { c: 2878.4, duration: 2.2, ease: 'none', onUpdate() { ic.textContent = fmt(this.targets()[0].c).slice(0, 5); } }, 0);
  const words = ['NO', 'HAY', 'EMPATE'];
  imgs.forEach((im, i) => {
    tl.set(im, { opacity: 1, scale: 1.25, xPercent: i % 2 ? 4 : -4 }, .25 + i * .3)
      .to(im, { scale: 1, xPercent: 0, duration: .28, ease: 'expo.out' }, '<')
      .set(im, { opacity: 0 }, '>-.02');
    if (words[i]) tl.add(() => scramble(words[i]), .25 + i * .3);
  });
  tl.add(() => { iw.style.color = 'var(--red)'; scramble('EMPATE.', .2); }, 1.45);
  await tl.then();
  await ready;
  const intro = $('#intro');
  kick(1, 6);
  gsap.to(intro, { clipPath: 'polygon(0 0,100% 0,100% 0,0 0)', duration: .5, ease: 'expo.inOut', onComplete: () => intro.remove() });
  document.body.classList.remove('is-intro');
  gsap.to(S, { intro: 1, duration: 1.3, ease: 'expo.out' });
}

/* ---------- utilidades de montaje ---------- */
function fmt(sec) { sec = Math.max(0, sec); const m = Math.floor(sec / 60), s = sec - m * 60; return String(m).padStart(2, '0') + ':' + s.toFixed(1).padStart(4, '0'); }
const FX = { flash: 0, punch: 0, shake: 0 };
// golpe de montaje: destello rojo + golpe de focal + temblor de cámara
function kick(flash = .9, punch = 5, shake = .6) { if (RM) return; FX.flash = 0; FX.punch = Math.min(punch, 2.5) * .6; FX.shake = 0; }

/* ---------- cámaras y planos ---------- */
const DEF = { pos: [0, 0, 130], look: [0, 0, 0], fov: 26 };
const P = (x, y, len, q, local = null) => stage.pose(x * W(), y * H(), len * Math.min(H(), W() * 1.15), q, local);
const at = (p, q, s = 1) => ({ p: V(...p), q, s });

function heroCam(p) { return mob() ? { pos: [0, -10, 112], look: [0, 0, 0], fov: 34 } : { pos: L3([0, -16, 104], [-8, -10, 90], p), look: [0, 0, 0], fov: lerp(34, 30, p), roll: lerp(-2, 1, p) }; }
function heroShoe(p) {
  const base = mob() ? P(.54, .64 - .03 * p, .64 + .08 * p, O(-42 + 12 * p, -18, -24 + 8 * p)) : P(.68, .5 - .04 * p, .92 + .12 * p, O(-46 + 16 * p, -16, -20 + 6 * p));
  // al final del cuarto la zapatilla barre la cámara y sale de plano: queda el negro para el corte a Q2
  const near = mob() ? P(.4, .56, 1.5, O(-70, -10, -6)) : P(.42, .56, 1.9, O(-74, -10, -8));
  const past = mob() ? P(-.9, .62, 3.4, O(-110, -16, 14)) : P(-.75, .62, 3.6, O(-112, -16, 16));
  return p < .86 ? Stage.mix(base, near, eio(range(p, .7, .86))) : Stage.mix(near, past, ein(range(p, .86, .97)));
}
// Q2: siete planos con pesos de duración
const Q2W = [1.15, 1, 1.15, 1, .9, 1.05, 1.25];
const Q2C = Q2W.reduce((a, w, i) => (a.push((a[i - 1] || 0) + w), a), []).map(v => v / Q2W.reduce((a, b) => a + b));
function q2Shot(p) {
  let k = Q2C.findIndex(c => p <= c); if (k < 0) k = 6;
  const a = k ? Q2C[k - 1] : 0, u = clamp((p - a) / (Q2C[k] - a));
  return { k, u };
}
const PT = { toe: [0, -.18, .42], heel: [0, -.05, -.48] };
function shotQ2(k, u) {
  const m = mob();
  switch (k) {
    case 0: { // SILUETA: acercamiento lento, la luz de contorno barre la pieza
      const q = O(-90, -2, 0);
      return { cam: { pos: L3(m ? [0, 3, 120] : [0, 3, 92], m ? [-6, 1, 78] : [-10, 1, 50], eio(u)), look: L3([0, 0, 0], [-3, 0, 0], u), fov: lerp(24, 21, u) },
        inst: [{ T: at([0, 0, 0], q) }], light: sweep(LIGHTS.sil, lerp(.25, .8, u) * Math.PI), fx: { trail: .2, glow: 1, rim: 1.1, halo: 'shoe', haloR: .55, haloA: 1 } };
    }
    case 1: { // IMPULSO: la zapatilla sale disparada hacia cámara; subfotogramas, estela y estrobo
      const uu = eio(u), from = [-80, -42, -300], to = [36, 20, 80];
      const pos = L3(from, to, uu), q = O(96 + 50 * uu, 10, 28 - 10 * uu);
      const ghosts = [1, 2, 3, 4].map(g => ({ side: 'R', T: at(L3(from, to, eio(clamp(u - g * .045))), O(96 + 50 * eio(clamp(u - g * .045)), 10, 28)), g: .55 / g }));
      return { cam: { pos: m ? [0, -8, 140] : [0, -8, 110], look: [0, 2, 0], fov: 44 }, inst: [{ T: at(pos, q) }], ghosts, light: LIGHTS.dark,
        fx: { blur: 1, trail: 1.25, decay: .935, glow: 1, rim: 1.2, halo: 'shoe', haloR: .28, haloA: .7 }, kin: 1, rail: [from, to] };
    }
    case 2: { // TRACCIÓN: la suela de frente, la cámara la rodea
      const ang = lerp(-34, 22, eio(u)) * Math.PI / 180, r = m ? 78 : 58;
      return { cam: { pos: [r * Math.sin(ang), lerp(-8, 6, u), r * Math.cos(ang)], look: [0, 0, 0], fov: 30 },
        inst: [{ T: at([0, 0, 0], O(-4, -90, 6)) }], light: sweep(LIGHTS.sole, lerp(.1, .55, u) * Math.PI), fx: { trail: .2, glow: .9, rim: .9, halo: 'shoe', haloR: .62, haloA: 1 } };
    }
    case 3: { // PUNTERA: cámara rasante sobre la puntera perforada, luz que barre la superficie
      const q = O(-50, 12, 0), tp = stage.localPoint(PT.toe).applyQuaternion(q);
      const dir = V(lerp(-.25, .4, u), lerp(.32, .12, u), 1).normalize(), d = lerp(m ? 48 : 36, m ? 38 : 25, eio(u));
      const pos = tp.clone().add(dir.multiplyScalar(d));
      const L = { ...LIGHTS.graze, key: [LIGHTS.graze.key[0], LIGHTS.graze.key[1], [-1, lerp(.05, .5, u), lerp(-.2, .6, u)]] };
      return { cam: { pos: pos.toArray(), look: tp.toArray(), fov: 34, roll: lerp(-6, 2, u) }, inst: [{ T: at([0, 0, 0], q) }], light: L, fx: { trail: .15, glow: .8, rim: .8 } };
    }
    case 4: { // TALÓN: giro rápido del producto ante cámara fija, con motion blur real
      const q = O(lerp(110, 250, eio(u)), 8, -4);
      return { cam: { pos: m ? [0, 4, 80] : [0, 4, 58], look: [0, 0, 0], fov: 30 }, inst: [{ T: at([0, 0, 0], q) }], light: sweep(LIGHTS.dark, lerp(1, 0, u) * Math.PI),
        fx: { blur: 1, trail: .7, decay: .9, glow: 1, rim: 1.1, halo: 'shoe', haloR: .45, haloA: .85 } };
    }
    case 5: { // PRESIÓN: tres escalas del producto cruzándose con paralaje
      const t = eio(u);
      return { cam: { pos: [0, 0, 110], look: [0, 0, 0], fov: 34 }, light: LIGHTS.close,
        inst: [
          { side: 'L', T: at([lerp(52, -38, t), lerp(-14, -6, t), 60], O(-90, 4, 18)) },
          { side: 'R', T: at([lerp(-30, 26, t), 4, -40], O(90, -4, -14)) },
          { side: 'R', T: at([lerp(140, -120, t), 30, -320], O(-90, 6, 10)) },
        ], fx: { blur: 1, trail: 1, decay: .92, glow: 1, rim: 1.1 } };
    }
    default: { // PAUSA DE PRODUCTO: plano limpio, rotación mínima, todo respira
      const q = O(lerp(-40, -28, u), 10, -4);
      return { cam: { pos: L3([0, 6, 100], [0, 4, 86], u), look: [0, 0, 0], fov: 26 }, inst: [{ T: at([0, 0, 0], q) }], light: LIGHTS.hero, fx: { trail: .2, glow: .8, rim: .9, halo: 'shoe', haloR: .5, haloA: .9 } };
    }
  }
}
// Q4: estudio negro con suelo brillante; la cámara visita las piezas
const Q4Q = O(-58, 0, 0);
const PARTS = [null, { fr: [.42, .3, -.3], dir: [.55, .35, .6], d: 40 }, { fr: [.47, -.1, .02], dir: [.2, .1, 1], d: 46 }, { fr: [0, -.18, .42], dir: [-.75, .15, .7], d: 38 }, { fr: [0, -.08, -.48], dir: [.85, .2, -.5], d: 40 }];
function q4Cam(fp) {
  const base = { pos: mob() ? [0, 22, 150] : [0, 17, 118], look: [0, -3, 0], fov: 26 };
  const mk = k => {
    if (!PARTS[k]) return base;
    const pt = stage.localPoint(PARTS[k].fr).applyQuaternion(Q4Q);
    const dir = V(...PARTS[k].dir).applyAxisAngle(V(0, 1, 0), 0).normalize();
    return { pos: pt.clone().add(dir.multiplyScalar(PARTS[k].d * (mob() ? 1.35 : 1))).toArray(), look: pt.toArray(), fov: 30 };
  };
  const i = Math.floor(clamp(fp, 0, 3.999)), f = eio(fp - i), a = mk(i), b = mk(i + 1);
  // en vertical la cámara baja con su objetivo: el producto sube al hueco entre el titular y el índice
  const dy = mob() ? lerp(i ? 9 : 16, 9, f) : 0;
  const pos = L3(a.pos, b.pos, f), look = L3(a.look, b.look, f); pos[1] -= dy; look[1] -= dy;
  return { pos, look, fov: lerp(a.fov, b.fov, f) };
}

/* ---------- interacción ---------- */
const partBtns = $$('#parts button');
let manual = null, manualAt = 0;
partBtns.forEach(b => { const go = () => { manual = +b.dataset.p; manualAt = S.q4; }; b.addEventListener('click', go); b.addEventListener('focus', go); });
const qLinks = $$('.quarters a'), clockEl = $('#clock'), qLabel = $('#qlabel'), otClock = $('#otclock');
const QL = ['1.º', '2.º', 'DESC.', '3.º', '4.º', 'PRÓR.'];
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const el = $(a.getAttribute('href')); if (!el) return;
  e.preventDefault(); window.scrollTo({ top: el.offsetTop + 2, behavior: RM ? 'auto' : 'smooth' });
}));


/* ---------- giro a mano: al parar el scroll, la zapatilla se gira con el cursor o con el dedo ---------- */
const spin = { yaw: 0, pitch: 0, ty: 0, tp: 0, on: false, id: null, x: 0, y: 0, last: -1e9, used: false, hit: null };
const hint = $('#spin-hint');
addEventListener('scroll', () => { spin.last = performance.now(); }, { passive: true });
const scrollIdle = () => performance.now() - spin.last > 220;
const onShoe = (x, y) => !!spin.hit && Math.hypot(x - spin.hit[0], y - spin.hit[1]) < spin.hit[2];
addEventListener('pointerdown', e => {
  if (e.button > 0 || e.target.closest('a,button,input,label,summary')) return;
  if (!scrollIdle() || !onShoe(e.clientX, e.clientY)) return;
  spin.on = true; spin.id = e.pointerId; spin.x = e.clientX; spin.y = e.clientY; spin.used = true;
  document.body.classList.add('spinning');
}, { passive: true });
addEventListener('pointermove', e => {
  if (!spin.on) { if (e.pointerType === 'mouse') document.body.classList.toggle('can-spin', scrollIdle() && onShoe(e.clientX, e.clientY)); return; }
  if (e.pointerId !== spin.id) return;
  const dx = e.clientX - spin.x, dy = e.clientY - spin.y; spin.x = e.clientX; spin.y = e.clientY;
  spin.ty += dx * .011; spin.tp = clamp(spin.tp + dy * .008, -1.1, 1.1);
}, { passive: true });
const endSpin = () => { spin.on = false; document.body.classList.remove('spinning'); };
addEventListener('pointerup', endSpin); addEventListener('pointercancel', endSpin);
function spinQ(cam) {
  const m = cam.matrixWorld.elements, right = V(m[0], m[1], m[2]).normalize(), up = V(m[4], m[5], m[6]).normalize();
  return new THREE.Quaternion().setFromAxisAngle(up, spin.yaw).multiply(new THREE.Quaternion().setFromAxisAngle(right, spin.pitch));
}
function stepSpin(dt) {
  if (!spin.on && !scrollIdle()) { spin.ty *= Math.pow(.02, dt); spin.tp *= Math.pow(.02, dt); }
  const k = 1 - Math.exp(-dt * 12); spin.yaw += (spin.ty - spin.yaw) * k; spin.pitch += (spin.tp - spin.pitch) * k;
}
function spinning() { return Math.abs(spin.yaw) + Math.abs(spin.pitch) > 1e-3; }
let hintT = 0;
function showHint() {
  // se enseña una sola vez, unos segundos, la primera vez que paras sobre una zapatilla
  let show = !!spin.hit && !spin.used && scrollIdle() && performance.now() - spin.last > 900 && S.intro >= 1;
  if (show && !hintT) hintT = performance.now();
  if (hintT && performance.now() - hintT > 4200) { spin.used = true; show = false; }
  hint.classList.toggle('on', show);
  if (show) hint.style.transform = `translate(${Math.round(spin.hit[0])}px, ${Math.round(Math.min(innerHeight - 60, spin.hit[1] + spin.hit[2] * .75))}px) translateX(-50%)`;
}

/* ---------- bucle ---------- */
const shotCaps = $$('#shots li'), shotIdx = $$('#shot-index span'), kinetic = $('#kinetic'), bigNum = $('#q2num'), rail = $('#rail');
const leader = $('#leader'), lPath = $('path', leader), lDot = $('circle', leader), q4num = $('#q4num');
const arcPath = $('#arc');
const echoes = $$('.ph[data-echo]');
const perf = { ema: .016, n: 0 };
let lastP = null, spd = 0, htLeft = 900, stageEmpty = false, echoKey = '';
const pista = new Pista($('#pista'), $('#htcap'), mob());
if (mob()) stage.setQuality(1);
let lastShot = -1, lastY = scrollY, lastRowX = 0, buzzer = false, last = performance.now(), landed = false;
function setShot(k) { lastShot = k; shotCaps.forEach((c, i) => c.classList.toggle('on', i === k)); shotIdx.forEach((c, i) => c.classList.toggle('on', i === k)); if (bigNum) bigNum.textContent = String(k + 1).padStart(2, '0'); }

function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(.05, raw); last = now;
  // calidad adaptativa: si los fotogramas se alargan de forma sostenida, baja un escalón (nunca vuelve a subir en la sesión)
  if (S.intro >= 1 && raw < .2 && !document.hidden) {
    perf.ema = perf.ema * .95 + raw * .05;
    // por debajo de ~52 fps sostenidos baja un escalón (resolución y desenfoque), en los dos motores
    if (++perf.n > 90 && perf.ema > .0192 && stage.q > 0) { stage.setQuality(stage.q - 1); if (pista.world) pista.world.setQuality(stage.q ? .85 : .72); perf.n = 0; perf.ema = .016; }
  }
  const vy = (scrollY - lastY) / Math.max(dt, .001); lastY = scrollY;
  stepSpin(dt);
  // el 3D sigue al scroll con inercia (como en la v2): sin saltos aunque la rueda avance a golpes
  for (const key of SMOOTH) S[key] = R[key];
  if (!pista.initing && (S.q2 > .05 || S.htin > 0)) pista.init();
  if (S.htin > 0 && S.q3in < 1) htLeft = pista.update(S.ht, dt, now, RM, spinning() ? spinQ : null);
  FX.flash *= Math.pow(.0009, dt); FX.punch *= Math.pow(.004, dt); FX.shake *= Math.pow(.01, dt);
  let cam = DEF, inst = [], ghosts = [], light = LIGHTS.hero, fx = { trail: .2, glow: .8, rim: .9 }, quarter = 0, clockSec = 2880, kin = 0, part = -1, railSeg = null;

  if (S.q2in <= 0) {
    cam = heroCam(S.q1); stage.setCamera(cam);
    const h = heroShoe(S.q1);
    let T = h;
    if (S.intro < 1) {
      const from = mob() ? P(1.3, -.4, .12, O(-170, 40, 80)) : P(1.25, -.35, .14, O(-170, 40, 80));
      T = Stage.mix(from, h, S.intro);
      ghosts = [1, 2, 3].map(g => ({ side: 'R', T: Stage.mix(from, h, clamp(S.intro - g * .05)), g: .5 / g }));
    }
    inst = [{ T }]; light = LIGHTS.hero;
    fx = { blur: S.intro < 1 ? 1 : (S.q1 > .7 ? .9 : 0), trail: S.intro < 1 ? 1.2 : .35, decay: .92, glow: .9, rim: 1, halo: 'shoe', haloR: mob() ? .38 : .5, haloA: .75 * S.intro * (1 - range(S.q1, .7, .9)) };
    clockSec = 2880 - 720 * S.q1;
  } else if (S.q2 <= 0) {
    cam = heroCam(1); stage.setCamera(cam);
    inst = [{ T: heroShoe(1) }]; light = mixLights(LIGHTS.hero, LIGHTS.sil, S.q2in); fx = { trail: .1, glow: .4, rim: .5 };
    if (lastShot !== 0) setShot(0);
    clockSec = 2160;
  } else if (S.htin <= 0) {
    const { k, u } = q2Shot(S.q2), sh = shotQ2(k, u);
    if (k !== lastShot) { if (lastShot !== -1) kick(.85, 7, .8); setShot(k); stage.prev = null; }
    cam = sh.cam; stage.setCamera(cam); inst = sh.inst; ghosts = sh.ghosts || []; light = sh.light; fx = sh.fx; kin = sh.kin || 0; railSeg = sh.rail;
    quarter = 1; clockSec = 2160 - 720 * S.q2;
  } else if (S.ht <= 0) {
    // salida: la última pose sale disparada mientras sube el túnel del medio tiempo
    const sh = shotQ2(6, 1); cam = sh.cam; stage.setCamera(cam);
    const t = eio(S.htin);
    inst = [{ T: Stage.mix(sh.inst[0].T, at([140, 30, -40], O(10, 10, -60)), t) }];
    light = LIGHTS.hero; fx = { blur: 1, trail: 1.2, decay: .93, glow: 1, rim: 1.1 }; quarter = 1; clockSec = 1440;
    if (lastShot !== 6) setShot(6);
  } else if (S.q3 <= 0) {
    // MEDIO TIEMPO: la zapatilla vive en el lienzo del túnel; el de la v1 queda vacío
    inst = []; quarter = 2; clockSec = htLeft;
  } else if (S.q4in <= 0) {
    // Q3: la zapatilla cruza la foto del mate siguiendo la trayectoria dibujada
    stage.setCamera(DEF);
    const u3 = -(gsap.getProperty(row, 'x') || 0) / W();
    const t = clamp((u3 - .55) / .9);
    if (t > 0 && t < 1 && arcPath) {
      const L = arcPath.getTotalLength(), pt = arcPath.getPointAtLength(L * t), pt2 = arcPath.getPointAtLength(L * clamp(t + .02));
      const M = arcPath.getScreenCTM(), sp = new DOMPoint(pt.x, pt.y).matrixTransform(M), sp2 = new DOMPoint(pt2.x, pt2.y).matrixTransform(M);
      const ang = Math.atan2(-(sp2.y - sp.y), sp2.x - sp.x) * 180 / Math.PI;
      inst = [{ T: stage.pose(sp.x, sp.y, (mob() ? .3 : .26) * H(), O(90, 0, ang)) }];
      fx = { blur: 1, trail: 1.3, decay: .94, glow: 1, rim: 1.3 }; light = LIGHTS.dark;
    } else { inst = []; fx = { trail: .8, decay: .86, glow: 0, rim: 0 }; }
    quarter = 3; clockSec = 1440 - 720 * S.q3;
  } else if (S.otin <= 0) {
    // Q4: caída al estudio negro, impacto en el suelo brillante y recorrido de cámara por las piezas
    let fp = clamp(S.q4 * 5 - .4, 0, 4);
    if (manual !== null && Math.abs(S.q4 - manualAt) < .05) fp = manual; else manual = null;
    cam = q4Cam(fp); stage.setCamera(cam);
    const drop = eout(range(S.q4in, .35, 1)), groundY = -stage.shoes.R.size.y * .5;
    const y = lerp(70, 0, drop * drop * (3 - 2 * drop));
    if (S.q4in > .98 && !landed) { landed = true; kick(.5, 4, 1.2); } else if (S.q4in < .9) landed = false;
    inst = [{ T: at([0, y, 0], Q4Q) }];
    light = LIGHTS.studio;
    fx = { blur: S.q4in < 1 ? .6 : 0, trail: S.q4in < 1 ? .6 : .15, glow: .7, rim: .8, mirror: { y: groundY, c: V(0, groundY, 0), r: 30 } };
    part = Math.round(fp); quarter = 4; clockSec = 720 - 720 * S.q4;
  } else {
    // PRÓRROGA: el par a contraluz con duplicados que se alejan
    const t = eio(S.otin), m = mob();
    cam = { pos: [0, -4, m ? 150 : 120], look: [0, 0, 0], fov: 28 }; stage.setCamera(cam);
    const len = (m ? .3 : .46) + .05 * S.ot, y = m ? .44 : .52, dx = m ? .21 : .15;
    const R = P(.5 + dx, y, len, O(-90, -8, 3)), Lf = P(.5 - dx, y, len, O(90, -8, -3));
    const Rin = P(1.3, .1, len, O(-150, 20, 40)), Lin = P(-.3, .1, len, O(150, 20, -40));
    inst = [{ side: 'R', T: Stage.mix(Rin, R, t) }, { side: 'L', T: Stage.mix(Lin, Lf, eio(range(S.otin, .15, 1))) }];
    const back = g => ({ p: V(0, 0, -g * 60), q: new THREE.Quaternion(), s: 1 });
    ghosts = [1, 2, 3].flatMap(g => [{ side: 'R', T: { p: R.p.clone().add(V(g * 6, 0, -g * 40)), q: R.q, s: R.s }, g: .35 / g }, { side: 'L', T: { p: Lf.p.clone().add(V(-g * 6, 0, -g * 40)), q: Lf.q, s: Lf.s }, g: .35 / g }]);
    light = LIGHTS.close; fx = { blur: S.otin < 1 ? .8 : 0, trail: .6, decay: .9, glow: 1, rim: 1.1, halo: 'mid', haloR: .42, haloA: .7 * t };
    quarter = 5; clockSec = 0;
    const otSec = 300 * (1 - clamp(S.ot / .55));
    otClock.textContent = otSec > 0 ? 'PRÓRROGA · ' + fmt(otSec) : 'FINAL · NO HAY EMPATE';
    if (S.ot > .55 && !buzzer) { buzzer = true; kick(1, 8, 1.4); } else if (S.ot < .5) buzzer = false;
  }

  // golpe de focal y temblor de cámara tras cada corte
  if (FX.punch > .05 || FX.shake > .02) {
    const c = { ...cam, fov: cam.fov + FX.punch, pos: cam.pos.map((v, i) => v + (i < 2 ? (Math.random() - .5) * FX.shake * 2.2 : 0)) };
    stage.setCamera(c);
  }
  const focus = inst.length ? inst[0].T.p : V(0, 0, 0);
  stage.lights(light, focus);
  if (fx.halo && inst.length) {
    const c = fx.halo === 'mid' && inst[1] ? stage.worldToScreen(inst[0].T.p.clone().lerp(inst[1].T.p, .5)) : stage.worldToScreen(focus);
    fx.halo = [c[0] / W(), c[1] / H(), fx.haloR, fx.haloA];
  } else fx.halo = null;
  fx.flash = FX.flash * .55;
  // desplazamiento = solo obturador: sin estela ni duplicados; el contorno se apaga mientras la zapatilla va rápida
  fx.trail = 0; ghosts = [];
  const p0 = inst.length ? inst[0].T.p : null;
  const sp = p0 && lastP ? p0.distanceTo(lastP) / Math.max(dt, .001) : 0; lastP = p0 ? p0.clone() : null;
  spd = spd * .8 + sp * .2;
  fx.rim = 0; fx.glow = 0; fx.halo = null; fx.flash = 0;
  if (RM) { fx.blur = 0; fx.trail = 0; ghosts = []; }
  // giro a mano: rota cada zapatilla sobre su propio centro, en los ejes de la cámara
  if (inst.length && spinning()) { const q = spinQ(stage.cam); inst = inst.map(it => ({ ...it, T: { ...it.T, q: q.clone().multiply(it.T.q) } })); }
  if (inst.length || !stageEmpty || FX.flash > .01) stage.render({ inst, ghosts, fx }, dt);
  // zona de agarre: la zapatilla visible (la del motor v1 o la del medio tiempo)
  if (inst.length) {
    // de todas las zapatillas en plano, la más grande que se vea dentro de la pantalla
    const m = stage.cam.matrixWorld.elements, rgt = V(m[0], m[1], m[2]).normalize(); let best = null;
    for (const it of inst) {
      const T = it.T, c = stage.worldToScreen(T.p), e = stage.worldToScreen(T.p.clone().add(rgt.clone().multiplyScalar(stage.shoes.R.size.z * (T.s || 1) * .55)));
      const r = Math.max(60, Math.hypot(e[0] - c[0], e[1] - c[1]));
      if (c[2] < 1 && c[0] > 0 && c[0] < W() && c[1] > 0 && c[1] < H() && (!best || r > best[2])) best = [c[0], c[1], r];
    }
    spin.hit = best;
  }
  else spin.hit = S.htin > .98 && S.q3in < .02 ? pista.hit : null;
  showHint();
  stageEmpty = !inst.length && FX.flash <= .01;
  // tipografía sincronizada con la cámara
  kinetic.style.opacity = kin ? .85 : 0;
  kinetic.style.transform = `rotate(-14deg) translateX(${-S.q2 * 140}vw)`;
  if (railSeg && rail) {
    const a = stage.worldToScreen(V(...railSeg[0])), b = stage.worldToScreen(V(...railSeg[1]));
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    rail.style.opacity = 1; rail.style.transform = `translate(${a[0]}px,${a[1]}px) rotate(${ang}deg)`;
  } else if (rail) rail.style.opacity = 0;
  if (bigNum) bigNum.style.transform = `translate(${(cam.pos[0] || 0) * -2}px, ${(cam.pos[1] || 0) * 2}px)`;

  // ecos de velocidad en las fotografías
  const rx = gsap.getProperty(row, 'x') || 0, vx = (rx - lastRowX) / Math.max(dt, .001); lastRowX = rx;
  const v = RM ? 0 : (Math.abs(vx) > 10 ? vx : -vy * .6);
  const ex = clamp(v * .025, -80, 80), eo = clamp(Math.abs(v) / 2200, 0, .55), ez = 1 + clamp(Math.abs(v) / 30000, 0, .08);
  const ek = eo < .02 ? '0' : Math.round(ex / 4) + '|' + eo.toFixed(2);
  if (ek !== echoKey) { echoKey = ek; for (const e of echoes) { e.style.setProperty('--ex', (eo < .02 ? 0 : ex).toFixed(1) + 'px'); e.style.setProperty('--eo', (eo < .02 ? 0 : eo).toFixed(2)); e.style.setProperty('--ez', ez.toFixed(3)); e.classList.toggle('still', eo < .02); } }

  // Q4: índice y línea guía hasta el punto real del modelo
  if (part >= 0) {
    partBtns.forEach(b => b.setAttribute('aria-pressed', +b.dataset.p === part));
    if (q4num) q4num.textContent = part ? String(part).padStart(2, '0') : 'AJ1';
    if (part > 0) {
      const btn = partBtns[part - 1].getBoundingClientRect();
      const wp = stage.localPoint(PARTS[part].fr).applyQuaternion(Q4Q);
      const [px, py] = stage.worldToScreen(wp);
      const sx = mob() ? btn.left + 70 : btn.right + 14, sy = mob() ? btn.top : btn.top + btn.height / 2;
      lPath.setAttribute('d', mob() ? `M${sx},${sy} L${px},${py}` : `M${sx},${sy} L${sx + (px - sx) * .45},${sy} L${px},${py}`);
      lDot.setAttribute('cx', px); lDot.setAttribute('cy', py); leader.style.opacity = 1;
    } else leader.style.opacity = 0;
  } else leader.style.opacity = 0;

  // marcador
  clockEl.textContent = fmt(clockSec).slice(0, clockSec < 60 ? 7 : 5);
  qLabel.textContent = QL[quarter];
  qLinks.forEach((a, i) => a.classList.toggle('on', i === quarter));
  requestAnimationFrame(frame);
}

addEventListener('resize', () => { stage.size(); pista.size(); ScrollTrigger.refresh(); });
ScrollTrigger.refresh();
runIntro();
await ready;
await document.fonts.ready;
ScrollTrigger.refresh();
requestAnimationFrame(frame);
// el motor del medio tiempo se prepara en cuanto el navegador queda libre tras la apertura, no en mitad del scroll
const idleInit = () => pista.init();
setTimeout(() => ('requestIdleCallback' in window ? requestIdleCallback(idleInit, { timeout: 2500 }) : idleInit()), 3200);
