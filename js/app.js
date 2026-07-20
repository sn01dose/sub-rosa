(() => {
  "use strict";

  const ALLOW_INDEXING = false;
  const STORAGE_AGE = "sr_age_ok";
  const STORAGE_RESULT = "sr_last_result";
  const AXES = {
    lf: { title: "主導軸", high: "Lead", low: "Follow", highJa: "導きたい", lowJa: "委ねたい" },
    gt: { title: "刺激軸", high: "Give", low: "Take", highJa: "与えたい", lowJa: "受けたい" },
    rp: { title: "関係軸", high: "Romance", low: "Play", highJa: "つながり", lowJa: "その時間" },
    cd: { title: "動機軸", high: "Care", low: "Desire", highJa: "相手を満たす", lowJa: "自分を満たす" }
  };
  const CHOICES = [
    { value: 5, label: "あてはまる" },
    { value: 4, label: "ややあてはまる" },
    { value: 3, label: "どちらでもない" },
    { value: 2, label: "ややあてはまらない" },
    { value: 1, label: "あてはまらない" }
  ];
  const INTENSITY_LABELS = ["ソフト", "ライト", "ミドル", "ディープ", "ハード"];
  const SHARE_HASHTAG = "#SUBROSA診断";
  const NOTE_TOPICS = [
    "深層傾向のメカニズム",
    "つまずきやすいパターンと処方箋",
    "相性とすれ違いの解きかた",
    "境界線と合意の伝えかた（会話例つき）",
    "わたしの取説・完全版"
  ];
  const SOCIAL_LINKS = {
    instagram: "https://www.instagram.com/_sn01__dose/",
    threads: "https://www.threads.com/@_sn01__dose"
  };
  const app = document.getElementById("app");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const quizState = { order: [], answers: {}, current: 0 };
  let quizTransitioning = false;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); }
    catch (_) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); }
    catch (_) { /* The site remains usable when storage is unavailable. */ }
  }

  function characterSrc(type) {
    return `assets/characters/${encodeURIComponent(type.code)}.webp`;
  }

  function characterSvgSrc(type) {
    return `assets/characters/${encodeURIComponent(type.code)}.svg`;
  }

  function setMetaPolicy() {
    const robots = document.querySelector('meta[name="robots"]');
    robots.setAttribute("content", ALLOW_INDEXING ? "index,follow" : "noindex");
  }

  function routeInfo() {
    const raw = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
    const normalized = raw || "/";
    const [path, query = ""] = normalized.split("?");
    return { path: path || "/", params: new URLSearchParams(query) };
  }

  function setActiveNav(path) {
    document.querySelectorAll(".site-nav a").forEach((link) => {
      const linkPath = link.getAttribute("href").slice(1);
      const active = path === linkPath || (path === "/result" && linkPath === "/quiz");
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function focusMain() {
    requestAnimationFrame(() => app.focus({ preventScroll: true }));
  }

  function applyStagger(root) {
    const groupSelectors = [".axis-grid", ".card-grid", ".three-steps", ".safety-stack", ".definition-grid", ".score-bars", ".relation-list", ".match-columns", ".share-row", ".compat-chips", ".note-teaser-grid"];
    root.querySelectorAll(groupSelectors.join(",")).forEach((group) => {
      Array.from(group.children).forEach((element, index) => {
        element.classList.add("motion-stagger");
        element.style.setProperty("--stagger-delay", `${index * 50}ms`);
      });
    });
    root.querySelectorAll(".result-card, .result-section, .form-card, .match-result, .note-teaser, .result-fineprint, .safety-callout, .empty-state").forEach((element, index) => {
      element.classList.add("motion-stagger");
      element.style.setProperty("--stagger-delay", `${index * 50}ms`);
    });
  }

  function renderPage(html, title, motion = "route") {
    app.classList.remove("is-entering", "is-question-entering");
    app.innerHTML = html;
    applyStagger(app);
    if (motion === "question") app.classList.add("is-question-entering");
    else if (motion === "route") app.classList.add("is-entering");
    document.title = `${title}｜SUB ROSA`;
    focusMain();
  }

  function transitionQuiz(update) {
    if (quizTransitioning) return;
    quizTransitioning = true;
    const commit = () => {
      update();
      quizTransitioning = false;
    };
    if (reducedMotion.matches) {
      commit();
      return;
    }
    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(commit);
      return;
    }
    const card = document.querySelector(".question-card");
    if (!card) {
      commit();
      return;
    }
    card.classList.add("is-exiting");
    window.setTimeout(commit, 140);
  }

  function initAgeGate() {
    const modal = document.getElementById("age-modal");
    if (storageGet(STORAGE_AGE) !== "1") modal.showModal();
    document.getElementById("age-yes").addEventListener("click", () => {
      storageSet(STORAGE_AGE, "1");
      modal.close();
    });
    document.getElementById("age-no").addEventListener("click", () => {
      location.replace("https://www.google.com/");
    });
    modal.addEventListener("cancel", (event) => event.preventDefault());
  }

  function renderHome() {
    renderPage(`
      <section class="hero">
        <div class="hero-inner">
          <div class="hero-ornament" aria-hidden="true">❦</div>
          <p class="eyebrow">A PRIVATE COMPATIBILITY PORTRAIT</p>
          <h1>SUB ROSA</h1>
          <p class="hero-sub">秘密の書斎で見つける、二人の輪郭。</p>
          <p class="hero-copy">4つの軸と16のタイプから、あなたが心地よいと感じる関係の傾向をひもときます。結果は答えではなく、安心して話すための最初の一枚です。</p>
          <div class="button-row">
            <a class="button button-primary" href="#/quiz">診断をはじめる <span aria-hidden="true">→</span></a>
            <a class="button button-ghost" href="#/match">二人の相性を照合する</a>
          </div>
          <p class="privacy-note">40問・約5分／回答はすべて端末内で完結</p>
        </div>
      </section>

      <section class="home-section" aria-labelledby="axes-title">
        <div class="section-heading">
          <p class="eyebrow">FOUR AXES</p>
          <h2 id="axes-title">ひとつの役割では語れないから</h2>
          <p class="quiet">「導く・委ねる」と「与える・受ける」を分けて見つめます。</p>
        </div>
        <div class="axis-grid">
          <article class="axis-card"><span class="axis-symbol">L / F</span><h3>主導のあり方</h3><p>流れを導きたいか、信頼して委ねたいか。</p></article>
          <article class="axis-card"><span class="axis-symbol">G / T</span><h3>刺激の向き</h3><p>相手へ届けたいか、自分が受け取りたいか。</p></article>
          <article class="axis-card"><span class="axis-symbol">R / P</span><h3>関係の置き場所</h3><p>継続するつながりか、その時間の遊びか。</p></article>
          <article class="axis-card"><span class="axis-symbol">C / D</span><h3>満たしたい気持ち</h3><p>相手の喜びか、自分の望みか。どちらも等価です。</p></article>
        </div>
      </section>

      <section class="home-section" aria-labelledby="flow-title">
        <div class="section-heading"><p class="eyebrow">HOW IT WORKS</p><h2 id="flow-title">診断から、対話へ</h2></div>
        <div class="three-steps">
          <div class="step"><b>40の問いに答える</b><span>考えすぎず、今の自分に近いものを。</span></div>
          <div class="step"><b>16タイプから知る</b><span>強みと注意点を、同じ重さで見つめます。</span></div>
          <div class="step"><b>二人で照合する</b><span>優劣ではなく、先に話したいことを発見。</span></div>
        </div>
      </section>

      <section class="home-section">
        <div class="disclaimer-box">
          <h2>これは、会話のきっかけです。</h2>
          <p>本診断は娯楽および対話補助を目的としたもので、心理検査・医学的評価ではありません。どのタイプにも優劣はなく、結果があなたのすべてを決めるものでもありません。</p>
          <a class="text-link" href="#/safety">安心して楽しむためのガイドを読む</a>
        </div>
      </section>
    `, "相性タイプ診断");
  }

  function shuffledQuestions() {
    const original = window.QUESTIONS.slice();
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const items = original.slice();
      for (let i = items.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      const valid = items.every((item, i) => i < 2 || item.axis !== items[i - 1].axis || item.axis !== items[i - 2].axis);
      if (valid) return items;
    }
    return original.sort((a, b) => a.id.localeCompare(b.id));
  }

  function resetQuiz() {
    quizState.order = shuffledQuestions();
    quizState.answers = {};
    quizState.current = 0;
  }

  function renderQuiz(isQuestionSwap = false) {
    if (!quizState.order.length) resetQuiz();
    const question = quizState.order[quizState.current];
    const selected = quizState.answers[question.id];
    const progress = Math.round(((quizState.current + 1) / window.QUESTIONS.length) * 100);
    renderPage(`
      <section class="page page-narrow">
        <div class="quiz-head">
          <div class="progress-meta"><span>QUESTION ${String(quizState.current + 1).padStart(2, "0")} / 40</span><span>${progress}%</span></div>
          <div class="progress-track" role="progressbar" aria-label="診断の進捗" aria-valuemin="0" aria-valuemax="40" aria-valuenow="${quizState.current + 1}"><div class="progress-fill" style="width:${progress}%"></div></div>
        </div>
        <article class="question-card">
          <span class="question-number">UNDER THE ROSE</span>
          <h1 class="question-text">${escapeHtml(question.text)}</h1>
          <div class="choice-list" role="group" aria-label="回答を選択">
            ${CHOICES.map((choice) => `<button class="choice" type="button" data-value="${choice.value}" aria-pressed="${selected === choice.value}">${choice.label}</button>`).join("")}
          </div>
        </article>
        <div class="quiz-actions">
          <button class="button button-ghost button-small" id="quiz-back" type="button" ${quizState.current === 0 ? "disabled" : ""}>← 戻る</button>
          <button class="button button-ghost button-small" id="quiz-reset" type="button">最初から</button>
        </div>
        <p class="fineprint" style="text-align:center;margin-top:24px">正解はありません。今の気持ちに近いものを選んでください。</p>
      </section>
    `, `診断 ${quizState.current + 1}/40`, isQuestionSwap ? (typeof document.startViewTransition === "function" ? "none" : "question") : "route");

    document.querySelectorAll(".choice").forEach((button) => {
      button.addEventListener("click", () => {
        if (quizState.current < window.QUESTIONS.length - 1) {
          transitionQuiz(() => {
            quizState.answers[question.id] = Number(button.dataset.value);
            quizState.current += 1;
            renderQuiz(true);
          });
        } else {
          quizState.answers[question.id] = Number(button.dataset.value);
          finishQuiz();
        }
      });
    });
    document.getElementById("quiz-back").addEventListener("click", () => {
      if (quizState.current === 0) return;
      transitionQuiz(() => {
        quizState.current -= 1;
        renderQuiz(true);
      });
    });
    document.getElementById("quiz-reset").addEventListener("click", () => {
      if (window.confirm("回答を消して、最初の質問に戻りますか？")) {
        transitionQuiz(() => {
          resetQuiz();
          renderQuiz(true);
        });
      }
    });
  }

  function calculateResult() {
    const sums = { lf: 0, gt: 0, rp: 0, cd: 0 };
    const counts = { lf: 0, gt: 0, rp: 0, cd: 0 };
    const intensityValues = [];
    window.QUESTIONS.forEach((question) => {
      const raw = quizState.answers[question.id];
      if (question.axis === "i") intensityValues.push(raw);
      else {
        sums[question.axis] += question.reverse ? 6 - raw : raw;
        counts[question.axis] += 1;
      }
    });
    const scores = {};
    Object.keys(sums).forEach((axis) => {
      scores[axis] = Math.round(((sums[axis] - counts[axis]) / (counts[axis] * 4)) * 100);
    });
    const typeCode = `${scores.lf >= 50 ? "L" : "F"}${scores.gt >= 50 ? "G" : "T"}${scores.rp >= 50 ? "R" : "P"}${scores.cd >= 50 ? "C" : "D"}`;
    const intensity = Math.round(intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length);
    return { typeCode, scores, intensity, isSwitch: scores.lf >= 45 && scores.lf <= 55 };
  }

  function resultHash(result) {
    const params = new URLSearchParams({
      r: result.typeCode,
      lf: result.scores.lf,
      gt: result.scores.gt,
      rp: result.scores.rp,
      cd: result.scores.cd,
      i: result.intensity,
      sw: result.isSwitch ? 1 : 0
    });
    return `#/result?${params.toString()}`;
  }

  function sharedResultHash(typeCode) {
    const params = new URLSearchParams({ r: typeCode });
    return `#/result?${params.toString()}`;
  }

  function sharedResultUrl(typeCode) {
    return `${location.origin}${location.pathname}${sharedResultHash(typeCode)}`;
  }

  function finishQuiz() {
    const result = calculateResult();
    storageSet(STORAGE_RESULT, JSON.stringify(result));
    location.hash = resultHash(result).slice(1);
  }

  function validScore(value) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 100 ? Math.round(number) : null;
  }

  function readResult(params) {
    const typeCode = (params.get("r") || "").toUpperCase();
    const intensity = Number(params.get("i"));
    const scores = { lf: validScore(params.get("lf")), gt: validScore(params.get("gt")), rp: validScore(params.get("rp")), cd: validScore(params.get("cd")) };
    if (window.TYPES[typeCode] && intensity >= 1 && intensity <= 5 && Object.values(scores).every((value) => value !== null)) {
      return { typeCode, intensity: Math.round(intensity), scores, isSwitch: params.get("sw") === "1" || (scores.lf >= 45 && scores.lf <= 55), isSharedPreview: false };
    }
    if (params.has("r")) {
      return window.TYPES[typeCode]
        ? { typeCode, intensity: null, scores: null, isSwitch: false, isSharedPreview: true }
        : null;
    }
    try {
      const saved = JSON.parse(storageGet(STORAGE_RESULT));
      if (saved && window.TYPES[saved.typeCode]) return { ...saved, isSharedPreview: false };
    } catch (_) { /* A missing or old local result is harmless. */ }
    return null;
  }

  function scoreBar(axisKey, score) {
    const axis = AXES[axisKey];
    const tied = score >= 45 && score <= 55;
    const side = score >= 50 ? `${axis.high} ${score}%` : `${axis.low} ${100 - score}%`;
    return `
      <div class="score-row">
        <div class="score-head"><strong>${axis.title}</strong><span>${side}${tied ? " ・ 拮抗" : ""}</span></div>
        <div class="score-track"><div class="score-fill ${tied ? "tied" : ""}" style="width:${score}%"></div></div>
        <div class="score-caption"><span>${axis.low} — ${axis.lowJa}</span><span>${axis.high} — ${axis.highJa}</span></div>
      </div>`;
  }

  function freeTypeSections(type, matchHref = "#/match") {
    return `
      <section class="result-section prose-section"><p class="eyebrow">CORE CONCEPT</p><h2>このタイプの核</h2><p>${type.concept}</p></section>
      <section class="result-section prose-section"><p class="eyebrow">PERSONALITY</p><h2>基本性格</h2><p>${type.personality}</p></section>
      <section class="result-section"><p class="eyebrow">STRENGTHS</p><h2>あなたの魅力</h2><ul class="strength-list">${type.strengths.map((item) => `<li>${item}</li>`).join("")}</ul></section>
      <section class="result-section"><p class="eyebrow">A PAGE FROM YOUR MANUAL</p><h2>わたしの取説（抜粋）</h2><ol class="manual manual-excerpt"><li>${type.manual[0]}</li></ol><p class="result-section-note">完全版では、残りの取説もあわせて紹介します。</p></section>
      <section class="result-section"><p class="eyebrow">GOOD WITH</p><h2>相性の入口</h2><p class="result-section-note">かみ合いやすい相手タイプ</p><div class="compat-chips">${type.goodWith.map((item) => `<span class="compat-chip">${window.TYPES[item.code].name}</span>`).join("")}</div><a class="button button-primary section-cta" href="${matchHref}">二人の結果を照合する（無料）</a><a class="safety-inline-link" href="#/safety">安全ガイドを読む</a></section>
    `;
  }

  function socialNotice() {
    return `<p class="note-social">公開はSNSでお知らせします <span aria-hidden="true">—</span> <a href="${SOCIAL_LINKS.instagram}" target="_blank" rel="author noopener">Instagram</a><span aria-hidden="true">／</span><a href="${SOCIAL_LINKS.threads}" target="_blank" rel="author noopener">Threads</a></p>`;
  }

  function noteTeaser(type, compact = false) {
    const setting = window.NOTE_LINKS?.[type.code] || { url: "", published: false };
    const headingTag = compact ? "h3" : "h2";
    const status = setting.published
      ? `<a class="button button-primary note-button" href="${escapeHtml(setting.url)}" target="_blank" rel="noopener">noteで詳細レポートを見る <span aria-hidden="true">↗</span></a><p class="note-external">外部サイト（note）が開きます</p>`
      : `<span class="note-status">詳細版は準備中です</span>${socialNotice()}`;
    return `
      <article class="note-teaser${compact ? " note-teaser-compact" : ""}" style="--type-color:${type.motif.color}">
        <p class="eyebrow">DEEPER PORTRAIT · ${type.code}</p>
        <${headingTag}>もっと深く知りたいあなたへ</${headingTag}>
        ${compact ? `<p class="note-type-name">${type.name}</p>` : ""}
        <p class="note-lead">詳細版で扱う予定のトピック</p>
        <ul class="note-topic-list">${NOTE_TOPICS.map((topic) => `<li>${topic}</li>`).join("")}</ul>
        <div class="note-action">${status}</div>
      </article>`;
  }

  function shareRow(type) {
    const url = sharedResultUrl(type.code);
    const text = `私は「${type.name}」タイプでした。｜SUB ROSA 相性タイプ診断`;
    const socialText = `${text}\n${SHARE_HASHTAG}`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialText)}&url=${encodeURIComponent(url)}`;
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(socialText)}`;
    return `
      <div class="share-wrap" aria-labelledby="share-title">
        <p class="share-title" id="share-title">結果をシェア</p>
        <div class="share-row">
          <a class="share-action" href="${xUrl}" target="_blank" rel="noopener" aria-label="Xで結果を共有する">X</a>
          <a class="share-action" href="${lineUrl}" target="_blank" rel="noopener" aria-label="LINEで結果を共有する">LINE</a>
          <button class="share-action" id="copy-share-link" type="button" data-share-url="${escapeHtml(url)}">リンクをコピー</button>
          <button class="share-action" id="native-share" type="button" hidden>共有</button>
        </div>
        <p class="share-status" id="share-status" aria-live="polite"></p>
      </div>`;
  }

  function bindShareActions(type) {
    const url = sharedResultUrl(type.code);
    const text = `私は「${type.name}」タイプでした。｜SUB ROSA 相性タイプ診断`;
    const status = document.getElementById("share-status");
    document.getElementById("copy-share-link").addEventListener("click", async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(url);
        status.textContent = "共有用リンクをコピーしました。";
      } catch (_) {
        window.prompt("この共有用リンクをコピーしてください", url);
      }
    });
    const nativeShare = document.getElementById("native-share");
    if (typeof navigator.share === "function") {
      nativeShare.hidden = false;
      nativeShare.addEventListener("click", async () => {
        try {
          await navigator.share({ title: "SUB ROSA 相性タイプ診断", text: `${text}\n${SHARE_HASHTAG}`, url });
        } catch (error) {
          if (error?.name !== "AbortError") status.textContent = "共有シートを開けませんでした。";
        }
      });
    }
  }

  function renderResult(params) {
    const result = readResult(params);
    if (!result) {
      renderPage(`<section class="page"><div class="empty-state"><div class="ornament">❦</div><h1>まだ結果がありません</h1><p class="quiet">診断を最後まで進めると、ここにあなたのタイプが現れます。</p><a class="button button-primary" href="#/quiz">診断をはじめる</a></div></section>`, "診断結果");
      return;
    }
    const type = window.TYPES[result.typeCode];
    const code = result.intensity ? `${result.typeCode}-${result.intensity}` : result.typeCode;
    const matchHref = result.intensity ? `#/match?a=${code}` : "#/match";
    const scoreContent = result.scores
      ? `
        <section class="result-section"><p class="eyebrow">YOUR BALANCE</p><h2>4つの軸</h2><div class="score-bars">${Object.keys(AXES).map((axis) => scoreBar(axis, result.scores[axis])).join("")}</div></section>
        <section class="result-section"><p class="eyebrow">INTENSITY</p><h2>強度 ${result.intensity} — ${INTENSITY_LABELS[result.intensity - 1]}</h2><div class="intensity" aria-label="強度5段階中${result.intensity}">${INTENSITY_LABELS.map((_, index) => `<span class="${index < result.intensity ? "on" : ""}"></span>`).join("")}</div><div class="intensity-labels"><span>ソフト</span><span>ハード</span></div></section>`
      : `<section class="result-section result-score-cta"><p class="eyebrow">YOUR OWN BALANCE</p><h2>自分の強度も見てみる</h2><p>この共有ページではタイプの輪郭だけを表示しています。診断すると、あなた自身の4軸スコアと強度が分かります。</p><a class="button button-primary" href="#/quiz">自分も診断する</a></section>`;
    renderPage(`
      <section class="page" style="--type-color:${type.motif.color}">
        <div class="page-intro"><p class="eyebrow">YOUR PORTRAIT</p><p class="quiet">薔薇の下で見つけた、あなたの傾向</p></div>
        <article class="result-card" aria-labelledby="result-name">
          <div class="seal" aria-label="モチーフ ${type.motif.detail}">${type.motif.icon}</div>
          <div class="character-stage"><img src="${characterSrc(type)}" loading="lazy" decoding="async" onerror="if(this.dataset.characterFallback==='svg'){this.onerror=null;this.src='assets/adult-silhouette.svg'}else{this.dataset.characterFallback='svg';this.src='${characterSvgSrc(type)}'}" alt="${type.name}を表す成人の抽象シルエット"></div>
          <div class="result-card-copy">
            <span class="result-code">TYPE ${code}</span>
            <h1 id="result-name">${type.name}</h1>
            <p class="result-catch">${type.catch}</p>
            <div class="badge-row">${result.isSwitch ? `<span class="badge badge-gold">SWITCH</span>` : ""}<span class="badge">${type.concept}</span></div>
          </div>
        </article>
        ${shareRow(type)}
        ${scoreContent}
        ${freeTypeSections(type, matchHref)}
        ${noteTeaser(type)}
        ${result.scores ? `<div class="result-actions"><button class="button button-ghost" id="retry-quiz" type="button">もう一度診断する</button></div>` : ""}
        <div class="result-fineprint" role="note">
          <p>本診断は自己理解と対話のきっかけを目的としたもので、医学的・心理学的な評価ではありません。</p>
          <p>詳細版の購入は任意です。無料版だけでも診断は完結します。</p>
        </div>
      </section>
    `, `${type.name}｜診断結果`);

    bindShareActions(type);
    const retryButton = document.getElementById("retry-quiz");
    if (retryButton) retryButton.addEventListener("click", () => {
      resetQuiz();
      location.hash = "/quiz";
    });
  }

  function renderTypes(params) {
    const selected = (params.get("type") || "").toUpperCase();
    if (window.TYPES[selected]) {
      const type = window.TYPES[selected];
      renderPage(`
        <section class="page" style="--type-color:${type.motif.color}">
          <a class="back-link" href="#/types">← 16タイプ一覧へ</a>
          <article class="result-card" aria-labelledby="type-name">
            <div class="seal" aria-label="モチーフ ${type.motif.detail}">${type.motif.icon}</div>
            <div class="character-stage"><img src="${characterSrc(type)}" loading="lazy" decoding="async" onerror="if(this.dataset.characterFallback==='svg'){this.onerror=null;this.src='assets/adult-silhouette.svg'}else{this.dataset.characterFallback='svg';this.src='${characterSvgSrc(type)}'}" alt="${type.name}を表す成人の抽象シルエット"></div>
            <div class="result-card-copy"><span class="result-code">TYPE ${type.code}</span><h1 id="type-name">${type.name}</h1><p class="result-catch">${type.catch}</p><div class="badge-row"><span class="badge">${type.concept}</span></div></div>
          </article>
          <section class="result-section result-score-cta"><p class="eyebrow">YOUR OWN INTENSITY</p><h2>診断して自分の強度を見る</h2><p>タイプ図鑑では強度を決めつけません。40問の診断で、今のあなたの4軸スコアと強度を確かめられます。</p><a class="button button-primary" href="#/quiz">診断して自分の強度を見る</a></section>
          ${freeTypeSections(type)}
          ${noteTeaser(type)}
        </section>`, `${type.name}｜タイプ図鑑`);
      return;
    }
    renderPage(`
      <section class="page">
        <div class="page-intro"><p class="eyebrow">THE SIXTEEN PORTRAITS</p><h1>タイプ図鑑</h1><p class="lede">4つの軸が描く16の輪郭。どれも、異なる魅力と注意点を持つ等価なタイプです。</p></div>
        <div class="card-grid">
          ${Object.values(window.TYPES).map((type) => `<a class="type-list-card" href="#/types?type=${type.code}" data-icon="${type.motif.icon}" style="--type-color:${type.motif.color}"><span class="code">${type.code} · ${type.motif.detail}</span><h2>${type.name}</h2><p>${type.catch}</p><span class="arrow">詳しく読む →</span></a>`).join("")}
        </div>
      </section>`, "タイプ図鑑");
  }

  function parseResultInput(input) {
    const value = input.trim();
    if (!value) return null;
    try {
      const url = new URL(value, location.href);
      const hashQuery = url.hash.includes("?") ? url.hash.split("?")[1] : "";
      const params = new URLSearchParams(hashQuery);
      const typeCode = (params.get("r") || "").toUpperCase();
      const intensity = Number(params.get("i"));
      if (window.TYPES[typeCode] && intensity >= 1 && intensity <= 5) return { typeCode, intensity: Math.round(intensity) };
    } catch (_) { /* Continue with result-code parsing. */ }
    const match = value.toUpperCase().match(/\b([LF][GT][RP][CD])-([1-5])\b/);
    if (!match || !window.TYPES[match[1]]) return null;
    return { typeCode: match[1], intensity: Number(match[2]) };
  }

  function renderMatch(params) {
    const prefill = params.get("a") || "";
    renderPage(`
      <section class="page page-narrow">
        <div class="page-intro"><p class="eyebrow">COMPATIBILITY DIALOGUE</p><h1>相性チェック</h1><p class="lede">相性に点数はつけません。二人が「かみ合うところ」と「先に話したいこと」を整理します。</p></div>
        <form class="form-card" id="match-form" novalidate>
          <div class="field"><label for="match-a">一人目の結果コード または 結果URL</label><input id="match-a" name="a" value="${escapeHtml(prefill)}" placeholder="例：LGRC-3" autocomplete="off" spellcheck="false"></div>
          <div class="field"><label for="match-b">二人目の結果コード または 結果URL</label><input id="match-b" name="b" placeholder="例：FTRD-2" autocomplete="off" spellcheck="false"></div>
          <p class="form-error" id="match-error" role="alert"></p>
          <button class="button button-primary" type="submit">二人の対話ポイントを見る</button>
        </form>
        <div id="match-output"></div>
        <p class="fineprint" style="margin-top:24px">入力した結果は外部へ送信されず、この画面の中だけで照合されます。</p>
      </section>`, "相性チェック");

    document.getElementById("match-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const first = parseResultInput(document.getElementById("match-a").value);
      const second = parseResultInput(document.getElementById("match-b").value);
      const error = document.getElementById("match-error");
      if (!first || !second) {
        error.textContent = "2人分の結果コード（例：LGRC-3）または結果URLを確認してください。";
        document.getElementById(!first ? "match-a" : "match-b").focus();
        return;
      }
      error.textContent = "";
      const report = window.evaluateCompatibility(first, second);
      const firstType = window.TYPES[first.typeCode];
      const secondType = window.TYPES[second.typeCode];
      const output = document.getElementById("match-output");
      output.classList.remove("is-revealing");
      output.innerHTML = `
        <section class="match-result" aria-live="polite">
          <span class="match-label ${report.key}">${report.label}</span>
          <h2 class="match-pair">${firstType.name}<br><span aria-hidden="true">×</span><span class="sr-only">と</span> ${secondType.name}</h2>
          <div class="match-columns">
            <div><h3>かみ合う点</h3><ul class="topic-list">${report.points.length ? report.points.map((item) => `<li>${item}</li>`).join("") : "<li>共通点よりも、違いを言葉にすることで輪郭が見えてくる組み合わせです。</li>"}</ul></div>
            <div><h3>先に話すべき議題</h3><ul class="topic-list">${report.topics.map((item, index) => `<li class="${report.critical && index === 0 ? "priority-topic" : ""}">${report.critical && index === 0 ? '<span class="priority-mark">MOST IMPORTANT</span>' : ""}${item}</li>`).join("")}</ul></div>
          </div>
          <div class="checklist-panel"><h3>すり合わせチェックリスト</h3><p>相性ラベルにかかわらず、毎回確認したい7項目です。</p><ul class="check-list">${window.COMPAT_RULES.fixedChecklist.map((item) => `<li>${item}</li>`).join("")}</ul></div>
        </section>
        <section class="match-note-section" aria-labelledby="match-note-title">
          <div class="section-heading"><p class="eyebrow">DEEPER PORTRAITS</p><h2 id="match-note-title">二人それぞれの詳細版</h2><p class="quiet">必要な人だけ、タイプごとの背景をさらに深く読めます。</p></div>
          <div class="note-teaser-grid">${noteTeaser(firstType, true)}${noteTeaser(secondType, true)}</div>
        </section>`;
      applyStagger(output);
      if (!reducedMotion.matches) {
        void output.offsetWidth;
        output.classList.add("is-revealing");
      }
      output.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
    });
  }

  function renderSafety() {
    renderPage(`
      <section class="page page-narrow">
        <div class="page-intro"><p class="eyebrow">SAFETY IS INTIMACY</p><h1>安全ガイド</h1><p class="lede">安心は、空気を冷ますものではありません。二人が心から楽しむための、いちばん静かな準備です。</p></div>
        <div class="safety-stack">
          <article class="safety-card"><span class="safety-number">01</span><h2>同意は、いつでも更新できる</h2><p>始める前の「いいよ」は、最後まで変えられない約束ではありません。途中で気持ちが変わったら、理由を説明できなくても止めて大丈夫。迷いや沈黙は同意として扱わず、短い言葉で確かめ合いましょう。</p></article>
          <article class="safety-card"><span class="safety-number">02</span><h2>セーフワードを二段階で</h2><p>たとえば「黄色」は弱める・止まって確認、「赤」はすぐ中止、のように意味を共有します。言葉が出にくい状況に備え、手を決まった回数たたくなど、声以外の合図も一つ用意すると安心です。</p></article>
          <article class="safety-card"><span class="safety-number">03</span><h2>限界は始める前に見せ合う</h2><p>絶対に避けたいこと、条件が整えば考えられること、好きなことを分けて共有します。体調、服薬、睡眠、気分もその日の大切な条件。強度に差があるときは、原則として低いほうに合わせます。</p></article>
          <article class="safety-card"><span class="safety-number">04</span><h2>アフターケアまでが二人の時間</h2><p>終わったあとに必要なものは、人によって違います。静かな休息、言葉での安心、飲み物、一人になる時間、翌日の連絡など、うれしい形を事前に相談してください。相手をケアする側の休息も同じだけ大切です。</p></article>
          <article class="safety-card"><span class="safety-number">05</span><h2>SSCとRACKを、やさしく考える</h2><p>どちらも安全と合意を考えるための合言葉です。完璧な安全を保証する印ではなく、二人が情報を共有し、選び、見直すための視点として使います。</p><div class="definition-grid"><div class="definition"><b>SSC</b><p>安全に、冷静に、合意の上で。まず持っておきたい基本の考え方です。</p></div><div class="definition"><b>RACK</b><p>考えられるリスクを理解し、納得した範囲を選ぶという考え方です。</p></div></div></article>
        </div>
        <p class="safety-callout">嫌なら即中止できることは、信頼が足りない印ではなく、良い関係を築けている証拠です。</p>
      </section>`, "安全ガイド");
  }

  function renderAbout() {
    renderPage(`
      <section class="page page-narrow">
        <div class="page-intro"><p class="eyebrow">ABOUT THIS PROJECT</p><h1>このサイトについて</h1><p class="lede">SUB ROSAは、成人同士が互いの傾向を言葉にし、合意と安心について話すための対話補助ツールです。</p></div>
        <section class="content-card" style="padding:clamp(24px,6vw,38px);margin-bottom:16px"><h2>プライバシー</h2><p>質問への回答、診断の計算、相性の照合は、すべてお使いの端末内で行います。回答内容をサーバへ送信せず、アクセス解析も使用していません。端末には年齢確認済みの記録と直近の診断結果だけを保存します。</p><p class="fineprint">診断直後の結果URLにはタイプと各軸の数値が含まれます。結果画面の共有ボタンが使う共有専用URLにはタイプコードだけが入り、軸スコアや強度は含まれません。</p></section>
        <section class="content-card" style="padding:clamp(24px,6vw,38px);margin-bottom:16px"><h2>この診断が示すもの</h2><p>本診断は娯楽および対話補助を目的としたもので、心理検査・医学的評価ではありません。タイプに優劣はなく、正常・異常を判定するものでもありません。結果は固定された人格ではなく、今の自分を見つめる一つの角度です。</p></section>
        <section class="content-card" style="padding:clamp(24px,6vw,38px)"><h2>18歳以上の方へ</h2><p>このサイトは18歳以上の成人を対象としています。相手がいる場合は、互いが自分の意思で選べること、いつでも中止できることを最優先にしてください。</p><a class="text-link" href="#/safety">安全ガイドを読む</a></section>
      </section>`, "このサイトについて");
  }

  function renderNotFound() {
    renderPage(`<section class="page"><div class="empty-state"><div class="ornament">❦</div><h1>秘密の扉が見つかりません</h1><p class="quiet">URLを確認するか、トップページへ戻ってください。</p><a class="button button-primary" href="#/">トップへ戻る</a></div></section>`, "ページが見つかりません");
  }

  function router() {
    const { path, params } = routeInfo();
    setActiveNav(path);
    window.scrollTo(0, 0);
    if (path === "/") renderHome();
    else if (path === "/quiz") renderQuiz();
    else if (path === "/result") renderResult(params);
    else if (path === "/types") renderTypes(params);
    else if (path === "/match") renderMatch(params);
    else if (path === "/safety") renderSafety();
    else if (path === "/about") renderAbout();
    else renderNotFound();
  }

  setMetaPolicy();
  initAgeGate();
  window.addEventListener("hashchange", router);
  if (!location.hash) history.replaceState(null, "", "#/");
  router();
})();
