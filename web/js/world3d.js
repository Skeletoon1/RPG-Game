"use strict";
// ============================================================================
//  3D ADVENTURE (beta) — real-time action, third-person, WASD + mouse-look.
//  Visual style: bright, cheerful stylized/toon town (Fiesta + WoW inspired).
//  Built on Three.js (vendored). Reuses CLASSES from data.js for stats/colors.
// ============================================================================
if (typeof THREE === "undefined") {
  document.getElementById("start").innerHTML =
    "<h1>3D failed to load</h1><div class='tag'>Three.js didn't load. Try the 2D game from the menu.</div>";
}

let renderer, scene, camera, clock;
let player, hero, playerOrb, playerOrbLight, motes;
const enemies = [], projectiles = [], floats = [], flames = [];
const keys = {};
let yaw = 0, pitch = 0.18, locked = false, running = false, paused = false, T = 0;
const W = () => window.innerWidth, H = () => window.innerHeight;
const TMP = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const WORLD = 95;
let GLOW, GRAD;   // shared glow texture + toon gradient map

const hud = document.getElementById("hud");
const startOv = document.getElementById("start");
const pauseOv = document.getElementById("pause");
const deadOv = document.getElementById("dead");

// ---------------------------------------------------------------------------
// stylized material helpers
// ---------------------------------------------------------------------------
function makeGlow() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.75)");
  grd.addColorStop(0.6, "rgba(255,255,255,0.18)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}
function makeGradientMap() {
  const data = new Uint8Array([40, 95, 165, 255]); // 4-step toon ramp (deeper shadows = more form)
  const t = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function ctex(c) { const t = new THREE.CanvasTexture(c); if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding; return t; }
function toon(color, emissive, eInt, map) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: GRAD });
  if (map) m.map = map;
  if (emissive != null) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = eInt == null ? 1 : eInt; }
  return m;
}
function shade(c, f) { let r = Math.min(255, (c >> 16 & 255) * f) | 0, g = Math.min(255, (c >> 8 & 255) * f) | 0, b = Math.min(255, (c & 255) * f) | 0; return (r << 16) | (g << 8) | b; }
function canvas2d(s) { const c = document.createElement("canvas"); c.width = c.height = s; return [c, c.getContext("2d")]; }
function makeGrassTexture() {
  const [c, g] = canvas2d(128); g.fillStyle = "#5fa247"; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1100; i++) { const s = Math.random(); g.fillStyle = s < 0.5 ? "rgba(70,140,60,0.55)" : s < 0.8 ? "rgba(120,185,95,0.5)" : "rgba(55,115,58,0.6)"; g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  return ctex(c);
}
function makePlazaTexture() {
  const [c, g] = canvas2d(512); g.fillStyle = "#d8cba2"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(120,105,80,0.6)"; g.lineWidth = 3;
  for (let i = 0; i <= 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  for (let i = 0; i < 500; i++) { g.fillStyle = "rgba(0,0,0," + (Math.random() * 0.05) + ")"; g.fillRect(Math.random() * 512, Math.random() * 512, 7, 7); }
  g.translate(256, 256);
  g.strokeStyle = "rgba(190,160,70,0.95)"; g.lineWidth = 5;
  [220, 160, 96].forEach(r => { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); });
  g.fillStyle = "rgba(190,160,70,0.9)";
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) { g.save(); g.rotate(a); g.fillRect(160, -5, 44, 10); g.restore(); }
  g.strokeStyle = "rgba(150,120,210,0.8)"; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.stroke();
  return ctex(c);
}
function makeCloudTexture() {
  const [c, g] = canvas2d(128);
  for (let i = 0; i < 7; i++) { const x = 30 + Math.random() * 68, y = 45 + Math.random() * 35, r = 18 + Math.random() * 30; const grd = g.createRadialGradient(x, y, 0, x, y, r); grd.addColorStop(0, "rgba(255,255,255,0.95)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  return ctex(c);
}
function addClouds() {
  const tex = makeCloudTexture();
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.9, depthWrite: false }));
    const sz = THREE.MathUtils.randFloat(45, 100); s.scale.set(sz, sz * 0.58, 1);
    s.position.set(rand(420), THREE.MathUtils.randFloat(70, 140), rand(420)); scene.add(s);
  }
}
function box(w, h, d, c, e, ei) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(c, e, ei)); }
function sph(r, c, e, ei) { return new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), toon(c, e, ei)); }
function cone(r, h, c, e, ei) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), toon(c, e, ei)); }
function cyl(rt, rb, h, c) { return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12), toon(c)); }
function glowSprite(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.set(size, size, 1); return s;
}
function shadowCasters(group) { group.traverse(o => { if (o.isMesh) o.castShadow = true; }); }
function hex(s) { return parseInt(s.slice(1), 16); }

// ---------------------------------------------------------------------------
// glTF model system (real authored animated models, with primitive fallback)
// ---------------------------------------------------------------------------
const PARSED = {};
function b64ToBuf(b64) { const bin = atob(b64); const n = bin.length; const a = new Uint8Array(n); for (let i = 0; i < n; i++) a[i] = bin.charCodeAt(i); return a.buffer; }
function parseModels(done) {
  if (typeof THREE === "undefined" || !THREE.GLTFLoader || typeof window === "undefined" || !window.MODELS) { done && done(); return; }
  const loader = new THREE.GLTFLoader(); const names = Object.keys(window.MODELS); let n = names.length;
  if (!n) { done && done(); return; }
  names.forEach(name => {
    try {
      loader.parse(b64ToBuf(window.MODELS[name]), "", g => { PARSED[name] = { scene: g.scene, animations: g.animations }; if (--n === 0) done && done(); },
        () => { if (--n === 0) done && done(); });
    } catch (e) { if (--n === 0) done && done(); }
  });
}
function pickClip(clips, keys) {
  if (!clips || !clips.length) return null;
  for (const k of keys) { const c = clips.find(cl => cl.name.toLowerCase().indexOf(k) >= 0); if (c) return c; }
  return clips[0];
}
function fitModel(root, targetH) {
  const box = new THREE.Box3().setFromObject(root); const size = new THREE.Vector3(); box.getSize(size);
  const s = (targetH || 2.2) / (size.y || 1); root.scale.setScalar(s);
  const b2 = new THREE.Box3().setFromObject(root); const c = new THREE.Vector3(); b2.getCenter(c);
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= b2.min.y;
}
// returns a Group wrapper {userData:{mixer,actions,play}} or null if model unavailable
function makeModelChar(modelName, height, states, faceFix) {
  const src = PARSED[modelName];
  if (!src || !THREE.SkeletonUtils || !THREE.AnimationMixer) return null;
  const root = THREE.SkeletonUtils.clone(src.scene);
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  fitModel(root, height);
  if (faceFix) root.rotation.y = Math.PI;
  const g = new THREE.Group(); g.add(root);
  const mixer = new THREE.AnimationMixer(root); const clips = src.animations || [];
  const map = states || { idle: ["idle", "survey", "stand"], walk: ["walk"], run: ["run", "fly", "parrot", "flamingo"] };
  const actions = {};
  for (const st in map) { const clip = pickClip(clips, map[st]); if (clip) actions[st] = mixer.clipAction(clip); }
  g.userData = {
    mixer, actions, cur: null,
    play(name) { const u = g.userData; const nx = u.actions[name] || u.actions.idle; if (!nx || u.cur === name) return; if (u.cur && u.actions[u.cur]) u.actions[u.cur].fadeOut(0.18); nx.reset().fadeIn(0.18).play(); u.cur = name; },
  };
  g.userData.play("idle");
  return g;
}
function charAnim(g, name) { if (g && g.userData && g.userData.play) g.userData.play(name); }
function charTick(g, dt) { if (g && g.userData && g.userData.mixer) g.userData.mixer.update(dt); }
// place a static (non-animated) model at x,z with a fixed scale; null if unavailable
function placeStatic(key, x, z, scale, rotY) {
  const src = PARSED[key]; if (!src || !src.scene || !src.scene.clone) return null;
  const root = src.scene.clone(true); root.scale.setScalar(scale || 4);
  const box = new THREE.Box3().setFromObject(root); const c = new THREE.Vector3(); box.getCenter(c);
  root.position.set(-c.x, -box.min.y, -c.z);  // center on origin, bottom on ground
  root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const g = new THREE.Group(); g.add(root); g.position.set(x, 0, z); if (rotY) g.rotation.y = rotY;
  scene.add(g); return g;
}
function buildWorld() { buildTown(); buildScenery(); addMotes(); }
const ENV_SCALE = 4;

