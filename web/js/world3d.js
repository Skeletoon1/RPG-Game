"use strict";
// ============================================================================
//  3D ADVENTURE (beta) — real-time action, third-person, WASD + mouse-look.
//  Built on Three.js (vendored). Reuses CLASSES from data.js for stats/colors.
//  Phase 1: explore a zone, fight roaming chibi monsters in real time.
// ============================================================================
if (typeof THREE === "undefined") {
  document.getElementById("start").innerHTML =
    "<h1>3D failed to load</h1><div class='tag'>Three.js didn't load. Try the 2D game from the menu.</div>";
}

// ---- globals ----
let renderer, scene, camera, clock;
let player, hero;                 // player = 3D group; hero = stats object
const enemies = [], projectiles = [], floats = [];
const keys = {};
let yaw = 0, pitch = 0.15, locked = false, running = false, paused = false;
const W = () => window.innerWidth, H = () => window.innerHeight;
const TMP = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const WORLD = 90;                 // half-size of the play area

const hud = document.getElementById("hud");
const startOv = document.getElementById("start");
const pauseOv = document.getElementById("pause");
const deadOv = document.getElementById("dead");

// ---- chibi model builder ----
function mat(c) { return new THREE.MeshLambertMaterial({ color: c }); }
function box(w, h, d, c) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c)); }
function sph(r, c) { return new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(c)); }
function cone(r, h, c) { return new THREE.Mesh(new THREE.ConeGeometry(r, h, 12), mat(c)); }

function makeChibi(opt) {
  opt = opt || {};
  const g = new THREE.Group();
  const skin = opt.skin || 0xe8c9a0, body = opt.body || 0x8a5acb, hair = opt.hair || 0x2a1f3a;
  // legs
  const l1 = box(0.28, 0.5, 0.28, 0x2a2238); l1.position.set(-0.18, 0.25, 0);
  const l2 = l1.clone(); l2.position.x = 0.18; g.add(l1, l2);
  // body
  const torso = box(0.72, 0.7, 0.42, body); torso.position.y = 0.85; g.add(torso);
  // arms
  const a1 = box(0.2, 0.6, 0.2, body); a1.position.set(-0.48, 0.9, 0);
  const a2 = a1.clone(); a2.position.x = 0.48; g.add(a1, a2);
  // big chibi head
  const head = sph(0.55, skin); head.position.y = 1.7; g.add(head);
  // hair cap
  const cap = sph(0.6, hair); cap.position.y = 1.85; cap.scale.set(1, 0.6, 1); g.add(cap);
  // eyes (face +z)
  const e1 = sph(0.08, 0x141018); e1.position.set(-0.2, 1.7, 0.5);
  const e2 = e1.clone(); e2.position.x = 0.2; g.add(e1, e2);
  if (opt.horns) {
    const h1 = cone(0.12, 0.35, 0x55121a); h1.position.set(-0.28, 2.2, 0); h1.rotation.z = 0.3;
    const h2 = h1.clone(); h2.position.x = 0.28; h2.rotation.z = -0.3; g.add(h1, h2);
  }
  if (opt.scale) g.scale.setScalar(opt.scale);
  return g;
}

// ---- init scene ----
function init() {
  const canvas = document.getElementById("c3d");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1230);
  scene.fog = new THREE.Fog(0x1a1230, 40, 130);
  camera = new THREE.PerspectiveCamera(60, W() / H(), 0.1, 400);
  clock = new THREE.Clock();

  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x3a2a4a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff0d0, 0.8);
  sun.position.set(30, 60, 20); scene.add(sun);

  // ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD * 2, WORLD * 2),
    new THREE.MeshLambertMaterial({ color: 0x2c3a26 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // grid-ish patches
  for (let i = 0; i < 40; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(THREE.MathUtils.randFloat(2, 6), 8),
      new THREE.MeshLambertMaterial({ color: 0x35472d }));
    p.rotation.x = -Math.PI / 2; p.position.set(rand(WORLD), 0.01, rand(WORLD)); scene.add(p);
  }
  // scenery: trees & rocks & ruined pillars
  for (let i = 0; i < 70; i++) {
    const x = rand(WORLD), z = rand(WORLD);
    if (Math.hypot(x, z) < 8) continue;
    if (Math.random() < 0.6) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.4, 6), mat(0x4a3320));
      trunk.position.set(x, 1.2, z);
      const leaves = sph(1.6, 0x2f5d34); leaves.position.set(x, 3.2, z); leaves.scale.y = 1.2;
      scene.add(trunk, leaves);
    } else {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(THREE.MathUtils.randFloat(0.7, 1.6)), mat(0x6a6a72));
      rock.position.set(x, 0.5, z); rock.rotation.set(Math.random(), Math.random(), Math.random());
      scene.add(rock);
    }
  }
  // boundary ring of pillars
  for (let a = 0; a < Math.PI * 2; a += 0.18) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), mat(0x241c30));
    pil.position.set(Math.sin(a) * WORLD, 4, Math.cos(a) * WORLD); scene.add(pil);
  }

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

