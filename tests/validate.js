const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = { window: {} };
vm.createContext(context);

for (const file of ["data/questions.js", "data/types.js", "data/notes.js", "data/compat.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const { QUESTIONS, TYPES, NOTE_LINKS, COMPAT_RULES, evaluateCompatibility } = context.window;
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

const noteCodes = Object.keys(NOTE_LINKS);
assert(noteCodes.length === 16, `note設定数が16ではありません: ${noteCodes.length}`);
assert(noteCodes.slice().sort().join(",") === codes.slice().sort().join(","), "note設定の16コードがタイプ定義と一致しません");
for (const code of codes) {
  const setting = NOTE_LINKS[code];
  assert(setting && typeof setting === "object", `${code}のnote設定がありません`);
  assert(typeof setting.url === "string", `${code}.urlが文字列ではありません`);
  assert(typeof setting.published === "boolean", `${code}.publishedが真偽値ではありません`);
  if (setting.url) assert(/^https:\/\//.test(setting.url), `${code}.urlはhttpsで始めてください`);
  if (setting.published) {
    assert(setting.url, `${code}はpublished=trueですがurlが空です`);
    assert(/^https:\/\/note\.com\//.test(setting.url), `${code}の公開URLはhttps://note.com/で始めてください`);
  }
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

const siteFiles = ["index.html", "css/style.css", "js/app.js", "data/questions.js", "data/types.js", "data/notes.js", "data/compat.js", "assets/favicon.svg", "assets/adult-silhouette.svg", "assets/rose-watermark.svg", "assets/og-card.png", "assets/characters/FGPD.svg", "assets/characters/STYLE.md", ".nojekyll"];
for (const file of siteFiles) assert(fs.existsSync(path.join(root, file)), `必要なファイルがありません: ${file}`);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(/<meta name="robots" content="noindex">/.test(html), "noindexが既定で設定されていません");
const publicUrl = "https://sn01dose.github.io/sub-rosa/";
const publicOgImage = `${publicUrl}assets/og-card.png`;
assert(html.includes(`<meta property="og:url" content="${publicUrl}">`), "og:urlが公開URLと一致しません");
assert(html.includes(`<meta property="og:image" content="${publicOgImage}">`), "og:imageが公開URL基準の絶対URLではありません");
assert(html.includes('<meta property="og:image:width" content="1200">') && html.includes('<meta property="og:image:height" content="630">'), "OG画像の寸法メタデータがありません");
assert(html.includes('<meta name="twitter:card" content="summary_large_image">'), "twitter:cardがsummary_large_imageではありません");
assert(!/(?:src|href)=["']\/(?!\/)/.test(html), "index.htmlにルート絶対パスがあります");
assert(html.includes("本サイトは18歳以上の方を対象としています"), "18歳以上向けのフッター表記がありません");
assert(html.indexOf('data/notes.js') > html.indexOf('data/types.js') && html.indexOf('data/notes.js') < html.indexOf('js/app.js'), "data/notes.jsの読み込み順が不正です");

const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
for (const route of ["/quiz", "/result", "/types", "/match", "/safety", "/about"]) {
  assert(appSource.includes(`path === "${route}"`), `ルートがありません: ${route}`);
}
assert(appSource.includes("sr_age_ok") && appSource.includes("sr_last_result"), "指定のlocalStorageキーがありません");
const fetchCalls = appSource.match(/\bfetch\s*\(/g) || [];
assert(fetchCalls.length === 1 && appSource.includes('fetch("assets/characters/manifest.json"'), "通信は同一オリジンのキャラクターmanifest読込だけにしてください");
assert(!/XMLHttpRequest|sendBeacon/.test(appSource), "回答を外部送信し得る通信処理があります");
assert(appSource.includes("function characterSrc(type, appearance"), "キャラクター画像パスのヘルパーがありません");
assert(appSource.includes("function characterSvgSrc(type)"), "SVGフォールバック画像パスのヘルパーがありません");
assert(appSource.includes("_${appearance}.webp`") && appSource.includes(".svg`"), "姿別WebP→SVGの画像フォールバックがありません");
assert(appSource.includes('loading="lazy"') && appSource.includes('decoding="async"'), "キャラクター画像の遅延読込がありません");
assert(appSource.includes("dataset.characterFallback='alternate'") && appSource.includes("dataset.characterFallback='svg'") && appSource.includes("dataset.characterFallback = \"silhouette\""), "選択姿→反対姿→SVG→共通シルエットのフォールバックが揃っていません");
assert(appSource.includes("availableCharacterAppearances") && appSource.includes("available.length === 2"), "片側しかないタイプで姿トグルを隠せません");
assert(appSource.includes('f: { label: "淑女" }') && appSource.includes('m: { label: "紳士" }'), "淑女/紳士トグルの表示名がありません");
assert(!/assets\/characters\/\$\{(?:encodeURIComponent\()?type\.code\)?\}\.webp/.test(appSource), "無印キャラクターWebP参照が残っています");
assert(appSource.includes('const SHARE_HASHTAG = "#SUBROSA診断"'), "共有ハッシュタグが定数化されていません");
assert(appSource.includes("twitter.com/intent/tweet") && appSource.includes("social-plugins.line.me/lineit/share"), "XまたはLINEの共有リンクがありません");
assert(appSource.includes("navigator.clipboard") && appSource.includes("navigator.share"), "コピーまたは共有シートへの対応がありません");
assert(appSource.includes("function sharedResultHash(typeCode)") && appSource.includes("isSharedPreview: true"), "未回答者向け共有ディープリンク処理がありません");
assert(appSource.includes("function sharedResultUrl(typeCode)") && appSource.includes("location.origin") && appSource.includes("location.pathname"), "共有URLがoriginとpathnameから組み立てられていません");
assert(!appSource.includes('location.href.split("#")'), "共有URLがサブパスを明示的に扱っていません");
assert(!/[`"']\/assets\//.test(appSource), "js/app.jsにルート絶対のassets参照があります");
assert(appSource.includes("function noteTeaser(type, compact = false)"), "詳細版予告カードが共通化されていません");
assert(appSource.includes("詳細版は準備中です") && appSource.includes("noteで詳細レポートを見る"), "noteの非公開・公開表示が揃っていません");
assert(appSource.includes("無料版だけでも診断は完結します"), "無料版完結の注意書きがありません");
assert(!/type\.(?:play|pitfalls|shadow|friction)\b/.test(appSource), "有料詳細へ回すタイプ情報が無料画面で描画されています");
assert(!/item\.reason\b/.test(appSource), "相性理由文が無料画面で描画されています");

for (const toolFile of ["tools/generate-characters.mjs", "tools/finalize-characters.mjs", "tools/generate-og-card.mjs", "tools/build-character-gallery.mjs", "tools/build-review-sheets.mjs", "tools/build-character-contact.mjs", "tools/build-character-contact-32.mjs", "tools/character-specs.json", "tools/selected.json", "tools/selected-32.json", "tools/package.json", ".env.example", ".gitignore"]) {
  assert(fs.existsSync(path.join(root, toolFile)), `画像生成ツールがありません: ${toolFile}`);
}
const generatorSource = fs.readFileSync(path.join(root, "tools/generate-characters.mjs"), "utf8");
assert(generatorSource.includes("process.env.OPENAI_API_KEY"), "画像生成ツールが環境変数のAPIキーを参照していません");
assert(generatorSource.includes("process.loadEnvFile") && generatorSource.includes('path.join(ROOT_DIR, ".env")'), "画像生成ツールがリポジトリ直下の.envを読み込みません");
assert(generatorSource.includes('const DEFAULT_MODEL = "gpt-image-1.5"'), "透明背景対応モデルが既定ではありません");
assert(generatorSource.includes("gpt-image-2 は透明背景をサポートしていません"), "非対応モデルの事前ガードがありません");
assert(generatorSource.includes('const EDITS_API_URL = "https://api.openai.com/v1/images/edits"'), "参照画像用のEdit APIがありません");
assert(generatorSource.includes('form.append("input_fidelity", "high")'), "シリーズ構図を高忠実度で参照する設定がありません");
assert(generatorSource.includes("loadCharacterSpecs") && generatorSource.includes("buildPrompt(type, candidate, specs,"), "画像生成がcharacter-specs駆動ではありません");
assert(generatorSource.includes("--output-set"), "既存候補を保持する出力セット指定がありません");
assert(generatorSource.includes("previousManifest") && generatorSource.includes("manifestItems"), "分割生成時に既存manifest項目を維持できません");
assert(generatorSource.includes("--appearance") && generatorSource.includes("withPairReference") && generatorSource.includes("selectionValue(selected, code, counterpart)"), "同タイプの確定側を参照するf/mペア生成がありません");
assert(generatorSource.includes("options.outputSet = options.appearance"), "f/m候補がtools/out/fまたはmへ自動分離されません");
assert(!/sk-[A-Za-z0-9_-]{20,}/.test(generatorSource), "画像生成ツールにAPIキーらしき値があります");
const characterLibSource = fs.readFileSync(path.join(root, "tools/lib/character-data.mjs"), "utf8");
assert(characterLibSource.includes("motif color") && characterLibSource.includes("25 to 30 percent"), "motif.colorの衣装面積ルールがプロンプトにありません");
assert(characterLibSource.includes("No pentagram") && characterLibSource.includes("clock-face numbers") && characterLibSource.includes("musical notes"), "紋章・文字・数字の禁止ルールが不足しています");
const commonStyleMatch = characterLibSource.match(/export const COMMON_STYLE = \[([\s\S]*?)\]\.join/);
assert(commonStyleMatch, "共通スタイルブロックを検出できません");
assert(!/dark attire|long-sleeved dark attire|black bob|cat choker/i.test(commonStyleMatch[1]), "共通スタイルにタイプ固有の服装・髪・小物が残っています");

const characterSpecs = JSON.parse(fs.readFileSync(path.join(root, "tools/character-specs.json"), "utf8"));
assert(characterSpecs.version === 2, "character-specs.jsonがv2ではありません");
assert(Object.keys(characterSpecs.types || {}).length === 16, "character-specs.jsonに16タイプがありません");
for (const axis of ["position1", "position2", "position3", "position4"]) assert(characterSpecs.axisGrammar?.[axis], `${axis}の見た目文法がありません`);
for (const code of codes) {
  const spec = characterSpecs.types[code];
  assert(spec, `${code}のキャラクタースペックがありません`);
  for (const field of ["archetype", "hair", "attire", "gestureExpression", "emblem", "vignette", "silhouette"]) assert(spec[field], `${code}.${field}がありません`);
}
assert(new Set(codes.map((code) => characterSpecs.types[code].hair)).size === 16, "髪スペックがタイプ間で重複しています");
assert(new Set(codes.map((code) => characterSpecs.types[code].silhouette)).size === 16, "シルエットスペックがタイプ間で重複しています");
const contactSource = fs.readFileSync(path.join(root, "tools/build-character-contact.mjs"), "utf8");
assert(contactSource.includes('path.join(OUT_DIR, "contact.html")'), "contact.htmlの生成処理がありません");
assert(contactSource.includes("遠目表示") && contactSource.includes("五芒星") && contactSource.includes("motif.color"), "コンタクトシートの同質化チェック項目が不足しています");
const contact32Source = fs.readFileSync(path.join(root, "tools/build-character-contact-32.mjs"), "utf8");
assert(contact32Source.includes('path.join(OUT_DIR, "contact-32.html")'), "contact-32.htmlの生成処理がありません");
assert(contact32Source.includes("淑女16体") && contact32Source.includes("紳士16体") && contact32Source.includes("selected-32.json"), "32体の対比・識別・選定UIが不足しています");
const characterStyle = fs.readFileSync(path.join(root, "assets/characters/STYLE.md"), "utf8");
assert(characterStyle.includes("32-character pairs") && characterStyle.includes("4軸から見た目への文法") && characterStyle.includes("プリンセス") && characterStyle.includes("プリンス"), "STYLE.mdが32体ペア規約へ更新されていません");
const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
assert(/^\.env$/m.test(gitignore) && /^!\.env\.example$/m.test(gitignore), ".envの除外設定が安全ではありません");
const envExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");
assert(/^OPENAI_API_KEY=$/m.test(envExample) && !/sk-[A-Za-z0-9_-]{20,}/.test(envExample), ".env.exampleが安全ではありません");

const cssSource = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
assert(!/url\(\s*["']?\//.test(cssSource), "css/style.cssにルート絶対のurl()があります");
assert(cssSource.includes("../assets/rose-watermark.svg"), "CSSのrose-watermark参照が相対パスではありません");

const ogCard = fs.readFileSync(path.join(root, "assets/og-card.png"));
assert(ogCard.length >= 24 && ogCard.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "OGカードがPNGではありません");
assert(ogCard.readUInt32BE(16) === 1200 && ogCard.readUInt32BE(20) === 630, "OGカードが1200x630ではありません");

const selectedCharacters = JSON.parse(fs.readFileSync(path.join(root, "tools/selected.json"), "utf8"));
assert(Object.keys(selectedCharacters).length === 16, "tools/selected.jsonに16タイプの選定結果がありません");
const selected32 = JSON.parse(fs.readFileSync(path.join(root, "tools/selected-32.json"), "utf8"));
assert(JSON.stringify(selected32) === JSON.stringify(selectedCharacters), "移行時のselected.jsonとselected-32.jsonが一致しません");
const finalizedCharacterManifest = JSON.parse(fs.readFileSync(path.join(root, "assets/characters/manifest.json"), "utf8"));
if (finalizedCharacterManifest.complete === true) {
  assert(finalizedCharacterManifest.version === 2, "complete character manifest must use version 2");
  assert(Object.keys(finalizedCharacterManifest.characters || {}).length === 16, "complete character manifest must contain 16 types");
  for (const code of codes) {
    const selection = selectedCharacters[code];
    assert(selection && Object.keys(selection).sort().join(",") === "f,m", `${code}: f/m selection keys are missing`);
    const variants = finalizedCharacterManifest.characters[code];
    assert(variants && variants.f && variants.m, `${code}: f/m manifest entries are missing`);
    for (const appearance of ["f", "m"]) {
      const value = selection[appearance];
      assert(typeof value === "string" && value.endsWith(".png"), `${code}_${appearance}: selected PNG is missing`);
      const source = value.includes("/") ? path.join(root, "tools/out", ...value.split("/")) : path.join(root, "tools/out", code, value);
      assert(fs.existsSync(source), `${code}_${appearance}: selected PNG does not exist: ${value}`);
      const item = variants[appearance];
      assert(item.exists === true, `${code}_${appearance}: manifest exists flag is false`);
      const expectedSource = value.includes("/") ? `tools/out/${value}` : `tools/out/${code}/${value}`;
      assert(item.source === expectedSource, `${code}_${appearance}: manifest source does not match selected.json`);
      assert(item.outputs?.length === 2, `${code}_${appearance}: two WebP outputs are required`);
      for (const expected of [
        { file: `assets/characters/${code}_${appearance}.webp`, width: 640, height: 840 },
        { file: `assets/characters/${code}_${appearance}@2x.webp`, width: 1280, height: 1680 }
      ]) {
        const output = item.outputs.find((entry) => entry.file === expected.file);
        assert(output, `${expected.file}: missing from manifest`);
        assert(output.width === expected.width && output.height === expected.height, `${expected.file}: invalid dimensions`);
        assert(output.hasAlpha === true && output.hasTransparency === true, `${expected.file}: transparency was not preserved`);
        const outputPath = path.join(root, ...expected.file.split("/"));
        assert(fs.existsSync(outputPath), `${expected.file}: output file is missing`);
        const bytes = fs.statSync(outputPath).size;
        assert(bytes === output.bytes, `${expected.file}: file size does not match manifest`);
        assert(bytes <= finalizedCharacterManifest.targetBytes, `${expected.file}: exceeds target byte size`);
      }
    }
    assert(!fs.existsSync(path.join(root, "assets", "characters", `${code}.webp`)), `${code}: unprefixed WebP remains`);
    assert(!fs.existsSync(path.join(root, "assets", "characters", `${code}@2x.webp`)), `${code}: unprefixed @2x WebP remains`);
  }
}

if (finalizedCharacterManifest.complete !== true) {
const existingFemale = new Set(["FGRD", "FTRD", "FTPC"]);
for (const code of codes) {
  const selection = selectedCharacters[code];
  assert(selection && Object.keys(selection).sort().join(",") === "f,m", `${code}のf/m選定欄がありません`);
  const existingAppearance = existingFemale.has(code) ? "f" : "m";
  const missingAppearance = existingAppearance === "f" ? "m" : "f";
  assert(selection[existingAppearance] && selection[missingAppearance] === null, `${code}の既存姿と不足姿の記録が不正です`);
  const value = selection[existingAppearance];
  const source = value.includes("/") ? path.join(root, "tools/out", ...value.split("/")) : path.join(root, "tools/out", code, value);
  assert(fs.existsSync(source), `${code}_${existingAppearance}の選定元PNGがありません: ${value}`);
}

const characterManifest = JSON.parse(fs.readFileSync(path.join(root, "assets/characters/manifest.json"), "utf8"));
assert(characterManifest.version === 2 && characterManifest.complete === false, "移行中のキャラクターmanifest状態が不正です");
assert(Object.keys(characterManifest.characters || {}).length === 16, "キャラクターmanifestに16タイプありません");
for (const code of codes) {
  const variants = characterManifest.characters[code];
  assert(variants && variants.f && variants.m, `${code}のf/m manifest欄がありません`);
  const existingAppearance = existingFemale.has(code) ? "f" : "m";
  const missingAppearance = existingAppearance === "f" ? "m" : "f";
  const item = variants[existingAppearance];
  assert(item.exists === true && variants[missingAppearance].exists === false, `${code}の存在フラグが移行状態と一致しません`);
  const expectedSource = selectedCharacters[code][existingAppearance].includes("/")
    ? `tools/out/${selectedCharacters[code][existingAppearance]}`
    : `tools/out/${code}/${selectedCharacters[code][existingAppearance]}`;
  assert(item.source === expectedSource, `${code}_${existingAppearance}のmanifest選定元がselected.jsonと一致しません`);
  assert(item.outputs?.length === 2, `${code}_${existingAppearance}のWebP出力が2種類ではありません`);
  for (const expected of [
    { file: `assets/characters/${code}_${existingAppearance}.webp`, width: 640, height: 840 },
    { file: `assets/characters/${code}_${existingAppearance}@2x.webp`, width: 1280, height: 1680 }
  ]) {
    const output = item.outputs.find((entry) => entry.file === expected.file);
    assert(output, `${expected.file}がmanifestにありません`);
    assert(output.width === expected.width && output.height === expected.height, `${expected.file}の寸法が不正です`);
    assert(output.hasAlpha === true && output.hasTransparency === true, `${expected.file}の透過が維持されていません`);
    const outputPath = path.join(root, ...expected.file.split("/"));
    assert(fs.existsSync(outputPath), `${expected.file}がありません`);
    const bytes = fs.statSync(outputPath).size;
    assert(bytes === output.bytes, `${expected.file}の容量がmanifestと一致しません`);
    assert(bytes <= characterManifest.targetBytes, `${expected.file}が150KB目安を超えています`);
  }
  assert(!fs.existsSync(path.join(root, "assets", "characters", `${code}.webp`)), `${code}.webpの無印ファイルが残っています`);
  assert(!fs.existsSync(path.join(root, "assets", "characters", `${code}@2x.webp`)), `${code}@2x.webpの無印ファイルが残っています`);
}

}

const fgpdSvg = fs.readFileSync(path.join(root, "assets/characters/FGPD.svg"), "utf8");
assert(fgpdSvg.includes('viewBox="0 0 320 420"'), "FGPD.svgのviewBoxが指定値ではありません");
assert(Buffer.byteLength(fgpdSvg, "utf8") < 25 * 1024, "FGPD.svgが25KBを超えています");
assert(!/<(?:image|text|script|foreignObject|rect|circle|ellipse|polygon|polyline|line)\b/i.test(fgpdSvg), "FGPD.svgに許可していない要素があります");
assert(fgpdSvg.includes("#333747") && fgpdSvg.includes("#241a2e") && fgpdSvg.includes("#efe6da") && fgpdSvg.includes("#c9a36a"), "FGPD.svgの基調色が不足しています");

const largeGap = evaluateCompatibility({ typeCode: "LGRC", intensity: 1 }, { typeCode: "FTRC", intensity: 5 });
assert(largeGap.topics.some((topic) => topic.includes("低いほう")), "強度差2以上で低い側に合わせる議題がありません");

const sourceText = ["index.html", "js/app.js", "data/questions.js", "data/types.js", "data/notes.js", "data/compat.js"]
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");
for (const forbidden of ["性器", "性行為"]) assert(!sourceText.includes(forbidden), `禁止された直接表現「${forbidden}」が残っています`);

console.log(`OK: ${QUESTIONS.length} questions, ${codes.length} types, ${noteCodes.length} note settings, ${comparisons} compatibility pairs, ${COMPAT_RULES.fixedChecklist.length} safety checks`);
