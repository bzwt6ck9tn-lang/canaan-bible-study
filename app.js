/* 迦南團契｜十月查經｜組員／組長分頁共用儲存 */
(function () {
  "use strict";

  var STORAGE_KEY = "canaan-bs-eph1-oct2026";
  var HIGHLIGHT_KEY = "canaan-bs-highlights-eph1";
  var fields = [
    "obs1", "obs2", "obs3", "obs4", "obs5",
    "exp1", "exp2", "exp3", "exp4", "exp5",
    "takeaway",
    "micro1", "micro1Notes",
    "micro2", "micro2Notes",
    "micro3", "micro3Notes"
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function showToast(msg) {
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      t.classList.remove("show");
    }, 2200);
  }

  function loadAnswers() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      fields.forEach(function (key) {
        var el = $(key);
        if (!el) return;
        if (el.type === "checkbox") {
          el.checked = !!data[key];
        } else if (typeof data[key] === "string") {
          el.value = data[key];
        }
      });
    } catch (e) {
      console.warn("loadAnswers failed", e);
    }
  }

  function collectAnswers() {
    var data = { savedAt: new Date().toISOString() };
    fields.forEach(function (key) {
      var el = $(key);
      if (!el) return;
      data[key] = el.type === "checkbox" ? el.checked : el.value;
    });
    return data;
  }

  function saveAnswers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectAnswers()));
      showToast("已儲存到本裝置");
    } catch (e) {
      showToast("儲存失敗（本機空間可能不足）");
    }
  }

  function isHighlightPunctuation(char) {
    return /[，。！？；：、,.!?;:「」『』（）()【】〔〕…—-]/.test(char);
  }

  function highlightTokens(text) {
    var tokens = [];
    var current = "";

    function pushCurrent() {
      if (current) {
        tokens.push({ text: current, interactive: true });
        current = "";
      }
    }

    for (var i = 0; i < text.length; i += 1) {
      var char = text.charAt(i);
      if (/\s/.test(char)) {
        pushCurrent();
        tokens.push({ text: char, interactive: false });
        continue;
      }
      current += char;
      var next = text.charAt(i + 1);
      if (isHighlightPunctuation(char) ||
          (current.length >= 8 && !isHighlightPunctuation(next))) {
        pushCurrent();
      }
    }
    pushCurrent();
    return tokens;
  }

  function readHighlights() {
    var saved = {};
    try {
      var raw = localStorage.getItem(HIGHLIGHT_KEY);
      var ids = raw ? JSON.parse(raw) : [];
      if (Array.isArray(ids)) {
        ids.forEach(function (id) { saved[id] = true; });
      }
    } catch (e) {
      console.warn("readHighlights failed", e);
    }
    return saved;
  }

  function persistHighlights() {
    var ids = [];
    document.querySelectorAll(".hl-unit.highlighted").forEach(function (unit) {
      ids.push(unit.getAttribute("data-highlight-id"));
    });
    try {
      localStorage.setItem(HIGHLIGHT_KEY, JSON.stringify(ids));
    } catch (e) {
      showToast("標記儲存失敗（本機空間可能不足）");
    }
  }

  function setHighlight(unit, highlighted) {
    unit.classList.toggle("highlighted", highlighted);
    unit.setAttribute("aria-pressed", highlighted ? "true" : "false");
  }

  function toggleHighlight(unit) {
    setHighlight(unit, !unit.classList.contains("highlighted"));
    persistHighlights();
  }

  function clearHighlights() {
    document.querySelectorAll(".hl-unit.highlighted").forEach(function (unit) {
      setHighlight(unit, false);
    });
    try {
      localStorage.removeItem(HIGHLIGHT_KEY);
    } catch (e) { /* ignore */ }
    showToast("已清除經文標記");
  }

  function initHighlights() {
    var scripture = document.querySelector(".scripture");
    if (!scripture || scripture.getAttribute("data-highlight-ready") === "true") return;

    var saved = readHighlights();
    scripture.setAttribute("data-highlight-ready", "true");
    scripture.querySelectorAll(".verse").forEach(function (verse) {
      var verseNum = verse.querySelector(".verse-num");
      var verseId = verseNum ? verseNum.textContent.trim() : "x";
      var unitIndex = 0;
      Array.prototype.slice.call(verse.childNodes).forEach(function (node) {
        if (node.nodeType !== 3 || !node.nodeValue.trim()) return;
        var fragment = document.createDocumentFragment();
        highlightTokens(node.nodeValue).forEach(function (token) {
          if (!token.interactive) {
            fragment.appendChild(document.createTextNode(token.text));
            return;
          }
          var unit = document.createElement("span");
          var id = "v" + verseId + "-" + unitIndex;
          unitIndex += 1;
          unit.className = "hl-unit";
          unit.setAttribute("data-highlight-id", id);
          unit.setAttribute("role", "button");
          unit.setAttribute("tabindex", "0");
          unit.setAttribute("aria-pressed", saved[id] ? "true" : "false");
          unit.setAttribute("aria-label", "第" + verseId + "節經文：" + token.text);
          unit.textContent = token.text;
          if (saved[id]) unit.classList.add("highlighted");
          unit.addEventListener("click", function () { toggleHighlight(unit); });
          unit.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleHighlight(unit);
            }
          });
          fragment.appendChild(unit);
        });
        node.parentNode.replaceChild(fragment, node);
      });
    });

    var clearBtn = $("btn-clear-highlights");
    if (clearBtn) clearBtn.addEventListener("click", clearHighlights);
  }

  function clearAnswers() {
    if (!confirm("確定清除本裝置上的全部答案、本週小改變勾選與填寫記錄？")) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
    fields.forEach(function (key) {
      var el = $(key);
      if (!el) return;
      if (el.type === "checkbox") {
        el.checked = false;
      } else {
        el.value = "";
      }
    });
    showToast("已清除");
  }

  function init() {
    loadAnswers();
    initHighlights();

    var saveBtn = $("btn-save");
    var clearBtn = $("btn-clear");
    if (saveBtn) saveBtn.addEventListener("click", saveAnswers);
    if (clearBtn) clearBtn.addEventListener("click", clearAnswers);

    // Auto-save text fields on blur; checkboxes save on change.
    fields.forEach(function (key) {
      var el = $(key);
      if (!el) return;
      if (el.type === "checkbox") {
        el.addEventListener("change", function () {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collectAnswers()));
          } catch (e) { /* ignore */ }
        });
      } else {
        el.addEventListener("blur", function () {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collectAnswers()));
          } catch (e) { /* ignore */ }
        });
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