// ---- player ----
const POWER_STAT = { overlord: "mag", demon: "mag", maid: "mag", ranger: "atk", vampire: "atk", frost: "atk" };
const RANGED = { overlord: 1, demon: 1, maid: 1, ranger: 1 };

function makeHero(clsKey) {
  const cc = CLASSES[clsKey], b = cc.base;
  const col = parseInt((cc.color || "#b06bff").slice(1), 16);
  hero = {
    clsKey, name: cc.name, color: cc.color,
    level: 1, xp: 0, xpNext: 40 + 1 * 1 * 18, gold: 0,
    maxHp: b.hp, maxMp: b.mp, hp: b.hp, mp: b.mp,
    atk: b.atk, mag: b.mag, def: b.def, spd: 7,
    powerStat: POWER_STAT[clsKey] || "atk", ranged: !!RANGED[clsKey],
    cd: { basic: 0, a1: 0, a2: 0, a3: 0 }, regen: 0,
  };
  player = makeChibi({ body: col, hair: 0x201826, scale: 1.0 });
  player.position.set(0, 0, 0);
  scene.add(player);
  buildAbilityHUD();
}
function power() { return hero[hero.powerStat]; }

// ---- abilities ----
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
    d.innerHTML = "<span class='k'>" + a.key + "</span>" + a.name +
      (a.mp ? "<br><small style='color:#8ab6ff'>" + a.mp + " MP</small>" : "") +
      "<div class='cd' style='display:none'></div>";
    bar.appendChild(d);
  });
}
function ready(id, mp) { return hero.cd[id] <= 0 && hero.mp >= (mp || 0); }
function elementColor() { return ({ overlord: "#c06bff", demon: "#ff7a3c", maid: "#ffe14d", ranger: "#7dff6b", vampire: "#ff5a6e", frost: "#7fe9ff" })[hero.clsKey] || "#b06bff"; }

function basicAttack() {
  if (!ready("basic")) return;
  hero.cd.basic = ABZ[0].cd;
  const dmg = Math.round((8 + power() * 0.8) * varf());
  if (hero.ranged) shoot(dmg, elementColor());
  else meleeHit(3.0, dmg);
}
function ability(id) {
  const a = ABZ.find(x => x.id === id); if (!ready(id, a.mp)) return;
  hero.cd[id] = a.cd; hero.mp -= a.mp;
  if (id === "a1") { // Nova AoE around player
    popText(player.position.clone().add(new THREE.Vector3(0, 2.2, 0)), "NOVA", elementColor());
    spawnRing(player.position.clone(), elementColor());
    const dmg = Math.round((20 + power() * 1.2) * varf());
    enemies.forEach(en => { if (en.alive && en.mesh.position.distanceTo(player.position) < 6.5) hurtEnemy(en, dmg, elementColor()); });
  } else if (id === "a2") { // Heal
    const amt = Math.round(hero.maxHp * 0.25 + hero.mag * 0.8);
    hero.hp = Math.min(hero.maxHp, hero.hp + amt);
    popText(player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), "+" + amt, "#46e08a");
    spawnRing(player.position.clone(), "#46e08a");
  } else if (id === "a3") { // Burst forward
    const dmg = Math.round((30 + power() * 1.6) * varf());
    if (hero.ranged) shoot(dmg, elementColor(), 1.7, 2.0);
    else meleeHit(4.0, dmg, 0.9);
  }
}
function varf() { return 0.9 + Math.random() * 0.2; }

