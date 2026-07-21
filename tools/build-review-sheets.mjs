import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { OUT_DIR, escapeHtml, loadTypes } from "./lib/character-data.mjs";

const CELL_WIDTH = 320;
const CELL_HEIGHT = 500;
const IMAGE_WIDTH = 300;
const IMAGE_HEIGHT = 450;
const TYPES_PER_SHEET = 4;

function labelSvg(text, width = CELL_WIDTH, height = 38) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#241a2e"/>
    <text x="12" y="25" fill="#efe6da" font-family="Arial, sans-serif" font-size="16">${escapeHtml(text)}</text>
  </svg>`);
}

async function candidateTile(code, file, source) {
  const image = await sharp(path.join(OUT_DIR, source, code, file))
    .resize({ width: IMAGE_WIDTH, height: IMAGE_HEIGHT, fit: "contain", background: "#efe6da" })
    .flatten({ background: "#efe6da" })
    .png()
    .toBuffer();
  return sharp({ create: { width: CELL_WIDTH, height: CELL_HEIGHT, channels: 3, background: "#17111b" } })
    .composite([
      { input: image, left: 10, top: 40 },
      { input: labelSvg(`${code} / ${file}`), left: 0, top: 0 }
    ])
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

async function main() {
  const args = process.argv.slice(2);
  let source = null;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--source" && args[index + 1]) { source = args[index + 1].toLowerCase(); index += 1; }
    else throw new Error(`不明な引数です: ${args[index]}`);
  }
  if (!new Set(["f", "m"]).has(source)) throw new Error("--source は f / m で指定してください。");
  const types = await loadTypes();
  const codes = [];
  for (const code of Object.keys(types)) {
    try { await fs.access(path.join(OUT_DIR, source, code, "candidate-1.png")); codes.push(code); }
    catch { /* This appearance is already confirmed or not generated. */ }
  }
  const sheetDir = path.join(OUT_DIR, source, "review-sheets");
  await fs.mkdir(sheetDir, { recursive: true });

  for (let offset = 0; offset < codes.length; offset += TYPES_PER_SHEET) {
    const group = codes.slice(offset, offset + TYPES_PER_SHEET);
    const tiles = [];
    for (let row = 0; row < group.length; row += 1) {
      for (let candidate = 1; candidate <= 3; candidate += 1) {
        const file = `candidate-${candidate}.png`;
        tiles.push({ input: await candidateTile(group[row], file, source), left: (candidate - 1) * CELL_WIDTH, top: row * CELL_HEIGHT });
      }
    }
    const destination = path.join(sheetDir, `sheet-${Math.floor(offset / TYPES_PER_SHEET) + 1}.jpg`);
    await sharp({ create: { width: CELL_WIDTH * 3, height: CELL_HEIGHT * group.length, channels: 3, background: "#17111b" } })
      .composite(tiles)
      .jpeg({ quality: 90, chromaSubsampling: "4:4:4" })
      .toFile(destination);
    console.log(path.relative(process.cwd(), destination));
  }
}

main().catch((error) => {
  console.error(`レビューシート作成に失敗しました: ${error.message}`);
  process.exitCode = 1;
});