// ---------------------------------------------------------------------------
// chibi characters
// ---------------------------------------------------------------------------
function makeWeapon(type, color) {
  const w = new THREE.Group();
  if (type === "staff") {
    const shaft = cyl(0.045, 0.055, 1.7, 0x6a4a2a); shaft.position.y = 1.15;
    const orb = sph(0.17, color, color, 1.5); orb.position.y = 2.05; const gl = glowSprite(color, 1.1); gl.position.y = 2.05;
    w.add(shaft, orb, gl); w.position.set(0.52, 0, 0.12);
  } else if (type === "bow") {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 18, Math.PI * 1.25), toon(0x6a4a2a));
    arc.position.set(0.58, 1.2, 0.1); arc.rotation.z = Math.PI / 2; w.add(arc);
  } else if (type === "sword") {
    const blade = box(0.09, 1.05, 0.16, 0xdfe6f0); blade.position.y = 1.5;
    const guard = box(0.34, 0.1, 0.22, 0xc8a83c); guard.position.y = 0.98; const grip = cyl(0.05, 0.05, 0.32, 0x3a2a18); grip.position.y = 0.78;
    w.add(blade, guard, grip); w.position.set(0.52, 0, 0.12);
  } else if (type === "dagger") {
    const blade = box(0.07, 0.5, 0.12, 0xdfe6f0); blade.position.y = 1.0; w.add(blade); w.position.set(0.5, 0, 0.12);
  } else if (type === "club") {
    const handle = cyl(0.06, 0.07, 0.7, 0x4a3320); handle.position.y = 0.9; const head = box(0.3, 0.4, 0.3, 0x5a4330); head.position.y = 1.4;
    w.add(handle, head); w.position.set(0.5, 0, 0.12);
  }
  return w;
}
function addOutline(group) {
  const mat = new THREE.MeshBasicMaterial({ color: 0x20121f, side: THREE.BackSide });
  const kids = group.children.slice();
  for (const m of kids) {
    if (!m.geometry) continue;
    const o = new THREE.Mesh(m.geometry, mat);
    o.position.set(m.position.x, m.position.y, m.position.z);
    o.rotation.set(m.rotation.x, m.rotation.y, m.rotation.z);
    o.scale.set(m.scale.x * 1.09, m.scale.y * 1.09, m.scale.z * 1.09);
    o.castShadow = false; group.add(o);
  }
}
function makeChibi(opt) {
  opt = opt || {};
  const g = new THREE.Group();
  const skin = opt.skin || 0xf0c49e, body = opt.body || 0x8a5acb, hair = opt.hair || 0x6a3a2a, pants = opt.pants || 0x39354f;
  // boots + legs
  const b1 = box(0.26, 0.22, 0.34, 0x2a2230); b1.position.set(-0.16, 0.11, 0.03); const b2 = b1.clone(); b2.position.x = 0.16; g.add(b1, b2);
  const l1 = box(0.22, 0.72, 0.24, pants); l1.position.set(-0.16, 0.56, 0); const l2 = l1.clone(); l2.position.x = 0.16; g.add(l1, l2);
  // torso (tunic) + trims
  const torso = box(0.62, 0.82, 0.38, body); torso.position.y = 1.2; g.add(torso);
  const collar = box(0.66, 0.16, 0.42, shade(body, 1.25)); collar.position.y = 1.57; g.add(collar);
  const belt = box(0.66, 0.1, 0.42, 0x2a2018); belt.position.y = 0.88; g.add(belt);
  // arms + hands
  const a1 = box(0.18, 0.7, 0.2, body); a1.position.set(-0.41, 1.22, 0); const a2 = a1.clone(); a2.position.x = 0.41; g.add(a1, a2);
  const hand1 = sph(0.12, skin); hand1.position.set(-0.41, 0.86, 0.04); const hand2 = hand1.clone(); hand2.position.x = 0.41; g.add(hand1, hand2);
  // head + spiky hair
  const head = sph(0.44, skin); head.position.y = 2.04; g.add(head);
  const cap = sph(0.47, hair); cap.position.y = 2.14; cap.scale.set(1, 0.72, 1); g.add(cap);
  for (let i = 0; i < 7; i++) { const sp = cone(0.13, 0.36, hair); const a = (i / 7) * Math.PI * 2; sp.position.set(Math.cos(a) * 0.32, 2.22 + Math.random() * 0.08, Math.sin(a) * 0.26); sp.rotation.set((Math.random() - 0.5) * 0.7, a, (Math.random() - 0.5) * 0.7); g.add(sp); }
  // pointed ears
  const r1 = cone(0.1, 0.28, skin); r1.position.set(-0.43, 2.06, 0); r1.rotation.z = 1.3; const r2 = r1.clone(); r2.position.x = 0.43; r2.rotation.z = -1.3; g.add(r1, r2);
  // big anime eyes (white + iris)
  const w1 = sph(0.1, 0xffffff); w1.position.set(-0.17, 2.03, 0.37); w1.scale.set(1, 1.3, 0.55); const w2 = w1.clone(); w2.position.x = 0.17; g.add(w1, w2);
  const irisC = opt.eyeGlow || 0x35506a;
  const i1 = sph(0.055, irisC, opt.eyeGlow || null, 1.2); i1.position.set(-0.17, 2.0, 0.45); const i2 = i1.clone(); i2.position.x = 0.17; g.add(i1, i2);
  if (opt.eyeGlow) { const ge = glowSprite(opt.eyeGlow, 0.55); ge.position.set(0, 2.02, 0.5); g.add(ge); }
  if (opt.horns) { const h1 = cone(0.14, 0.44, 0x55121a); h1.position.set(-0.28, 2.5, 0); h1.rotation.z = 0.32; const h2 = h1.clone(); h2.position.x = 0.28; h2.rotation.z = -0.32; g.add(h1, h2); }
  if (opt.cape) { const cape = box(0.66, 1.3, 0.08, opt.cape); cape.position.set(0, 1.18, -0.24); g.add(cape); }
  if (opt.weapon) g.add(makeWeapon(opt.weapon, body));
  addOutline(g);
  shadowCasters(g);
  if (opt.scale) g.scale.setScalar(opt.scale);
  return g;
}