function forwardVec() { return new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)); }
function meleeHit(range, dmg, wide) {
  const f = forwardVec(); const ang = wide ? 0.9 : 0.6;
  swing(elementColor());
  enemies.forEach(en => {
    if (!en.alive) return;
    const to = en.mesh.position.clone().sub(player.position); const dist = to.length();
    if (dist > range) return;
    to.normalize();
    if (to.dot(f) > Math.cos(ang)) hurtEnemy(en, dmg, elementColor());
  });
}
function shoot(dmg, color, scale, speedMul) {
  const m = sph(0.25 * (scale || 1), parseInt(color.slice(1), 16));
  m.position.copy(player.position).add(new THREE.Vector3(0, 1.2, 0)).add(forwardVec().multiplyScalar(0.8));
  scene.add(m);
  projectiles.push({ mesh: m, dir: forwardVec(), speed: 26 * (speedMul || 1), life: 1.6, dmg, color });
}

// ---- enemies ----
const EKINDS = [
  { name: "Goblin", body: 0x4e7d36, skin: 0x6a9a44, hp: 34, atk: 9, xp: 12, gold: 6, scale: 0.8 },
  { name: "Wolf", body: 0x6a6a72, skin: 0x6a6a72, hp: 30, atk: 11, xp: 14, gold: 5, scale: 0.7 },
  { name: "Ogre", body: 0x8a5a40, skin: 0xb07a56, hp: 80, atk: 18, xp: 30, gold: 16, scale: 1.25, horns: 1 },
];
function spawnEnemy() {
  const k = EKINDS[Math.floor(Math.random() * EKINDS.length)];
  const lvl = hero.level;
  const mesh = makeChibi({ body: k.body, skin: k.skin, hair: 0x222018, horns: k.horns, scale: k.scale });
  let x, z; do { x = rand(WORLD - 6); z = rand(WORLD - 6); } while (Math.hypot(x, z) < 18);
  mesh.position.set(x, 0, z); scene.add(mesh);
  const maxHp = Math.round(k.hp * (1 + 0.25 * (lvl - 1)));
  const bar = document.createElement("div"); bar.className = "ehp"; bar.innerHTML = "<i></i>"; hud.appendChild(bar);
  enemies.push({
    kind: k, mesh, alive: true, hp: maxHp, maxHp,
    atk: Math.round(k.atk * (1 + 0.22 * (lvl - 1))), def: 4 + lvl * 2,
    xpReward: Math.round(k.xp * (1 + 0.3 * (lvl - 1))), goldReward: Math.round(k.gold * (1 + 0.3 * (lvl - 1))),
    speed: 3.2 + Math.random() * 1.5, atkCd: 0, wanderT: 0, wdir: new THREE.Vector3(), bar,
  });
}
function hurtEnemy(en, dmg, color) {
  if (!en.alive) return;
  const real = Math.max(1, Math.round(dmg * 100 / (100 + en.def)));
  en.hp -= real;
  popText(en.mesh.position.clone().add(new THREE.Vector3(0, 2.6, 0)), "" + real, color || "#fff");
  if (en.hp <= 0) killEnemy(en);
}
function killEnemy(en) {
  en.alive = false; scene.remove(en.mesh); if (en.bar) en.bar.remove();
  hero.gold += en.goldReward; gainXp(en.xpReward);
  popText(player.position.clone().add(new THREE.Vector3(0, 3, 0)), "+" + en.xpReward + " XP", "#ffd866");
}
function gainXp(n) {
  hero.xp += n;
  while (hero.xp >= hero.xpNext) {
    hero.xp -= hero.xpNext; hero.level++; hero.xpNext = 40 + hero.level * hero.level * 18;
    hero.maxHp += 16; hero.maxMp += 8; hero.atk += 3; hero.mag += 3; hero.def += 2;
    hero.hp = hero.maxHp; hero.mp = hero.maxMp;
    popText(player.position.clone().add(new THREE.Vector3(0, 3.4, 0)), "LEVEL UP! " + hero.level, "#ffe14d");
  }
}

