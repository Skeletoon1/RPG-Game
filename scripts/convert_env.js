// Convert curated KayKit Medieval Hexagon gltf models -> slim .glb in web/models/
const { NodeIO } = require("@gltf-transform/core");
const { dedup, prune, weld, quantize } = require("@gltf-transform/functions");
const fs = require("fs");
const B = "/tmp/hex/KayKit-Medieval-Hexagon-Pack-1.0-main/addons/kaykit_medieval_hexagon_pack/Assets/gltf";
const JOBS = {
  b_home_a: "buildings/blue/building_home_A_blue.gltf",
  b_home_b: "buildings/green/building_home_B_green.gltf",
  b_tavern: "buildings/blue/building_tavern_blue.gltf",
  b_church: "buildings/green/building_church_green.gltf",
  b_market: "buildings/blue/building_market_blue.gltf",
  b_tower: "buildings/green/building_tower_A_green.gltf",
  b_windmill: "buildings/blue/building_windmill_blue.gltf",
  b_well: "buildings/blue/building_well_blue.gltf",
  b_blacksmith: "buildings/green/building_blacksmith_green.gltf",
  tree_a: "decoration/nature/tree_single_A.gltf",
  tree_b: "decoration/nature/tree_single_B.gltf",
  trees_lg: "decoration/nature/trees_A_large.gltf",
  rock_a: "decoration/nature/rock_single_A.gltf",
  rock_c: "decoration/nature/rock_single_C.gltf",
  barrel: "decoration/props/barrel.gltf",
  crate: "decoration/props/crate_A_big.gltf",
  // town dressing
  fence_wood: "buildings/neutral/fence_wood_straight.gltf",
  fence_gate: "buildings/neutral/fence_wood_straight_gate.gltf",
  flag_red: "decoration/props/flag_red.gltf",
  flag_blue: "decoration/props/flag_blue.gltf",
  tent: "decoration/props/tent.gltf",
  weaponrack: "decoration/props/weaponrack.gltf",
  wheelbarrow: "decoration/props/wheelbarrow.gltf",
  sack: "decoration/props/sack.gltf",
  crate_long: "decoration/props/crate_long_A.gltf",
  lumber: "decoration/props/resource_lumber.gltf",
};
(async () => {
  const io = new NodeIO();
  for (const key in JOBS) {
    const src = B + "/" + JOBS[key];
    if (!fs.existsSync(src)) { console.log("MISS", src); continue; }
    const doc = await io.read(src);
    await doc.transform(dedup(), prune(), weld(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
    const out = "web/models/" + key + ".glb";
    await io.write(out, doc);
    console.log(key, (fs.statSync(out).size / 1024).toFixed(0) + "KB");
  }
})().catch(e => { console.error(e); process.exit(1); });
