// Embed the slimmed web/models/*.glb files as base64 into web/models/models.js
// so the 3D models load with no XHR (works on double-click and in the app).
const fs = require("fs"), path = require("path");
const dir = "web/models";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".glb"));
let out = "window.MODELS = window.MODELS || {};\n";
for (const f of files) {
  const key = f.replace(/\.glb$/, "");
  const b = fs.readFileSync(path.join(dir, f)).toString("base64");
  out += "window.MODELS." + key + " = \"" + b + "\";\n";
}
fs.writeFileSync(path.join(dir, "models.js"), out);
console.log("embedded:", files.join(", "), "->", (fs.statSync(path.join(dir, "models.js")).size / 1048576).toFixed(1) + "MB");