// ---- fx ----
function popText(pos, text, color) { floats.push({ pos: pos.clone(), text, color, life: 1.1, el: null }); }
function swing(color) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.12, 6, 16), mat(parseInt(color.slice(1), 16)));
  ring.position.copy(player.position).add(new THREE.Vector3(0, 1, 0)); ring.lookAt(player.position.clone().add(forwardVec()));
  scene.add(ring); projectiles.push({ mesh: ring, dir: new THREE.Vector3(), speed: 0, life: 0.18, dmg: 0, fade: true });
}
function spawnRing(pos, color) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.18, 6, 20), mat(parseInt(color.slice(1), 16)));
  ring.position.copy(pos).add(new THREE.Vector3(0, 0.4, 0)); ring.rotation.x = -Math.PI / 2;
  scene.add(ring); projectiles.push({ mesh: ring, dir: new THREE.Vector3(), speed: 0, life: 0.5, dmg: 0, fade: true, grow: 14 });
}

// ---- update ----
function update(dt) {
  // cooldowns / regen
  for (const k in hero.cd) hero.cd[k] = Math.max(0, hero.cd[k] - dt);
  hero.regen += dt;
  if (hero.regen > 0.5) { hero.mp = Math.min(hero.maxMp, hero.mp + 3); hero.regen = 0; }
  if (keys.Digit1) ability("a1");
  if (keys.Digit2) ability("a2");
  if (keys.Digit3) ability("a3");
  if (keys.Space) basicAttack();

  // movement (relative to camera yaw)
  running = !!keys.ShiftLeft || !!keys.ShiftRight;
  const f = forwardVec(); const right = new THREE.Vector3().crossVectors(f, UP).negate();
  const move = new THREE.Vector3();
  if (keys.KeyW) move.add(f); if (keys.KeyS) move.sub(f);
  if (keys.KeyA) move.sub(right); if (keys.KeyD) move.add(right);
  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(hero.spd * (running ? 1.7 : 1) * dt);
    player.position.add(move);
    const lim = WORLD - 3;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -lim, lim);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -lim, lim);
    player.rotation.y = Math.atan2(move.x, move.z);
  }

  // projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; p.life -= dt;
    if (p.speed) p.mesh.position.add(TMP.copy(p.dir).multiplyScalar(p.speed * dt));
    if (p.grow) p.mesh.scale.addScalar(p.grow * dt);
    if (p.fade) p.mesh.material.opacity = Math.max(0, p.life * 4), p.mesh.material.transparent = true;
    if (p.dmg) {
      for (const en of enemies) {
        if (en.alive && en.mesh.position.distanceTo(p.mesh.position) < 1.3) {
          hurtEnemy(en, p.dmg, p.color); p.life = 0; break;
        }
      }
    }
    if (p.life <= 0) { scene.remove(p.mesh); projectiles.splice(i, 1); }
  }

  // enemies AI
  let alive = 0;
  for (const en of enemies) {
    if (!en.alive) continue; alive++;
    en.atkCd = Math.max(0, en.atkCd - dt);
    const toP = player.position.clone().sub(en.mesh.position); const dist = toP.length();
    en.mesh.position.y = Math.sin(performance.now() * 0.005 + en.mesh.id) * 0.05;
    if (dist < 16) {
      toP.y = 0; toP.normalize();
      if (dist > 2.0) en.mesh.position.add(toP.multiplyScalar(en.speed * dt));
      en.mesh.rotation.y = Math.atan2(toP.x, toP.z);
      if (dist <= 2.4 && en.atkCd <= 0) {
        en.atkCd = 1.2;
        const dmg = Math.max(1, Math.round(en.atk * 100 / (100 + hero.def)));
        hero.hp -= dmg;
        popText(player.position.clone().add(new THREE.Vector3(0, 2.4, 0)), "-" + dmg, "#ff5a6e");
        if (hero.hp <= 0) { hero.hp = 0; onDeath(); }
      }
    } else { // wander
      en.wanderT -= dt;
      if (en.wanderT <= 0) { en.wanderT = 1 + Math.random() * 2; en.wdir.set(rand(1), 0, rand(1)).normalize(); }
      en.mesh.position.add(en.wdir.clone().multiplyScalar(en.speed * 0.4 * dt));
    }
  }
  while (alive < 8) { spawnEnemy(); alive++; }

  // camera (third-person follow)
  const camDist = 8, camHeight = 3.2 + pitch * 6;
  const back = forwardVec().multiplyScalar(-camDist);
  camera.position.copy(player.position).add(back).add(new THREE.Vector3(0, camHeight, 0));
  camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.6, 0)));

  updateHUD();
}

