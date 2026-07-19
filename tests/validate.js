const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.createContext(context);

for (const file of ["data/questions.js", "data/types.js", "data/compat.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const { QUESTIONS, TYPES, COMPAT_RULES, evaluateCompatibility } = context.window;
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const typeFields = ["code", "name", "catch", "concept", "personality", "play", "strengths", "pitfalls", "goodWith", "friction", "manual", "shadow", "motif"];

assert(QUESTIONS.length === 40, `質問数が40ではありません: ${QUESTIONS.length}`);
for (const axis of ["lf", "gt", "rp", "cd"]) {
  const questions = QUESTIONS.filter((question) => question.axis === axis);
  assert(questions.length === 9, `${axis}軸が9問ではありません`);
  assert(questions.filter((question) => question.reverse).length >= 3, `${axis}軸の逆転項目が3問未満です`);
}
assert(QUESTIONS.filter((question) => question.axis === "i").length === 4, "強度項目が4問ではありません");
assert(new Set(QUESTIONS.map((question) => question.id)).size === 40, "質問IDが重複しています");

const codes = Object.keys(TYPES);
assert(codes.length === 16, `タイプ数が16ではありません: ${codes.length}`);
for (const code of codes) {
  const type = TYPES[code];
  for (const field of typeFields) assert(type[field], `${code}.${field} がありません`);
  assert(type.code === code, `${code} のcode値が一致しません`);
  assert(type.catch.length <= 20, `${code}.catch が20字を超えています`);
  assert(type.strengths.length === 3, `${code}.strengths が3件ではありません`);
  assert(type.pitfalls.length === 3, `${code}.pitfalls が3件ではありません`);
  assert(type.goodWith.length === 2, `${code}.goodWith が2件ではありません`);
  assert(type.friction.length === 1, `${code}.friction が1件ではありません`);
  assert(type.manual.length === 3, `${code}.manual が3件ではありません`);
  assert(type.goodWith.every((item) => TYPES[item.code]), `${code}.goodWith に不明なコードがあります`);
  assert(type.friction.every((item) => TYPES[item.code]), `${code}.friction に不明なコードがあります`);
}

let comparisons = 0;
for (const firstCode of codes) {
  for (const secondCode of codes) {
    const report = evaluateCompatibility({ typeCode: firstCode, intensity: 1 }, { typeCode: secondCode, intensity: 5 });
    assert(["easy", "align", "talk"].includes(report.key), `${firstCode}×${secondCode} のラベルが不正です`);
    assert(report.topics.length > 0, `${firstCode}×${secondCode} に議題がありません`);
    if (firstCode[2] !== secondCode[2]) {
      assert(report.critical, `${firstCode}×${secondCode} のR/P不一致フラグがありません`);
      assert(report.topics[0].includes("この関係を何と呼ぶか"), `${firstCode}×${secondCode} の最重要議題が先頭にありません`);
    }
    comparisons += 1;
  }
}
assert(COMPAT_RULES.fixedChecklist.length === 7, "固定チェックリストが7項目ではありません");

const siteFiles = ["index.html", "css/style.css", "js/app.js", "data/questions.js", "data/types.js", "data/compat.js", "assets/favicon.svg", "assets/adult-silhouette.svg", "assets/rose-watermark.svg"];
for (const file of siteFiles) assert(fs.existsSync(path.join(root, file)), `必要なファイルがありません: ${file}`);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(/<meta name="robots" content="noindex">/.test(html), "noindexが既定で設定されていません");
assert(html.includes("本サイトは18歳以上の方を対象としています"), "18歳以上向けのフッター表記がありません");

const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
for (const route of ["/quiz", "/result", "/types", "/match", "/safety", "/about"]) {
  assert(appSource.includes(`path === "${route}"`), `ルートがありません: ${route}`);
}
assert(appSource.includes("sr_age_ok") && appSource.includes("sr_last_result"), "指定のlocalStorageキーがありません");
assert(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(appSource), "回答を外部送信し得る通信処理があります");

const largeGap = evaluateCompatibility({ typeCode: "LGRC", intensity: 1 }, { typeCode: "FTRC", intensity: 5 });
assert(largeGap.topics.some((topic) => topic.includes("低いほう")), "強度差2以上で低い側に合わせる議題がありません");

const sourceText = ["index.html", "js/app.js", "data/questions.js", "data/types.js", "data/compat.js"]
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");
for (const forbidden of ["性器", "性行為"]) assert(!sourceText.includes(forbidden), `禁止された直接表現「${forbidden}」が残っています`);

console.log(`OK: ${QUESTIONS.length} questions, ${codes.length} types, ${comparisons} compatibility pairs, ${COMPAT_RULES.fixedChecklist.length} safety checks`);
