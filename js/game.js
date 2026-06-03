/* ============================================================
   Luso-Math  —  ノベルゲーム・エンジン
   ポルトガル語 × 数学 × アフリカ近現代史を題材にした
   複数エンドのシリアスなノベルゲーム。
   依存：mozambique.js / angola.js（window.CAMPAIGN_* を定義）
   ============================================================ */
(function () {
  "use strict";

  var CAMPAIGNS = { moz: window.CAMPAIGN_MOZ, ang: window.CAMPAIGN_ANG };

  var TYPE_META = {
    lang: { label: "ポルトガル語", icon: "🗣️", cls: "t-lang" },
    hist: { label: "歴史", icon: "📜", cls: "t-hist" },
    math: { label: "数学", icon: "🧮", cls: "t-math" },
  };

  var SLOTS = 5;
  var SAVE_PREFIX = "luso-math-save-";
  var CLEAR_KEY = "luso-math-cleared-v2";

  // ---- 進行中の状態 ----
  var S = null; // { camp, ch, pos, vars:{know,ans,heart}, choiceLog }
  function freshVars() {
    return { know: 0, ans: 0, heart: 0 };
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
  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  /* ========================================================
     セーブ／ロード
     ======================================================== */
  function readSlot(i) {
    try {
      return JSON.parse(localStorage.getItem(SAVE_PREFIX + i)) || null;
    } catch (e) {
      return null;
    }
  }
  function writeSlot(i, data) {
    try {
      localStorage.setItem(SAVE_PREFIX + i, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }
  function deleteSlot(i) {
    try {
      localStorage.removeItem(SAVE_PREFIX + i);
    } catch (e) {}
  }
  function snapshot() {
    var camp = CAMPAIGNS[S.camp];
    return {
      camp: S.camp,
      ch: S.ch,
      pos: S.pos,
      vars: JSON.parse(JSON.stringify(S.vars)),
      choiceLog: S.choiceLog.slice(),
      ts: Date.now(),
      meta: {
        campName: camp.name,
        flag: camp.flag,
        chTitle: camp.chapters[S.ch].title,
        chNo: S.ch + 1,
        chTotal: camp.chapters.length,
      },
    };
  }
  function fmtTime(ts) {
    var d = new Date(ts);
    function p(n) {
      return (n < 10 ? "0" : "") + n;
    }
    return (
      d.getFullYear() +
      "/" +
      p(d.getMonth() + 1) +
      "/" +
      p(d.getDate()) +
      " " +
      p(d.getHours()) +
      ":" +
      p(d.getMinutes())
    );
  }

  // クリア記録（チャプター選択の解放用）
  function loadCleared() {
    try {
      return JSON.parse(localStorage.getItem(CLEAR_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function markCleared(campId, chIndex) {
    var c = loadCleared();
    if (!c[campId]) c[campId] = 0;
    if (chIndex + 1 > c[campId]) c[campId] = chIndex + 1;
    try {
      localStorage.setItem(CLEAR_KEY, JSON.stringify(c));
    } catch (e) {}
  }
  function clearedCount(campId) {
    return loadCleared()[campId] || 0;
  }

  /* ========================================================
     タイトル
     ======================================================== */
  function renderTitle() {
    S = null;
    clear();
    var w = el("div", "screen title-screen");
    w.appendChild(
      el(
        "div",
        "title-hero",
        '<h1>Luso<span>·</span>Math</h1>' +
          '<p class="tagline">ポルトガル語 × 数学 × アフリカ近現代史</p>' +
          '<p class="subtle">これは、失われた記録を取りもどす物語。<br>' +
          "モザンビークとアンゴラ——その近現代史を、言葉と数字でたどり直す。</p>"
      )
    );

    var menu = el("div", "title-menu");
    var bStart = el("button", "btn primary big", "▶　物語をはじめる");
    bStart.addEventListener("click", renderCampaignSelect);
    var bLoad = el("button", "btn ghost big", "📁　つづきから（ロード）");
    bLoad.addEventListener("click", function () {
      openSaveMenu("load", renderTitle);
    });
    menu.appendChild(bStart);
    menu.appendChild(bLoad);
    w.appendChild(menu);

    w.appendChild(
      el(
        "p",
        "footnote",
        "💡 物語の中で「ポルトガル語・歴史・数学」の問いに答え、選択を重ねます。<br>" +
          "知識と、あなたの眼差しが、たどりつく結末を変えます（各編に複数のエンディング）。"
      )
    );
    app.appendChild(w);
  }

  /* ========================================================
     編（キャンペーン）選択
     ======================================================== */
  function renderCampaignSelect() {
    clear();
    var w = el("div", "screen campaign-select");
    w.appendChild(
      el(
        "div",
        "cs-head",
        "<h2>どちらの記録庫へ向かう？</h2>" +
          '<p class="subtle">2つの国の物語。どちらから始めても、別々の結末が待っています。</p>'
      )
    );

    var cards = el("div", "campaign-cards");
    [CAMPAIGNS.moz, CAMPAIGNS.ang].forEach(function (c) {
      var done = clearedCount(c.id);
      var total = c.chapters.length;
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
        '<div class="cc-prog">読了：' +
        done +
        " / " +
        total +
        " 章</div>";
      card.addEventListener("click", function () {
        renderChapterSelect(c);
      });
      cards.appendChild(card);
    });
    w.appendChild(cards);

    var back = el("button", "btn ghost", "← タイトルへ");
    back.addEventListener("click", renderTitle);
    var row = el("div", "btn-row");
    row.appendChild(back);
    w.appendChild(row);
    app.appendChild(w);
  }

  /* ========================================================
     チャプター選択（通し再生 or 章ジャンプ）
     ======================================================== */
  function renderChapterSelect(camp) {
    clear();
    var done = clearedCount(camp.id);
    var w = el("div", "screen stage-select");
    w.style.setProperty("--accent", camp.color);

    var head = el("div", "stage-head");
    head.appendChild(
      el(
        "div",
        "",
        "<h2>" +
          camp.flag +
          " " +
          camp.name +
          "</h2>" +
          '<p class="intro">' +
          camp.intro +
          "</p>"
      )
    );
    var back = el("button", "btn ghost", "← 編を選び直す");
    back.addEventListener("click", renderCampaignSelect);
    head.appendChild(back);
    w.appendChild(head);

    var row = el("div", "btn-row");
    var startNew = el("button", "btn primary", "▶ 最初から通しで読む");
    startNew.addEventListener("click", function () {
      beginPlay(camp.id, 0, freshVars(), []);
    });
    var load = el("button", "btn ghost", "📁 ロード");
    load.addEventListener("click", function () {
      openSaveMenu("load", function () {
        renderChapterSelect(camp);
      });
    });
    row.appendChild(startNew);
    row.appendChild(load);
    w.appendChild(row);

    w.appendChild(
      el("p", "select-note", "── 章を選んで読み直す（その章から再開・知識はリセット） ──")
    );

    var list = el("div", "stage-list");
    camp.chapters.forEach(function (ch, i) {
      var locked = i > done;
      var cleared = i < done;
      var item = el("button", "stage-item" + (locked ? " locked" : ""));
      item.innerHTML =
        '<div class="si-no">' +
        (cleared ? "✓" : i + 1) +
        "</div>" +
        '<div class="si-body"><div class="si-title">' +
        ch.title +
        (locked ? " 🔒" : "") +
        '</div><div class="si-era">' +
        ch.era +
        "</div></div>";
      if (!locked) {
        item.addEventListener("click", function () {
          beginPlay(camp.id, i, freshVars(), []);
        });
      }
      list.appendChild(item);
    });
    w.appendChild(list);
    app.appendChild(w);
  }

  /* ========================================================
     再生の開始
     ======================================================== */
  function beginPlay(campId, chIndex, vars, choiceLog) {
    S = { camp: campId, ch: chIndex, pos: 0, vars: vars, choiceLog: choiceLog };
    renderChapterCard();
  }

  function renderChapterCard() {
    var camp = CAMPAIGNS[S.camp];
    var ch = camp.chapters[S.ch];
    clear();
    var w = el("div", "screen chapter-card");
    w.style.setProperty("--accent", camp.color);
    w.innerHTML =
      '<div class="cc-era">' +
      ch.era +
      "</div>" +
      '<div class="cc-no">第 ' +
      (S.ch + 1) +
      " 章</div>" +
      "<h2>" +
      ch.title +
      "</h2>" +
      (ch.subtitle ? '<p class="cc-sub2">' + ch.subtitle + "</p>" : "");
    var btn = el("button", "btn primary big", "▶ 読み進める");
    btn.addEventListener("click", function () {
      S.pos = 0;
      renderNode();
    });
    w.appendChild(btn);
    app.appendChild(w);
  }

  /* ========================================================
     共通フレーム（ヘッダ＋ステージ＋テキスト枠）
     ======================================================== */
  function frame(inner) {
    var camp = CAMPAIGNS[S.camp];
    var ch = camp.chapters[S.ch];
    clear();
    var w = el("div", "screen vn");
    w.style.setProperty("--accent", camp.color);

    // ヘッダ（左：メニュー、右上の固定音楽ボタンと重ならないよう配置）
    var head = el("div", "vn-head");
    var menuBtn = el("button", "vn-menu-btn", "≡ メニュー");
    menuBtn.addEventListener("click", openPlayMenu);
    head.appendChild(menuBtn);
    head.appendChild(
      el(
        "div",
        "vn-chap",
        camp.flag + " 第" + (S.ch + 1) + "章　" + esc(ch.title)
      )
    );
    w.appendChild(head);

    // メーター
    var ratio = S.vars.ans ? Math.round((S.vars.know / S.vars.ans) * 100) : 0;
    w.appendChild(
      el(
        "div",
        "vn-meters",
        '<span class="meter know">📚 知識 ' +
          S.vars.know +
          "/" +
          S.vars.ans +
          (S.vars.ans ? "（" + ratio + "%）" : "") +
          "</span>" +
          '<span class="meter heart">🕯️ 眼差し ' +
          S.vars.heart +
          "</span>"
      )
    );

    var stage = el("div", "vn-stage");
    stage.appendChild(inner);
    w.appendChild(stage);
    app.appendChild(w);
    return w;
  }

  /* ========================================================
     ノード描画
     ======================================================== */
  function renderNode() {
    var ch = CAMPAIGNS[S.camp].chapters[S.ch];
    if (S.pos >= ch.script.length) {
      endChapter();
      return;
    }
    var node = ch.script[S.pos];
    switch (node.t) {
      case "say":
        renderSay(node);
        break;
      case "narr":
        renderSay({ who: "", text: node.text, narr: true });
        break;
      case "info":
        renderInfo(node);
        break;
      case "quiz":
        renderQuiz(node);
        break;
      case "choice":
        renderChoice(node);
        break;
      default:
        S.pos++;
        renderNode();
    }
  }

  function advance() {
    S.pos++;
    renderNode();
  }

  // ---- セリフ／ナレーション ----
  function renderSay(node) {
    var box = el("div", "vn-box" + (node.narr ? " narr" : ""));
    if (node.who) {
      box.appendChild(el("div", "vn-name", esc(node.who)));
    }
    box.appendChild(el("div", "vn-text", node.text));
    box.appendChild(el("div", "vn-next", "▼ クリックで進む"));
    box.addEventListener("click", advance);
    var f = frame(box);
    // 立ち絵的な雰囲気アイコン
    if (node.face) setFace(f, node.face);
  }

  function setFace(frameEl, face) {
    var st = frameEl.querySelector(".vn-stage");
    var av = el("div", "vn-avatar", face);
    st.insertBefore(av, st.firstChild);
  }

  // ---- 学習メモ ----
  function renderInfo(node) {
    var box = el("div", "vn-info");
    box.innerHTML =
      "<h3>📖 " +
      esc(node.title || "記録のメモ") +
      "</h3><ul>" +
      node.items
        .map(function (i) {
          return "<li>" + i + "</li>";
        })
        .join("") +
      "</ul>";
    var btn = el("button", "btn primary", "確認した →");
    btn.addEventListener("click", advance);
    box.appendChild(btn);
    frame(box);
  }

  // ---- クイズ ----
  function renderQuiz(node) {
    var meta = TYPE_META[node.qtype] || TYPE_META.hist;
    var box = el("div", "vn-quiz");
    var badges =
      '<span class="badge ' +
      meta.cls +
      '">' +
      meta.icon +
      " " +
      meta.label +
      "</span>";
    if (node.subject)
      badges += '<span class="badge subject">' + esc(node.subject) + "</span>";
    box.appendChild(el("div", "q-badges", badges));
    if (node.lead) box.appendChild(el("div", "q-lead", node.lead));
    box.appendChild(el("div", "q-text", node.q));

    var opts = el("div", "options");
    node.options.forEach(function (opt, i) {
      var b = el("button", "option", "<span>" + opt + "</span>");
      b.addEventListener("click", function () {
        onAnswer(node, i, opts);
      });
      opts.appendChild(b);
    });
    box.appendChild(opts);
    box.appendChild(el("div", "feedback", ""));
    frame(box);
  }

  function onAnswer(node, choice, optsEl) {
    if (optsEl.dataset.done) return;
    optsEl.dataset.done = "1";
    var correct = node.answer;
    optsEl.querySelectorAll(".option").forEach(function (b, i) {
      b.classList.add("disabled");
      if (i === correct) b.classList.add("right");
      if (i === choice && choice !== correct) b.classList.add("wrong");
    });
    var ok = choice === correct;
    S.vars.ans++;
    if (ok) S.vars.know++;

    var fb = app.querySelector(".feedback");
    fb.innerHTML =
      '<div class="fb-card ' +
      (ok ? "ok" : "ng") +
      '"><div class="fb-head">' +
      (ok ? "⭕ 正解" : "❌ 不正解") +
      '</div><div class="fb-explain">' +
      node.explain +
      "</div></div>";
    var next = el("button", "btn primary", "つづける →");
    next.addEventListener("click", advance);
    fb.appendChild(next);
    fb.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // ---- 選択肢 ----
  function renderChoice(node) {
    var box = el("div", "vn-choice");
    if (node.text) box.appendChild(el("div", "vn-text choice-prompt", node.text));
    var list = el("div", "choice-list");
    node.choices.forEach(function (c, i) {
      var b = el("button", "choice-btn", c.label);
      b.addEventListener("click", function () {
        onChoice(node, c);
      });
      list.appendChild(b);
    });
    box.appendChild(list);
    frame(box);
  }

  function onChoice(node, c) {
    if (typeof c.heart === "number") S.vars.heart += c.heart;
    S.choiceLog.push({ ch: S.ch, pos: S.pos, label: c.label });
    if (c.reply) {
      // 選択への応答を1枚はさんでから進む
      var box = el("div", "vn-box");
      if (c.who) box.appendChild(el("div", "vn-name", esc(c.who)));
      box.appendChild(el("div", "vn-text", c.reply));
      box.appendChild(el("div", "vn-next", "▼ クリックで進む"));
      box.addEventListener("click", advance);
      frame(box);
    } else {
      advance();
    }
  }

  /* ========================================================
     章の終わり → 次章 or エンディング
     ======================================================== */
  function endChapter() {
    markCleared(S.camp, S.ch);
    var camp = CAMPAIGNS[S.camp];
    if (S.ch + 1 < camp.chapters.length) {
      // 章間：小休止画面
      clear();
      var w = el("div", "screen chapter-card interlude");
      w.style.setProperty("--accent", camp.color);
      w.innerHTML =
        '<div class="cc-no">第 ' + (S.ch + 1) + " 章 ―― 了</div>";
      var ratio = S.vars.ans
        ? Math.round((S.vars.know / S.vars.ans) * 100)
        : 0;
      w.appendChild(
        el(
          "p",
          "interlude-stat",
          "ここまでの知識：" +
            S.vars.know +
            " / " +
            S.vars.ans +
            "（" +
            ratio +
            "%）　眼差し：" +
            S.vars.heart
        )
      );
      var rowS = el("div", "btn-row");
      var save = el("button", "btn ghost", "📁 ここでセーブ");
      save.addEventListener("click", function () {
        openSaveMenu("save", endChapter);
      });
      var next = el("button", "btn primary big", "次の章へ →");
      next.addEventListener("click", function () {
        S.ch++;
        renderChapterCard();
      });
      rowS.appendChild(save);
      rowS.appendChild(next);
      w.appendChild(rowS);
      app.appendChild(w);
    } else {
      renderEnding();
    }
  }

  /* ========================================================
     エンディング（複数）
     ======================================================== */
  function computeEnding(camp) {
    var ratio = S.vars.ans ? S.vars.know / S.vars.ans : 0;
    var heartHigh = S.vars.heart >= (camp.heartThreshold || 2);
    var knowHigh = ratio >= 0.7;
    if (ratio < 0.4) return "perdido"; // 未完の書庫（バッド）
    if (knowHigh && heartHigh) return "guardiao"; // 記憶の守り手（トゥルー）
    if (knowHigh && !heartHigh) return "cronista"; // 冷徹な年代記者
    if (!knowHigh && heartHigh) return "testemunha"; // 寄り添う証人
    return "aprendiz"; // 見習いのまま（ノーマル）
  }

  function renderEnding() {
    var camp = CAMPAIGNS[S.camp];
    var key = computeEnding(camp);
    var end = camp.endings[key];
    var ratio = S.vars.ans ? Math.round((S.vars.know / S.vars.ans) * 100) : 0;

    clear();
    var w = el("div", "screen ending");
    w.style.setProperty("--accent", camp.color);
    w.innerHTML =
      '<div class="ending-tag">ENDING</div>' +
      '<div class="ending-pt">' +
      esc(end.pt) +
      "</div>" +
      "<h2>" +
      esc(end.title) +
      "</h2>" +
      '<div class="ending-body">' +
      end.body +
      "</div>" +
      '<div class="ending-stat">最終的な知識：' +
      S.vars.know +
      " / " +
      S.vars.ans +
      "（" +
      ratio +
      "%）　眼差し：" +
      S.vars.heart +
      "</div>" +
      '<p class="ending-hint">※ 知識（正答率）と眼差し（選択）の組み合わせで、結末は4通りに分かれます。</p>';

    var row = el("div", "btn-row");
    var retry = el("button", "btn ghost", "🔁 この編をやり直す");
    retry.addEventListener("click", function () {
      beginPlay(camp.id, 0, freshVars(), []);
    });
    var title = el("button", "btn primary", "タイトルへ →");
    title.addEventListener("click", renderTitle);
    row.appendChild(retry);
    row.appendChild(title);
    w.appendChild(row);
    app.appendChild(w);
  }

  /* ========================================================
     プレイ中メニュー（セーブ／ロード／タイトル）
     ======================================================== */
  function openPlayMenu() {
    var ov = el("div", "overlay");
    var panel = el("div", "menu-panel");
    panel.appendChild(el("h3", "", "メニュー"));
    var bSave = el("button", "btn primary", "📁 セーブ");
    bSave.addEventListener("click", function () {
      closeOverlay(ov);
      openSaveMenu("save", function () {
        renderNode();
      });
    });
    var bLoad = el("button", "btn ghost", "📂 ロード");
    bLoad.addEventListener("click", function () {
      closeOverlay(ov);
      openSaveMenu("load", function () {
        renderNode();
      });
    });
    var bTitle = el("button", "btn ghost", "🏠 タイトルへ戻る");
    bTitle.addEventListener("click", function () {
      closeOverlay(ov);
      if (confirm("タイトルに戻りますか？（セーブしていない進行は失われます）")) {
        renderTitle();
      }
    });
    var bClose = el("button", "btn ghost", "× とじる");
    bClose.addEventListener("click", function () {
      closeOverlay(ov);
    });
    [bSave, bLoad, bTitle, bClose].forEach(function (b) {
      panel.appendChild(b);
    });
    ov.appendChild(panel);
    ov.addEventListener("click", function (e) {
      if (e.target === ov) closeOverlay(ov);
    });
    document.body.appendChild(ov);
  }
  function closeOverlay(ov) {
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  }

  /* ---- セーブ／ロード画面（5スロット） ---- */
  function openSaveMenu(mode, onBack) {
    var ov = el("div", "overlay");
    var panel = el("div", "save-panel");
    panel.appendChild(
      el("h3", "", mode === "save" ? "📁 セーブ（5枠）" : "📂 ロード（5枠）")
    );
    if (mode === "save" && !S) {
      panel.appendChild(el("p", "save-note", "セーブできる進行がありません。"));
    }

    var listEl = el("div", "slot-list");
    for (var i = 1; i <= SLOTS; i++) {
      (function (slot) {
        var data = readSlot(slot);
        var item = el("div", "slot");
        var info;
        if (data) {
          var r = data.vars.ans
            ? Math.round((data.vars.know / data.vars.ans) * 100)
            : 0;
          info =
            '<div class="slot-no">SLOT ' +
            slot +
            "</div>" +
            '<div class="slot-main">' +
            data.meta.flag +
            " " +
            esc(data.meta.campName) +
            "　第" +
            data.meta.chNo +
            "章<br>" +
            '<span class="slot-sub">' +
            esc(data.meta.chTitle) +
            "</span></div>" +
            '<div class="slot-meta">知識 ' +
            data.vars.know +
            "/" +
            data.vars.ans +
            "（" +
            r +
            "%）・眼差し " +
            data.vars.heart +
            "<br>" +
            fmtTime(data.ts) +
            "</div>";
        } else {
          info =
            '<div class="slot-no">SLOT ' +
            slot +
            '</div><div class="slot-main empty">― 空き ―</div>';
        }
        item.innerHTML = info;

        var act = el("div", "slot-actions");
        if (mode === "save") {
          if (S) {
            var sv = el("button", "btn primary sm", data ? "上書き保存" : "保存");
            sv.addEventListener("click", function () {
              if (data && !confirm("SLOT " + slot + " を上書きしますか？")) return;
              writeSlot(slot, snapshot());
              closeOverlay(ov);
              openSaveMenu("save", onBack); // 反映して開き直す
            });
            act.appendChild(sv);
          }
        } else {
          if (data) {
            var ld = el("button", "btn primary sm", "ロード");
            ld.addEventListener("click", function () {
              closeOverlay(ov);
              beginLoaded(data);
            });
            act.appendChild(ld);
          }
        }
        if (data) {
          var del = el("button", "btn ghost sm", "削除");
          del.addEventListener("click", function () {
            if (confirm("SLOT " + slot + " を削除しますか？")) {
              deleteSlot(slot);
              closeOverlay(ov);
              openSaveMenu(mode, onBack);
            }
          });
          act.appendChild(del);
        }
        item.appendChild(act);
        listEl.appendChild(item);
      })(i);
    }
    panel.appendChild(listEl);

    var back = el("button", "btn ghost", "← 戻る");
    back.addEventListener("click", function () {
      closeOverlay(ov);
      if (onBack) onBack();
    });
    panel.appendChild(back);
    ov.appendChild(panel);
    document.body.appendChild(ov);
  }

  function beginLoaded(data) {
    S = {
      camp: data.camp,
      ch: data.ch,
      pos: data.pos,
      vars: JSON.parse(JSON.stringify(data.vars)),
      choiceLog: (data.choiceLog || []).slice(),
    };
    renderNode();
  }

  // ---- 起動 ----
  renderTitle();
})();
