/* 迦南團契｜每月查經｜組員／組長分頁共用儲存（多月份） */
(function () {
  "use strict";
  // 每個 .month-panel 有自己的 data-store／data-hl 鍵；十月沿用原有鍵（canaan-bs-eph1-oct2026／canaan-bs-highlights-eph1），舊答案不受影響。
  var DEFAULT_MONTH = "2026-11";
  var panels = [];
  var active = null;

  function $(id) { return document.getElementById(id); }

  function showToast(msg) {
    var t = $("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  function fieldsOf(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll("textarea[id], input[id]"));
  }

  function loadAnswers(panel) {
    try {
      var raw = localStorage.getItem(panel.getAttribute("data-store"));
      if (!raw) return;
      var data = JSON.parse(raw);
      fieldsOf(panel).forEach(function (el) {
        if (el.type === "checkbox") el.checked = !!data[el.id];
        else if (typeof data[el.id] === "string") el.value = data[el.id];
      });
    } catch (e) { console.warn("loadAnswers failed", e); }
  }

  function storeAnswers(panel) {
    var key = panel.getAttribute("data-store");
    var data = {};
    try { data = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) { data = {}; }
    data.savedAt = new Date().toISOString();
    fieldsOf(panel).forEach(function (el) {
      data[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    localStorage.setItem(key, JSON.stringify(data));
  }

  function saveAnswers() {
    try { storeAnswers(active); showToast("已儲存到本裝置（" + active.getAttribute("data-label").split("｜")[0] + "）"); }
    catch (e) { showToast("儲存失敗（本機空間可能不足）"); }
  }

  function clearAnswers() {
    var name = active.getAttribute("data-label").split("｜")[0];
    if (!confirm("確定清除本裝置上「" + name + "」的全部答案、本週小改變勾選與填寫記錄？（其他月份不受影響）")) return;
    try { localStorage.removeItem(active.getAttribute("data-store")); } catch (e) { /* ignore */ }
    fieldsOf(active).forEach(function (el) {
      if (el.type === "checkbox") el.checked = false; else el.value = "";
    });
    showToast("已清除" + name + "答案");
  }

  function isHighlightPunctuation(char) {
    return /[，。！？；：、,.!?;:「」『』（）()【】〔〕…—-]/.test(char);
  }

  function highlightTokens(text) {
    var tokens = [], current = "";
    function pushCurrent() {
      if (current) { tokens.push({ text: current, interactive: true }); current = ""; }
    }
    for (var i = 0; i < text.length; i += 1) {
      var char = text.charAt(i);
      if (/\s/.test(char)) { pushCurrent(); tokens.push({ text: char, interactive: false }); continue; }
      current += char;
      var next = text.charAt(i + 1);
      if (isHighlightPunctuation(char) || (current.length >= 8 && !isHighlightPunctuation(next))) pushCurrent();
    }
    pushCurrent();
    return tokens;
  }

  function initHighlights(panel) {
    var key = panel.getAttribute("data-hl");
    var scripture = panel.querySelector(".scripture");
    if (!scripture) return;
    var saved = {};
    try {
      var ids = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(ids)) ids.forEach(function (id) { saved[id] = true; });
    } catch (e) { /* ignore */ }

    function persist() {
      var ids = [];
      scripture.querySelectorAll(".hl-unit.highlighted").forEach(function (u) { ids.push(u.getAttribute("data-highlight-id")); });
      try { localStorage.setItem(key, JSON.stringify(ids)); } catch (e) { showToast("標記儲存失敗（本機空間可能不足）"); }
    }
    function setHl(unit, on) {
      unit.classList.toggle("highlighted", on);
      unit.setAttribute("aria-pressed", on ? "true" : "false");
    }
    function toggle(unit) { setHl(unit, !unit.classList.contains("highlighted")); persist(); }

    scripture.querySelectorAll(".verse").forEach(function (verse) {
      var verseNum = verse.querySelector(".verse-num");
      var verseId = verseNum ? verseNum.textContent.trim() : "x";
      var unitIndex = 0;
      Array.prototype.slice.call(verse.childNodes).forEach(function (node) {
        if (node.nodeType !== 3 || !node.nodeValue.trim()) return;
        var fragment = document.createDocumentFragment();
        highlightTokens(node.nodeValue).forEach(function (token) {
          if (!token.interactive) { fragment.appendChild(document.createTextNode(token.text)); return; }
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
          unit.addEventListener("click", function () { toggle(unit); });
          unit.addEventListener("keydown", function (ev) {
            if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); toggle(unit); }
          });
          fragment.appendChild(unit);
        });
        node.parentNode.replaceChild(fragment, node);
      });
    });

    panel.querySelectorAll(".scripture-clear").forEach(function (btn) {
      btn.addEventListener("click", function () {
        scripture.querySelectorAll(".hl-unit.highlighted").forEach(function (u) { setHl(u, false); });
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        showToast("已清除經文標記");
      });
    });
  }

  function flashVerseTarget(target) {
    if (!target) return;
    target.classList.remove("verse-target-flash");
    void target.offsetWidth;
    target.classList.add("verse-target-flash");
    clearTimeout(target._verseFlashTimer);
    target._verseFlashTimer = setTimeout(function () { target.classList.remove("verse-target-flash"); }, 1300);
  }

  function initVerseLinks(panel) {
    panel.querySelectorAll("a.verse-ref[href^=\"#\"]").forEach(function (link) {
      link.addEventListener("click", function () {
        var target = $(link.getAttribute("href").slice(1));
        setTimeout(function () { flashVerseTarget(target); }, 50);
      });
    });
  }

  function bindAutosave(panel) {
    fieldsOf(panel).forEach(function (el) {
      el.addEventListener(el.type === "checkbox" ? "change" : "blur", function () {
        try { storeAnswers(panel); } catch (e) { /* ignore */ }
      });
    });
  }

  function findPanel(month) {
    for (var i = 0; i < panels.length; i += 1) if (panels[i].getAttribute("data-month") === month) return panels[i];
    return null;
  }

  function monthFromUrl() {
    var m = null;
    var q = /[?&]m=(\d{4}-\d{2})/.exec(window.location.search);
    if (q) m = q[1];
    var h = /[#&]m=(\d{4}-\d{2})/.exec(window.location.hash);
    if (h) m = h[1];
    if (!m && window.location.hash) {
      // 舊連結（如 #v3、#sec-obs）屬於十月頁面
      var el = $(window.location.hash.slice(1));
      var p = el && el.closest ? el.closest(".month-panel") : null;
      if (p) m = p.getAttribute("data-month");
    }
    return m && findPanel(m) ? m : DEFAULT_MONTH;
  }

  function showMonth(month, updateUrl) {
    var panel = findPanel(month) || findPanel(DEFAULT_MONTH);
    panels.forEach(function (p) { p.hidden = p !== panel; });
    active = panel;
    var label = $("month-current-label");
    if (label) label.textContent = panel.getAttribute("data-label");
    var sel = $("month-select");
    if (sel) sel.value = panel.getAttribute("data-month");
    document.body.setAttribute("data-month", panel.getAttribute("data-month"));
    if (updateUrl && window.history && history.replaceState) {
      var url = window.location.pathname + "?m=" + panel.getAttribute("data-month");
      history.replaceState(null, "", url);
    }
  }

  function init() {
    panels = Array.prototype.slice.call(document.querySelectorAll(".month-panel"));
    panels.forEach(function (p) {
      loadAnswers(p);
      initVerseLinks(p);
      initHighlights(p);
      bindAutosave(p);
    });
    showMonth(monthFromUrl(), false);
    var bar = document.querySelector(".month-bar");
    function setBarH() { if (bar) document.documentElement.style.setProperty("--month-bar-h", bar.offsetHeight + "px"); }
    setBarH();
    window.addEventListener("resize", setBarH);

    var sel = $("month-select");
    if (sel) sel.addEventListener("change", function () {
      if (active) { try { storeAnswers(active); } catch (e) { /* ignore */ } }
      showMonth(sel.value, true);
      window.scrollTo(0, 0);
    });

    var hash = window.location.hash;
    if (hash && /^#[A-Za-z]/.test(hash) && !/^#m=/.test(hash)) {
      var t = $(hash.slice(1));
      if (t) setTimeout(function () { t.scrollIntoView(); if (t.classList.contains("verse")) flashVerseTarget(t); }, 120);
    }

    var saveBtn = $("btn-save"), clearBtn = $("btn-clear");
    if (saveBtn) saveBtn.addEventListener("click", saveAnswers);
    if (clearBtn) clearBtn.addEventListener("click", clearAnswers);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
