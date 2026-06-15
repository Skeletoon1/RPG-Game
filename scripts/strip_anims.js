// Strips KayKit models down to a few needed animation clips to shrink file size,
// then writes the slim .glb into web/models/. CC0 source (KayKit).
const { NodeIO } = require("@gltf-transform/core");
const { prune, dedup, resample, weld, quantize } = require("@gltf-transform/functions");
const fs = require("fs");

const KEEP = new Set([
  "Idle", "Walking_A", "Running_A", "1H_Melee_Attack_Slice_Diagonal", "Hit_A",
]);

const JOBS = {
  mage: "web/raw/Mage.glb", knight: "web/raw/Knight.glb", rogue: "web/raw/Rogue.glb",
  skel_warrior: "web/raw/Skeleton_Warrior.glb", skel_mage: "web/raw/Skeleton_Mage.glb",
};

(async () => {
  const io = new NodeIO();
  for (const key in JOBS) {
    const src = JOBS[key];
    if (!fs.existsSync(src)) { console.log("skip (missing):", src); continue; }
    const doc = await io.read(src);
    let kept = 0;
    for (const anim of doc.getRoot().listAnimations()) {
      if (KEEP.has(anim.getName())) kept++; else anim.dispose();
    }
    await doc.transform(
      resample(),          // drop redundant animation keyframes
      dedup(), prune(),
      weld(),
      quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12, quantizeWeight: 10, quantizeColor: 8 })
    );
    const out = "web/models/" + key + ".glb";
    await io.write(out, doc);
    console.log(key, "kept", kept, "anims ->", (fs.statSync(out).size / 1024).toFixed(0) + "KB");
  }
})().catch(e => { console.error(e); process.exit(1); });
