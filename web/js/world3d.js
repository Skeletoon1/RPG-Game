"use strict";
// ============================================================================
//  3D ADVENTURE (beta) — real-time action, third-person, WASD + mouse-look.
//  Visual style: stylized/toon (Fiesta + WoW) with dark Nazarick grandeur.
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
  const data = new Uint8Array([70, 130, 200, 255]); // 4-step toon ramp
  const t = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
}
function toon(color, emissive, eInt) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: GRAD });
  if (emissive != null) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = eInt == null ? 1 : eInt; }
  return m;
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
// chibi characters
// ---------------------------------------------------------------------------
function makeChibi(opt) {
  opt = opt || {};
  const g = new THREE.Group();
  const skin = opt.skin || 0xe8c9a0, body = opt.body || 0x8a5acb, hair = opt.hair || 0x2a1f3a;
  const eyeCol = opt.eyeGlow || 0x141018;
  const l1 = box(0.28, 0.5, 0.28, 0x2a2238); l1.position.set(-0.18, 0.25, 0);
  const l2 = l1.clone(); l2.position.x = 0.18; g.add(l1, l2);
  const torso = box(0.74, 0.72, 0.44, body); torso.position.y = 0.86; g.add(torso);
  const belt = box(0.78, 0.12, 0.48, 0x1a1422); belt.position.y = 0.56; g.add(belt);
  const a1 = box(0.2, 0.62, 0.2, body); a1.position.set(-0.49, 0.9, 0);
  const a2 = a1.clone(); a2.position.x = 0.49; g.add(a1, a2);
  const head = sph(0.56, skin); head.position.y = 1.72; g.add(head);
  const cap = sph(0.62, hair); cap.position.y = 1.88; cap.scale.set(1, 0.62, 1); g.add(cap);
  // eyes (optionally glowing)
  const glowEyes = !!opt.eyeGlow;
  const e1 = sph(0.085, glowEyes ? eyeCol : 0x141018, glowEyes ? eyeCol : null, 1.4); e1.position.set(-0.2, 1.72, 0.5);
  const e2 = e1.clone(); e2.position.x = 0.2; g.add(e1, e2);
  if (glowEyes) { const ge = glowSprite(eyeCol, 0.5); ge.position.set(0, 1.72, 0.55); g.add(ge); }
  if (opt.horns) {
    const h1 = cone(0.13, 0.4, 0x55121a); h1.position.set(-0.3, 2.25, 0); h1.rotation.z = 0.32;
    const h2 = h1.clone(); h2.position.x = 0.3; h2.rotation.z = -0.32; g.add(h1, h2);
  }
  if (opt.ears) { // goblin-style pointed ears
    const r1 = cone(0.12, 0.34, skin); r1.position.set(-0.55, 1.78, 0); r1.rotation.z = 1.4;
    const r2 = r1.clone(); r2.position.x = 0.55; r2.rotation.z = -1.4; g.add(r1, r2);
  }
  if (opt.cape) {
    const cape = box(0.78, 1.15, 0.08, opt.cape); cape.position.set(0, 0.95, -0.27); g.add(cape);
    const collar = box(0.5, 0.18, 0.2, opt.cape); collar.position.set(0, 1.5, -0.18); g.add(collar);
  }
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
  scene.fog = new THREE.FogExp2(0x140d24, 0.0085);
  camera = new THREE.PerspectiveCamera(62, W() / H(), 0.1, 600);
  clock = new THREE.Clock();
  GLOW = makeGlow(); GRAD = makeGradientMap();

  // --- sky dome (dusk gradient) ---
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x3a2470) }, mid: { value: new THREE.Color(0x6a3a7a) }, bot: { value: new THREE.Color(0x140d24) } },
    vertexShader: "varying vec3 vW; void main(){ vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} ",
    fragmentShader: "varying vec3 vW; uniform vec3 top; uniform vec3 mid; uniform vec3 bot; void main(){ float h=normalize(vW).y; vec3 c = h>0.0 ? mix(mid,top,smoothstep(0.0,0.6,h)) : mix(mid,bot,smoothstep(0.0,0.5,-h)); gl_FragColor=vec4(c,1.0);} ",
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMat); scene.add(sky);
  // moon
  const moon = glowSprite(0xead8ff, 60); moon.position.set(-120, 130, -260); scene.add(moon);
  const moonCore = sph(14, 0xe9e0ff, 0xe9e0ff, 0.8); moonCore.position.copy(moon.position); scene.add(moonCore);
  // stars
  addStars();

  // --- lights ---
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x2a1d3a, 0.65));
  const sun = new THREE.DirectionalLight(0xffe6c0, 1.0);
  sun.position.set(40, 80, -30); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 250;
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x8a6bff, 0.5); rim.position.set(-30, 20, 40); scene.add(rim);

  // --- ground (gently undulating, stylized) ---
  const gGeo = new THREE.PlaneGeometry(WORLD * 2.2, WORLD * 2.2, 80, 80);
  const pos = gGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const z = (Math.sin(x * 0.06) * Math.cos(y * 0.05) + Math.sin(x * 0.13 + y * 0.1) * 0.5) * 0.9;
    pos.setZ(i, z);
  }
  gGeo.computeVertexNormals();
  const ground = new THREE.Mesh(gGeo, toon(0x3a5a34)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // lighter grass patches
  for (let i = 0; i < 46; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(THREE.MathUtils.randFloat(2.5, 7), 10), toon(0x46703c));
    p.rotation.x = -Math.PI / 2; p.position.set(rand(WORLD), 0.05, rand(WORLD)); scene.add(p);
  }

  buildScenery();
  buildNazarick();
  addMotes();

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

