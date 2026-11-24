// AIR JORDAN 1 · motor CGI del prototipo 02 (refinamiento)
// Tubería: escena principal con motion blur por subfotogramas + pasada de contornos fresnel
// -> estela persistente + resplandor -> composición aditiva sobre la página (premultiplied alpha).
// El GLB se lee desde assets/ sin modificarlo.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const GLB = 'assets/modelo/air_jordan_1.glb';
const D2R = Math.PI / 180;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const QUAD_VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    const R = this.R = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    R.autoClear = false;
    R.setClearColor(0x000000, 0);
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.toneMapping = THREE.NeutralToneMapping; // conserva el tono del rojo (ACES lo llevaba a rosa)
    this.scene = new THREE.Scene();
    this.scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
    this.cam = new THREE.PerspectiveCamera(26, 1, .5, 4000);
    this.key = new THREE.DirectionalLight(0xffffff, 2);
    this.fill = new THREE.DirectionalLight(0xffffff, .4);
    this.rimA = new THREE.DirectionalLight(0xc8102e, 3);
    this.rimB = new THREE.DirectionalLight(0xcfe0ff, 2);
    for (const l of [this.key, this.fill, this.rimA, this.rimB]) this.scene.add(l, l.target);
    // suelo negro brillante: oscurece el reflejo con la distancia y añade sombra de contacto
    this.floorMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, toneMapped: false,
      uniforms: { uC: { value: V(0, 0, 0) }, uR: { value: 20 } },
      vertexShader: 'varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
      fragmentShader: 'uniform vec3 uC;uniform float uR;varying vec3 vW;void main(){float d=length((vW-uC).xz)/uR;float a=mix(.52,.985,smoothstep(.2,1.5,d));float sh=smoothstep(.8,0.,d)*.5;gl_FragColor=vec4(vec3(.01,.01,.012),clamp(a+sh,0.,1.));}',
    });
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), this.floorMat);
    this.floor.rotation.x = -Math.PI / 2; this.floor.visible = false; this.floor.frustumCulled = false;
    this.scene.add(this.floor);
    // material de contornos: fresnel coloreado según el lado de la luz (rojo / frío)
    this.rimMat = new THREE.ShaderMaterial({
      uniforms: { uRed: { value: new THREE.Color('#c8102e') }, uCold: { value: new THREE.Color('#bcd6ff') }, uGain: { value: 1 }, uPow: { value: 2.4 }, uSide: { value: new THREE.Vector2(1, .2) } },
      vertexShader: 'varying vec3 vN;varying vec3 vV;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform vec3 uRed,uCold;uniform vec2 uSide;uniform float uGain,uPow;varying vec3 vN;varying vec3 vV;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float f=pow(1.-clamp(dot(n,vV),0.,1.),uPow);float s=smoothstep(-.4,.4,dot(normalize(n.xy+1e-4),normalize(uSide)));gl_FragColor=vec4(mix(uCold,uRed,s)*f*uGain,1.);}',
      side: THREE.DoubleSide, toneMapped: false,
    });
    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.quad.frustumCulled = false; this.quadScene.add(this.quad);
    const q = (u, fs, extra = {}) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: QUAD_VS, fragmentShader: fs, depthTest: false, depthWrite: false, toneMapped: false, ...extra });
    this.mAdd = q({ t: { value: null }, k: { value: 1 } }, 'uniform sampler2D t;uniform float k;varying vec2 vUv;void main(){gl_FragColor=texture2D(t,vUv)*k;}', { blending: THREE.AdditiveBlending, transparent: true });
    this.mTrail = q({ prev: { value: null }, cur: { value: null }, decay: { value: .9 }, shift: { value: new THREE.Vector2() } },
      'uniform sampler2D prev,cur;uniform float decay;uniform vec2 shift;varying vec2 vUv;void main(){vec4 p=texture2D(prev,vUv-shift)*decay;gl_FragColor=max(p,texture2D(cur,vUv));}');
    this.mBlur = q({ t: { value: null }, dir: { value: new THREE.Vector2() } },
      'uniform sampler2D t;uniform vec2 dir;varying vec2 vUv;void main(){vec4 c=texture2D(t,vUv)*.2270;c+=(texture2D(t,vUv+dir*1.3846)+texture2D(t,vUv-dir*1.3846))*.3162;c+=(texture2D(t,vUv+dir*3.2308)+texture2D(t,vUv-dir*3.2308))*.0703;gl_FragColor=c;}');
    this.mComp = new THREE.ShaderMaterial({
      uniforms: { tMain: { value: null }, trail: { value: null }, glow: { value: null }, kT: { value: 1 }, kG: { value: 1 },
        hC: { value: new THREE.Vector2(.5, .5) }, hR: { value: .4 }, hA: { value: 0 }, asp: { value: 1 }, flash: { value: 0 } },
      vertexShader: QUAD_VS,
      fragmentShader: `uniform sampler2D tMain,trail,glow;uniform float kT,kG,hR,hA,asp,flash;uniform vec2 hC;varying vec2 vUv;
        void main(){vec4 m=texture2D(tMain,vUv);float out_=1.-m.a;
        vec3 add=texture2D(trail,vUv).rgb*kT*(.15+.85*out_)+texture2D(glow,vUv).rgb*kG*(.35+.65*out_);
        vec2 d=(vUv-hC)*vec2(asp,1.);float r=length(d)/hR;
        vec3 halo=(vec3(.85,.1,.27)*exp(-r*r*6.)*.12+vec3(.62,.03,.17)*exp(-r*r*1.8)*.26)*hA*out_;
        gl_FragColor=vec4(m.rgb+add+halo+vec3(.81,.07,.26)*flash,m.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }`,
      depthTest: false, depthWrite: false, toneMapped: true, blending: THREE.NoBlending,
    });
    this.prev = null;
    this.size();
  }

  // calidad adaptativa: 2 = completa, 1 = media, 0 = baja (menos subfotogramas y menos resolución)
  setQuality(q) {
    if (q === this.q) return;
    this.q = q; this.maxSub = [0, 1, 2][q]; this.dprCap = [.85, 1, 1.25][q];
    this.size();
  }
  size() {
    if (this.q === undefined) { this.q = 2; this.maxSub = 2; this.dprCap = 1.25; }
    const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio, this.dprCap);
    this.R.setPixelRatio(dpr); this.R.setSize(w, h, false);
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    const W = Math.round(w * dpr), H = Math.round(h * dpr);
    const mk = (s, ms = 0) => new THREE.WebGLRenderTarget(Math.max(2, Math.round(W * s)), Math.max(2, Math.round(H * s)), { type: THREE.HalfFloatType, samples: ms });
    for (const k of ['rtAcc', 'rtSub', 'rtLight', 'rtTA', 'rtTB', 'rtB1', 'rtB2']) if (this[k]) this[k].dispose();
    this.rtAcc = mk(1); this.rtSub = mk(1, 4);
    this.rtLight = mk(.5); this.rtTA = mk(.5); this.rtTB = mk(.5); this.rtB1 = mk(.25); this.rtB2 = mk(.25);
    this.asp = w / h;
    this.prev = null;
  }

  async load(onProgress) {
    const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(GLB, e => { if (e.total) onProgress(e.loaded / e.total); });
    g.scene.updateWorldMatrix(true, true);
    const v = new THREE.Vector3();
    const parts = { R: [], L: [] };
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
    this.shoes = {};
    for (const side of ['R', 'L']) {
      const box = new THREE.Box3();
      parts[side].forEach(p => { const pos = p.q.attributes.position, idx = p.q.index; for (let i = 0; i < idx.count; i += 3) box.expandByPoint(v.fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(p.M)); });
      const c = box.getCenter(new THREE.Vector3());
      const T = new THREE.Matrix4().makeTranslation(-c.x, -c.y, -c.z);
      const grp = new THREE.Group();
      parts[side].forEach(p => {
        const mesh = new THREE.Mesh(p.q, p.mat);
        mesh.matrixAutoUpdate = false; mesh.matrix.copy(T.clone().multiply(p.M)); mesh.frustumCulled = false;
        grp.add(mesh);
      });
      grp.matrixAutoUpdate = false; grp.visible = false;
      this.scene.add(grp);
      this.shoes[side] = { grp, size: box.getSize(new THREE.Vector3()) };
    }
    this.len = this.shoes.R.size.z;
  }

  // ---------- cámara y poses ----------
  setCamera(c) {
    const cam = this.cam;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    if (c.roll) cam.rotateZ(c.roll * D2R);
    if (cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    cam.updateMatrixWorld();
    this.focusDist = cam.position.distanceTo(V(...c.look));
  }
  screenToWorld(x, y, dist) {
    const ndc = V((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1, .5).unproject(this.cam);
    const dir = ndc.sub(this.cam.position).normalize();
    const fwd = new THREE.Vector3(); this.cam.getWorldDirection(fwd);
    return this.cam.position.clone().add(dir.multiplyScalar(dist / dir.dot(fwd)));
  }
  worldToScreen(p) { const q = p.clone().project(this.cam); return [(q.x + 1) / 2 * innerWidth, (1 - q.y) / 2 * innerHeight, q.z]; }
  static orient(yaw, tilt, roll) {
    const qy = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), yaw * D2R);
    const qx = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), tilt * D2R);
    const qz = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), roll * D2R);
    return qz.multiply(qx).multiply(qy);
  }
  // pose anclada a pantalla: (x,y) px y longitud visible en px a la distancia de enfoque
  pose(x, y, lenPx, q, local = null, dist = null) {
    const d = dist ?? this.focusDist;
    const worldPerPx = 2 * d * Math.tan(this.cam.fov * D2R / 2) / innerHeight;
    const s = (lenPx * worldPerPx) / this.len;
    const p = this.screenToWorld(x, y, d);
    if (local) p.sub(local.clone().multiplyScalar(s).applyQuaternion(q));
    return { p, q: q.clone(), s };
  }
  static mix(a, b, t) {
    if (!a) return b; if (!b) return a;
    if (t <= 0) return a; if (t >= 1) return b;
    return { p: a.p.clone().lerp(b.p, t), q: a.q.clone().slerp(b.q, t), s: a.s + (b.s - a.s) * t };
  }
  localPoint(fr) { const s = this.shoes.R.size; return V(fr[0] * s.x, fr[1] * s.y, fr[2] * s.z); }
  matrixOf(T) { return new THREE.Matrix4().compose(T.p, T.q, V(T.s, T.s, T.s)); }

  lights(L, focus) {
    const set = (l, c) => { l.color.set(c[0]); l.intensity = c[1]; l.position.copy(focus).add(V(...c[2]).normalize().multiplyScalar(200)); l.target.position.copy(focus); l.target.updateMatrixWorld(); };
    set(this.key, L.key); set(this.fill, L.fill); set(this.rimA, L.rimA); set(this.rimB, L.rimB);
    // sin halo ni contorno pintados, los contraluces reales llevan todo el recorte: más intensos y un poco de relleno de entorno
    this.rimA.intensity *= 1.7; this.rimB.intensity *= 1.45; this.fill.intensity = Math.max(this.fill.intensity, .12);
    this.scene.environmentIntensity = L.env;
    this.R.toneMappingExposure = L.exp;
    this.rimMat.uniforms.uRed.value.set(L.rimA[0]);
    this.rimMat.uniforms.uCold.value.set(L.rimB[0]);
    // el lado rojo del contorno sigue la dirección real de la luz roja, vista desde la cámara
    const a = V(...L.rimA[2]).normalize().transformDirection(this.cam.matrixWorldInverse);
    this.rimMat.uniforms.uSide.value.set(a.x || .001, a.y);
  }

  drawList(list, override = null) {
    this.scene.overrideMaterial = override;
    for (const it of list) {
      const g = this.shoes[it.side || 'R'].grp;
      g.visible = true;
      g.matrix.copy(it.M || this.matrixOf(it.T)); g.updateMatrixWorld(true);
      if (override) this.rimMat.uniforms.uGain.value = it.g ?? 1;
      this.R.render(this.scene, this.cam);
      g.visible = false;
    }
    this.scene.overrideMaterial = null;
  }
  quadTo(target, mat, clear = true) {
    this.quad.material = mat;
    this.R.setRenderTarget(target);
    if (clear) this.R.clear();
    this.R.render(this.quadScene, this.quadCam);
  }

  // frame: { inst:[{side,T,g}], ghosts:[{side,T,g}], fx:{blur,trail,glow,rim,decay,shift,halo,flash,mirror} }
  render(frame, dt) {
    const R = this.R, fx = frame.fx, inst = frame.inst || [];
    this.shoes.R.grp.visible = this.shoes.L.grp.visible = false;
    // 1 · escena principal con motion blur por subfotogramas
    R.setRenderTarget(this.rtAcc); R.clear();
    const prev = this.prev;
    const n = prev && prev.length === inst.length && fx.blur > 0 ? Math.round(1 + fx.blur * this.maxSub) : 1;
    // sin instancias no se toca rtSub: un clear() no resuelve el MSAA y la textura conservaría el último plano
    for (let i = 0; i < (inst.length ? n : 0); i++) {
      const t = n === 1 ? 1 : (i + .5) / n;
      const list = n === 1 ? inst : inst.map((it, k) => ({ side: it.side, T: Stage.mix(prev[k], it.T, .3 + .7 * t) }));
      R.setRenderTarget(this.rtSub); R.clear();
      if (fx.mirror) {
        const M = new THREE.Matrix4().makeTranslation(0, 2 * fx.mirror.y, 0).multiply(new THREE.Matrix4().makeScale(1, -1, 1));
        this.drawList(list.map(it => ({ side: it.side, M: M.clone().multiply(this.matrixOf(it.T)) })));
        this.floor.visible = true; this.floor.position.y = fx.mirror.y;
        this.floorMat.uniforms.uC.value.copy(fx.mirror.c); this.floorMat.uniforms.uR.value = fx.mirror.r;
        R.render(this.scene, this.cam); this.floor.visible = false;
      }
      this.drawList(list);
      this.mAdd.uniforms.t.value = this.rtSub.texture; this.mAdd.uniforms.k.value = 1 / n;
      this.quadTo(this.rtAcc, this.mAdd, false);
    }
    this.prev = inst.map(it => it.T);
    // 2 · pasada de contornos: producto + duplicados
    R.setRenderTarget(this.rtLight); R.clear();
    const rim = fx.rim ?? 1;
    if (rim > 0 || (fx.glow ?? 0) > 0) this.drawList(inst.map(it => ({ side: it.side, T: it.T, g: rim * (it.g ?? 1) })).concat((frame.ghosts || []).map(g => ({ ...g, g: rim * (g.g ?? 1) }))), this.rimMat);
    // 3 · estela persistente (sigue al desplazamiento real del contorno)
    // (sin estela no se calcula: en la v3 el desplazamiento es solo obturador)
    if (fx.trail > 0) {
      const a = this.rtTA, b = this.rtTB;
      this.mTrail.uniforms.prev.value = a.texture; this.mTrail.uniforms.cur.value = this.rtLight.texture;
      this.mTrail.uniforms.decay.value = Math.pow(fx.decay ?? .88, dt * 60);
      this.mTrail.uniforms.shift.value.set(...(fx.shift || [0, 0]));
      this.quadTo(b, this.mTrail); this.rtTA = b; this.rtTB = a;
    }
    // 4 · resplandor
    const bl = (src, dst, x, y) => { this.mBlur.uniforms.t.value = src.texture; this.mBlur.uniforms.dir.value.set(x / this.rtB1.width, y / this.rtB1.height); this.quadTo(dst, this.mBlur); };
    if ((fx.glow ?? 0) > 0) { bl(this.rtLight, this.rtB1, 1.5, 0); bl(this.rtB1, this.rtB2, 0, 1.5); bl(this.rtB2, this.rtB1, 3.5, 0); bl(this.rtB1, this.rtB2, 0, 3.5); }
    // 5 · composición sobre la página
    const u = this.mComp.uniforms;
    u.tMain.value = this.rtAcc.texture; u.trail.value = this.rtTA.texture; u.glow.value = this.rtB2.texture;
    u.kT.value = fx.trail || 0; u.kG.value = fx.glow ?? .9; u.asp.value = this.asp; u.flash.value = fx.flash || 0;
    if (fx.halo) { u.hC.value.set(fx.halo[0], 1 - fx.halo[1]); u.hR.value = fx.halo[2]; u.hA.value = fx.halo[3]; } else u.hA.value = 0;
    R.setRenderTarget(null); R.clear();
    this.quad.material = this.mComp; R.render(this.quadScene, this.quadCam);
  }
}

