"use strict";
// Runtime smoke for the 3D mode: mock Three.js (with a real Vector3 for the
// math) + DOM, load world3d.js, start a game, run update ticks and combat.
// Catches API/typo/logic errors without a real WebGL context.
const fs = require("fs"), path = require("path"), vm = require("vm");
const base = path.join(__dirname, "..", "web");

// ---- real-ish Vector3 ----
class V3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new V3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  addScalar(s) { this.x += s; this.y += s; this.z += s; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  length() { return Math.hypot(this.x, this.y, this.z); }
  lengthSq() { return this.x * this.x + this.y * this.y + this.z * this.z; }
  normalize() { const l = this.length() || 1; return this.multiplyScalar(1 / l); }
  distanceTo(v) { return Math.hypot(this.x - v.x, this.y - v.y, this.z - v.z); }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
  negate() { this.x = -this.x; this.y = -this.y; this.z = -this.z; return this; }
  crossVectors(a, b) { this.x = a.y * b.z - a.z * b.y; this.y = a.z * b.x - a.x * b.z; this.z = a.x * b.y - a.y * b.x; return this; }
  project() { return this; }
}
let _id = 0;
function obj() {
  return {
    id: _id++, position: new V3(),
    rotation: { x: 0, y: 0, z: 0, set(a, b, c) { this.x = a; this.y = b; this.z = c; } },
    scale: { x: 1, y: 1, z: 1, set(a, b, c) { this.x = a; this.y = b; this.z = c; }, setScalar(s) { this.x = this.y = this.z = s; }, addScalar(s) { this.x += s; this.y += s; this.z += s; } },
    material: { color: 0, opacity: 1, transparent: false }, children: [], isMesh: true, userData: {},
    add() { for (const a of arguments) this.children.push(a); }, remove() {}, lookAt() {},
    traverse(fn) { fn(this); for (const c of this.children) (c && c.traverse) ? c.traverse(fn) : fn(c); },
    clone() { const o = obj(); o.position.copy(this.position); return o; },
  };
}
function planeGeo() { return { attributes: { position: { count: 4, getX: () => 0, getY: () => 0, setZ() {} } }, computeVertexNormals() {} }; }
function geoWithH(r, h) { return { parameters: { height: h || 1 } }; }
const THREE = {
  Vector3: V3,
  Group: function () { return obj(); },
  Mesh: function (g, m) { const o = obj(); o.geometry = g || { parameters: {} }; if (m) o.material = m; return o; },
  Sprite: function (m) { const o = obj(); o.material = m || { rotation: 0, opacity: 1, transparent: false }; return o; },
  Points: function () { return obj(); },
  Scene: function () { return { add() {}, remove() {}, background: null, fog: null }; },
  PerspectiveCamera: function () { return { aspect: 1, position: new V3(), updateProjectionMatrix() {}, lookAt() {} }; },
  WebGLRenderer: function () { return { setPixelRatio() {}, setSize() {}, render() {}, shadowMap: { enabled: false, type: 0 }, outputEncoding: 0 }; },
  Color: function () { return { copy() { return this; }, set() { return this; } }; },
  Fog: function () {}, FogExp2: function () {},
  HemisphereLight: function () { return obj(); },
  DirectionalLight: function () { const o = obj(); o.castShadow = false; o.shadow = { mapSize: { set() {} }, camera: {} }; return o; },
  PointLight: function () { const o = obj(); o.intensity = 1; o.distance = 0; return o; },
  BoxGeometry: function () { return {}; }, SphereGeometry: function () { return {}; },
  ConeGeometry: function (r, h) { return geoWithH(r, h); }, CylinderGeometry: function () { return {}; },
  PlaneGeometry: function () { return planeGeo(); }, CircleGeometry: function () { return {}; },
  DodecahedronGeometry: function () { return {}; }, TorusGeometry: function () { return {}; },
  OctahedronGeometry: function () { return {}; }, RingGeometry: function () { return {}; },
  BufferGeometry: function () { return { setAttribute() {}, attributes: {}, computeVertexNormals() {} }; },
  BufferAttribute: function () { return {}; },
  CanvasTexture: function () { return {}; },
  DataTexture: function () { return { needsUpdate: false, minFilter: 0, magFilter: 0 }; },
  ShaderMaterial: function (o) { return Object.assign({ uniforms: {} }, o); },
  MeshToonMaterial: function (o) { return { color: (o && o.color) || 0, emissive: 0, emissiveIntensity: 1, opacity: 1, transparent: false, gradientMap: null }; },
  MeshBasicMaterial: function (o) { return Object.assign({ color: 0, opacity: 1, transparent: false }, o); },
  MeshLambertMaterial: function (o) { return { color: (o && o.color) || 0, opacity: 1, transparent: false }; },
  SpriteMaterial: function (o) { return Object.assign({ rotation: 0, opacity: 1, transparent: false }, o); },
  PointsMaterial: function (o) { return o || {}; },
  AdditiveBlending: 2, BackSide: 1, DoubleSide: 2, NearestFilter: 3, RedFormat: 1, PCFSoftShadowMap: 1,
  Clock: function () { return { getDelta() { return 0.016; } }; },
  MathUtils: { clamp: (v, a, b) => Math.max(a, Math.min(b, v)), randFloat: (a, b) => a + Math.random() * (b - a), randFloatSpread: s => (Math.random() - 0.5) * s },
};