// ---------------------------------------------------------------------------
// scene
// ---------------------------------------------------------------------------
function init() {
  const canvas = document.getElementById("c3d");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe8ff, 130, 520);
  camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 1200);
  clock = new THREE.Clock();
  GLOW = makeGlow(); GRAD = makeGradientMap();

  // --- bright day sky dome ---
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x3f86d8) }, mid: { value: new THREE.Color(0x9fd0ff) }, bot: { value: new THREE.Color(0xeaf6ff) } },
    vertexShader: "varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ",
    fragmentShader: "varying vec3 vW; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; void main(){ float h=clamp(normalize(vW).y,-1.0,1.0); vec3 c = h>0.15 ? mix(mid,top,smoothstep(0.15,0.9,h)) : mix(bot,mid,smoothstep(-0.1,0.15,h)); gl_FragColor=vec4(c,1.0);} ",
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(560, 32, 16), skyMat));
  addClouds();

  // --- bright daylight ---
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88aa66, 0.55));
  const sun = new THREE.DirectionalLight(0xfff4d8, 1.15);
  sun.position.set(60, 95, 45); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 340;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));

  // --- grassy ground (textured + gently undulating) ---
  const grass = makeGrassTexture(); grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(42, 42);
  const gGeo = new THREE.PlaneGeometry(WORLD * 2.4, WORLD * 2.4, 64, 64);
  const pos = gGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, (Math.sin(x * 0.05) * Math.cos(y * 0.045) + Math.sin(x * 0.12 + y * 0.09) * 0.5) * 0.7); }
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, toon(0xffffff, null, 1, grass)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // town & scenery are built in buildWorld() after models finish loading

  window.addEventListener("resize", onResize);
  document.addEventListener("keydown", e => { keys[e.code] = true; });
  document.addEventListener("keyup", e => { keys[e.code] = false; });
  canvas.addEventListener("mousedown", e => { if (locked && e.button === 0) basicAttack(); });
  document.addEventListener("mousemove", e => {
    if (!locked) return;
    yaw -= e.movementX * 0.0025;
    pitch = THREE.MathUtils.clamp(pitch - e.movementY * 0.0022, -0.15, 0.7);
  });
  document.addEventListener("pointerlockchange", () => {
    locked = (document.pointerLockElement === canvas);
    if (locked) hidePause();
    else if (hero && hero.hp > 0 && deadOv.classList.contains("hidden")) showPause();
  });
}
function rand(half) { return THREE.MathUtils.randFloatSpread(half * 2); }
function onResize() { camera.aspect = W() / H(); camera.updateProjectionMatrix(); renderer.setSize(W(), H()); }

