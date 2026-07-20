import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const TOOL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const ROOT_DIR = path.resolve(TOOL_DIR, "..");
export const OUT_DIR = path.join(TOOL_DIR, "out");
export const SELECTED_PATH = path.join(TOOL_DIR, "selected.json");
export const SPECS_PATH = path.join(TOOL_DIR, "character-specs.json");
export const ASSET_DIR = path.join(ROOT_DIR, "assets", "characters");

// v2 keeps only the series' rendering language in the shared block. Hair,
// wardrobe, pose, expression, vignette, and emblem all come from specs.
export const COMMON_STYLE = [
  "Match the approved SUB ROSA FGPD character's compact adult chibi proportion: a very large refined head, short torso, and short limbs, approximately 2.2 to 2.7 head-heights overall.",
  "Use delicate dark ink linework with soft bleeding watercolor washes, lightly granulated paper texture, muted dusty color, and restrained antique-gold highlights.",
  "Frame the figure with the same thin antique-gold open art-nouveau arch, with one small top-center emblem integrated into the arch.",
  "Inside the arch, use only a pale sepia watercolor vignette with generous open space; outside the painted figure, arch, and vignette, preserve a genuinely transparent background.",
  "One complete full-body figure only, centered vertical composition, no filled tarot-card rectangle, no title strip, and no cast shadow outside the painted vignette."
].join(" ");

export const VARIANT_DIRECTIONS = [
  "Candidate variation 1: prioritize the most instantly readable hair silhouette, wardrobe shape, and one large type-specific gesture at thumbnail size.",
  "Candidate variation 2: keep every type specification fixed while allowing a slightly closer crop and a clearer relationship between the person, top emblem, and vignette.",
  "Candidate variation 3: keep every type specification fixed while emphasizing asymmetry or stillness from the fourth axis and the large motif-color garment area."
];

const AXIS_KEYS = ["position1", "position2", "position3", "position4"];
const BANNED_PROMPT_TERMS = /\b(?:bdsm|bondage|fetish|erotic|sexual|sensual|dominant|submissive|restraint|blindfold|collar|throne)\b|首輪|細い鎖|鍵と錠|目隠し|玉座/iu;
const REQUIRED_SPEC_FIELDS = ["archetype", "hair", "attire", "gestureExpression", "emblem", "vignette", "silhouette"];

export async function loadTypes() {
  const source = await fs.readFile(path.join(ROOT_DIR, "data", "types.js"), "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "data/types.js" });
  const types = context.window.TYPES;
  if (!types || Object.keys(types).length !== 16) throw new Error("data/types.js から16タイプを読み込めませんでした。");
  return types;
}

export async function loadCharacterSpecs() {
  const specs = JSON.parse(await fs.readFile(SPECS_PATH, "utf8"));
  if (specs.version !== 2) throw new Error("tools/character-specs.json のversionは2である必要があります。");
  if (!specs.axisGrammar || AXIS_KEYS.some((key) => !specs.axisGrammar[key])) throw new Error("4軸の見た目文法が不足しています。");
  if (!specs.types || Object.keys(specs.types).length !== 16) throw new Error("character-specs.json に16タイプが揃っていません。");
  for (const [code, spec] of Object.entries(specs.types)) {
    if (!/^[LF][GT][RP][CD]$/.test(code)) throw new Error(`character-specs.json に不正なコードがあります: ${code}`);
    for (const field of REQUIRED_SPEC_FIELDS) if (!spec[field]) throw new Error(`${code}.${field} がcharacter-specs.jsonにありません。`);
  }
  return specs;
}

function axisDirections(code, specs) {
  if (!/^[LF][GT][RP][CD]$/.test(code)) throw new Error(`${code}: 4軸コードが不正です。`);
  return code.split("").map((letter, index) => {
    const rule = specs.axisGrammar[AXIS_KEYS[index]]?.[letter];
    if (!rule?.prompt) throw new Error(`${code}: ${index + 1}文字目「${letter}」の見た目文法がありません。`);
    return `${letter} axis (${rule.label}): ${rule.prompt}`;
  });
}

export function buildPrompt(type, candidateIndex, specs) {
  for (const field of ["name", "catch", "personality", "motif"]) {
    if (!type[field]) throw new Error(`${type.code}: ${field} がありません。`);
  }
  const spec = specs.types[type.code];
  if (!spec) throw new Error(`${type.code}: character-specs.json にタイプ別スペックがありません。`);
  const variant = VARIANT_DIRECTIONS[(candidateIndex - 1) % VARIANT_DIRECTIONS.length];
  const axes = axisDirections(type.code, specs);
  const isApprovedFgpd = type.code === "FGPD";
  const prompt = [
    "Use case: stylized-concept character illustration for a no-build web diagnosis app.",
    `Series rendering style: ${COMMON_STYLE}`,
    `Archetype: ${spec.archetype}.`,
    `Hair: ${spec.hair}.`,
    `Wardrobe: ${spec.attire}.`,
    `Type-specific gesture and expression: ${spec.gestureExpression}.`,
    `Distinctive thumbnail silhouette: ${spec.silhouette}.`,
    `Top arch emblem: ${spec.emblem}. The entire gold arch must contain only this specified emblem and no other icon; use non-symbolic botanical curves for every other arch line.`,
    `Sepia vignette scene: ${spec.vignette}. Keep this scene pale, sparse, and secondary to the character.`,
    ...axes,
    `Palette requirement: motif color ${type.motif.color} must cover at least 25 to 30 percent of the visible wardrobe area through large panels such as lining, waistcoat, sash, mantle, or coat body; do not reduce it to a tiny accessory.`,
    isApprovedFgpd
      ? "Identity requirement: faithfully preserve the already approved FGPD black side-swept bob, one-eye concealment, cat choker, half-sideways gaze, crossed tiptoe stance, and rounded flowing coat."
      : "Identity separation requirement: create a visibly new person. Do not reuse FGPD's black side-swept bob, one-eye concealment, cat choker, crossed tiptoe stance, or rounded black coat unless explicitly required by this type's own slots.",
    variant,
    "Keep both hands anatomically clear with exactly five fingers where visible; simplify tiny finger detail rather than merging or multiplying fingers.",
    "The character must read as an androgynous adult in their late twenties. Fully clothed, tasteful, and non-explicit; no school uniform or child-coded styling.",
    "No text, letters, numerals, clock-face numbers, musical notes, music staffs, signature, watermark, logo, title, duplicate body part, extra person, or weapon.",
    "No pentagram, five-point star, occult glyph, alchemical glyph, zodiac sign, rune, or decorative mark that resembles writing. Ordinary four-point sparkles are allowed only when the type specification calls for stars or night atmosphere, and then only inside the vignette or on the wardrobe, never on the gold arch.",
    "No exposed shoulder, exposed chest, bare midriff, exposed thigh, lingerie, or provocative pose."
  ].join("\n");
  if (BANNED_PROMPT_TERMS.test(prompt)) throw new Error(`${type.code}: 禁止語がプロンプトに残っています。`);
  return prompt;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export async function readJson(filePath, fallback) {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")); }
  catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