function buildScenery() {
  for (let i = 0; i < 80; i++) {
    const x = rand(WORLD), z = rand(WORLD);
    if (Math.hypot(x, z) < 12) continue;
    const r = Math.random();
    if (r < 0.5) { // stylized tree (two leaf blobs)
      const grp = new THREE.Group();
      const trunk = cyl(0.28, 0.42, 2.6, 0x4a3320); trunk.position.y = 1.3;
      const l1 = sph(1.7, 0x2f6d38); l1.position.y = 3.3; l1.scale.set(1.1, 1.0, 1.1);
      const l2 = sph(1.2, 0x387a42); l2.position.set(0.5, 4.1, 0.2);
      grp.add(trunk, l1, l2); grp.position.set(x, 0, z); shadowCasters(grp); scene.add(grp);
    } else if (r < 0.8) { // rock
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(THREE.MathUtils.randFloat(0.8, 1.8)), toon(0x6a6a78));
      rock.position.set(x, 0.6, z); rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true; scene.add(rock);
    } else { // glowing crystal cluster (Nazarick mana)
      const grp = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const cr = cone(0.25, THREE.MathUtils.randFloat(1, 2.2), 0x7a4bff, 0x7a4bff, 0.8);
        cr.position.set((Math.random() - 0.5), cr.geometry.parameters.height / 2, (Math.random() - 0.5)); cr.rotation.z = (Math.random() - 0.5) * 0.4;
        grp.add(cr);
      }
      const gl = glowSprite(0x9a6bff, 3.5); gl.position.y = 1.2; grp.add(gl);
      grp.position.set(x, 0, z); scene.add(grp);
    }
  }
  // distant mountain ring
  for (let a = 0; a < Math.PI * 2; a += 0.16) {
    const m = cone(THREE.MathUtils.randFloat(14, 26), THREE.MathUtils.randFloat(28, 55), 0x241a38);
    const d = 250 + Math.random() * 40; m.position.set(Math.sin(a) * d, 8, Math.cos(a) * d); scene.add(m);
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
  player = makeChibi({ body: col, hair: 0x201826, eyeGlow: col, cape: col, scale: 1.0 });
  player.position.set(0, 0, 12); scene.add(player);
  // floating magic orb at the hand
  playerOrb = sph(0.2, col, col, 1.4); player.add(playerOrb);
  const og = glowSprite(col, 0.9); playerOrb.add(og);
  playerOrbLight = new THREE.PointLight(col, 0.7, 10); player.add(playerOrbLight);
  // ground aura ring
  const auraMesh = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
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
  { name: "Goblin", body: 0x4e7d36, skin: 0x6a9a44, hp: 34, atk: 9, xp: 12, gold: 6, scale: 0.8, ears: 1, eyeGlow: 0xff5a3c },
  { name: "Wraith", body: 0x3a2a55, skin: 0x241a3a, hp: 30, atk: 12, xp: 16, gold: 7, scale: 0.85, eyeGlow: 0xc06bff },
  { name: "Ogre", body: 0x8a5a40, skin: 0xb07a56, hp: 80, atk: 18, xp: 30, gold: 16, scale: 1.3, horns: 1, eyeGlow: 0xffd34d },
];
function spawnEnemy() {
  const k = EKINDS[Math.floor(Math.random() * EKINDS.length)]; const lvl = hero.level;
  const mesh = makeChibi({ body: k.body, skin: k.skin, hair: 0x201818, horns: k.horns, ears: k.ears, eyeGlow: k.eyeGlow, scale: k.scale });
  let x, z; do { x = rand(WORLD - 8); z = rand(WORLD - 8); } while (Math.hypot(x, z) < 20);
  mesh.position.set(x, 0, z); scene.add(mesh);
  const maxHp = Math.round(k.hp * (1 + 0.25 * (lvl - 1)));
  const bar = document.createElement("div"); bar.className = "ehp"; bar.innerHTML = "<i></i>"; hud.appendChild(bar);
  enemies.push({
    kind: k, mesh, alive: true, hp: maxHp, maxHp,
    atk: Math.round(k.atk * (1 + 0.22 * (lvl - 1))), def: 4 + lvl * 2,
    xpReward: Math.round(k.xp * (1 + 0.3 * (lvl - 1))), goldReward: Math.round(k.gold * (1 + 0.3 * (lvl - 1))),
    speed: 3.2 + Math.random() * 1.6, atkCd: 0, wanderT: 0, wdir: new THREE.Vector3(), bar, hit: 0,
  });
}
function hurtEnemy(en, dmg, color) {
  if (!en.alive) return; const real = Math.max(1, Math.round(dmg * 100 / (100 + en.def)));
  en.hp -= real; en.hit = 0.12;
  popText(en.mesh.position.clone().add(new THREE.Vector3(0, 2.7 * (en.kind.scale || 1), 0)), "" + real, color || "#fff");
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
  // bobbing + orb float + aura pulse
  player.position.y = moving ? Math.abs(Math.sin(T * 12)) * 0.12 : 0;
  if (playerOrb) { playerOrb.position.set(0.6, 1.1 + Math.sin(T * 3) * 0.12, 0.35); playerOrbLight.position.copy(playerOrb.position); }
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
    if (en.hit > 0) { en.hit -= dt; en.mesh.scale.setScalar((en.kind.scale || 1) * (1 + en.hit)); }
    const toP = player.position.clone().sub(en.mesh.position); const dist = toP.length();
    en.mesh.position.y = Math.sin(T * 5 + en.mesh.id) * 0.06;
    if (dist < 17) {
      toP.y = 0; toP.normalize();
      if (dist > 2.0) en.mesh.position.add(toP.multiplyScalar(en.speed * dt));
      en.mesh.rotation.y = Math.atan2(toP.x, toP.z);
      if (dist <= 2.5 && en.atkCd <= 0) {
        en.atkCd = 1.2; const dmg = Math.max(1, Math.round(en.atk * 100 / (100 + hero.def))); hero.hp -= dmg;
        popText(player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), "-" + dmg, "#ff5a6e");
        if (hero.hp <= 0) { hero.hp = 0; onDeath(); }
      }
    } else { en.wanderT -= dt; if (en.wanderT <= 0) { en.wanderT = 1 + Math.random() * 2; en.wdir.set(rand(1), 0, rand(1)).normalize(); } en.mesh.position.add(en.wdir.clone().multiplyScalar(en.speed * 0.4 * dt)); }
  }
  while (alive < 9) { spawnEnemy(); alive++; }

  // braziers flicker
  for (const fl of flames) { fl.t += dt; const k = 0.8 + Math.sin(fl.t * 11) * 0.12 + Math.random() * 0.12; fl.flame.scale.set(fl.base * k, fl.base * (k + 0.2), 1); fl.light.intensity = 1.0 * k; }
  if (motes) motes.rotation.y += dt * 0.02;

  // camera (third-person follow)
  const camDist = 8.5, camHeight = 3.4 + pitch * 6.5;
  const back = forwardVec().multiplyScalar(-camDist);
  camera.position.copy(player.position).add(back).add(new THREE.Vector3(0, camHeight, 0));
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.7, 0)));

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
    const s = toScreen(en.mesh.position.clone().add(new THREE.Vector3(0, 2.6 * (en.kind.scale || 1), 0)));
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
function respawn() { hero.hp = hero.maxHp; hero.mp = hero.maxMp; hero.gold = Math.floor(hero.gold * 0.8); player.position.set(0, 0, 6); deadOv.classList.add("hidden"); lockMouse(); }
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
  init(); buildClassCards();
  document.getElementById("resumebtn").onclick = lockMouse;
  document.getElementById("respawnbtn").onclick = respawn;
  loop();
}