function addStars() {
  const n = 600, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 380, th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 0.9 + 0.05);
    a[i * 3] = r * Math.sin(ph) * Math.cos(th); a[i * 3 + 1] = Math.abs(r * Math.cos(ph)); a[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
  }
  g.setAttribute("position", new THREE.BufferAttribute(a, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfd6ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85 })));
}
function addMotes() {
  const n = 220, g = new THREE.BufferGeometry(), a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = rand(WORLD); a[i * 3 + 1] = Math.random() * 14 + 1; a[i * 3 + 2] = rand(WORLD); }
  g.setAttribute("position", new THREE.BufferAttribute(a, 3));
  motes = new THREE.Points(g, new THREE.PointsMaterial({ map: GLOW, color: 0xbb8cff, size: 1.1, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(motes);
}

function signpost(x, z, rot) {
  const g = new THREE.Group();
  const post = cyl(0.1, 0.12, 2.0, 0x6a4a2a); post.position.y = 1.0;
  const board = box(1.5, 0.7, 0.12, 0x9a7038); board.position.y = 1.7;
  g.add(post, board); g.position.set(x, 0, z); if (rot) g.rotation.y = rot; shadowCasters(g); scene.add(g);
}
// closed fence perimeter around the town, with the gate set into the front wall (corners connected)
function buildFence() {
  const FX = 20, ZN = -19, ZS = 44, ST = 3.6;     // bounds + tiling step (slight overlap = no gaps)
  function seg(x, z, rot) {
    if (placeStatic("fence_wood", x, z, ENV_SCALE, rot)) return;
    const f = box(3.4, 1.3, 0.25, 0x6a4a2a); f.position.set(x, 0.65, z); if (rot) f.rotation.y = rot; f.castShadow = true; scene.add(f);
  }
  for (let z = ZN; z <= ZS + 0.01; z += ST) { seg(-FX, z, 0); seg(FX, z, 0); }       // left & right walls (along z)
  for (let x = -FX; x <= FX + 0.01; x += ST) seg(x, ZN, Math.PI / 2);                // back wall (along x)
  for (let x = -FX; x <= FX + 0.01; x += ST) { if (Math.abs(x) < 4.5) continue; seg(x, ZS, Math.PI / 2); } // front wall, gate gap
  if (!placeStatic("fence_gate", 0, ZS, ENV_SCALE, Math.PI / 2)) { const g = box(8, 2.4, 0.3, 0x8a6a3a); g.position.set(0, 1.2, ZS); g.castShadow = true; scene.add(g); }
}
function buildTown() {
  const PR = 12;                 // central square radius (cozy)
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(PR, 40), new THREE.MeshLambertMaterial({ map: makePlazaTexture() }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.07; plaza.receiveShadow = true; scene.add(plaza);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(PR, 0.4, 8, 48), toon(0xb9a06a)); rim.rotation.x = -Math.PI / 2; rim.position.y = 0.2; scene.add(rim);
  // narrow cobbled main street from the entrance (south/+z) into the square
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 44), new THREE.MeshLambertMaterial({ map: makePlazaTexture() }));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.06, 31); road.receiveShadow = true; scene.add(road);
  if (!placeStatic("b_well", 0, 0, 3.0)) fountain(0, 0);   // centerpiece

  const roofCols = [0xe05a5a, 0x5a86e0, 0x5ac06a, 0xe0a83c, 0x9a5ae0, 0xe07ab0];
  const FW = Math.PI / 2;
  // denser hand-authored "Town of Beginnings": [key, x, z, (rot)]
  const L = [
    ["b_church", 0, -15], ["b_tavern", -12, -9], ["b_market", 12, -9],
    ["b_blacksmith", -15, 1], ["b_home_b", 15, 1], ["b_tower", 15, -14], ["b_windmill", -15, -14],
    ["b_home_a", -11, 9], ["b_home_b", 11, 9],
    // tight street rows (x = ±7), four each side
    ["b_home_a", -7, 17, FW], ["b_home_b", -7, 24, FW], ["b_tavern", -7, 31, FW], ["b_home_a", -7, 38, FW],
    ["b_home_b", 7, 17, -FW], ["b_home_a", 7, 24, -FW], ["b_market", 7, 31, -FW], ["b_home_b", 7, 38, -FW],
  ];
  let ci = 0;
  for (const e of L) {
    const x = e[1], z = e[2], rot = (e.length > 3 ? e[3] : Math.atan2(-x, -z));
    if (!placeStatic(e[0], x, z, ENV_SCALE, rot)) house(x, z, rot, roofCols[(ci++) % roofCols.length]);
  }
  buildFence();   // closed perimeter wall + gate at the entrance
  // signposts at the gate and square
  signpost(-4, 43, 0.4); signpost(3.5, 11, -0.5);
  // banners, market tent, weapon rack, wheelbarrow
  placeStatic("flag_red", -8, -12, ENV_SCALE); placeStatic("flag_blue", 8, -12, ENV_SCALE);
  placeStatic("flag_blue", -16, -2, ENV_SCALE); placeStatic("flag_red", 16, -2, ENV_SCALE);
  placeStatic("tent", -5, -4, ENV_SCALE, 0.4); placeStatic("weaponrack", -13, 4, ENV_SCALE, 0.7); placeStatic("wheelbarrow", 6, 5, ENV_SCALE, 1.1);
  // scattered market clutter (varied props, smaller)
  const PROPS = ["barrel", "crate", "sack", "crate_long", "lumber"];
  for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, d = PR - 6 + Math.random() * 5, x = Math.sin(a) * d, z = Math.cos(a) * d; if (!placeStatic(PROPS[Math.floor(Math.random() * PROPS.length)], x, z, 2.4, Math.random() * 6)) barrel(x, z); }
  // lots of tall trees throughout the town (avoid the street, square & buildings)
  let placed = 0, tries = 0;
  while (placed < 26 && tries < 500) {
    tries++;
    const x = THREE.MathUtils.randFloatSpread(37), z = -18 + Math.random() * 61;
    if (Math.abs(x) > 18.5 || z < -18 || z > 43) continue;   // inside the fence
    if (Math.abs(x) < 5.5 && z > 12) continue;               // keep the street clear
    if (Math.hypot(x, z) < 13.5) continue;                   // keep the square clear
    let ok = true;
    for (const e of L) { if (Math.hypot(x - e[1], z - e[2]) < 6.5) { ok = false; break; } }
    if (!ok) continue;
    const h = ENV_SCALE * THREE.MathUtils.randFloat(1.3, 2.0); // taller than field trees
    if (!placeStatic(Math.random() < 0.45 ? "tree_a" : (Math.random() < 0.6 ? "tree_b" : "trees_lg"), x, z, h, Math.random() * 6)) primTree(x, z);
    placed++;
  }
  // lamps lining the street + around the square
  [[-5, 15], [5, 15], [-5, 25], [5, 25], [-5, 35], [5, 35]].forEach(p => lamppost(p[0], p[1]));
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) lamppost(Math.sin(a) * (PR - 1), Math.cos(a) * (PR - 1));
}
function fountain(x, z) {
  const grp = new THREE.Group();
  const base = cyl(3.2, 3.6, 0.6, 0xcdbf9a); base.position.y = 0.3; base.receiveShadow = true;
  const water = new THREE.Mesh(new THREE.CircleGeometry(3.0, 32), new THREE.MeshBasicMaterial({ color: 0x6ac6ff, transparent: true, opacity: 0.75 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.63;
  const tier = cyl(0.5, 0.7, 1.2, 0xcdbf9a); tier.position.y = 1.2;
  const bowl = cyl(1.2, 0.7, 0.4, 0xcdbf9a); bowl.position.y = 1.9;
  const top = sph(0.4, 0x9fd8ff, 0x9fd8ff, 0.6); top.position.y = 2.4;
  const gl = glowSprite(0xbfe8ff, 2); gl.position.y = 2.4;
  grp.add(base, water, tier, bowl, top, gl); grp.position.set(x, 0, z); shadowCasters(grp); scene.add(grp);
}
function house(x, z, rot, roof) {
  const grp = new THREE.Group();
  const wall = box(5, 3.6, 5, 0xeadfca); wall.position.y = 1.8;
  const r = new THREE.Mesh(new THREE.ConeGeometry(4.4, 3.4, 4), toon(roof)); r.position.y = 5.0; r.rotation.y = Math.PI / 4;
  const door = box(1.2, 2, 0.2, 0x6a4a2a); door.position.set(0, 1.0, 2.55);
  const w1 = box(1, 1, 0.2, 0x9fd0ff); w1.position.set(-1.6, 2.1, 2.55); const w2 = w1.clone(); w2.position.x = 1.6;
  grp.add(wall, r, door, w1, w2); grp.position.set(x, 0, z); grp.rotation.y = rot || 0; shadowCasters(grp); scene.add(grp);
}
function lamppost(x, z) {
  const grp = new THREE.Group();
  const post = cyl(0.08, 0.12, 3.0, 0x3a2f3a); post.position.y = 1.5;
  const lamp = sph(0.22, 0xfff0b0, 0xfff0b0, 1.2); lamp.position.y = 3.1; const gl = glowSprite(0xffe8a0, 1.5); gl.position.y = 3.1;
  grp.add(post, lamp, gl); grp.position.set(x, 0, z); shadowCasters(grp); scene.add(grp);
  const light = new THREE.PointLight(0xffe0a0, 0.5, 14); light.position.set(x, 3.1, z); scene.add(light);
}
function barrel(x, z) { const b = cyl(0.5, 0.5, 1.0, 0x7a5230); b.position.set(x, 0.5, z); b.castShadow = true; scene.add(b); }
function tent(x, z, col) { const grp = new THREE.Group(); const t = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.6, 4), toon(col || 0xd05a5a)); t.position.y = 1.3; t.rotation.y = Math.PI / 4; const pole = cyl(0.06, 0.06, 0.6, 0x4a3320); pole.position.y = 2.7; grp.add(t, pole); grp.position.set(x, 0, z); shadowCasters(grp); scene.add(grp); }

function primTree(x, z) {
  const grp = new THREE.Group();
  const trunk = cyl(0.28, 0.42, 2.6, 0x4a3320); trunk.position.y = 1.3;
  const l1 = sph(1.7, 0x2f6d38); l1.position.y = 3.3; l1.scale.set(1.1, 1.0, 1.1);
  const l2 = sph(1.2, 0x387a42); l2.position.set(0.5, 4.1, 0.2);
  grp.add(trunk, l1, l2); grp.position.set(x, 0, z); shadowCasters(grp); scene.add(grp);
}
function primRock(x, z) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(THREE.MathUtils.randFloat(0.8, 1.8)), toon(0x6a6a78));
  rock.position.set(x, 0.6, z); rock.rotation.set(Math.random(), Math.random(), Math.random()); rock.castShadow = true; scene.add(rock);
}
function buildScenery() {
  for (let i = 0; i < 150; i++) {
    const x = rand(WORLD), z = rand(WORLD);
    if (Math.abs(x) < 24 && z > -26 && z < 50) continue;  // keep clear of the town + street (trees hug the edges)
    const rot = Math.random() * 6.28;
    if (Math.random() < 0.66) {
      const k = Math.random() < 0.4 ? "tree_a" : (Math.random() < 0.6 ? "tree_b" : "trees_lg");
      if (!placeStatic(k, x, z, ENV_SCALE * THREE.MathUtils.randFloat(1.0, 1.8), rot)) primTree(x, z);
    } else {
      if (!placeStatic(Math.random() < 0.5 ? "rock_a" : "rock_c", x, z, ENV_SCALE * THREE.MathUtils.randFloat(0.7, 1.2), rot)) primRock(x, z);
    }
  }
  // distant mountain ring (hazy blue for daytime)
  for (let a = 0; a < Math.PI * 2; a += 0.16) {
    const m = cone(THREE.MathUtils.randFloat(16, 30), THREE.MathUtils.randFloat(34, 64), 0x6f82a6);
    const d = 270 + Math.random() * 50; m.position.set(Math.sin(a) * d, 6, Math.cos(a) * d); scene.add(m);
  }
}

