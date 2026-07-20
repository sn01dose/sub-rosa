import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { OUT_DIR, SELECTED_PATH, escapeHtml, loadTypes, readJson } from "./lib/character-data.mjs";

export async function buildGallery({ outDir = OUT_DIR } = {}) {
  const types = await loadTypes();
  const selected = await readJson(SELECTED_PATH, {});
  const qa = await readJson(path.join(outDir, "qa.json"), {});
  const outputPrefix = path.relative(OUT_DIR, outDir).replaceAll("\\", "/");
  if (outputPrefix.startsWith("..")) throw new Error("候補一覧の出力先はtools/out内にしてください。");
  const groups = [];

  await fs.mkdir(outDir, { recursive: true });
  for (const type of Object.values(types)) {
    const directory = path.join(outDir, type.code);
    let files = [];
    try {
      files = (await fs.readdir(directory)).filter((file) => /^candidate-\d+\.png$/i.test(file)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (files.length) groups.push({ type, files });
  }

  const cards = groups.map(({ type, files }) => `
    <section class="type-group" data-code="${type.code}">
      <header><div><p class="code">${type.code}</p><h2>${escapeHtml(type.name)}</h2></div><p>${escapeHtml(type.catch)}</p></header>
      <div class="candidates">
        ${files.map((file) => {
          const review = qa[type.code]?.[file] || {};
          const selectionValue = outputPrefix ? `${outputPrefix}/${type.code}/${file}` : file;
          const isSelected = selected[type.code] === selectionValue;
          const flags = Array.isArray(review.flags) ? review.flags : [];
          const reviewStatus = ["recommended", "approved"].includes(review.status) ? review.status : "";
          const reviewLabel = review.status === "approved" ? "選定済み" : review.status === "recommended" ? "Codex推奨" : "";
          return `<article class="candidate ${flags.length ? "has-flags" : ""} ${reviewStatus}">
            <label class="image-wrap"><img src="${type.code}/${file}" alt="${escapeHtml(type.name)} ${escapeHtml(file)}"><span class="pick"><input type="radio" name="${type.code}" value="${selectionValue}" ${isSelected ? "checked" : ""}> この候補を選ぶ</span></label>
            <div class="candidate-copy"><h3>${escapeHtml(file)}${reviewLabel ? `<span class="review-badge">${reviewLabel}</span>` : ""}</h3>
              ${flags.length ? `<ul class="flags">${flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>` : `<p class="pass">自動フラグなし（最終判断は目視）</p>`}
              ${review.note ? `<p class="note">${escapeHtml(review.note)}</p>` : ""}
              <label class="memo-label">自分用メモ<textarea rows="2" data-memo="${type.code}/${file}" placeholder="指、文字、露出、世界観など"></textarea></label>
            </div>
          </article>`;
        }).join("")}
      </div>
    </section>`).join("");

  const data = JSON.stringify({ selected, qa }).replaceAll("<", "\\u003c");
  const html = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SUB ROSA character review</title>
<style>
:root{color-scheme:dark;--ink:#17111b;--panel:#241a2e;--wine:#6f304c;--rose:#b34e70;--gold:#c9a36a;--paper:#efe6da;--muted:#b9aeb7}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#3a2030,var(--ink) 44rem);color:var(--paper);font-family:"Yu Mincho","Hiragino Mincho ProN",serif;line-height:1.7}main{width:min(1500px,calc(100% - 32px));margin:auto;padding:48px 0 90px}.intro{max-width:850px;margin-bottom:38px}.eyebrow,.code{color:var(--gold);letter-spacing:.16em;font-size:12px;text-transform:uppercase}h1,h2,h3,p{margin-top:0}h1{font-size:clamp(32px,6vw,58px);margin-bottom:12px}.toolbar{position:sticky;top:10px;z-index:4;display:flex;gap:10px;flex-wrap:wrap;padding:12px;margin:0 0 30px;border:1px solid rgba(201,163,106,.35);border-radius:16px;background:rgba(23,17,27,.9);backdrop-filter:blur(12px)}button{min-height:48px;padding:10px 18px;border:1px solid var(--gold);border-radius:999px;background:var(--wine);color:white;font:inherit;cursor:pointer}button.secondary{background:transparent}.status{align-self:center;color:var(--muted);font-size:13px}.type-group{margin:0 0 48px;padding:22px;border:1px solid rgba(201,163,106,.26);border-radius:20px;background:rgba(36,26,46,.78)}.type-group>header{display:flex;justify-content:space-between;gap:20px;align-items:end}.type-group h2{margin-bottom:4px}.type-group header>p{color:var(--muted)}.code{margin-bottom:0}.candidates{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.candidate{overflow:hidden;border:1px solid rgba(239,230,218,.16);border-radius:16px;background:#1d1622}.candidate:has(input:checked){border-color:var(--gold);box-shadow:0 0 0 2px rgba(201,163,106,.24)}.candidate.has-flags{border-color:#b96673}.candidate.recommended{border-color:rgba(201,163,106,.62)}.candidate.approved{border-color:#d8bb7c;box-shadow:0 0 0 2px rgba(201,163,106,.2)}.image-wrap{display:block;cursor:pointer}.image-wrap img{display:block;width:100%;aspect-ratio:2/3;object-fit:contain;background-color:#d8d1ca;background-image:linear-gradient(45deg,#c7c0ba 25%,transparent 25%),linear-gradient(-45deg,#c7c0ba 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#c7c0ba 75%),linear-gradient(-45deg,transparent 75%,#c7c0ba 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}.pick{display:flex;align-items:center;gap:9px;min-height:48px;padding:10px 14px;background:#2b2030}.candidate-copy{padding:15px}.candidate-copy h3{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;font:600 14px/1.4 ui-monospace,monospace}.review-badge{flex:none;padding:3px 8px;border:1px solid rgba(201,163,106,.5);border-radius:999px;color:var(--gold);font:600 11px/1.4 "Yu Mincho","Hiragino Mincho ProN",serif;letter-spacing:.04em}.flags{margin:0 0 10px;padding-left:21px;color:#f0a9b2}.pass{color:#a9c8b5;font-size:13px}.note,.memo-label{font-size:13px;color:var(--muted)}textarea{width:100%;margin-top:5px;padding:9px;border:1px solid rgba(239,230,218,.2);border-radius:8px;background:#17111b;color:white;resize:vertical}@media(max-width:900px){.candidates{grid-template-columns:1fr}.type-group>header{display:block}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style></head><body><main>
<section class="intro"><p class="eyebrow">LOCAL REVIEW ONLY</p><h1>SUB ROSA character review</h1><p>各タイプから1枚を選びます。チェック柄は透明部分です。指の破綻、文字混入、露出、年齢感、シリーズからの逸脱を100%表示でも確認してください。</p></section>
<div class="toolbar"><button id="download">selected.json を保存</button><button class="secondary" id="clear" type="button">選択を解除</button><span class="status" id="status" aria-live="polite"></span></div>
${cards || '<p>候補画像がまだありません。generate-characters.mjs を実行してください。</p>'}
</main><script>const initial=${data};const storageKey="sub-rosa-character-review";let state={selected:{...initial.selected},memos:{}};try{state={...state,...JSON.parse(localStorage.getItem(storageKey)||"{}")}}catch{}const status=document.getElementById("status");function save(){document.querySelectorAll('input[type="radio"]:checked').forEach(input=>state.selected[input.name]=input.value);document.querySelectorAll("textarea[data-memo]").forEach(input=>state.memos[input.dataset.memo]=input.value);localStorage.setItem(storageKey,JSON.stringify(state));status.textContent=Object.keys(state.selected).length+"タイプ選択済み";setTimeout(()=>status.textContent="",1800)}document.querySelectorAll('input[type="radio"]').forEach(input=>{if(state.selected[input.name]===input.value)input.checked=true;input.addEventListener("change",save)});document.querySelectorAll("textarea[data-memo]").forEach(input=>{input.value=state.memos[input.dataset.memo]||"";input.addEventListener("input",save)});document.getElementById("download").addEventListener("click",()=>{save();const blob=new Blob([JSON.stringify(state.selected,null,2)+"\\n"],{type:"application/json"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="selected.json";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)});document.getElementById("clear").addEventListener("click",()=>{state={selected:{},memos:{}};localStorage.removeItem(storageKey);document.querySelectorAll('input[type="radio"]').forEach(input=>input.checked=false);document.querySelectorAll("textarea").forEach(input=>input.value="");status.textContent="選択を解除しました"});</script></body></html>`;

  await fs.writeFile(path.join(outDir, "index.html"), html, "utf8");
  return { groups: groups.length, candidates: groups.reduce((sum, group) => sum + group.files.length, 0) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let source = null;
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--source" && args[index + 1]) { source = args[index + 1]; index += 1; }
    else throw new Error(`不明な引数です: ${args[index]}`);
  }
  if (source && !/^[a-z0-9][a-z0-9_-]*$/i.test(source)) throw new Error("--source は英数字・ハイフン・アンダースコアだけで指定してください。");
  const result = await buildGallery({ outDir: source ? path.join(OUT_DIR, source) : OUT_DIR });
  console.log(`候補一覧を更新しました: ${result.groups}タイプ / ${result.candidates}候補`);
}
