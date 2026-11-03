/* 迦南團契｜每月查經｜組員／組長分頁共用儲存（多月份） */
(function () {
  "use strict";
  // 每個 .month-panel 有自己的 data-store／data-hl 鍵；十月沿用原有鍵（canaan-bs-eph1-oct2026／canaan-bs-highlights-eph1），舊答案不受影響。
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
    try { storeAnswers(active); showToast("已儲存到本裝置（" + (active ? active.getAttribute("data-label") : "").split("｜")[0] + "）"); }
    catch (e) { showToast("儲存失敗（本機空間可能不足）"); }
  }

  function clearAnswers() {
    var name = (active ? active.getAttribute("data-label") : "").split("｜")[0];
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

  var WEEK_NAME = { A: "A週 查經", B: "B週 生命同行" };
  // 每月共用的經文段落（B 週的經文跳轉連結指向這裡），兩週都顯示
  var SHARED_IDS = { "n-sec-1": true, "sec-scripture": true };

  // 把 <main> 的每個直接子元素標記為 A／B／both
  function tagWeeks(panel) {
    var main = panel.querySelector("main");
    if (!main) return;
    var seenB = false;
    Array.prototype.slice.call(main.children).forEach(function (el) {
      var id = el.id || "";
      var tag;
      if (el.tagName === "NAV" || el.tagName === "FOOTER") tag = "both";
      else if (SHARED_IDS[id]) tag = "both";
      else {
        if (id === "nb") seenB = true;
        tag = (seenB || /^nb-/.test(id) || /^sec-week-b/.test(id)) ? "B" : "A";
      }
      el.setAttribute("data-week", tag);
    });
    panel.querySelectorAll(".nav-chips a[href^='#']").forEach(function (a) {
      var t = $(a.getAttribute("href").slice(1));
      var sec = t && t.closest ? t.closest("main > *") : null;
      a.setAttribute("data-week", a.classList.contains("nav-week-link") ? "B" : (sec ? sec.getAttribute("data-week") : "both"));
    });
    panel.querySelectorAll(".nav-chips .nav-week").forEach(function (s) { s.classList.add("wk-hidden"); });
  }

  function weekOf(el) {
    var sec = el && el.closest ? el.closest("[data-week]") : null;
    var w = sec ? sec.getAttribute("data-week") : null;
    return w === "B" ? "B" : (w === "A" ? "A" : null);
  }

  function parseUrl() {
    var r = { m: null, w: null, el: null };
    var q = /[?&]m=(\d{4}-\d{2})/.exec(window.location.search);
    if (q) r.m = q[1];
    var h = /[#&]m=(\d{4}-\d{2})/.exec(window.location.hash);
    if (h) r.m = h[1];
    var wq = /[?&]w=([AaBb])/.exec(window.location.search);
    if (wq) r.w = wq[1].toUpperCase();
    var hash = window.location.hash;
    if (hash && /^#[A-Za-z]/.test(hash) && !/^#m=/.test(hash)) {
      var el = $(hash.slice(1));
      var p = el && el.closest ? el.closest(".month-panel") : null;
      if (p) {
        r.el = el;
        if (!r.m) r.m = p.getAttribute("data-month");
        if (!r.w) r.w = weekOf(el) || "A";
      }
    }
    if (r.m && !findPanel(r.m)) { r.m = null; r.w = null; }
    return r;
  }

  function weekUrl(m, w) { return window.location.pathname + "?m=" + m + "&w=" + w; }

  function go(url) {
    if (active) { try { storeAnswers(active); } catch (e) { /* ignore */ } }
    if (window.history && history.pushState) { history.pushState(null, "", url); route(); window.scrollTo(0, 0); }
    else window.location.href = url;
  }

  function showHome(month) {
    document.body.classList.add("on-home");
    document.body.removeAttribute("data-month");
    panels.forEach(function (p) { p.hidden = true; });
    active = null;
    $("home-screen").hidden = false;
    $("home-months").hidden = !!month;
    $("home-weeks").hidden = !month;
    if (month) {
      var p = findPanel(month);
      $("home-weeks-title").textContent = p.getAttribute("data-label");
      $("home-week-A").setAttribute("href", weekUrl(month, "A"));
      $("home-week-B").setAttribute("href", weekUrl(month, "B"));
    }
    document.title = document.title.replace(/｜.*$/, "") + "｜主頁";
  }

  // B 週：把共用經文移到 B 週內容之後（頁尾之前），A 週放回原位；節點只移動，不重建
  function placeShared(panel, week) {
    var main = panel.querySelector("main");
    if (!main) return;
    Array.prototype.slice.call(main.querySelectorAll(":scope > [data-week='both']")).forEach(function (el) {
      if (!SHARED_IDS[el.id]) return;
      if (!el._home) el._home = { next: el.nextElementSibling };
      var chip = panel.querySelector(".nav-chips a[href='#" + el.id + "']");
      if (chip && !chip._home) chip._home = { next: chip.nextElementSibling };
      if (week === "B") {
        var foot = main.querySelector(":scope > footer");
        main.insertBefore(el, foot);
        if (chip) chip.parentNode.appendChild(chip);
      } else {
        main.insertBefore(el, el._home.next);
        if (chip) chip.parentNode.insertBefore(chip, chip._home.next);
      }
    });
  }

  function showWeek(month, week) {
    var panel = findPanel(month);
    document.body.classList.remove("on-home");
    $("home-screen").hidden = true;
    panels.forEach(function (p) { p.hidden = p !== panel; });
    active = panel;
    panel.querySelectorAll("[data-week]").forEach(function (el) {
      var w = el.getAttribute("data-week");
      el.classList.toggle("wk-hidden", w !== "both" && w !== week);
    });
    placeShared(panel, week);
    var label = $("month-current-label");
    if (label) label.textContent = panel.getAttribute("data-label") + "｜" + WEEK_NAME[week];
    document.querySelectorAll(".week-btn").forEach(function (b) {
      var on = b.getAttribute("data-w") === week;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("href", weekUrl(month, b.getAttribute("data-w")));
    });
    document.body.setAttribute("data-month", month);
    document.body.setAttribute("data-week", week);
    setTimeout(setBarH, 0);
  }

  var bar = null;
  function setBarH() { if (bar) document.documentElement.style.setProperty("--month-bar-h", bar.offsetHeight + "px"); }

  function route() {
    var r = parseUrl();
    if (!r.m) { showHome(null); return r; }
    if (!r.w) { showHome(r.m); return r; }
    showWeek(r.m, r.w);
    return r;
  }

  function init() {
    panels = Array.prototype.slice.call(document.querySelectorAll(".month-panel"));
    panels.forEach(function (p) {
      tagWeeks(p);
      loadAnswers(p);
      initVerseLinks(p);
      initHighlights(p);
      bindAutosave(p);
    });
    bar = document.querySelector(".month-bar");
    var r = route();
    window.addEventListener("resize", setBarH);
    window.addEventListener("popstate", function () { if (active) { try { storeAnswers(active); } catch (e) { /* ignore */ } } route(); });

    function intercept(el, urlFn) {
      el.addEventListener("click", function (ev) {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
        ev.preventDefault(); go(urlFn());
      });
    }
    document.querySelectorAll("[data-goto-month]").forEach(function (a) {
      intercept(a, function () { return window.location.pathname + "?m=" + a.getAttribute("data-goto-month"); });
    });
    ["home-week-A", "home-week-B"].forEach(function (id) { var a = $(id); if (a) intercept(a, function () { return a.getAttribute("href"); }); });
    var back = $("home-back"); if (back) intercept(back, function () { return window.location.pathname; });
    var home = $("btn-home"); if (home) intercept(home, function () { return window.location.pathname; });
    document.querySelectorAll(".week-btn").forEach(function (b) { intercept(b, function () { return b.getAttribute("href"); }); });

    if (r.el) {
      var t = r.el;
      setTimeout(function () { t.scrollIntoView(); if (t.classList.contains("verse")) flashVerseTarget(t); }, 120);
    }

    var saveBtn = $("btn-save"), clearBtn = $("btn-clear");
    if (saveBtn) saveBtn.addEventListener("click", saveAnswers);
    if (clearBtn) clearBtn.addEventListener("click", clearAnswers);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