function buildNazarick() {
  // central dark obelisk landmark with crowning crystal + brazier ring
  const grp = new THREE.Group();
  const base = cyl(5, 7, 1.4, 0x1a1326); base.position.y = 0.7; base.receiveShadow = true;
  const steps = cyl(3.6, 5, 1.2, 0x241a30); steps.position.y = 1.8;
  const ob = box(2.2, 12, 2.2, 0x120c20); ob.position.y = 8.4; shadowCasters(ob);
  for (let s = 0; s < 4; s++) { const e = box(0.2, 11, 0.2, 0x6a3aff, 0x6a3aff, 0.7); e.position.set(s < 2 ? -1.1 : 1.1, 8.4, (s % 2 ? -1.1 : 1.1)); grp.add(e); }
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.8), toon(0x9a6bff, 0x9a6bff, 1.2)); crystal.position.y = 16; grp.add(crystal);
  const cglow = glowSprite(0xb38cff, 9); cglow.position.y = 16; grp.add(cglow);
  const cpl = new THREE.PointLight(0x9a6bff, 1.4, 60); cpl.position.y = 16; grp.add(cpl);
  grp.add(base, steps, ob);
  grp.position.set(0, 0, -34); scene.add(grp);
  // braziers encircling the landmark (not the player spawn)
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
    addBrazier(Math.sin(a) * 9, -34 + Math.cos(a) * 9);
  }
}
function addBrazier(x, z) {
  const grp = new THREE.Group();
  const post = cyl(0.18, 0.26, 2.2, 0x2a2030); post.position.y = 1.1;
  const bowl = cyl(0.7, 0.4, 0.5, 0x1a1018); bowl.position.y = 2.3;
  grp.add(post, bowl); grp.position.set(x, 0, z); shadowCasters(grp); scene.add(grp);
  const flame = glowSprite(0xff9a3c, 1.7); flame.position.set(x, 3.0, z); scene.add(flame);
  const light = new THREE.PointLight(0xff8a3a, 0.9, 18); light.position.set(x, 3.2, z); scene.add(light);
  flames.push({ flame, light, base: 1.7, t: Math.random() * 6 });
}

// ---------------------------------------------------------------------------
// player
// ---------------------------------------------------------------------------
const POWER_STAT = { overlord: "mag", demon: "mag", maid: "mag", ranger: "atk", vampire: "atk", frost: "atk" };
const RANGED = { overlord: 1, demon: 1, maid: 1, ranger: 1 };
const CLASS_MODEL = { overlord: "mage", demon: "mage", maid: "mage", ranger: "rogue", vampire: "rogue", frost: "knight" };
const MODEL_FACE = false; // KayKit rig faces +Z; no flip needed

function makeHero(clsKey) {
  const cc = CLASSES[clsKey], b = cc.base; const col = hex(cc.color || "#b06bff");
  hero = {
    clsKey, name: cc.name, color: cc.color,
    level: 1, xp: 0, xpNext: 40 + 18, gold: 0,
    maxHp: b.hp, maxMp: b.mp, hp: b.hp, mp: b.mp,
    atk: b.atk, mag: b.mag, def: b.def, spd: 7.5,
    powerStat: POWER_STAT[clsKey] || "atk", ranged: !!RANGED[clsKey],
    cd: { basic: 0, a1: 0, a2: 0, a3: 0 }, regen: 0,
  };
  const WPN = { overlord: "staff", demon: "staff", maid: "staff", ranger: "bow", vampire: "sword", frost: "sword" };
  yaw = Math.PI; pitch = 0.2;   // face the town at spawn
  player = makeModelChar(CLASS_MODEL[clsKey] || "knight", 2.05, { idle: ["idle"], walk: ["walk"], run: ["run"] }, MODEL_FACE)
        || makeChibi({ body: col, hair: shade(col, 0.6), pants: 0x39354f, eyeGlow: col, cape: (POWER_STAT[clsKey] === "mag") ? col : null, weapon: WPN[clsKey], scale: 1.0 });
  player.position.set(0, 0, 46); player.rotation.y = yaw; scene.add(player);
  // floating familiar orb above the head
  playerOrb = sph(0.16, col, col, 1.4); playerOrb.position.set(0, 2.7, 0); player.add(playerOrb);
  const og = glowSprite(col, 0.8); playerOrb.add(og);
  playerOrbLight = new THREE.PointLight(col, 0.6, 9); playerOrbLight.position.set(0, 2.7, 0); player.add(playerOrbLight);
  // ground aura ring
  const auraMesh = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.4, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  auraMesh.rotation.x = -Math.PI / 2; auraMesh.position.y = 0.06; player.add(auraMesh); player.userData.aura = auraMesh;
  buildAbilityHUD();
}
function power() { return hero[hero.powerStat]; }

