// v3 · sección «MEDIO TIEMPO»: el túnel de pórticos y las pantallas de pabellón de la v2, como bloque propio
// entre el 2.º y el 3.er cuarto de la v1. Tiene su propio lienzo 3D (motor de la v2) y su propio scroll suavizado.
import * as THREE from 'three';
import { World, V, orient, textPlane, photoPanel, C, D2R } from './world.js';

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const range = (x, a, b) => clamp((x - a) / (b - a));
const eio = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const ss = x => { x = clamp(x); return x * x * (3 - 2 * x); };

// Pantallas: imágenes generadas para esta sección (provisionales, ver RECURSOS-v3.md).
export const SCREENS = [
  { f: 'assets/pantallas/pantalla-01-mate-contraluz.jpg', cap: ['LA GRADA', 'NO SE SIENTA.'], led: .55 },
  { f: 'assets/pantallas/pantalla-02-manos-balon.jpg', cap: ['AQUÍ NADIE', 'FIRMA TABLAS.'], led: .5 },
  { f: 'assets/pantallas/pantalla-03-sprint.jpg', cap: ['SEGUNDA PARTE.', 'MISMA HAMBRE.'], red: 1, neg: 1, led: .6 },
  { f: 'assets/pantallas/pantalla-04-salida-tunel.jpg', cap: ['VUELVE.', 'GANA.'], led: .5 },
];
const SPOS = [[-6.5, -182], [6.5, -204], [-6.5, -226], [6.5, -248]];

/* ---------- claves (las mismas de la v2, del despegue al final de las pantallas) ---------- */
const cr = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
function seg(keys, P) {
  const n = keys.length;
  if (P <= keys[0].t) return [0, 0]; if (P >= keys[n - 1].t) return [n - 2, 1];
  let i = 0; while (keys[i + 1].t < P) i++;
  return [i, (P - keys[i].t) / (keys[i + 1].t - keys[i].t)];
}
function sample(keys, P, f) {
  const [i, s0] = seg(keys, P), n = keys.length, k = keys[i];
  const s = k.e === 'io' ? eio(s0) : k.e === 'ss' ? ss(s0) : s0;
  const a = f(keys[Math.max(0, i - 1)]), b = f(keys[i]), c = f(keys[i + 1]), d = f(keys[Math.min(n - 1, i + 2)]);
  if (typeof b === 'number') return cr(a, b, c, d, s);
  return b.map((_, j) => cr(a[j], b[j], c[j], d[j], s));
}
const CK = [
  [.17, [-2.6, .45, -13.2], [0, 1.4, -19.5], 31, -4],
  [.20, [-3.4, 1.1, -21.5], [0, 2.2, -27], 36, -6],
  [.24, [-6.2, 2.6, -42], [0, 2.8, -48], 42, 6],
  [.28, [-5, 3.3, -64], [1, 3.2, -72], 40, 9],
  [.31, [.5, .45, -91], [.9, 3.4, -84.5], 38, 0],
  [.345, [1.6, 3.7, -107], [0, 3.5, -100.5], 30, -3],
  [.375, [3.8, 3.5, -113], [-.6, 3, -119], 33, 4],
  [.41, [5.2, 2.5, -133], [0, 2, -140], 33, 0],
  [.45, [0, 1.55, -141.5], [0, 1.1, -150], 30, 0, 'ss'],
  [.48, [2, 3.8, -156], [-6.5, 5.4, -182], 36, 0],
  [.505, [3.2, 4.4, -164.5], [-6.5, 5.4, -182], 33, 0, 'ss'],
  [.53, [2.8, 4.4, -166], [-6.5, 5.3, -182], 33, 0],
  [.555, [-3.2, 4.4, -186.5], [6.5, 5.4, -204], 33, 0, 'ss'],
  [.58, [-2.8, 4.4, -188], [6.5, 5.3, -204], 33, 0],
  [.605, [3.2, 4.4, -208.5], [-6.5, 5.4, -226], 33, 0, 'ss'],
  [.63, [2.8, 4.4, -210], [-6.5, 5.3, -226], 33, 0],
  [.655, [-3.2, 4.4, -230.5], [6.5, 5.4, -248], 33, 0, 'ss'],
  [.68, [-2.8, 4.4, -232], [6.5, 5.3, -248], 33, 0],
  [.70, [0, 3.8, -257], [0, 1.2, -290], 34, 0],
].map(([t, pos, look, fov, roll, e]) => ({ t, pos, look, fov, roll, e }));
const SK = [
  [.12, [0, 0, -18], [-34, 0, 0]],
  [.17, [0, .55, -19.5], [160, -14, 0]],
  [.21, [0, 1.9, -30], null],
  [.25, [-1.6, 2.1, -52], null],
  [.29, [1.8, 2.5, -75], null],
  [.33, [0, 2.9, -96], null],
  [.37, [-1.2, 2.3, -118], null],
  [.41, [0, 1.4, -140], null],
  [.45, [0, .25, -150], [-90, 0, 0], 'ss'],
  [.465, [0, .25, -150], [-90, 0, 0]],
  [.49, [-1, 2.6, -170], null],
  [.52, [-3.4, 3.6, -178], null],
  [.55, [1.5, 1.6, -194], null],
  [.575, [4.2, 6.6, -200], null],
  [.60, [-1.5, 3.4, -216], null],
  [.635, [-4, 5.4, -222], null],
  [.665, [3.2, 2.6, -242], null],
  [.70, [0, 2.4, -272], null],
  [.74, [0, 1, -300], null],
].map(([t, p, o, e]) => ({ t, p, o, e }));
const CAPS = [
  [0, 'DESCANSO · 24:00', 'MEDIO PARTIDO', 'EL PARTIDO EMPIEZA AHORA.'],
  [.47, 'MEDIO TIEMPO · PANTALLA 01 / 04', '', ''],
  [.545, 'MEDIO TIEMPO · PANTALLA 02 / 04', '', ''],
  [.595, 'MEDIO TIEMPO · PANTALLA 03 / 04', '', ''],
  [.645, 'MEDIO TIEMPO · PANTALLA 04 / 04', '', ''],
];
// la sección empieza con la zapatilla parada ante el marcador del descanso y termina en la cuarta pantalla
const P0 = .447, P1 = .68;