// ---- HUD / projection ----
function toScreen(v) { const p = v.clone().project(camera); return { x: (p.x * 0.5 + 0.5) * W(), y: (-p.y * 0.5 + 0.5) * H(), behind: p.z > 1 }; }
function updateHUD() {
  document.getElementById("hpfill").style.width = (100 * hero.hp / hero.maxHp) + "%";
  document.getElementById("mpfill").style.width = (100 * hero.mp / hero.maxMp) + "%";
  document.getElementById("stats").innerHTML =
    "<b>" + hero.name + "</b>  Lv." + hero.level + "  HP " + Math.ceil(hero.hp) + "/" + hero.maxHp +
    "  ·  <span id='gold'>" + hero.gold + "g</span>  ·  XP " + hero.xp + "/" + hero.xpNext;
  ABZ.forEach(a => {
    const cdEl = document.querySelector("#ab-" + a.id + " .cd"); if (!cdEl) return;
    if (hero.cd[a.id] > 0) { cdEl.style.display = "flex"; cdEl.textContent = hero.cd[a.id].toFixed(1); }
    else cdEl.style.display = "none";
  });
  // floating texts
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.life -= 0.016; f.pos.y += 0.02;
    if (!f.el) { f.el = document.createElement("div"); f.el.className = "float"; f.el.textContent = f.text; f.el.style.color = f.color; hud.appendChild(f.el); }
    const s = toScreen(f.pos);
    if (s.behind) { f.el.style.display = "none"; } else { f.el.style.display = ""; f.el.style.left = s.x + "px"; f.el.style.top = s.y + "px"; f.el.style.opacity = Math.max(0, f.life); }
    if (f.life <= 0) { f.el.remove(); floats.splice(i, 1); }
  }
  // enemy hp bars
  for (const en of enemies) {
    if (!en.bar) continue;
    if (!en.alive) { en.bar.style.display = "none"; continue; }
    const s = toScreen(en.mesh.position.clone().add(new THREE.Vector3(0, 2.4 * (en.kind.scale || 1), 0)));
    if (s.behind || en.mesh.position.distanceTo(player.position) > 40) { en.bar.style.display = "none"; continue; }
    en.bar.style.display = ""; en.bar.style.left = s.x + "px"; en.bar.style.top = s.y + "px";
    en.bar.firstChild.style.width = (100 * Math.max(0, en.hp) / en.maxHp) + "%";
  }
}

// ---- loop ----
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  if (running !== undefined && !paused && hero && hero.hp > 0) update(dt);
  if (renderer) renderer.render(scene, camera);
}

// ---- flow ----
function onDeath() {
  document.exitPointerLock && document.exitPointerLock();
  document.getElementById("deadmsg").textContent =
    "You reached level " + hero.level + " with " + hero.gold + " gold. The New World is unforgiving.";
  deadOv.classList.remove("hidden");
}
function respawn() {
  hero.hp = hero.maxHp; hero.mp = hero.maxMp; hero.gold = Math.floor(hero.gold * 0.8);
  player.position.set(0, 0, 0); deadOv.classList.add("hidden");
  lockMouse();
}
function showPause() { paused = true; pauseOv.classList.remove("hidden"); }
function hidePause() { paused = false; pauseOv.classList.add("hidden"); }
function lockMouse() { document.getElementById("c3d").requestPointerLock(); }

function startGame(clsKey) {
  startOv.classList.add("hidden"); hud.classList.remove("hidden");
  makeHero(clsKey);
  for (let i = 0; i < 8; i++) spawnEnemy();
  running = false;
  lockMouse();
}

function buildClassCards() {
  const wrap = document.getElementById("classcards");
  for (const key in CLASSES) {
    const cc = CLASSES[key];
    const c = document.createElement("div"); c.className = "card";
    c.innerHTML = "<b style='color:" + cc.color + "'>" + cc.name + "</b><span>" + cc.style + "</span>";
    c.onclick = () => startGame(key);
    wrap.appendChild(c);
  }
}

// ---- boot ----
if (typeof THREE !== "undefined") {
  init();
  buildClassCards();
  document.getElementById("resumebtn").onclick = lockMouse;
  document.getElementById("respawnbtn").onclick = respawn;
  loop();
}
