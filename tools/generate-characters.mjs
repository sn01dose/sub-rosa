import fs from "node:fs/promises";
import path from "node:path";
import { buildGallery } from "./build-character-gallery.mjs";
import { OUT_DIR, ROOT_DIR, buildPrompt, loadCharacterSpecs, loadTypes, readJson, writeJson } from "./lib/character-data.mjs";

const GENERATIONS_API_URL = "https://api.openai.com/v1/images/generations";
const EDITS_API_URL = "https://api.openai.com/v1/images/edits";
// GPT Image 2 currently rejects background="transparent" on the Images API.
// GPT Image 1.5 is the newest available model that satisfies this workflow's
// native transparent-PNG requirement.
const DEFAULT_MODEL = "gpt-image-1.5";

function parseArgs(argv) {
  const options = { codes: ["FGPD"], count: 3, model: DEFAULT_MODEL, quality: "high", delayMs: 13000, maxRetries: 4, reference: null, outputSet: null, force: false, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === "--all") options.codes = null;
    else if (arg === "--code" && value) { options.codes = value.split(",").map((code) => code.trim().toUpperCase()).filter(Boolean); index += 1; }
    else if (arg === "--count" && value) { options.count = Number(value); index += 1; }
    else if (arg === "--model" && value) { options.model = value; index += 1; }
    else if (arg === "--quality" && value) { options.quality = value; index += 1; }
    else if (arg === "--delay-ms" && value) { options.delayMs = Number(value); index += 1; }
    else if (arg === "--max-retries" && value) { options.maxRetries = Number(value); index += 1; }
    else if (arg === "--reference" && value) { options.reference = value; index += 1; }
    else if (arg === "--output-set" && value) { options.outputSet = value; index += 1; }
    else if (arg === "--force") options.force = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else throw new Error(`不明な引数です: ${arg}`);
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > 3) throw new Error("--count は1〜3で指定してください。");
  if (!Number.isFinite(options.delayMs) || options.delayMs < 0) throw new Error("--delay-ms が不正です。");
  if (!Number.isInteger(options.maxRetries) || options.maxRetries < 0 || options.maxRetries > 8) throw new Error("--max-retries は0〜8で指定してください。");
  if (!new Set(["low", "medium", "high", "auto"]).has(options.quality)) throw new Error("--quality は low / medium / high / auto です。");
  if (options.outputSet && !/^[a-z0-9][a-z0-9_-]*$/i.test(options.outputSet)) throw new Error("--output-set は英数字・ハイフン・アンダースコアだけで指定してください。");
  if (/^gpt-image-2(?:-|$)/.test(options.model)) throw new Error("gpt-image-2 は透明背景をサポートしていません。このワークフローでは gpt-image-1.5 を使用してください。");
  return options;
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

class ImageApiError extends Error {
  constructor(message, status, retryable, requestId) {
    super(message);
    this.status = status;
    this.retryable = retryable;
    this.requestId = requestId;
  }
}

async function callImageApi({ apiKey, model, quality, prompt, reference }) {
  let response;
  try {
    if (reference) {
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", prompt);
      form.append("image", new Blob([reference.bytes], { type: "image/png" }), reference.name);
      form.append("n", "1");
      form.append("size", "1024x1536");
      form.append("quality", quality);
      form.append("background", "transparent");
      form.append("output_format", "png");
      form.append("input_fidelity", "high");
      response = await fetch(EDITS_API_URL, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    } else {
      response = await fetch(GENERATIONS_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, n: 1, size: "1024x1536", quality, background: "transparent", output_format: "png" })
      });
    }
  } catch (error) {
    const code = error.cause?.code || "network";
    throw new ImageApiError(`画像APIへの接続に失敗しました (${code})。`, null, true);
  }
  const requestId = response.headers.get("x-request-id") || undefined;
  let payload;
  try { payload = await response.json(); }
  catch { throw new ImageApiError("API応答をJSONとして読めませんでした。", response.status, response.status === 429 || response.status >= 500, requestId); }
  if (!response.ok) {
    const safeMessage = payload?.error?.message || `HTTP ${response.status}`;
    throw new ImageApiError(safeMessage, response.status, response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500, requestId);
  }
  const item = payload?.data?.[0];
  if (item?.b64_json) return { bytes: Buffer.from(item.b64_json, "base64"), requestId };
  if (item?.url) {
    let imageResponse;
    try { imageResponse = await fetch(item.url); }
    catch (error) {
      const code = error.cause?.code || "network";
      throw new ImageApiError(`生成画像の取得に失敗しました (${code})。`, null, true, requestId);
    }
    if (!imageResponse.ok) throw new ImageApiError("生成済み画像の取得に失敗しました。", imageResponse.status, imageResponse.status >= 500, requestId);
    return { bytes: Buffer.from(await imageResponse.arrayBuffer()), requestId };
  }
  throw new ImageApiError("API応答に画像データがありません。", response.status, false, requestId);
}

