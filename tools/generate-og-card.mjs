import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const run = promisify(execFile);
const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(TOOL_DIR, "..");
const OUTPUT_PATH = path.join(ROOT_DIR, "assets", "og-card.png");
const WIDTH = 1200;
const HEIGHT = 630;

async function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { await fs.access(candidate); return candidate; }
    catch { /* Try the next local browser. */ }
  }
  throw new Error("Chrome / Edgeが見つかりません。CHROME_PATHを設定してください。");
}

function pngSize(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) throw new Error("生成結果がPNGではありません。");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

async function main() {
  const chrome = await findChrome();
  const character = await fs.readFile(path.join(ROOT_DIR, "assets", "characters", "FGPD.webp"));
  const characterUrl = `data:image/webp;base64,${character.toString("base64")}`;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "sub-rosa-og-"));
  const htmlPath = path.join(tempDir, "og-card.html");
  const profileDir = path.join(tempDir, "chrome-profile");
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{width:${WIDTH}px;height:${HEIGHT}px;margin:0;overflow:hidden;background:#201527}
body{font-family:"Yu Mincho","YuMincho","Hiragino Mincho ProN","Noto Serif CJK JP","Meiryo",serif;color:#f4e9dd}
.card{position:relative;width:100%;height:100%;overflow:hidden;background:
radial-gradient(circle at 76% 42%,rgba(193,97,132,.27),transparent 31%),
radial-gradient(circle at 14% 105%,rgba(201,163,106,.17),transparent 34%),
linear-gradient(135deg,#17101f 0%,#2b1829 49%,#5b2439 100%)}
.card:before{content:"";position:absolute;inset:30px;border:1px solid rgba(201,163,106,.62);border-radius:8px 44px 8px 44px;box-shadow:inset 0 0 0 7px rgba(255,255,255,.018)}
.card:after{content:"";position:absolute;width:520px;height:520px;right:-115px;top:-116px;border:1px solid rgba(201,163,106,.22);border-radius:50%;box-shadow:0 0 0 28px rgba(201,163,106,.045),0 0 0 62px rgba(201,163,106,.025)}
.copy{position:absolute;z-index:2;left:92px;top:74px;width:690px}
.brand{display:flex;align-items:center;gap:19px;color:#d9b875;font:600 22px/1 Arial,sans-serif;letter-spacing:.28em}
.mark{display:grid;place-items:center;width:54px;height:54px;border:1px solid #d9b875;border-radius:50%;font-size:15px;letter-spacing:.08em}
.kicker{margin:78px 0 18px;color:#d9b875;font:600 15px/1.2 Arial,sans-serif;letter-spacing:.24em}
h1{margin:0;font-size:77px;font-weight:500;line-height:1.05;letter-spacing:.12em;text-shadow:0 9px 32px rgba(0,0,0,.25)}
.rule{width:154px;height:1px;margin:29px 0 26px;background:linear-gradient(90deg,#d9b875,transparent)}
.tagline{margin:0;width:660px;font-size:31px;line-height:1.72;letter-spacing:.09em;color:#efe1d6}
.sub{margin-top:28px;color:#c99baa;font:500 14px/1 Arial,sans-serif;letter-spacing:.2em}
.figure{position:absolute;z-index:1;right:42px;bottom:-72px;width:455px;height:650px;object-fit:contain;filter:drop-shadow(0 24px 35px rgba(0,0,0,.45))}
.rose{position:absolute;z-index:0;right:116px;bottom:52px;width:310px;height:310px;border:1px solid rgba(213,137,160,.28);border-radius:50%}
</style></head><body><main class="card">
<div class="copy"><div class="brand"><span class="mark">SR</span><span>SUB ROSA</span></div>
<p class="kicker">COMPATIBILITY TYPE PORTRAIT</p><h1>相性タイプ診断</h1><div class="rule"></div>
<p class="tagline">秘密の書斎で見つける、<br>二人の対話のきっかけ。</p><p class="sub">UNDER THE ROSE · 16 PORTRAITS</p></div>
<span class="rose"></span><img class="figure" src="${characterUrl}" alt=""></main></body></html>`;

  try {
    await fs.writeFile(htmlPath, html, "utf8");
    await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
    await run(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profileDir}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      "--force-device-scale-factor=1",
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=1500",
      `--screenshot=${OUTPUT_PATH}`,
      pathToFileURL(htmlPath).href
    ], { windowsHide: true, maxBuffer: 1024 * 1024 });
    const output = await fs.readFile(OUTPUT_PATH);
    const size = pngSize(output);
    if (size.width !== WIDTH || size.height !== HEIGHT) throw new Error(`OG画像の寸法が不正です: ${size.width}x${size.height}`);
    console.log(`${path.relative(ROOT_DIR, OUTPUT_PATH).replaceAll("\\", "/")}: ${size.width}x${size.height}, ${Math.round(output.length / 1024)}KB`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`OG画像を生成できませんでした: ${error.message}`);
  process.exitCode = 1;
});
