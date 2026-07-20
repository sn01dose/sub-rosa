import fs from "node:fs/promises";
import path from "node:path";
import { OUT_DIR, SELECTED_PATH, escapeHtml, loadCharacterSpecs, loadTypes, readJson } from "./lib/character-data.mjs";

function parseArgs(argv) {
  const options = { sources: ["v2"] };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source" && argv[index + 1]) { options.sources = argv[index + 1].split(",").map((source) => source.trim()).filter(Boolean); index += 1; }
    else throw new Error(`不明な引数です: ${argv[index]}`);
  }
  if (!options.sources.length || options.sources.some((source) => !/^[a-z0-9][a-z0-9_-]*$/i.test(source))) throw new Error("--source は英数字・ハイフン・アンダースコアを使い、複数時はカンマで区切ってください。");
  return options;
}

async function candidateFiles(directory) {
  try {
    return (await fs.readdir(directory))
      .filter((file) => /^candidate-\d+\.png$/i.test(file))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const types = await loadTypes();
  const specs = await loadCharacterSpecs();
  const selected = await readJson(SELECTED_PATH, {});
  const approvedFgpd = selected.FGPD || "candidate-1.png";
  const groups = [];

  for (const code of Object.keys(types)) {
    const sets = [];
    for (const source of options.sources) {
      const files = await candidateFiles(path.join(OUT_DIR, source, code));
      if (files.length) sets.push({ source, files });
    }
    if (sets.length) groups.push({ code, sets, type: types[code], spec: specs.types[code] });
  }
  if (!groups.length) throw new Error(`${options.sources.join(", ")} に候補がありません。`);

  const groupHtml = groups.map(({ code, sets, type, spec }) => `
    <section class="type-group" data-code="${code}">
      <header>
        <div><p class="code">${code}</p><h2>${escapeHtml(type.name)}</h2></div>
        <p class="spec"><b>髪:</b> ${escapeHtml(spec.hair)}<br><b>輪郭:</b> ${escapeHtml(spec.silhouette)}</p>
      </header>
      ${sets.map(({ source, files }) => `<h3 class="set-name">${escapeHtml(source)}</h3><div class="candidates">${files.map((file) => `<figure class="candidate"><img src="${source}/${code}/${file}" alt="${escapeHtml(type.name)} ${escapeHtml(source)} ${escapeHtml(file)}"><figcaption>${escapeHtml(source)} / ${escapeHtml(file)}</figcaption></figure>`).join("")}</div>`).join("")}
    </section>`).join("");

  const checklist = [
    "25%の遠目表示でも、FGPDと各タイプを髪・服の外形・重心だけで見分けられる",
    "同じ黒ボブ、同じロングコート、同じ片足クロスが安易に再利用されていない",
    "motif.colorが裏地・ベスト・帯・マントなど衣装の25〜30%以上を占める",
    "L/F、G/T、R/P、C/Dの姿勢・手・色・対称性が読み取れる",
    "アーチ上部はタイプ指定の紋章だけで、別タイプの月・猫・星が残っていない",
    "五芒星、オカルト記号、文字、数字、時計盤の数字、音符、譜線がない",
    "指の増減・融合、重複した手足、文字混入、露出、幼い服装がない",
    "確定FGPDと線画・水彩・金枠の画風は同じだが、中身の人物は明確に違う"
  ];

  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SUB ROSA v2 contact review</title>
<style>
:root{color-scheme:dark;--ink:#17111b;--panel:#241a2e;--wine:#6f304c;--gold:#c9a36a;--paper:#efe6da;--muted:#b9aeb7}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#3a2030,var(--ink) 50rem);color:var(--paper);font-family:"Yu Mincho","Hiragino Mincho ProN",serif;line-height:1.65}main{width:min(1320px,calc(100% - 28px));margin:auto;padding:42px 0 80px}h1,h2,p{margin-top:0}.eyebrow,.code{color:var(--gold);font:600 12px/1.4 ui-monospace,monospace;letter-spacing:.14em}.lead{max-width:850px;color:var(--muted)}.controls{position:sticky;top:10px;z-index:4;display:flex;align-items:center;gap:12px;padding:12px 16px;margin:24px 0;border:1px solid rgba(201,163,106,.35);border-radius:16px;background:rgba(23,17,27,.9);backdrop-filter:blur(10px)}.controls label{display:flex;align-items:center;gap:9px;min-height:44px}.baseline,.type-group,.checklist{padding:20px;margin:0 0 26px;border:1px solid rgba(201,163,106,.28);border-radius:18px;background:rgba(36,26,46,.78)}.baseline-grid{display:grid;grid-template-columns:minmax(150px,280px) 1fr;gap:22px;align-items:center}.baseline img{display:block;width:100%;max-height:420px;object-fit:contain;background:#efe6da}.type-group>header{display:grid;grid-template-columns:minmax(180px,.6fr) 1.4fr;gap:18px}.type-group h2{margin-bottom:4px}.spec{color:var(--muted);font-size:13px}.candidates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.candidate{margin:0;padding:8px;border:1px solid rgba(239,230,218,.14);border-radius:14px;background:#1b151f;text-align:center}.candidate img{display:block;width:100%;aspect-ratio:2/3;object-fit:contain;background:#efe6da;transition:width .2s ease}.candidate figcaption{padding:8px 4px 2px;font:12px/1.4 ui-monospace,monospace}.contact.far .candidates{display:flex;justify-content:center;gap:24px;flex-wrap:wrap}.contact.far .type-group{overflow:hidden}.contact.far .candidate{width:118px}.contact.far .candidate img{width:100px;margin:auto}.checklist ul{display:grid;grid-template-columns:1fr 1fr;gap:9px 22px;padding:0;list-style:none}.checklist label{display:flex;gap:10px;align-items:flex-start}.checklist input{margin-top:6px;accent-color:var(--gold)}@media(max-width:760px){.baseline-grid,.type-group>header{grid-template-columns:1fr}.candidates{grid-template-columns:1fr}.checklist ul{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.candidate img{transition:none}}
.set-name{margin:16px 0 10px;color:var(--gold);font:600 13px/1.4 ui-monospace,monospace;letter-spacing:.08em}.candidates+.set-name{margin-top:24px}
</style></head><body><main>
<p class="eyebrow">SUB ROSA CHARACTER SYSTEM v2</p><h1>同質化チェック・コンタクトシート</h1><p class="lead">確定FGPDは画風・頭身・金枠の基準です。新規候補は「同じ絵師の別人」に見えるかを、通常表示と遠目表示の両方で確認します。</p>
<div class="controls"><label><input id="far" type="checkbox"> 遠目表示（約25%）で識別する</label></div>
<section class="baseline"><div class="baseline-grid"><img src="FGPD/${escapeHtml(approvedFgpd)}" alt="確定FGPD"><div><p class="code">APPROVED FGPD</p><h2>画風と頭身の基準</h2><p>黒ボブ片目隠し、猫チョーカー、半視線、丸いコート、三日月と猫はFGPD固有です。他タイプへコピーしません。</p></div></div></section>
<div class="contact" id="contact">${groupHtml}</div>
<section class="checklist"><h2>承認前チェック</h2><ul>${checklist.map((item, index) => `<li><label><input type="checkbox" data-check="${index}"><span>${escapeHtml(item)}</span></label></li>`).join("")}</ul></section>
</main><script>const key="sub-rosa-v2-contact-checks";const contact=document.getElementById("contact");const far=document.getElementById("far");let state={};try{state=JSON.parse(localStorage.getItem(key)||"{}")}catch{}far.checked=Boolean(state.far);contact.classList.toggle("far",far.checked);far.addEventListener("change",()=>{state.far=far.checked;contact.classList.toggle("far",far.checked);localStorage.setItem(key,JSON.stringify(state))});document.querySelectorAll("[data-check]").forEach(input=>{input.checked=Boolean(state[input.dataset.check]);input.addEventListener("change",()=>{state[input.dataset.check]=input.checked;localStorage.setItem(key,JSON.stringify(state))})});</script></body></html>`;

  const destination = path.join(OUT_DIR, "contact.html");
  await fs.writeFile(destination, html, "utf8");
  const candidateCount = groups.reduce((sum, group) => sum + group.sets.reduce((setSum, set) => setSum + set.files.length, 0), 0);
  console.log(`${path.relative(process.cwd(), destination)}: 確定FGPD + ${groups.length}タイプ / ${candidateCount}候補 (${options.sources.join(" vs ")})`);
}

main().catch((error) => {
  console.error(`コンタクトシート作成に失敗しました: ${error.message}`);
  process.exitCode = 1;
});