async function generateWithRetry(args, maxRetries) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try { return await callImageApi(args); }
    catch (error) {
      lastError = error;
      if (!error.retryable || attempt === maxRetries) break;
      const delay = Math.min(45000, 2500 * (2 ** attempt)) + Math.floor(Math.random() * 700);
      console.warn(`  再試行 ${attempt + 1}/${maxRetries}: ${Math.round(delay / 1000)}秒待機 (${error.status || "network"})`);
      await wait(delay);
    }
  }
  throw lastError;
}

function isPng(buffer) {
  return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

function withSeriesReference(prompt) {
  return [
    "Use the input image only as the approved SUB ROSA series style reference.",
    "Preserve only its compact adult chibi proportions, large refined eye design, delicate dark linework, bleeding watercolor finish, muted dusty palette, thin antique-gold art-nouveau arch, and pale translucent sepia vignette treatment.",
    "The complete figure from hair top to shoes must measure only about 2.2 to 2.5 head-heights: the oversized head occupies roughly 40 to 45 percent of the figure height, with a compact torso and very short limbs. Never use three-, four-, or fashion-figure proportions.",
    "Treat every content feature in the reference as replaceable: identity, face, hairstyle, outfit silhouette, pose, hand placement, crescent emblem, cat emblem, and library objects must not carry over unless the new type specification explicitly asks for them.",
    "Remove the reference arch's crescent, cat mark, hanging stars, and every celestial ornament unless the new type specification explicitly names that exact symbol. The top arch must contain only the new type's specified emblem; all remaining arch decoration must be non-symbolic botanical linework.",
    "Any warm flower or heart echo and any cool night or four-point sparkle requested by an axis belongs only inside the pale vignette or on the wardrobe, never attached to the gold arch.",
    "The new type slots below have absolute priority for hair, wardrobe, gesture, expression, top emblem, vignette, and motif-color area. Keep the same illustrator and frame language, not the same character design.",
    prompt
  ].join("\n");
}

async function loadApiKey() {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  const envPath = path.join(ROOT_DIR, ".env");
  try {
    await fs.access(envPath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  if (typeof process.loadEnvFile !== "function") {
    throw new Error(".env の自動読込には Node.js 20.12 以降が必要です。");
  }
  process.loadEnvFile(envPath);
  return process.env.OPENAI_API_KEY?.trim() || null;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const types = await loadTypes();
  const specs = await loadCharacterSpecs();
  const codes = options.codes || Object.keys(types);
  for (const code of codes) if (!types[code]) throw new Error(`不明なタイプコードです: ${code}`);
  let reference = null;
  if (options.reference) {
    const referencePath = path.resolve(ROOT_DIR, options.reference);
    const bytes = await fs.readFile(referencePath);
    if (!isPng(bytes)) throw new Error("--reference はPNG画像を指定してください。");
    if (bytes.length >= 50 * 1024 * 1024) throw new Error("--reference は50MB未満にしてください。");
    reference = { bytes, name: path.basename(referencePath), relativePath: path.relative(ROOT_DIR, referencePath).replaceAll("\\", "/") };
  }
  const apiKey = options.dryRun ? null : await loadApiKey();
  if (!options.dryRun && !apiKey) throw new Error("OPENAI_API_KEY が未設定です。リポジトリ直下の .env またはプロセス環境変数へ設定してください。");

  const runDir = options.outputSet ? path.join(OUT_DIR, options.outputSet) : OUT_DIR;
  await fs.mkdir(runDir, { recursive: true });
  const failures = [];
  const manifestPath = path.join(runDir, "manifest.json");
  const previousManifest = await readJson(manifestPath, { items: [] });
  const manifestItems = new Map(
    (previousManifest.items || [])
      .filter((item) => item?.code && item?.file)
      .map((item) => [`${item.code}/${item.file}`, item])
  );
  const manifest = { model: options.model, size: "1024x1536", quality: options.quality, background: "transparent", outputFormat: "png", specsVersion: specs.version, outputSet: options.outputSet, reference: reference?.relativePath || null, generatedAt: new Date().toISOString(), items: [] };
  let madeRequest = false;

  for (const code of codes) {
    const type = types[code];
    const directory = path.join(runDir, code);
    await fs.mkdir(directory, { recursive: true });
    for (let candidate = 1; candidate <= options.count; candidate += 1) {
      const file = `candidate-${candidate}.png`;
      const output = path.join(directory, file);
      const typePrompt = buildPrompt(type, candidate, specs);
      const prompt = reference ? withSeriesReference(typePrompt) : typePrompt;
      const manifestKey = `${code}/${file}`;
      const manifestItem = { ...manifestItems.get(manifestKey), code, file, prompt, status: options.dryRun ? "dry-run" : "pending" };
      manifestItems.set(manifestKey, manifestItem);
      if (options.dryRun) {
        console.log(`\n[${code}/${file}]\n${prompt}\n`);
        continue;
      }
      try {
        if (!options.force) {
          try { await fs.access(output); manifestItem.status = "skipped-existing"; console.log(`${code}/${file}: 既存のためスキップ`); continue; }
          catch { /* Generate the missing candidate. */ }
        }
        if (madeRequest && options.delayMs) await wait(options.delayMs);
        madeRequest = true;
        console.log(`${code}/${file}: ${options.model}${reference ? " 参照編集" : ""} で生成中…`);
        const result = await generateWithRetry({ apiKey, model: options.model, quality: options.quality, prompt, reference }, options.maxRetries);
        if (!isPng(result.bytes)) throw new Error("返却画像がPNGではありません。");
        await fs.writeFile(output, result.bytes);
        manifestItem.status = "generated";
        manifestItem.requestId = result.requestId || null;
        console.log(`${code}/${file}: 保存完了 (${Math.round(result.bytes.length / 1024)}KB${result.requestId ? `, request ${result.requestId}` : ""})`);
      } catch (error) {
        manifestItem.status = "failed";
        failures.push({ code, file, status: error.status || null, message: error.message });
        console.error(`${code}/${file}: 失敗 - ${error.message}`);
      }
    }
  }

  const codeOrder = new Map(Object.keys(types).map((code, index) => [code, index]));
  manifest.items = [...manifestItems.values()].sort((left, right) =>
    (codeOrder.get(left.code) ?? Number.MAX_SAFE_INTEGER) - (codeOrder.get(right.code) ?? Number.MAX_SAFE_INTEGER)
    || left.file.localeCompare(right.file, "en", { numeric: true })
  );
  await writeJson(manifestPath, manifest);
  await writeJson(path.join(runDir, "failures.json"), { failedTypes: [...new Set(failures.map((failure) => failure.code))], failures });
  const gallery = await buildGallery({ outDir: runDir });
  console.log(`候補一覧: ${path.relative(ROOT_DIR, path.join(runDir, "index.html")).replaceAll("\\", "/")} (${gallery.groups}タイプ / ${gallery.candidates}候補)`);
  if (failures.length) {
    console.error(`失敗タイプ: ${[...new Set(failures.map((failure) => failure.code))].join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`生成を開始できません: ${error.message}`);
  process.exitCode = 1;
});
