/* 迦南團契｜十月查經｜組員／組長分頁共用儲存 */
(function () {
  "use strict";

  var STORAGE_KEY = "canaan-bs-eph1-oct2026";
  var fields = [
    "obs1", "obs2", "obs3", "obs4", "obs5",
    "exp1", "exp2", "exp3", "exp4", "exp5",
    "takeaway",
    "micro1", "micro2", "micro3"
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

  function clearAnswers() {
    if (!confirm("確定清除本裝置上的全部答案與微行動勾選？")) return;
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

    var saveBtn = $("btn-save");
    var clearBtn = $("btn-clear");
    if (saveBtn) saveBtn.addEventListener("click", saveAnswers);
    if (clearBtn) clearBtn.addEventListener("click", clearAnswers);

    // Auto-save on blur for textareas / takeaway; checkboxes save on change.
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
