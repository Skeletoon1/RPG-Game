// Embeds selected .glb models as base64 into web/models/models.js so they load
// over file:// with no XHR (works on double-click and in the desktop app).
const fs = require("fs");
const pick = { soldier: "web/raw/soldier.glb", fox: "web/raw/fox.glb", robot: "web/raw/robot.glb", parrot: "web/raw/parrot.glb" };
let out = "window.MODELS = window.MODELS || {};\n";
for (const k in pick) {
  const b = fs.readFileSync(pick[k]).toString("base64");
  out += "window.MODELS." + k + " = \"" + b + "\";\n";
}
fs.writeFileSync("web/models/models.js", out);
console.log("models.js bytes:", fs.statSync("web/models/models.js").size);