export class Pista {
  constructor(canvas, cap, mobile) {
    this.canvas = canvas; this.cap = cap; this.mobile = mobile;
    this.cur = 0; this.ready = false; this.capIdx = -1; this.lastFly = orient(180);
    this.gates = []; this.panels = [];
  }
  async init() {
    if (this.initing) return; this.initing = true;
    await Promise.all([document.fonts.load('400 100px "Anton"'), document.fonts.load('600 40px "IBM Plex Mono"')]).catch(() => {});
    this.world = new World(this.canvas, { mobile: this.mobile });
    this.buildSet();
    await this.world.load(() => {});
    this.world.setShoe('L', V(0, -50, 0), orient(0), false);
    // compila los shaders ya, en reposo, para que la entrada en la sección no dé tirón
    this.world.setShoe('R', V(0, 1, -150), orient(-90), true);
    this.world.setCamera(V(0, 1.55, -141.5), V(0, 1.1, -150), 30);
    this.world.R.compile(this.world.scene, this.world.cam);
    this.ready = true;
  }
  buildSet() {
    const S = this.world.scene;
    // sin túnel ni pórticos: solo el marcador del descanso y las pantallas
    const c2 = this.world.clock.panel(12); c2.position.set(0, 7.8, -158); S.add(c2);
    const tl = new THREE.TextureLoader();
    SCREENS.forEach((d, i) => {
      tl.load(d.f, tex => {
        tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
        const [x, z] = SPOS[i], g = new THREE.Group();
        const m = photoPanel(tex, 7, 10.5, d); m.position.y = 5.5;
        if (d.zoom) { const u = m.material.uniforms; u.uS.value.multiplyScalar(1 / d.zoom); u.uO.value.set((1 - u.uS.value.x) * (d.focus ? d.focus[0] : .5), 1 - u.uS.value.y); }
        // el titular cabe siempre dentro de la pantalla, alineado al lado que mira al pasillo
        const cap = textPlane(d.cap, { h: .95 * d.cap.length, color: C.bone, lh: .86 });
        const k = Math.min(1, 6 / cap.userData.w), cw = cap.userData.w * k; cap.scale.setScalar(k);
        cap.position.set(x < 0 ? 3.5 - cw / 2 - .45 : -3.5 + cw / 2 + .45, 1.2 + .95 * d.cap.length * k / 2, .35);
        g.add(m, cap); g.position.set(x, 0, z); g.rotation.y = (x < 0 ? 28 : -28) * D2R;
        S.add(g); this.panels[i] = { g, m, z };
      });
    });
  }
  size() { if (this.world) this.world.size(); }
  shoePos(P) { const p = sample(SK, P, k => k.p); return V(p[0], p[1] + (this.world.H2 || .75), p[2]); }
  flightQ(P) {
    const a = this.shoePos(P - .003), b = this.shoePos(P + .003), c = this.shoePos(P + .009), v = b.clone().sub(a);
    if (v.lengthSq() < 1e-6) return null;
    const m = new THREE.Matrix4().lookAt(V(), v.clone().negate(), V(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    const turn = v.clone().normalize().cross(c.clone().sub(b).normalize()).y;
    return q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), clamp(turn * 18, -.7, .7)));
  }
  shoeQ(P) {
    const [i, s0] = seg(SK, P), ka = SK[i], kb = SK[i + 1];
    const fq = (!ka.o || !kb.o) ? (this.flightQ(P) || this.lastFly) : null;
    if (fq) this.lastFly = fq;
    const qa = ka.o ? orient(...ka.o) : fq, qb = kb.o ? orient(...kb.o) : fq;
    return qa.clone().slerp(qb, ka.e === 'ss' || kb.o ? ss(s0) : eio(s0));
  }
  setCap(P) {
    let i = 0; while (i + 1 < CAPS.length && CAPS[i + 1][0] <= P) i++;
    if (i === this.capIdx) return; this.capIdx = i;
    const [, ey, t, s] = CAPS[i], c = this.cap;
    c.classList.remove('in'); void c.offsetWidth;
    c.querySelector('.ey').textContent = ey; c.querySelector('.t').textContent = t; c.querySelector('.s').textContent = s;
    c.classList.toggle('no-t', !t); c.classList.add('in');
  }
  // u: progreso de la sección (0..1); devuelve los segundos que quedan del descanso
  update(u, dt, now, rm, spinFn = null) {
    this.cur = rm ? u : this.cur + (u - this.cur) * (1 - Math.exp(-dt * 6.5));
    const P = lerp(P0, P1, this.cur);
    const left = 900 * (1 - this.cur);
    if (!this.ready) return left;
    const w = this.world;
    const m = Math.floor(left / 60), s = Math.floor(left % 60);
    w.clock.set(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'));
    this.setCap(P);
    const pos = V(...sample(CK, P, k => k.pos)), look = V(...sample(CK, P, k => k.look));
    let fov = sample(CK, P, k => k.fov); const roll = sample(CK, P, k => k.roll);
    const asp = innerWidth / innerHeight;
    if (asp < 1) fov = 2 * Math.atan(Math.tan(fov * D2R / 2) * lerp(1, 1.85, clamp((1 - asp) / .55))) / D2R;
    w.setCamera(pos, look, fov, roll);
    const pR = this.shoePos(P); let qR = this.shoeQ(P);
    if (spinFn) qR = spinFn(w.cam).multiply(qR);
    w.setShoe('R', pR, qR, true);
    const back = pR.clone().sub(pos).setY(0).normalize();
    w.rim.position.copy(pR).add(back.multiplyScalar(6.5)).add(V(0, 3.2, 0)); w.rim.target.position.copy(pR); w.rim.target.updateMatrixWorld();
    const right = V().crossVectors(V().subVectors(look, pos).normalize(), V(0, 1, 0)).normalize();
    w.key.position.copy(pR).add(V(2, 10, 3)); w.key.target.position.copy(pR); w.key.target.updateMatrixWorld();
    w.cold.position.copy(pR).add(right.multiplyScalar(-7)).add(V(0, 2, 0)); w.cold.target.position.copy(pR); w.cold.target.updateMatrixWorld();
    let near = null, nb = 0;
    for (const g of this.gates) { const b = Math.exp(-Math.pow((pR.z - g.z) / 4.5, 2)); g.mat.color.setRGB(.23 + 3.2 * b, .03 + .25 * b, .02 + .15 * b); if (b > nb) { nb = b; near = g; } }
    if (near) { w.gateL.position.set(0, 6, near.z); w.gateL.intensity = 70 * nb; } else w.gateL.intensity = 0;
    for (const p of this.panels) if (p) { const d = pos.distanceTo(p.g.position); const on = clamp((46 - d) / 12); p.m.material.uniforms.uOn.value = on < 1 && on > 0 ? on * (.55 + .45 * Math.sin(now * .09 + p.z) ** 2) : on; }
    w.render();
    const c = w.toScreen(pR), e = w.toScreen(pR.clone().add(right.clone().normalize().multiplyScalar(1.7)));
    this.hit = c[2] < 1 && c[0] > 0 && c[0] < innerWidth && c[1] > 0 && c[1] < innerHeight ? [c[0], c[1], Math.max(60, Math.hypot(e[0] - c[0], e[1] - c[1]))] : null;
    return left;
  }
}