// iluminación: [color, intensidad, dirección]
export const LIGHTS = {
  hero:   { key: ['#f6f3f2', 1.3, [-.6, .8, .7]], fill: ['#3a3f50', .2, [.3, -.2, 1]], rimA: ['#c8102e', 6.5, [1, .2, -.7]], rimB: ['#d6e4ff', 4, [-1, .5, -.6]], env: .28, exp: 1.05 },
  sil:    { key: ['#000000', 0, [0, .5, 1]], fill: ['#000000', 0, [0, -1, .5]], rimA: ['#c8102e', 11, [.55, .25, -1.3]], rimB: ['#dfe8ff', 7.5, [-.55, .45, -1.3]], env: 0, exp: 1.1 },
  dark:   { key: ['#f1eeee', .35, [0, .6, 1]], fill: ['#1b1d26', .12, [0, -1, .5]], rimA: ['#c8102e', 8, [.9, .2, -.8]], rimB: ['#cfe0ff', 5, [-.9, .4, -.7]], env: .1, exp: 1.1 },
  sole:   { key: ['#f2eeee', 1.0, [0, .3, 1]], fill: ['#26201c', .2, [0, -1, .3]], rimA: ['#c8102e', 7, [0, 1, -.6]], rimB: ['#cfe0ff', 3.5, [-1, -.2, -.5]], env: .2, exp: 1.1 },
  graze:  { key: ['#e8f0ff', 2.8, [-1, .12, .2]], fill: ['#20232e', .12, [1, 0, .5]], rimA: ['#c8102e', 6, [1, .3, -.6]], rimB: ['#cfe0ff', 3, [-.4, 1, -.6]], env: .1, exp: 1.05 },
  studio: { key: ['#ffffff', 3.2, [-.25, 1, .35]], fill: ['#30333d', .25, [.6, .2, 1]], rimA: ['#c8102e', 6, [1, .25, -.8]], rimB: ['#dfe8ff', 4.5, [-1, .35, -.7]], env: .26, exp: 1.0 },
  close:  { key: ['#f4f1f1', .45, [0, .5, 1]], fill: ['#20232e', .15, [0, -1, .4]], rimA: ['#c8102e', 8.5, [1, .3, -.7]], rimB: ['#dfe8ff', 5.5, [-1, .35, -.7]], env: .12, exp: 1.1 },
};
export function mixLights(a, b, t) {
  if (t <= 0) return a; if (t >= 1) return b;
  const C = (x, y) => '#' + new THREE.Color(x).lerp(new THREE.Color(y), t).getHexString();
  const N = (x, y) => x + (y - x) * t;
  const L = k => [C(a[k][0], b[k][0]), N(a[k][1], b[k][1]), a[k][2].map((v, i) => N(v, b[k][2][i]))];
  return { key: L('key'), fill: L('fill'), rimA: L('rimA'), rimB: L('rimB'), env: N(a.env, b.env), exp: N(a.exp, b.exp) };
}
// barrido de luz: la luz de contorno roja gira alrededor del producto
export function sweep(L, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return { ...L, rimA: [L.rimA[0], L.rimA[1], [c, .25 + .2 * s, -Math.abs(s) - .3]] };
}
