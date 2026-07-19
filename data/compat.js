const COMPAT_RULES = {
  labels: {
    easy: "かみ合いやすい",
    align: "要すり合わせ",
    talk: "じっくり対話推奨"
  },
  fixedChecklist: [
    "セーフワード",
    "NGリスト（ハードリミット）",
    "強度とペース",
    "アフターケアの希望",
    "頻度",
    "プレイ外の関係の扱い",
    "体調・気分による当日中止のルール"
  ],
  axisNames: ["主導", "刺激", "関係", "動機"]
};

function evaluateCompatibility(first, second) {
  const intensityLabels = ["ソフト", "ライト", "ミドル", "ディープ", "ハード"];
  const a = first.typeCode;
  const b = second.typeCode;
  const points = [];
  const topics = [];
  let critical = false;
  let moderate = 0;

  if (a[0] !== b[0]) points.push("主導する側と委ねる側の希望が補い合います。");
  else {
    moderate += 1;
    topics.push(a[0] === "L" ? "主導したい気持ちが重なります。場面ごとの担当や交代制を決める。" : "委ねたい気持ちが重なります。小さな提案を交互に出すルールを決める。");
  }
  if (a[1] !== b[1]) points.push("刺激を届けたい側と受け取りたい側の向きが合います。");
  else {
    moderate += 1;
    topics.push(a[1] === "G" ? "刺激を届けたい希望が重なります。交代制や二人が楽しめる別の形を相談する。" : "刺激を受けたい希望が重なります。順番と、それぞれが担える範囲を相談する。");
  }
  if (a[2] === b[2]) points.push(a[2] === "R" ? "関係を継続的なつながりとして大切にする姿勢が共通します。" : "親密な時間と日常を分ける距離感が共通します。");
  else {
    critical = true;
    topics.unshift("関係の位置づけが異なります。『この関係を何と呼ぶか』と、日常で期待する距離を最初に話す。");
  }
  if (a[3] !== b[3]) {
    points.push("満たしたい側と満たされたい側の需要がかみ合います。");
    topics.push("Care側の限界をDesire側が越えないよう、セーフワードと事後レビューの方法を決める。");
  } else {
    moderate += 1;
    topics.push(a[3] === "C" ? "双方が相手を優先して遠慮しやすい組み合わせです。自分の希望を一つずつ言う。" : "双方の要求がぶつかりやすい組み合わせです。優先順と交代の仕方を決める。");
  }
  const gap = Math.abs(first.intensity - second.intensity);
  if (gap >= 2) {
    moderate += 1;
    topics.push(`強度に${gap}段階の差があります。原則として低いほうの「${intensityLabels[Math.min(first.intensity, second.intensity) - 1]}」に合わせる。`);
  } else {
    points.push("強度の好みが近く、ペースを合わせやすい傾向です。");
  }
  const key = critical || moderate >= 2 ? "talk" : moderate === 1 ? "align" : "easy";
  return { key, label: COMPAT_RULES.labels[key], points: points.slice(0, 3), topics, critical };
}

window.COMPAT_RULES = COMPAT_RULES;
window.evaluateCompatibility = evaluateCompatibility;
