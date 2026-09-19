/*!
 * OLIMA AI widget loader
 * -----------------------------------------------------------------------------
 * Mijoz saytiga bitta qator bilan ulanadi:
 *
 *   <script src=".../widget.js"
 *           data-key="wk_live_..."           // hozircha data-org ishlatiladi
 *           data-org="550e8400-..."          // VAQTINCHA: tashkilot identifikatori
 *           data-api="http://localhost:8080" // backend manzili
 *           async></script>
 *
 * ⚠️ VAQTINCHA YECHIM: hozir tashkilot brauzerdan uzatilyapti (data-org).
 *    Bu ishlab chiqarishga YARAMAYDI — har kim boshqa tashkilot botiga murojaat
 *    qila oladi. To'g'ri yo'l: server `wk_...` kalitidan tashkilotni o'zi aniqlaydi
 *    va so'rov tanasidagi organizationId umuman e'tiborga olinmaydi.
 *
 * Widget iframe ichida ishlaydi: mijoz sahifasining CSS'i, DOM'i va cookie'lariga
 * tegmaydi, sahifa ham widget ichini ko'ra olmaydi.
 */
(function () {
  "use strict";

  if (window.OlimaAI && window.OlimaAI.__loaded) return;

  var script =
    document.currentScript ||
    (function () {
      var all = document.getElementsByTagName("script");
      for (var i = all.length - 1; i >= 0; i--) {
        if (all[i].src && all[i].src.indexOf("widget.js") !== -1) return all[i];
      }
      return null;
    })();

  var cfg = {
    key: (script && script.getAttribute("data-key")) || "",
    org: (script && script.getAttribute("data-org")) || "",
    // data-api berilmasa, widget.js qayerdan yuklangan bo'lsa o'sha origin —
    // odatda backend ham shu yerda turadi, shunda ulash qatori qisqaradi.
    api: (script && script.getAttribute("data-api")) ||
         (script && script.src ? new URL(script.src).origin : "http://localhost:8080"),
    title: (script && script.getAttribute("data-title")) || "Yordamchi",
    subtitle: (script && script.getAttribute("data-subtitle")) || "",
    accent: (script && script.getAttribute("data-accent")) || "#12564A",
    side: (script && script.getAttribute("data-side")) || "right",
    theme: (script && script.getAttribute("data-theme")) || "auto",
    suggest: (script && script.getAttribute("data-suggest")) || ""
  };

  var base = (script && script.src ? script.src.replace(/[^/]*$/, "") : "./");
  var identity = null;
  var open = false;
  var unread = 0;
  var listeners = {};

  /* ---------- host ---------- */
  var host = document.createElement("div");
  host.setAttribute("data-olima", "");
  var shadow = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;

  var style = document.createElement("style");
  style.textContent = [
    ":host,*{box-sizing:border-box}",
    ".root{position:fixed;bottom:20px;" + (cfg.side === "left" ? "left" : "right") + ":20px;z-index:2147483000;",
    "  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}",
    ".bubble{width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;",
    "  background:#fff;color:#fff;box-shadow:0 8px 28px rgba(20,25,60,.3);transition:transform .16s ease;}",
    ".bubble:hover{transform:translateY(-2px)}",
    ".bubble img{width:38px;height:38px;object-fit:contain;display:block;pointer-events:none}",
    ".dot{position:absolute;top:-2px;" + (cfg.side === "left" ? "left" : "right") + ":-2px;min-width:19px;height:19px;",
    "  border-radius:10px;background:#C0392B;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;padding:0 5px}",
    ".nudge{position:absolute;bottom:8px;" + (cfg.side === "left" ? "left" : "right") + ":68px;white-space:nowrap;",
    "  background:#fff;color:#16191C;border:1px solid #E1E3DF;border-radius:20px;padding:9px 15px;font-size:13.5px;",
    "  box-shadow:0 6px 20px rgba(0,0,0,.12)}",
    ".panel{position:fixed;z-index:2147483000;bottom:88px;" + (cfg.side === "left" ? "left" : "right") + ":20px;width:396px;height:min(620px,calc(100vh - 120px));",
    "  border:0;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.3);background:transparent;overflow:hidden;",
    "  opacity:0;transform:translateY(10px) scale(.985);transition:opacity .16s ease,transform .16s ease;pointer-events:none}",
    ".panel.on{opacity:1;transform:none;pointer-events:auto}",
    "@media (max-width:520px){",
    "  .panel{inset:0;width:100%;height:100%;border-radius:0;bottom:0}",
    "  .root{bottom:16px;" + (cfg.side === "left" ? "left" : "right") + ":16px}",
    "  .nudge{display:none}",
    "}",
    "@media (prefers-reduced-motion:reduce){.panel,.bubble{transition:none}}"
  ].join("\n");

  var root = document.createElement("div");
  root.className = "root";

  var bubble = document.createElement("button");
  bubble.className = "bubble";
  bubble.type = "button";
  bubble.setAttribute("aria-label", "Yordamchini ochish");
  bubble.innerHTML = '<img src="' + base + 'logo-96.png" alt="" />';

  var badge = null;
  var nudge = null;

  var frame = document.createElement("iframe");
  frame.className = "panel";
  frame.title = cfg.title;
  frame.setAttribute("allow", "microphone");
  frame.src =
    base + "app.html" +
    "?api=" + encodeURIComponent(cfg.api) +
    "&org=" + encodeURIComponent(cfg.org) +
    "&key=" + encodeURIComponent(cfg.key) +
    "&title=" + encodeURIComponent(cfg.title) +
    "&subtitle=" + encodeURIComponent(cfg.subtitle) +
    "&accent=" + encodeURIComponent(cfg.accent) +
    "&theme=" + encodeURIComponent(cfg.theme) +
    (cfg.suggest ? "&suggest=" + encodeURIComponent(cfg.suggest) : "");

  root.appendChild(bubble);
  shadow.appendChild(style);
  shadow.appendChild(root);
  shadow.appendChild(frame);

  function mount() {
    document.body.appendChild(host);
    window.setTimeout(showNudge, 2600);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  /* ---------- nudge: bir marta, 8 soniya ---------- */
  var nudgeShown = false;
  function showNudge() {
    if (nudgeShown || open) return;
    try { if (window.sessionStorage.getItem("olima_nudge")) return; } catch (e) {}
    nudgeShown = true;
    nudge = document.createElement("div");
    nudge.className = "nudge";
    nudge.textContent = "Savolingiz bormi?";
    root.appendChild(nudge);
    try { window.sessionStorage.setItem("olima_nudge", "1"); } catch (e) {}
    window.setTimeout(hideNudge, 8000);
  }
  function hideNudge() {
    if (nudge && nudge.parentNode) nudge.parentNode.removeChild(nudge);
    nudge = null;
  }

  /* ---------- ochish / yopish ---------- */
  function setOpen(next) {
    open = next;
    frame.classList.toggle("on", open);
    bubble.setAttribute("aria-label", open ? "Yordamchini yopish" : "Yordamchini ochish");
    if (open) {
      hideNudge();
      setUnread(0);
      post({ type: "focus" });
      if (identity) post({ type: "identify", identity: identity });
    }
    emit(open ? "open" : "close", {});
  }
  bubble.addEventListener("click", function () { setOpen(!open); });

  function setUnread(n) {
    unread = n;
    if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
    badge = null;
    if (n > 0) {
      badge = document.createElement("span");
      badge.className = "dot";
      badge.textContent = String(n);
      bubble.appendChild(badge);
    }
  }

  /* ---------- iframe bilan aloqa ---------- */
  function post(msg) {
    try {
      msg.source = "olima-host";
      frame.contentWindow.postMessage(msg, "*");
    } catch (e) {}
  }

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.source !== "olima-widget") return;
    if (ev.source !== frame.contentWindow) return;   // faqat o'z iframe'imizdan
    switch (d.type) {
      case "ready":
        if (identity) post({ type: "identify", identity: identity });
        emit("ready", {});
        break;
      case "close":
        setOpen(false);
        break;
      case "unread":
        if (!open) setUnread(unread + 1);
        break;
      case "handoff":
        emit("handoff", d.payload || {});
        break;
      case "answer":
        emit("answer", d.payload || {});
        break;
    }
  });

  /* ---------- hodisalar ---------- */
  function emit(name, payload) {
    (listeners[name] || []).forEach(function (fn) {
      try { fn(payload); } catch (e) {}
    });
  }

  /* ---------- ommaviy API ---------- */
  window.OlimaAI = {
    __loaded: true,
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    toggle: function () { setOpen(!open); },
    ask: function (text) { setOpen(true); post({ type: "ask", text: String(text || "") }); },
    /**
     * Kirgan foydalanuvchini tanitish.
     * hash — mijoz SERVERIDA maxfiy kalit bilan imzolangan HMAC.
     * Imzosiz shaxsiy ma'lumotlarga ruxsat berilmasligi kerak.
     */
    identify: function (user) {
      identity = user || null;
      if (identity) post({ type: "identify", identity: identity });
    },
    on: function (name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
    },
    destroy: function () {
      if (host.parentNode) host.parentNode.removeChild(host);
      window.OlimaAI.__loaded = false;
    }
  };
})();