// ---- DOM mock ----
function elMock() {
  const cls = new Set();
  return {
    classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c), toggle: c => (cls.has(c) ? cls.delete(c) : cls.add(c)) },
    style: {}, _children: [], onclick: null, firstChild: { style: {} },
    set innerHTML(v) {}, set textContent(v) {}, get textContent() { return ""; },
    appendChild(c) { this._children.push(c); return c; }, remove() {}, matches() { return false; },
    addEventListener() {}, requestPointerLock() {}, querySelector() { return elMock(); },
    getContext(type) {
      if (type === "2d") return { createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, fillText() {}, set fillStyle(v) {}, set font(v) {} };
      return {};
    },
  };
}
const els = {};
const document = {
  getElementById: id => (els[id] || (els[id] = elMock())),
  createElement: () => elMock(), querySelector: () => elMock(),
  addEventListener() {}, exitPointerLock() {}, get pointerLockElement() { return null; },
};
const window = { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1, addEventListener() {} };

const ctx = { THREE, document, window, Math, JSON, console, performance: { now: () => Date.now() }, requestAnimationFrame: () => 0 };
vm.createContext(ctx);

let pass = 0, fail = 0;
function ok(n, c) { if (c) { pass++; console.log("PASS  " + n); } else { fail++; console.log("FAIL  " + n); } }
function step(n, fn) { try { fn(); ok(n, true); } catch (e) { ok(n, false); console.log("   → " + e.message + "\n" + (e.stack || "").split("\n").slice(1, 3).join("\n")); } }

step("load data.js + world3d.js (runs init, buildClassCards, loop)", () => {
  vm.runInContext(fs.readFileSync(path.join(base, "js", "data.js"), "utf8"), ctx, { filename: "data.js" });
  vm.runInContext(fs.readFileSync(path.join(base, "js", "world3d.js"), "utf8"), ctx, { filename: "world3d.js" });
});
vm.runInContext("this.__g={startGame,update,basicAttack,ability,spawnEnemy,hurtEnemy,getHero:()=>hero,getEnemies:()=>enemies};", ctx);
const G = ctx.__g;

step("startGame('overlord') builds hero + enemies", () => {
  G.startGame("overlord");
  if (!G.getHero()) throw new Error("no hero");
  if (G.getEnemies().length < 8) throw new Error("enemies not spawned");
});
step("run 30 update ticks", () => { for (let i = 0; i < 30; i++) G.update(0.016); });
step("basic attack + abilities fire", () => { G.basicAttack(); G.ability("a1"); G.ability("a2"); G.ability("a3"); });
step("kill an enemy → xp & gold awarded (level path)", () => {
  const h0gold = G.getHero().gold, h0xp = G.getHero().xp + (G.getHero().level - 1) * 1000;
  const en = G.getEnemies().find(e => e.alive);
  G.hurtEnemy(en, 999999, "#fff");
  if (en.alive) throw new Error("enemy survived lethal damage");
  const h = G.getHero();
  const xpNow = h.xp + (h.level - 1) * 1000;
  if (!(h.gold > h0gold)) throw new Error("no gold awarded");
  if (!(xpNow > h0xp)) throw new Error("no xp awarded");
});
step("hero still consistent after combat", () => {
  const h = G.getHero();
  if (!(h.hp >= 0 && h.maxHp > 0 && h.level >= 1)) throw new Error("hero state invalid");
});

console.log("\n" + pass + "/" + (pass + fail) + " 3D smoke checks passed");
process.exit(fail ? 1 : 0);
