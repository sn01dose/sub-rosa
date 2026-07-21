import fs from "node:fs/promises";
import path from "node:path";
import { OUT_DIR, SELECTED_32_PATH, escapeHtml, loadTypes, readJson, selectionValue } from "./lib/character-data.mjs";

const APPEARANCES = {
  f: { label: "淑女", english: "LADY" },
  m: { label: "紳士", english: "GENTLEMAN" }
};

async function candidateFiles(appearance, code) {
  try {
    return (await fs.readdir(path.join(OUT_DIR, appearance, code)))
      .filter((file) => /^candidate-\d+\.png$/i.test(file))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

function assetSrc(code, appearance) {
  return `../../assets/characters/${code}_${appearance}.webp`;
}

async function main() {
  const types = await loadTypes();
  const selected = await readJson(SELECTED_32_PATH, {});
  const qa = {
    f: await readJson(path.join(OUT_DIR, "f", "qa.json"), {}),
    m: await readJson(path.join(OUT_DIR, "m", "qa.json"), {})
  };
  const rows = [];
  const overview = { f: [], m: [] };

  for (const type of Object.values(types)) {
    const panels = [];
    for (const appearance of Object.keys(APPEARANCES)) {
      const confirmed = selectionValue(selected, type.code, appearance);
      const files = await candidateFiles(appearance, type.code);
      let overviewImage = confirmed ? assetSrc(type.code, appearance) : files[0] ? `${appearance}/${type.code}/${files[0]}` : "../../assets/adult-silhouette.svg";
      const panelBody = confirmed
        ? `<figure class="confirmed"><img src="${assetSrc(type.code, appearance)}" alt="${escapeHtml(type.name)} ${APPEARANCES[appearance].label}版"><figcaption>確定済み<br><code>${escapeHtml(confirmed)}</code></figcaption></figure>`
        : files.length
          ? `<div class="candidate-grid">${files.map((file) => {
              const value = `${appearance}/${type.code}/${file}`;
              const review = qa[appearance]?.[type.code]?.[file] || {};
              const flags = Array.isArray(review.flags) ? review.flags : [];
              const recommended = review.status === "recommended";
              const isSelected = selectionValue(selected, type.code, appearance) === value;
              return `<label class="candidate ${flags.length ? "ng" : ""} ${recommended ? "recommended" : ""}"><img src="${appearance}/${type.code}/${file}" alt="${escapeHtml(type.name)} ${APPEARANCES[appearance].label}版 ${file}"><span class="pick"><input type="radio" name="${type.code}-${appearance}" data-code="${type.code}" data-appearance="${appearance}" value="${value}" ${isSelected ? "checked" : ""}> ${file}</span>${recommended ? '<b class="badge">Codex推奨</b>' : ""}${flags.length ? `<ul>${flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}</ul>` : '<p class="pass">目視NGなし</p>'}${review.note ? `<p class="note">${escapeHtml(review.note)}</p>` : ""}</label>`;
            }).join("")}</div>`
          : `<div class="pending">候補未生成</div>`;
      panels.push(`<section class="appearance-panel"><header><span>${APPEARANCES[appearance].english}</span><h3>${APPEARANCES[appearance].label}版</h3></header>${panelBody}</section>`);
      overview[appearance].push(`<figure><img src="${overviewImage}" alt="${type.code} ${APPEARANCES[appearance].label}"><figcaption>${type.code}</figcaption></figure>`);
    }
    rows.push(`<article class="type-pair" data-code="${type.code}"><header><p>${type.code}</p><h2>${escapeHtml(type.name)}</h2><span>${escapeHtml(type.catch)}</span></header><div class="pair-grid">${panels.join("")}</div></article>`);
  }

  const checks = [
    "左右を見比べ、同じ色・モチーフ・紋章・背景・軸の所作を持つ同一タイプの対に見える",
    "淑女16体だけ／紳士16体だけを遠目に見ても、髪・衣装・ポーズの外形でタイプを識別できる",
    "性別差がまつ毛だけではなく、成人の顔立ち・髪の処理・体格の方向性に現れている",
    "全身着衣で、露出・扇情的な構図・幼い服装・重複人物がない",
    "アーチ上部はタイプ指定の紋章だけで、文字・数字・五芒星・オカルト記号がない",
    "指の増減や融合、重複した手足、文字・署名・透かしがない",
    "FTRDは淑女=プリンセス、紳士=プリンスとして甘さとピンクの強さが揃っている"
  ];

  const data = JSON.stringify({ selected }).replaceAll("<", "\\u003c");
  const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SUB ROSA 32 character review</title><link rel="icon" href="../../assets/favicon.svg"><style>
:root{color-scheme:dark;--ink:#17111b;--panel:#241a2e;--wine:#6f304c;--rose:#b34e70;--gold:#c9a36a;--paper:#efe6da;--muted:#b9aeb7}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#3a2030,var(--ink) 52rem);color:var(--paper);font-family:"Yu Mincho","Hiragino Mincho ProN",serif;line-height:1.65}main{width:min(1500px,calc(100% - 28px));margin:auto;padding:42px 0 90px}h1,h2,h3,p{margin-top:0}.eyebrow,.type-pair>header p,.appearance-panel header span{color:var(--gold);font:700 12px/1.4 ui-monospace,monospace;letter-spacing:.14em}.lead{max-width:920px;color:var(--muted)}.toolbar{position:sticky;top:8px;z-index:9;display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:12px;margin:20px 0 28px;border:1px solid rgba(201,163,106,.4);border-radius:16px;background:rgba(23,17,27,.92);backdrop-filter:blur(12px)}button{min-height:48px;padding:9px 18px;border:1px solid var(--gold);border-radius:999px;background:var(--wine);color:white;font:inherit;cursor:pointer}.status{color:var(--muted);font-size:13px}.overview,.checklist,.type-pair{margin:0 0 28px;padding:20px;border:1px solid rgba(201,163,106,.28);border-radius:18px;background:rgba(36,26,46,.8)}.overview h2{margin-bottom:8px}.overview-grid{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:9px}.overview figure{margin:0;padding:5px;border:1px solid rgba(239,230,218,.12);border-radius:10px;background:#19131d;text-align:center}.overview img{width:100%;aspect-ratio:2/3;object-fit:contain;background:#efe6da}.overview figcaption{font:11px/1.3 ui-monospace,monospace}.type-pair>header{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:end}.type-pair>header p,.type-pair>header h2{margin-bottom:0}.type-pair>header span{color:var(--muted)}.pair-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:15px}.appearance-panel{min-width:0;padding:14px;border:1px solid rgba(239,230,218,.12);border-radius:14px;background:#1b151f}.appearance-panel header{display:flex;justify-content:space-between;align-items:baseline}.appearance-panel h3{margin-bottom:8px}.confirmed{max-width:350px;margin:0 auto;text-align:center}.confirmed img,.candidate img{display:block;width:100%;aspect-ratio:2/3;object-fit:contain;background:#efe6da}.confirmed figcaption{padding:8px;color:var(--muted);font-size:12px}.confirmed code{font-size:11px}.candidate-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.candidate{position:relative;display:block;padding:7px;border:1px solid rgba(239,230,218,.15);border-radius:12px;background:#17111b;cursor:pointer}.candidate:has(input:checked),.candidate.recommended{border-color:var(--gold)}.candidate.ng{border-color:#c66b79}.pick{display:flex;align-items:center;gap:6px;min-height:42px;font:11px/1.3 ui-monospace,monospace}.badge{position:absolute;top:12px;right:12px;padding:3px 6px;border-radius:999px;background:var(--gold);color:var(--ink);font-size:10px}.candidate ul{margin:2px 0 5px;padding-left:18px;color:#f0a9b2;font-size:12px}.pass{margin:2px 0;color:#a9c8b5;font-size:12px}.note{color:var(--muted);font-size:12px}.pending{display:grid;min-height:320px;place-items:center;border:1px dashed rgba(239,230,218,.25);color:var(--muted)}.checklist ul{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;padding:0;list-style:none}.checklist label{display:flex;gap:9px}.far .overview img{height:82px;aspect-ratio:auto}.far .overview figure{max-width:80px}.far .overview-grid{display:flex;gap:12px;flex-wrap:wrap}@media(max-width:900px){.pair-grid{grid-template-columns:1fr}.candidate-grid{grid-template-columns:1fr 1fr}.overview-grid{grid-template-columns:repeat(4,1fr)}.type-pair>header{grid-template-columns:1fr}.checklist ul{grid-template-columns:1fr}}@media(max-width:520px){.candidate-grid{grid-template-columns:1fr}.overview-grid{grid-template-columns:repeat(2,1fr)}}
</style></head><body><main><p class="eyebrow">SUB ROSA CHARACTER SYSTEM 32</p><h1>淑女／紳士 ペア検品</h1><p class="lead">各タイプの確定側と新規候補側を左右で比較します。対としての一致、性別ごとの識別性、安全性と紋章の厳守を確認し、不足側を1枚選んでください。</p><div class="toolbar"><button id="download">selected-32.jsonを保存</button><label><input id="far" type="checkbox"> 遠目表示</label><span class="status" id="status" aria-live="polite"></span></div><div id="far-root"><section class="overview"><h2>淑女16体・遠目一覧</h2><div class="overview-grid">${overview.f.join("")}</div></section><section class="overview"><h2>紳士16体・遠目一覧</h2><div class="overview-grid">${overview.m.join("")}</div></section>${rows.join("")}</div><section class="checklist"><h2>承認前チェック</h2><ul>${checks.map((item, index) => `<li><label><input type="checkbox" data-check="${index}"><span>${escapeHtml(item)}</span></label></li>`).join("")}</ul></section></main><script>const initial=${data};const key="sub-rosa-contact-32";let state={selected:structuredClone(initial.selected),checks:{},far:false};try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved)state={...state,...saved}}catch{}const status=document.getElementById("status");function persist(){localStorage.setItem(key,JSON.stringify(state));status.textContent=Object.values(state.selected).reduce((sum,item)=>sum+Number(Boolean(item.f))+Number(Boolean(item.m)),0)+" / 32姿選定済み"}document.querySelectorAll('input[type="radio"]').forEach(input=>{const current=state.selected[input.dataset.code]?.[input.dataset.appearance];if(current===input.value)input.checked=true;input.addEventListener("change",()=>{state.selected[input.dataset.code]||={f:null,m:null};state.selected[input.dataset.code][input.dataset.appearance]=input.value;persist()})});document.querySelectorAll("[data-check]").forEach(input=>{input.checked=Boolean(state.checks[input.dataset.check]);input.addEventListener("change",()=>{state.checks[input.dataset.check]=input.checked;persist()})});const far=document.getElementById("far");const farRoot=document.getElementById("far-root");far.checked=state.far;farRoot.classList.toggle("far",state.far);far.addEventListener("change",()=>{state.far=far.checked;farRoot.classList.toggle("far",state.far);persist()});document.getElementById("download").addEventListener("click",()=>{persist();const blob=new Blob([JSON.stringify(state.selected,null,2)+"\\n"],{type:"application/json"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="selected-32.json";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)});persist();</script></body></html>`;

  const destination = path.join(OUT_DIR, "contact-32.html");
  await fs.writeFile(destination, html, "utf8");
  const candidates = await Promise.all(Object.keys(APPEARANCES).flatMap((appearance) => Object.keys(types).map((code) => candidateFiles(appearance, code))));
  console.log(`${path.relative(process.cwd(), destination)}: 16ペア / ${candidates.reduce((sum, files) => sum + files.length, 0)}候補`);
}

main().catch((error) => {
  console.error(`32体コンタクトシート作成に失敗しました: ${error.message}`);
  process.exitCode = 1;
});
