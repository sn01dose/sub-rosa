import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { APPEARANCES, ASSET_DIR, ROOT_DIR, SELECTED_32_PATH, SELECTED_PATH, loadTypes, readJson, resolveSelectionPath, selectionValue, writeJson } from "./lib/character-data.mjs";

const TARGET_BYTES = 150 * 1024;
const MANIFEST_PATH = path.join(ASSET_DIR, "manifest.json");
const OUTPUTS = [
  { suffix: "", width: 640, height: 840 },
  { suffix: "@2x", width: 1280, height: 1680 }
];

function parseArgs(argv) {
  const options = { codes: null, appearance: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--code" && argv[index + 1]) { options.codes = argv[index + 1].split(",").map((code) => code.trim().toUpperCase()).filter(Boolean); index += 1; }
    else if (argv[index] === "--appearance" && argv[index + 1]) { options.appearance = argv[index + 1].toLowerCase(); index += 1; }
    else throw new Error(`不明な引数です: ${argv[index]}`);
  }
  if (options.appearance && !APPEARANCES[options.appearance]) throw new Error("--appearance は f / m で指定してください。");
  return options;
}

async function normalizedPng(input, width, height) {
  const trimmed = await sharp(input)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .png()
    .toBuffer();
  const padX = Math.round(width * 0.075);
  const padY = Math.round(height * 0.075);
  const inner = await sharp(trimmed)
    .resize({ width: width - padX * 2, height: height - padY * 2, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp(inner)
    .extend({ top: padY, bottom: padY, left: padX, right: padX, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

async function encodeWebp(png) {
  let best;
  const settings = [
    { quality: 88, alphaQuality: 100 },
    { quality: 78, alphaQuality: 96 },
    { quality: 68, alphaQuality: 90 },
    { quality: 58, alphaQuality: 84 },
    { quality: 48, alphaQuality: 76 },
    { quality: 40, alphaQuality: 68 },
    { quality: 34, alphaQuality: 60 },
    { quality: 28, alphaQuality: 52 },
    { quality: 22, alphaQuality: 44 }
  ];
  for (const setting of settings) {
    const buffer = await sharp(png).webp({ ...setting, smartSubsample: true, effort: 6 }).toBuffer();
    best = { buffer, ...setting };
    if (buffer.length <= TARGET_BYTES) break;
  }
  return best;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const types = await loadTypes();
  const selected = await readJson(SELECTED_32_PATH, await readJson(SELECTED_PATH, {}));
  const codes = options.codes || Object.keys(types);
  if (!codes.length) throw new Error("tools/selected-32.json に選定結果がありません。");
  await fs.mkdir(ASSET_DIR, { recursive: true });
  const existingManifest = await readJson(MANIFEST_PATH, { version: 2, characters: {} });
  const characters = structuredClone(existingManifest.characters || {});
  let processed = 0;

  for (const code of codes) {
    if (!types[code]) throw new Error(`不明なタイプコードです: ${code}`);
    const appearances = options.appearance ? [options.appearance] : Object.keys(APPEARANCES);
    characters[code] ||= { f: { exists: false, source: null, outputs: [] }, m: { exists: false, source: null, outputs: [] } };
    for (const appearance of appearances) {
      const value = selectionValue(selected, code, appearance);
      if (!value) continue;
      const input = resolveSelectionPath(code, value);
      await fs.access(input);
      const assetOutputs = [];
      for (const output of OUTPUTS) {
        const normalized = await normalizedPng(input, output.width, output.height);
        const encoded = await encodeWebp(normalized);
        const destination = path.join(ASSET_DIR, `${code}_${appearance}${output.suffix}.webp`);
        await fs.writeFile(destination, encoded.buffer);
        const metadata = await sharp(encoded.buffer).metadata();
        const stats = await sharp(encoded.buffer).stats();
        if (!metadata.hasAlpha || stats.isOpaque) throw new Error(`${code}_${appearance}${output.suffix}: 透過情報が維持されていません。`);
        const size = Math.round(encoded.buffer.length / 1024);
        const warning = encoded.buffer.length > TARGET_BYTES ? " (150KB目安超過)" : "";
        console.log(`${path.relative(process.cwd(), destination)}: ${metadata.width}x${metadata.height}, alpha=${metadata.hasAlpha}, q=${encoded.quality}, aq=${encoded.alphaQuality}, ${size}KB${warning}`);
        assetOutputs.push({
          file: path.relative(ROOT_DIR, destination).replaceAll(path.sep, "/"),
          width: metadata.width,
          height: metadata.height,
          bytes: encoded.buffer.length,
          hasAlpha: metadata.hasAlpha,
          hasTransparency: !stats.isOpaque,
          quality: encoded.quality,
          alphaQuality: encoded.alphaQuality
        });
      }
      characters[code][appearance] = {
        exists: true,
        source: path.relative(ROOT_DIR, input).replaceAll(path.sep, "/"),
        outputs: assetOutputs
      };
      processed += 1;
    }
  }

  await writeJson(MANIFEST_PATH, {
    version: 2,
    generatedAt: new Date().toISOString(),
    targetBytes: TARGET_BYTES,
    complete: Object.keys(types).every((code) => characters[code]?.f?.exists && characters[code]?.m?.exists),
    characters
  });
  console.log(`${path.relative(process.cwd(), MANIFEST_PATH)}: ${processed}姿を更新`);
}

main().catch((error) => {
  console.error(`最終化に失敗しました: ${error.message}`);
  process.exitCode = 1;
});
