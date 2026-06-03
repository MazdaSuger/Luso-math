/* ============================================================
   Luso-Math  —  BGM コントローラ（80sシティポップ）
   ・ブラウザの自動再生制限に対応：最初のユーザー操作で再生開始
   ・🔈/🔇 トグルで ON/OFF、設定は localStorage に保存
   ============================================================ */
(function () {
  "use strict";

  var audio = document.getElementById("bgm");
  var btn = document.getElementById("music-toggle");
  if (!audio || !btn) return;

  var MUTE_KEY = "luso-math-bgm-muted";
  audio.volume = 0.45;

  // 保存された設定（既定は ON）
  var wantOn = localStorage.getItem(MUTE_KEY) !== "1";

  function updateIcon() {
    var playing = wantOn && !audio.paused;
    btn.textContent = wantOn ? "🔊" : "🔈";
    btn.classList.toggle("playing", playing);
  }

  function tryPlay() {
    if (!wantOn) return;
    var p = audio.play();
    if (p && p.catch) {
      // 自動再生がブロックされても静かに失敗（次の操作で再試行）
      p.catch(function () {});
    }
    updateIcon();
  }

  // 最初のユーザー操作で再生を試みる（自動再生対策）
  // ※ 音楽トグル自身の操作は除外（toggle側で制御するため）
  function primeOnce(e) {
    if (e && e.target && e.target.closest && e.target.closest("#music-toggle")) {
      return;
    }
    tryPlay();
    window.removeEventListener("pointerdown", primeOnce);
    window.removeEventListener("keydown", primeOnce);
  }
  window.addEventListener("pointerdown", primeOnce);
  window.addEventListener("keydown", primeOnce);

  // トグル操作
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    wantOn = !wantOn;
    localStorage.setItem(MUTE_KEY, wantOn ? "0" : "1");
    if (wantOn) {
      tryPlay();
    } else {
      audio.pause();
    }
    updateIcon();
  });

  audio.addEventListener("play", updateIcon);
  audio.addEventListener("pause", updateIcon);

  updateIcon();
})();