// ---------------------------------------------------------------------------
// abilities
// ---------------------------------------------------------------------------
const ABZ = [
  { id: "basic", key: "LMB", name: "Attack", mp: 0, cd: 0.5 },
  { id: "a1", key: "1", name: "Nova", mp: 14, cd: 4 },
  { id: "a2", key: "2", name: "Heal", mp: 16, cd: 7 },
  { id: "a3", key: "3", name: "Burst", mp: 12, cd: 5 },
];
function buildAbilityHUD() {
  const bar = document.getElementById("abilities"); bar.innerHTML = "";
  ABZ.forEach(a => {
    const d = document.createElement("div"); d.className = "ab"; d.id = "ab-" + a.id;
    d.innerHTML = "<span class='k'>" + a.key + "</span>" + a.name + (a.mp ? "<br><small style='color:#8ab6ff'>" + a.mp + " MP</small>" : "") + "<div class='cd' style='display:none'></div>";
    bar.appendChild(d);
  });
}
function ready(id, mp) { return hero.cd[id] <= 0 && hero.mp >= (mp || 0); }
function elementColor() { return ({ overlord: "#c06bff", demon: "#ff7a3c", maid: "#ffe14d", ranger: "#7dff6b", vampire: "#ff5a6e", frost: "#7fe9ff" })[hero.clsKey] || "#b06bff"; }

function basicAttack() {
  if (!ready("basic")) return; hero.cd.basic = ABZ[0].cd;
  const dmg = Math.round((8 + power() * 0.8) * varf());
  if (hero.ranged) shoot(dmg, elementColor()); else meleeHit(3.0, dmg);
}
function ability(id) {
  const a = ABZ.find(x => x.id === id); if (!ready(id, a.mp)) return;
  hero.cd[id] = a.cd; hero.mp -= a.mp; const col = elementColor();
  if (id === "a1") {
    popText(player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), "NOVA", col);
    spawnRing(player.position.clone(), col, 16); flashLight(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), col);
    const dmg = Math.round((20 + power() * 1.2) * varf());
    enemies.forEach(en => { if (en.alive && en.mesh.position.distanceTo(player.position) < 6.8) hurtEnemy(en, dmg, col); });
  } else if (id === "a2") {
    const amt = Math.round(hero.maxHp * 0.25 + hero.mag * 0.8); hero.hp = Math.min(hero.maxHp, hero.hp + amt);
    popText(player.position.clone().add(new THREE.Vector3(0, 2.6, 0)), "+" + amt, "#46e08a");
    spawnRing(player.position.clone(), "#46e08a", 10); spawnBurstParticles(player.position.clone().add(new THREE.Vector3(0, 1, 0)), "#46e08a");
  } else if (id === "a3") {
    const dmg = Math.round((30 + power() * 1.6) * varf());
    if (hero.ranged) shoot(dmg, col, 1.8, 2.0); else meleeHit(4.2, dmg, 0.95);
  }
}
function varf() { return 0.9 + Math.random() * 0.2; }
function forwardVec() { return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); }

function meleeHit(range, dmg, wide) {
  const f = forwardVec(); const ang = wide ? 0.95 : 0.6; swing(elementColor());
  enemies.forEach(en => {
    if (!en.alive) return; const to = en.mesh.position.clone().sub(player.position); const dist = to.length();
    if (dist > range) return; to.normalize(); if (to.dot(f) > Math.cos(ang)) hurtEnemy(en, dmg, elementColor());
  });
}
function shoot(dmg, color, scale, speedMul) {
  const core = sph(0.22 * (scale || 1), hex(color), hex(color), 1.5);
  core.position.copy(player.position).add(new THREE.Vector3(0, 1.2, 0)).add(forwardVec().multiplyScalar(0.9));
  const gl = glowSprite(hex(color), 1.6 * (scale || 1)); core.add(gl);
  const light = new THREE.PointLight(hex(color), 0.8, 8); core.add(light);
  scene.add(core);
  projectiles.push({ mesh: core, dir: forwardVec(), speed: 27 * (speedMul || 1), life: 1.7, dmg, color, spin: 1 });
}

