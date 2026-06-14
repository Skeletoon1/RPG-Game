// Generates build/icon.png (512x512) procedurally — a glowing purple orb with
// hollow lich eyes, matching the game's Nazarick theme. No image tools needed.
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const S = 512;
const buf = Buffer.alloc(S * S * 4);
const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
function set(x, y, r, g, b, a) { const i = (y * S + x) * 4; buf[i]=r; buf[i+1]=g; buf[i+2]=b; buf[i+3]=a; }

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const cx = x - S / 2, cy = y - S / 2;
    const od = Math.sqrt(cx * cx + cy * cy);
    const d = od / (S / 2);
    // background: deep violet vignette
    let r = 18 + (1 - d) * 26, g = 8 + (1 - d) * 8, b = 30 + (1 - d) * 44;
    // glowing orb
    const orbR = S * 0.34;
    if (od < orbR) {
      const t = 1 - od / orbR;
      r = 110 + t * 130; g = 40 + t * 55; b = 200 + t * 55;
      // soft inner light
      r += t * t * 30; b += t * t * 20;
    }
    // outer ring glow
    const ring = Math.abs(od - orbR);
    if (ring < 14) { const t = 1 - ring / 14; r += t * 90; g += t * 30; b += t * 110; }
    // two hollow "eyes" (lich)
    const eyeY = cy + 24;
    const e1 = Math.sqrt((cx + 58) ** 2 + eyeY ** 2);
    const e2 = Math.sqrt((cx - 58) ** 2 + eyeY ** 2);
    if (e1 < 34 || e2 < 34) {
      const ed = Math.min(e1, e2);
      const t = 1 - ed / 34;
      r = 10 + t * 0; g = 6; b = 16;
      if (ed < 16) { r = 200 * (1 - ed / 16) + 20; g = 70 * (1 - ed / 16); b = 255 * (1 - ed / 16) + 30; }
    }
    set(x, y, clamp(r), clamp(g), clamp(b), 255);
  }
}

// ---- encode PNG ----
function crc32(b) {
  let c = ~0;
  for (let i = 0; i < b.length; i++) {
    c ^= b[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcBuf]);
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
// raw scanlines with filter byte 0
const raw = Buffer.alloc(S * (S * 4 + 1));
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  buf.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}
const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);

const out = path.join(__dirname, "..", "build", "icon.png");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, png);
console.log("wrote " + out + " (" + png.length + " bytes)");
