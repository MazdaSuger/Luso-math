/* ============================================================
   Luso-Math  —  ゲームエンジン
   ポルトガル語 × 数学 × アフリカ近現代史 を学ぶブラウザゲーム
   依存：mozambique.js / angola.js（window.CAMPAIGN_* を定義）
   ============================================================ */
(function () {
  "use strict";

  var CAMPAIGNS = {
    moz: window.CAMPAIGN_MOZ,
    ang: window.CAMPAIGN_ANG,
  };

  // 問題タイプごとの表示設定
  var TYPE_META = {
    lang: { label: "ポルトガル語", icon: "🗣️", cls: "t-lang" },
    hist: { label: "歴史", icon: "📜", cls: "t-hist" },
    math: { label: "数学", icon: "🧮", cls: "t-math" },
  };

  var STORAGE_KEY = "luso-math-progress-v1";

  // ---- 状態 ----
  var state = {
    campaign: null, // 現在のキャンペーンオブジェクト
    stageIndex: 0, // 現在のステージ番号
    qIndex: 0, // ステージ内の問題番号
    correct: 0, // ステージ内の正解数
    answered: false, // 現在の問題に解答済みか
    totalScore: 0, // 通算スコア（全体）
  };

  // ---- 進捗の保存／読み込み（クリア済みステージ数） ----
  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveProgress(p) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch (e) {
      /* localStorage 不可でも続行 */
    }
  }
  // そのキャンペーンで「解放済み」のステージ数（0なら第1章のみ）
  function unlockedCount(campaignId) {
    var p = loadProgress();
    return (p[campaignId] && p[campaignId].cleared) || 0;
  }
  function markStageCleared(campaignId, stageIndex) {
    var p = loadProgress();
    if (!p[campaignId]) p[campaignId] = { cleared: 0 };
    if (stageIndex + 1 > p[campaignId].cleared) {
      p[campaignId].cleared = stageIndex + 1;
    }
    saveProgress(p);
  }

  // ---- DOM ヘルパ ----
  var app = document.getElementById("app");
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function clear() {
    app.innerHTML = "";
  }

  /* ========================================================
     画面1：タイトル＆キャンペーン選択
     ======================================================== */
  function renderTitle() {
    clear();
    state.campaign = null;

    var wrap = el("div", "screen title-screen");
    wrap.appendChild(
      el(
        "div",
        "title-hero",
        '<h1>Luso<span>·</span>Math</h1>' +
          '<p class="tagline">ポルトガル語 × 数学 × アフリカ近現代史</p>' +
          '<p class="subtle">遊びながら、高校数学（文系）と、モザンビーク・アンゴラの歴史とポルトガル語を学ぼう。</p>'
      )
    );

    var cards = el("div", "campaign-cards");
    [CAMPAIGNS.moz, CAMPAIGNS.ang].forEach(function (c) {
      var unlocked = unlockedCount(c.id);
      var total = c.stages.length;
      var card = el("button", "campaign-card");
      card.style.setProperty("--accent", c.color);
      card.innerHTML =
        '<div class="cc-flag">' +
        c.flag +
        "</div>" +
        '<div class="cc-name">' +
        c.name +
        "</div>" +
        '<div class="cc-sub">' +
        c.subtitle +
        "</div>" +
        '<div class="cc-prog">進捗：' +
        unlocked +
        " / " +
        total +
        " 章クリア</div>";
      card.addEventListener("click", function () {
        renderStageSelect(c);
      });
      cards.appendChild(card);
    });
    wrap.appendChild(cards);

    wrap.appendChild(
      el(
        "p",
        "footnote",
        "💡 各章では「ポルトガル語 → 歴史 → 数学」の順に出題します。半分以上正解で次の章が解放されます。"
      )
    );
    app.appendChild(wrap);
  }

  /* ========================================================
     画面2：ステージ（章）選択
     ======================================================== */
  function renderStageSelect(campaign) {
    clear();
    state.campaign = campaign;
    var unlocked = unlockedCount(campaign.id);

    var wrap = el("div", "screen stage-select");
    wrap.style.setProperty("--accent", campaign.color);

    var head = el("div", "stage-head");
    head.appendChild(
      el(
        "div",
        "",
        '<h2>' +
          campaign.flag +
          " " +
          campaign.name +
          "</h2>" +
          '<p class="intro">' +
          campaign.intro +
          "</p>"
      )
    );
    var back = el("button", "btn ghost", "← トップへ");
    back.addEventListener("click", renderTitle);
    head.appendChild(back);
    wrap.appendChild(head);

    var list = el("div", "stage-list");
    campaign.stages.forEach(function (st, i) {
      var locked = i > unlocked; // unlocked章まで＋次の1章が遊べる
      var done = i < unlocked;
      var item = el("button", "stage-item" + (locked ? " locked" : ""));
      item.innerHTML =
        '<div class="si-no">' +
        (done ? "✓" : i + 1) +
        "</div>" +
        '<div class="si-body">' +
        '<div class="si-title">' +
        st.title +
        (locked ? " 🔒" : "") +
        "</div>" +
        '<div class="si-era">' +
        st.era +
        "</div>" +
        "</div>";
      if (!locked) {
        item.addEventListener("click", function () {
          startStage(i);
        });
      }
      list.appendChild(item);
    });
    wrap.appendChild(list);
    app.appendChild(wrap);
  }

  /* ========================================================
     画面3：章の導入（learn パネル）
     ======================================================== */
  function startStage(stageIndex) {
    state.stageIndex = stageIndex;
    state.qIndex = 0;
    state.correct = 0;
    state.answered = false;

    var st = state.campaign.stages[stageIndex];
    clear();
    var wrap = el("div", "screen stage-intro");
    wrap.style.setProperty("--accent", state.campaign.color);

    var learnHtml = st.learn
      .map(function (l) {
        return "<li>" + l + "</li>";
      })
      .join("");

    wrap.innerHTML =
      '<div class="si-era-tag">' +
      st.era +
      "</div>" +
      "<h2>" +
      st.title +
      "</h2>" +
      '<p class="lead">' +
      st.lead +
      "</p>" +
      '<div class="learn-box"><h3>📖 この章のポイント</h3><ul>' +
      learnHtml +
      "</ul></div>";

    var btnRow = el("div", "btn-row");
    var startBtn = el("button", "btn primary", "クイズを始める →");
    startBtn.addEventListener("click", renderQuestion);
    var backBtn = el("button", "btn ghost", "← 章を選び直す");
    backBtn.addEventListener("click", function () {
      renderStageSelect(state.campaign);
    });
    btnRow.appendChild(backBtn);
    btnRow.appendChild(startBtn);
    wrap.appendChild(btnRow);
    app.appendChild(wrap);
  }

  /* ========================================================
     画面4：問題出題
     ======================================================== */
  function renderQuestion() {
    var st = state.campaign.stages[state.stageIndex];
    var q = st.questions[state.qIndex];
    var meta = TYPE_META[q.type];
    state.answered = false;
    clear();

    var wrap = el("div", "screen quiz");
    wrap.style.setProperty("--accent", state.campaign.color);

    // 進捗バー
    var total = st.questions.length;
    var pct = Math.round((state.qIndex / total) * 100);
    wrap.appendChild(
      el(
        "div",
        "quiz-top",
        '<div class="qt-info"><span class="chap">' +
          st.title +
          "</span>" +
          '<span class="count">問題 ' +
          (state.qIndex + 1) +
          " / " +
          total +
          "</span></div>" +
          '<div class="bar"><div class="bar-fill" style="width:' +
          pct +
          '%"></div></div>'
      )
    );

    // タイプバッジ＋科目
    var badge =
      '<span class="badge ' +
      meta.cls +
      '">' +
      meta.icon +
      " " +
      meta.label +
      "</span>";
    if (q.subject) {
      badge += '<span class="badge subject">' + q.subject + "</span>";
    }
    wrap.appendChild(el("div", "q-badges", badge));

    // 設問
    wrap.appendChild(el("div", "q-text", q.q));

    // 選択肢
    var opts = el("div", "options");
    q.options.forEach(function (opt, i) {
      var b = el("button", "option", "<span>" + opt + "</span>");
      b.addEventListener("click", function () {
        onAnswer(i, b, opts);
      });
      opts.appendChild(b);
    });
    wrap.appendChild(opts);

    // フィードバック領域
    wrap.appendChild(el("div", "feedback", ""));

    app.appendChild(wrap);
  }

  function onAnswer(choice, btn, optsEl) {
    if (state.answered) return;
    state.answered = true;
    var st = state.campaign.stages[state.stageIndex];
    var q = st.questions[state.qIndex];
    var correct = q.answer;

    var buttons = optsEl.querySelectorAll(".option");
    buttons.forEach(function (b, i) {
      b.classList.add("disabled");
      if (i === correct) b.classList.add("right");
      if (i === choice && choice !== correct) b.classList.add("wrong");
    });

    var ok = choice === correct;
    if (ok) {
      state.correct++;
      state.totalScore++;
    }

    var fb = app.querySelector(".feedback");
    fb.innerHTML =
      '<div class="fb-card ' +
      (ok ? "ok" : "ng") +
      '">' +
      '<div class="fb-head">' +
      (ok ? "⭕ 正解！" : "❌ 不正解") +
      "</div>" +
      '<div class="fb-explain">' +
      q.explain +
      "</div>" +
      "</div>";

    var next = el(
      "button",
      "btn primary",
      state.qIndex + 1 < st.questions.length ? "次の問題 →" : "結果を見る →"
    );
    next.addEventListener("click", function () {
      state.qIndex++;
      if (state.qIndex < st.questions.length) {
        renderQuestion();
      } else {
        renderResult();
      }
    });
    fb.appendChild(next);
    fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ========================================================
     画面5：章のリザルト
     ======================================================== */
  function renderResult() {
    var st = state.campaign.stages[state.stageIndex];
    var total = st.questions.length;
    var score = state.correct;
    var ratio = score / total;
    var passed = ratio >= 0.5; // 半分以上で次章解放

    if (passed) {
      markStageCleared(state.campaign.id, state.stageIndex);
    }

    var rank, msg;
    if (ratio === 1) {
      rank = "S";
      msg = "全問正解！完璧です。Parabéns!（おめでとう）";
    } else if (ratio >= 0.8) {
      rank = "A";
      msg = "すばらしい！よく理解できています。";
    } else if (ratio >= 0.5) {
      rank = "B";
      msg = "合格！次の章が解放されました。";
    } else {
      rank = "C";
      msg = "もう一度挑戦してみよう。ポイントを読み返すと◎。";
    }

    clear();
    var wrap = el("div", "screen result");
    wrap.style.setProperty("--accent", state.campaign.color);
    var isLast = state.stageIndex + 1 >= state.campaign.stages.length;

    wrap.innerHTML =
      '<div class="rank rank-' +
      rank +
      '">' +
      rank +
      "</div>" +
      "<h2>" +
      st.title +
      " クリア</h2>" +
      '<div class="score-big">' +
      score +
      " / " +
      total +
      " 問正解</div>" +
      '<p class="result-msg">' +
      msg +
      "</p>" +
      (passed && !isLast
        ? '<p class="unlock">🔓 次の章が解放されました！</p>'
        : "") +
      (passed && isLast
        ? '<p class="unlock">🎉 ' +
          state.campaign.name +
          "をすべてクリアしました！</p>"
        : "");

    var row = el("div", "btn-row");
    var retry = el("button", "btn ghost", "🔁 この章をやり直す");
    retry.addEventListener("click", function () {
      startStage(state.stageIndex);
    });
    row.appendChild(retry);

    if (passed && !isLast) {
      var nextBtn = el("button", "btn primary", "次の章へ →");
      nextBtn.addEventListener("click", function () {
        startStage(state.stageIndex + 1);
      });
      row.appendChild(nextBtn);
    } else {
      var mapBtn = el("button", "btn primary", "章の一覧へ →");
      mapBtn.addEventListener("click", function () {
        renderStageSelect(state.campaign);
      });
      row.appendChild(mapBtn);
    }
    wrap.appendChild(row);
    app.appendChild(wrap);
  }

  // ---- 起動 ----
  renderTitle();
})();