// ---------------------------------------------------------------------------
// enemies
// ---------------------------------------------------------------------------
const EKINDS = [
  { name: "Skeleton Warrior", model: "skel_warrior", height: 2.0, faceFix: MODEL_FACE, hp: 50, atk: 12, xp: 16, gold: 8, melee: true,
    states: { idle: ["idle"], walk: ["walk"], run: ["run"], attack: ["attack", "slice", "chop", "melee"] },
    fb: { body: 0xcfcbb4, skin: 0xe6e2cc, scale: 1.0, eyeGlow: 0xff5a3c } },
  { name: "Skeleton Mage", model: "skel_mage", height: 2.0, faceFix: MODEL_FACE, hp: 40, atk: 14, xp: 18, gold: 10, melee: true,
    states: { idle: ["idle"], walk: ["walk"], run: ["run"], attack: ["attack", "slice", "chop", "melee"] },
    fb: { body: 0x3a2a55, skin: 0xe6e2cc, scale: 1.0, eyeGlow: 0xc06bff, cape: 0x2a1f44 } },
];
function spawnEnemy() {
  const k = EKINDS[Math.floor(Math.random() * EKINDS.length)]; const lvl = hero.level;
  let mesh = makeModelChar(k.model, k.height, k.states, k.faceFix);
  if (!mesh) mesh = makeChibi(Object.assign({ hair: 0x201818 }, k.fb));
  let x, z; do { x = rand(WORLD - 8); z = rand(WORLD - 8); } while (Math.hypot(x, z) < 36);
  const baseY = k.fly ? 3.0 : 0;
  mesh.position.set(x, baseY, z); scene.add(mesh);
  const maxHp = Math.round(k.hp * (1 + 0.25 * (lvl - 1)));
  const bar = document.createElement("div"); bar.className = "ehp"; bar.innerHTML = "<i></i>"; hud.appendChild(bar);
  enemies.push({
    kind: k, mesh, alive: true, hp: maxHp, maxHp, baseY, baseScale: mesh.scale.x || 1,
    atk: Math.round(k.atk * (1 + 0.22 * (lvl - 1))), def: 4 + lvl * 2,
    xpReward: Math.round(k.xp * (1 + 0.3 * (lvl - 1))), goldReward: Math.round(k.gold * (1 + 0.3 * (lvl - 1))),
    speed: 3.2 + Math.random() * 1.6, atkCd: 0, wanderT: 0, wdir: new THREE.Vector3(), bar, hit: 0,
  });
  charAnim(mesh, "idle");
}
function hurtEnemy(en, dmg, color) {
  if (!en.alive) return; const real = Math.max(1, Math.round(dmg * 100 / (100 + en.def)));
  en.hp -= real; en.hit = 0.12;
  popText(en.mesh.position.clone().add(new THREE.Vector3(0, (en.kind.height || 2) + 0.6, 0)), "" + real, color || "#fff");
  spawnBurstParticles(en.mesh.position.clone().add(new THREE.Vector3(0, 1.4, 0)), color || "#ffffff", 6);
  if (en.hp <= 0) killEnemy(en);
}
function killEnemy(en) {
  en.alive = false; scene.remove(en.mesh); if (en.bar) en.bar.remove();
  spawnBurstParticles(en.mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), "#cfc", 16);
  hero.gold += en.goldReward; gainXp(en.xpReward);
  popText(player.position.clone().add(new THREE.Vector3(0, 3, 0)), "+" + en.xpReward + " XP", "#ffd866");
}
function gainXp(n) {
  hero.xp += n;
  while (hero.xp >= hero.xpNext) {
    hero.xp -= hero.xpNext; hero.level++; hero.xpNext = 40 + hero.level * hero.level * 18;
    hero.maxHp += 16; hero.maxMp += 8; hero.atk += 3; hero.mag += 3; hero.def += 2; hero.hp = hero.maxHp; hero.mp = hero.maxMp;
    popText(player.position.clone().add(new THREE.Vector3(0, 3.4, 0)), "LEVEL UP!  " + hero.level, "#ffe14d");
    spawnRing(player.position.clone(), "#ffe14d", 12); spawnBurstParticles(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#ffe14d", 24);
  }
}

// ---------------------------------------------------------------------------
// fx
// ---------------------------------------------------------------------------
function popText(pos, text, color) { floats.push({ pos: pos.clone(), text, color, life: 1.1, el: null }); }
function swing(color) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 8, 18), new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.copy(player.position).add(new THREE.Vector3(0, 1, 0)); ring.lookAt(player.position.clone().add(forwardVec()));
  scene.add(ring); projectiles.push({ mesh: ring, dir: new THREE.Vector3(), speed: 0, life: 0.2, dmg: 0, fade: true });
}
function spawnRing(pos, color, grow) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.2, 8, 24), new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  ring.position.copy(pos).add(new THREE.Vector3(0, 0.4, 0)); ring.rotation.x = -Math.PI / 2;
  scene.add(ring); projectiles.push({ mesh: ring, dir: new THREE.Vector3(), speed: 0, life: 0.55, dmg: 0, fade: true, grow: grow || 12 });
}
function flashLight(pos, color) {
  const l = new THREE.PointLight(hex(color), 3, 16); l.position.copy(pos); scene.add(l);
  projectiles.push({ mesh: l, dir: new THREE.Vector3(), speed: 0, life: 0.25, dmg: 0, lightFade: 3 });
}
function spawnBurstParticles(pos, color, n) {
  n = n || 10;
  for (let i = 0; i < n; i++) {
    const p = glowSprite(hex(color), 0.6); p.position.copy(pos);
    const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(2 + Math.random() * 3);
    scene.add(p); projectiles.push({ mesh: p, dir: v, speed: 1, life: 0.5, dmg: 0, fade: true, grav: -5 });
  }
}

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
function update(dt) {
  T += dt;
  for (const k in hero.cd) hero.cd[k] = Math.max(0, hero.cd[k] - dt);
  hero.regen += dt; if (hero.regen > 0.5) { hero.mp = Math.min(hero.maxMp, hero.mp + 3); hero.regen = 0; }
  if (keys.Digit1) ability("a1"); if (keys.Digit2) ability("a2"); if (keys.Digit3) ability("a3"); if (keys.Space) basicAttack();

  running = !!keys.ShiftLeft || !!keys.ShiftRight;
  const f = forwardVec(); const right = new THREE.Vector3().crossVectors(f, UP).negate();
  const move = new THREE.Vector3();
  if (keys.KeyW) move.add(f); if (keys.KeyS) move.sub(f); if (keys.KeyA) move.sub(right); if (keys.KeyD) move.add(right);
  let moving = move.lengthSq() > 0;
  if (moving) {
    move.normalize().multiplyScalar(hero.spd * (running ? 1.7 : 1) * dt);
    player.position.add(move);
    const lim = WORLD - 4; player.position.x = THREE.MathUtils.clamp(player.position.x, -lim, lim); player.position.z = THREE.MathUtils.clamp(player.position.z, -lim, lim);
    player.rotation.y = Math.atan2(move.x, move.z);
  }
  // animation + bob
  charTick(player, dt);
  charAnim(player, moving ? (running ? "run" : "walk") : "idle");
  if (player.userData && player.userData.mixer) player.position.y = 0;   // model has foot animation
  else player.position.y = moving ? Math.abs(Math.sin(T * 12)) * 0.12 : 0;
  if (playerOrb) { playerOrb.position.set(0, 2.7 + Math.sin(T * 3) * 0.14, 0); playerOrbLight.position.copy(playerOrb.position); }
  if (player.userData.aura) { const s = 1 + Math.sin(T * 4) * 0.08; player.userData.aura.scale.set(s, s, s); player.userData.aura.rotation.z += dt * 1.5; }

  // projectiles / fx
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; p.life -= dt;
    if (p.speed) p.mesh.position.add(TMP.copy(p.dir).multiplyScalar(p.speed * dt));
    if (p.grav) { p.dir.y += p.grav * dt; }
    if (p.spin) p.mesh.rotation.y += dt * 8;
    if (p.grow) p.mesh.scale.addScalar(p.grow * dt);
    if (p.lightFade) p.mesh.intensity = Math.max(0, p.life * p.lightFade * 4);
    if (p.fade && p.mesh.material) { p.mesh.material.opacity = Math.max(0, p.life * 3); p.mesh.material.transparent = true; }
    if (p.dmg) { for (const en of enemies) { if (en.alive && en.mesh.position.distanceTo(p.mesh.position) < 1.4) { hurtEnemy(en, p.dmg, p.color); p.life = 0; break; } } }
    if (p.life <= 0) { scene.remove(p.mesh); projectiles.splice(i, 1); }
  }

  // enemies
  let alive = 0;
  for (const en of enemies) {
    if (!en.alive) continue; alive++;
    en.atkCd = Math.max(0, en.atkCd - dt);
    charTick(en.mesh, dt);
    let s = en.baseScale; if (en.hit > 0) { en.hit -= dt; s = en.baseScale * (1 + Math.max(0, en.hit)); }
    en.mesh.scale.setScalar(s);
    const toP = player.position.clone().sub(en.mesh.position); toP.y = 0; const dist = toP.length();
    en.mesh.position.y = en.baseY + Math.sin(T * 4 + en.mesh.id) * (en.kind.fly ? 0.3 : 0.05);
    const ff = en.kind.faceFix ? Math.PI : 0;
    if (dist < 18) {
      toP.normalize();
      if (dist > 2.2) { en.mesh.position.add(toP.clone().multiplyScalar(en.speed * dt)); charAnim(en.mesh, "run"); }
      else charAnim(en.mesh, en.kind.melee ? "attack" : "idle");
      en.mesh.rotation.y = Math.atan2(toP.x, toP.z) + ff;
      if (dist <= 2.6 && en.atkCd <= 0) {
        en.atkCd = 1.2; const dmg = Math.max(1, Math.round(en.atk * 100 / (100 + hero.def))); hero.hp -= dmg;
        popText(player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), "-" + dmg, "#ff5a6e");
        if (hero.hp <= 0) { hero.hp = 0; onDeath(); }
      }
    } else {
      en.wanderT -= dt; if (en.wanderT <= 0) { en.wanderT = 1 + Math.random() * 2; en.wdir.set(rand(1), 0, rand(1)).normalize(); }
      en.mesh.position.add(en.wdir.clone().multiplyScalar(en.speed * 0.4 * dt));
      charAnim(en.mesh, "walk");
      if (en.wdir.lengthSq() > 0.001) en.mesh.rotation.y = Math.atan2(en.wdir.x, en.wdir.z) + ff;
    }
  }
  while (alive < 9) { spawnEnemy(); alive++; }

  // braziers flicker
  for (const fl of flames) { fl.t += dt; const k = 0.8 + Math.sin(fl.t * 11) * 0.12 + Math.random() * 0.12; fl.flame.scale.set(fl.base * k, fl.base * (k + 0.2), 1); fl.light.intensity = 1.0 * k; }
  if (motes) motes.rotation.y += dt * 0.02;

  // camera (third-person follow)
  const camDist = 8.5, camHeight = 3.4 + pitch * 6.5;
  const back = forwardVec().multiplyScalar(-camDist);
  camera.position.copy(player.position).add(back).add(new THREE.Vector3(0, camHeight, 0));
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.9, 0)));

  updateHUD();
}

