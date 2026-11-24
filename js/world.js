// AIR JORDAN 1 · «NO HAY EMPATE» · v2 «LA PISTA»
// Un único mundo 3D: pista nocturna con suelo espejo, marcador LED como arquitectura, pórticos de luz,
// pantallas de pabellón con las fotografías y tipografía pintada en planos reales.
// El GLB se lee desde assets/ sin modificarlo (la ruta es relativa a la página v2/).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Reflector } from 'three/addons/objects/Reflector.js';

const GLB = 'assets/modelo/air_jordan_1.glb';
export const D2R = Math.PI / 180;
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const BG = 0x050505;
export const C = { ink: '#0B0B0C', bone: '#EFEDE8', red: '#CE1141' };

export function orient(yaw, tilt = 0, roll = 0) {
  const qy = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw * D2R);
  const qx = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), tilt * D2R);
  const qz = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), roll * D2R);
  return qz.multiply(qx).multiply(qy);
}

/* ---------- texturas tipográficas (Anton / Plex Mono en canvas: texto real en profundidad) ---------- */
export function textPlane(lines, { h = 2, font = 'Anton', weight = 400, color = C.bone, stroke = 0, align = 'left', lh = .86, track = 0, opacity = 1, px = 220 } = {}) {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  const f = `${weight} ${px}px "${font}"`;
  ctx.font = f;
  const ws = lines.map(l => ctx.measureText(l).width + Math.max(0, l.length - 1) * track * px);
  const W = Math.ceil(Math.max(...ws) + px * .2), H = Math.ceil(px * (lh * (lines.length - 1) + 1.05) + px * .1);
  cv.width = Math.min(4096, W); cv.height = Math.min(4096, H);
  const sx = cv.width / W;
  ctx.scale(sx, sx);
  ctx.font = f; ctx.textBaseline = 'top';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${track * px}px`;
  lines.forEach((l, i) => {
    const x = align === 'left' ? px * .1 : align === 'right' ? W - ws[i] - px * .1 : (W - ws[i]) / 2;
    const y = px * .06 + i * px * lh;
    if (stroke) { ctx.lineWidth = stroke * px; ctx.strokeStyle = color; ctx.strokeText(l, x, y); } else { ctx.fillStyle = color; ctx.fillText(l, x, y); }
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity, fog: true });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(h * W / H, h), mat);
  m.userData.w = h * W / H;
  return m;
}

/* ---------- marcador LED de siete segmentos (una textura compartida por todos los paneles) ---------- */
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
export class LedClock {
  constructor() {
    this.cv = document.createElement('canvas'); this.cv.width = 1024; this.cv.height = 330;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.val = '';
    this.set('48:00');
  }
  set(str) {
    if (str === this.val) return; this.val = str;
    const c = this.cv.getContext('2d'), W = 1024, H = 330;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const dw = 170, dh = 260, th = 26, gap = 34, y0 = 35;
    let x = 60;
    const seg = (on, x0, y, w, h) => { c.fillStyle = on ? '#ff1f57' : 'rgba(206,17,65,.10)'; c.beginPath(); c.roundRect(x0, y, w, h, th / 2); c.fill(); };
    for (const ch of str) {
      if (ch === ':') { c.fillStyle = '#ff1f57'; c.fillRect(x + 6, y0 + 70, th, th); c.fillRect(x + 6, y0 + 170, th, th); x += 60; continue; }
      const on = SEG[ch] || '';
      const sk = 18; // inclinación de marcador deportivo
      c.save(); c.transform(1, 0, -sk / dh, 1, sk, 0);
      seg(on.includes('a'), x + th, y0, dw - 2 * th, th);
      seg(on.includes('b'), x + dw - th, y0 + th, th, dh / 2 - th * 1.5);
      seg(on.includes('c'), x + dw - th, y0 + dh / 2 + th / 2, th, dh / 2 - th * 1.5);
      seg(on.includes('d'), x + th, y0 + dh - th, dw - 2 * th, th);
      seg(on.includes('e'), x, y0 + dh / 2 + th / 2, th, dh / 2 - th * 1.5);
      seg(on.includes('f'), x, y0 + th, th, dh / 2 - th * 1.5);
      seg(on.includes('g'), x + th, y0 + dh / 2 - th / 2, dw - 2 * th, th);
      c.restore();
      x += dw + gap;
    }
    // rejilla de diodos
    c.globalCompositeOperation = 'destination-in';
    c.fillStyle = '#000'; c.beginPath();
    for (let yy = 0; yy < H; yy += 9) c.rect(0, yy, W, 7);
    c.fill();
    c.globalCompositeOperation = 'destination-over'; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    this.tex.needsUpdate = true;
  }
  panel(w) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 330 / 1024), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, fog: true }));
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.06, w * 330 / 1024 * 1.18), new THREE.MeshBasicMaterial({ color: 0x0d0d0e, fog: true }));
    frame.position.z = -.02;
    const g = new THREE.Group(); g.add(frame, m);
    return g;
  }
}

/* ---------- pantallas de pabellón: foto en B/N de alto contraste, trama LED y duotono rojo ---------- */
const PHOTO_VS = 'varying vec2 vUv;varying float vD;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);vD=-mv.z;gl_Position=projectionMatrix*mv;}';
const PHOTO_FS = `uniform sampler2D map;uniform vec2 uS,uO;uniform float uRed,uLed,uOn,uNeg,uFogN,uFogF;uniform vec3 uBg;varying vec2 vUv;varying float vD;
void main(){vec2 uv=vUv*uS+uO;vec3 c=texture2D(map,uv).rgb;float l=dot(c,vec3(.299,.587,.114));
l=smoothstep(.06,.86,l);l=mix(l,1.-l,uNeg);
vec3 col=mix(vec3(l),mix(vec3(.02,0.,0.),vec3(.93,.08,.3),l),uRed);
vec2 g=fract(vUv*vec2(120.,180.))-.5;float dotm=smoothstep(.5,.28,length(g));
col*=mix(1.,.35+dotm*.95,uLed);
col*=uOn;
float f=smoothstep(uFogN,uFogF,vD);gl_FragColor=vec4(mix(col,uBg,f),1.);}`;
export function photoPanel(tex, w, h, { red = 0, led = .55, neg = 0, focus = [.5, .5] } = {}) {
  const img = tex.image, ia = img.width / img.height, pa = w / h;
  const S = ia > pa ? new THREE.Vector2(pa / ia, 1) : new THREE.Vector2(1, ia / pa);
  const O = new THREE.Vector2((1 - S.x) * focus[0], (1 - S.y) * (1 - focus[1]));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uS: { value: S }, uO: { value: O }, uRed: { value: red }, uLed: { value: led }, uOn: { value: 1 }, uNeg: { value: neg }, uFogN: { value: 30 }, uFogF: { value: 120 }, uBg: { value: new THREE.Color(BG) } },
    vertexShader: PHOTO_VS, fragmentShader: PHOTO_FS, toneMapped: false,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return m;
}

/* ---------- mundo ---------- */
export class World {
  constructor(canvas, { mobile }) {
    this.mobile = mobile;
    const R = this.R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    R.setClearColor(BG, 1);
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.toneMapping = THREE.NeutralToneMapping; R.toneMappingExposure = 1.05;
    R.localClippingEnabled = true;
    const S = this.scene = new THREE.Scene();
    S.fog = new THREE.Fog(BG, 30, 120);
    S.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), .04).texture;
    S.environmentIntensity = .22;
    this.cam = new THREE.PerspectiveCamera(32, 1, .05, 600);
    // luces: clave fría desde arriba, contraluz rojo detrás del producto, relleno frío lateral, luz de pórtico
    this.key = new THREE.DirectionalLight(0xf4f1ea, 2.1);
    this.rim = new THREE.SpotLight(0xc8102e, 150, 40, .55, .9, 1.4);
    this.cold = new THREE.DirectionalLight(0xbfd4ff, .9);
    this.gateL = new THREE.PointLight(0xce1141, 0, 22, 1.4);
    S.add(this.key, this.key.target, this.rim, this.rim.target, this.cold, this.cold.target, this.gateL);
    this.cut = new THREE.Plane(V(1, 0, 0), 1e4);
    this.clock = new LedClock();
    this.buildCourt();
    this.size();
  }

  size() {
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio, this.mobile ? 1 : 1.25) * (this.qScale || 1);
    this.R.setPixelRatio(dpr); this.R.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    if (this.mirror) this.mirror.getRenderTarget().setSize(Math.round(w * dpr * .5), Math.round(h * dpr * .5));
  }
  setQuality(k) { this.qScale = k; this.size(); }

  buildCourt() {
    const S = this.scene;
    // suelo: espejo a media resolución bajo una capa negra semitransparente (parqué lacado de noche)
    if (!this.mobile) {
      this.mirror = new Reflector(new THREE.PlaneGeometry(60, 460), { textureWidth: 512, textureHeight: 512, color: 0x9a9a9a, clipBias: .003 });
      this.mirror.rotation.x = -Math.PI / 2; this.mirror.position.set(0, -.002, -170);
      S.add(this.mirror);
    }
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(60, 460), new THREE.MeshBasicMaterial({ color: 0x070707, transparent: true, opacity: this.mobile ? 1 : .8, fog: true }));
    cover.rotation.x = -Math.PI / 2; cover.position.set(0, 0, -170);
    S.add(cover);
    // líneas de pista
    const lm = new THREE.MeshBasicMaterial({ color: 0xefede8, transparent: true, opacity: .5, depthWrite: false, fog: true, toneMapped: false });
    const line = (x, z, w, l) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), lm); m.rotation.x = -Math.PI / 2; m.position.set(x, .006, z); S.add(m); };
    line(-11, -170, .07, 460); line(11, -170, .07, 460);
    for (const z of [-18, -160, -320]) {
      line(0, z, 22, .07);
      const ring = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.67, 128), lm); ring.rotation.x = -Math.PI / 2; ring.position.set(0, .006, z); S.add(ring);
    }
    const ringR = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.27, 96), new THREE.MeshBasicMaterial({ color: 0xce1141, transparent: true, opacity: .9, depthWrite: false, toneMapped: false, fog: true }));
    ringR.rotation.x = -Math.PI / 2; ringR.position.set(0, .007, -320); S.add(ringR); this.otRing = ringR;
  }

  async load(onProgress) {
    const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(GLB, e => { if (e.total) onProgress(e.loaded / e.total); });
    g.scene.updateWorldMatrix(true, true);
    const v = V(), parts = { R: [], L: [] };
    g.scene.traverse(m => {
      if (!m.isMesh) return;
      const p = m.geometry.attributes.position, ix = m.geometry.index, a = [], b = [];
      for (let i = 0; i < ix.count; i += 3) {
        v.fromBufferAttribute(p, ix.getX(i)).applyMatrix4(m.matrixWorld);
        (v.x > 0 ? a : b).push(ix.getX(i), ix.getX(i + 1), ix.getX(i + 2));
      }
      for (const [side, list] of [['R', a], ['L', b]]) {
        const qg = new THREE.BufferGeometry();
        for (const n in m.geometry.attributes) qg.setAttribute(n, m.geometry.attributes[n]);
        qg.setIndex(new THREE.BufferAttribute(new Uint32Array(list), 1));
        parts[side].push({ q: qg, mat: m.material, M: m.matrixWorld.clone() });
      }
    });
    // sección roja: caras traseras visibles a través del plano de corte
    const capMat = new THREE.MeshBasicMaterial({ color: 0xc8102e, side: THREE.BackSide, clippingPlanes: [this.cut], toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    this.shoes = {};
    for (const side of ['R', 'L']) {
      const box = new THREE.Box3();
      parts[side].forEach(p => { const pos = p.q.attributes.position, idx = p.q.index; for (let i = 0; i < idx.count; i += 3) box.expandByPoint(v.fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(p.M)); });
      const c = box.getCenter(V()), size = box.getSize(V());
      const s = 3 / size.z; // longitud de la zapatilla = 3 unidades de mundo
      const T = new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z));
      const grp = new THREE.Group();
      parts[side].forEach(p => {
        const mat = p.mat.clone(); mat.clippingPlanes = [this.cut];
        const mesh = new THREE.Mesh(p.q, mat);
        mesh.matrixAutoUpdate = false; mesh.matrix.copy(T.clone().multiply(p.M)); mesh.frustumCulled = false;
        const cap = new THREE.Mesh(p.q, capMat);
        cap.matrixAutoUpdate = false; cap.matrix.copy(mesh.matrix); cap.frustumCulled = false; cap.visible = false;
        grp.add(mesh, cap);
      });
      grp.matrixAutoUpdate = false;
      this.scene.add(grp);
      // sombra de contacto
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.shadowTex(), transparent: true, depthWrite: false, opacity: .7, fog: true }));
      sh.rotation.x = -Math.PI / 2; this.scene.add(sh);
      this.shoes[side] = { grp, sh, size: size.multiplyScalar(s), caps: grp.children.filter((_, i) => i % 2) };
    }
    this.H2 = this.shoes.R.size.y / 2;
  }
  shadowTex() {
    if (this._sht) return this._sht;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d'), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.55, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    return (this._sht = new THREE.CanvasTexture(cv));
  }
  setShoe(side, p, q, visible = true) {
    const s = this.shoes[side];
    s.grp.visible = visible; s.grp.matrix.compose(p, q, V(1, 1, 1)); s.grp.matrixWorldNeedsUpdate = true;
    const lift = Math.max(0, p.y - this.H2);
    const fwd = V(0, 0, 1).applyQuaternion(q); const ang = Math.atan2(fwd.x, fwd.z);
    s.sh.visible = visible; s.sh.position.set(p.x, .008, p.z); s.sh.rotation.z = ang;
    s.sh.scale.set(1.5 + lift * .35, 3.6 + lift * .6, 1); s.sh.material.opacity = .75 * Math.exp(-lift * .9);
  }
  setCut(nx, ny, nz, d) {
    if (d === null) { this.cut.constant = 1e4; this.cut.normal.set(1, 0, 0); for (const k in this.shoes) this.shoes[k].caps.forEach(c => c.visible = false); return; }
    this.cut.normal.set(nx, ny, nz).normalize(); this.cut.constant = -d;
    for (const k in this.shoes) this.shoes[k].caps.forEach(c => c.visible = true);
  }
  setCamera(pos, look, fov, roll = 0, up = null) {
    const cam = this.cam;
    cam.position.copy(pos); cam.up.copy(up || V(0, 1, 0)); cam.lookAt(look);
    if (roll) cam.rotateZ(roll * D2R);
    if (Math.abs(cam.fov - fov) > 1e-3) { cam.fov = fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
  }
  toScreen(p) { const q = p.clone().project(this.cam); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight, q.z]; }
  render() { this.R.render(this.scene, this.cam); }
}