// ---------------------------------------------------------------------------
// HUD / projection
// ---------------------------------------------------------------------------
function toScreen(v) { const p = v.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * W(), y: (-p.y * 0.5 + 0.5) * H(), behind: p.z > 1 }; }
function updateHUD() {
  document.getElementById("hpfill").style.width = (100 * Math.max(0, hero.hp) / hero.maxHp) + "%";
  document.getElementById("mpfill").style.width = (100 * hero.mp / hero.maxMp) + "%";
  document.getElementById("stats").innerHTML = "<b>" + hero.name + "</b>  Lv." + hero.level + "  HP " + Math.ceil(hero.hp) + "/" + hero.maxHp + "  ·  <span id='gold'>" + hero.gold + "g</span>  ·  XP " + hero.xp + "/" + hero.xpNext;
  ABZ.forEach(a => { const cdEl = document.querySelector("#ab-" + a.id + " .cd"); if (!cdEl) return; if (hero.cd[a.id] > 0) { cdEl.style.display = "flex"; cdEl.textContent = hero.cd[a.id].toFixed(1); } else cdEl.style.display = "none"; });
  for (let i = floats.length - 1; i >= 0; i--) {
    const fl = floats[i]; fl.life -= 0.016; fl.pos.y += 0.02;
    if (!fl.el) { fl.el = document.createElement("div"); fl.el.className = "float"; fl.el.textContent = fl.text; fl.el.style.color = fl.color; hud.appendChild(fl.el); }
    const s = toScreen(fl.pos);
    if (s.behind) fl.el.style.display = "none"; else { fl.el.style.display = ""; fl.el.style.left = s.x + "px"; fl.el.style.top = s.y + "px"; fl.el.style.opacity = Math.max(0, fl.life); fl.el.style.fontSize = (14 + fl.life * 8) + "px"; }
    if (fl.life <= 0) { fl.el.remove(); floats.splice(i, 1); }
  }
  for (const en of enemies) {
    if (!en.bar) continue; if (!en.alive) { en.bar.style.display = "none"; continue; }
    const s = toScreen(en.mesh.position.clone().add(new THREE.Vector3(0, (en.kind.height || 2) + 0.5, 0)));
    if (s.behind || en.mesh.position.distanceTo(player.position) > 45) { en.bar.style.display = "none"; continue; }
    en.bar.style.display = ""; en.bar.style.left = s.x + "px"; en.bar.style.top = s.y + "px"; en.bar.firstChild.style.width = (100 * Math.max(0, en.hp) / en.maxHp) + "%";
  }
}

// ---------------------------------------------------------------------------
// loop / flow
// ---------------------------------------------------------------------------
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (!paused && hero && hero.hp > 0) update(dt);
  if (renderer) renderer.render(scene, camera);
}
function onDeath() {
  document.exitPointerLock && document.exitPointerLock();
  document.getElementById("deadmsg").textContent = "You reached level " + hero.level + " with " + hero.gold + " gold. The New World is unforgiving.";
  deadOv.classList.remove("hidden");
}
function respawn() { hero.hp = hero.maxHp; hero.mp = hero.maxMp; hero.gold = Math.floor(hero.gold * 0.8); player.position.set(0, 0, 46); deadOv.classList.add("hidden"); lockMouse(); }
function showPause() { paused = true; pauseOv.classList.remove("hidden"); }
function hidePause() { paused = false; pauseOv.classList.add("hidden"); }
function lockMouse() { document.getElementById("c3d").requestPointerLock(); }
function startGame(clsKey) {
  startOv.classList.add("hidden"); hud.classList.remove("hidden");
  makeHero(clsKey); for (let i = 0; i < 9; i++) spawnEnemy(); running = false; lockMouse();
}
function buildClassCards() {
  const wrap = document.getElementById("classcards");
  for (const key in CLASSES) {
    const cc = CLASSES[key]; const c = document.createElement("div"); c.className = "card";
    c.innerHTML = "<b style='color:" + cc.color + "'>" + cc.name + "</b><span>" + cc.style + "</span>";
    c.onclick = () => startGame(key); wrap.appendChild(c);
  }
}

if (typeof THREE !== "undefined") {
  init(); parseModels(buildWorld); buildClassCards();
  document.getElementById("resumebtn").onclick = lockMouse;
  document.getElementById("respawnbtn").onclick = respawn;
  loop();
}
