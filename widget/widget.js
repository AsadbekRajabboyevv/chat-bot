/*!
 * OLIMA AI widget loader
 * -----------------------------------------------------------------------------
 * Mijoz saytiga bitta qator bilan ulanadi:
 *
 *   <script src=".../widget.js"
 *           data-key="wk_live_..."           // hozircha data-org ishlatiladi
 *           data-org="550e8400-..."          // VAQTINCHA: tashkilot identifikatori
 *           data-api="http://localhost:8080" // backend manzili
 *           data-greeting="Salom! ..."        // ixtiyoriy: salomlashish matni, "off" — o'chirish
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
    suggest: (script && script.getAttribute("data-suggest")) || "",
    // Salomlashish kartasi: "off" — o'chirish, bo'sh — standart matn
    greeting: (script && script.getAttribute("data-greeting")) || "",
    greetDelay: parseInt((script && script.getAttribute("data-greeting-delay")) || "3500", 10)
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
    // ---- salomlashish kartasi ----
    ".greet{--g-bg:#fff;--g-fg:#16191C;--g-mute:#5B6168;--g-line:#E4E6EA;",
    "  position:absolute;bottom:70px;" + (cfg.side === "left" ? "left" : "right") + ":0;width:292px;max-width:calc(100vw - 32px);",
    "  background:var(--g-bg);color:var(--g-fg);border:1px solid var(--g-line);border-radius:16px;",
    "  border-" + (cfg.side === "left" ? "bottom-left" : "bottom-right") + "-radius:4px;",
    "  padding:14px 16px 14px 16px;box-shadow:0 12px 36px rgba(20,25,60,.18);cursor:pointer;text-align:left;",
    "  opacity:0;transform:translateY(8px) scale(.97);transform-origin:bottom " + (cfg.side === "left" ? "left" : "right") + ";",
    "  transition:opacity .22s ease,transform .22s cubic-bezier(.2,.9,.3,1.2)}",
    ".greet.on{opacity:1;transform:none}",
    ".greet .who{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--g-mute);margin:0 22px 6px 0}",
    ".greet .who img{width:20px;height:20px;border-radius:50%;object-fit:contain}",
    ".greet .who i{width:7px;height:7px;border-radius:50%;background:#1DB954;display:inline-block;margin-left:2px}",
    ".greet .msg{font-size:14.5px;line-height:1.45;margin:0}",
    ".greet .cta{margin-top:10px;font-size:13px;font-weight:600;color:" + cfg.accent + "}",
    ".greet .x{position:absolute;top:8px;right:8px;width:24px;height:24px;border:0;border-radius:50%;",
    "  background:transparent;color:var(--g-mute);font-size:17px;line-height:1;cursor:pointer;display:grid;place-items:center}",
    ".greet .x:hover{background:rgba(0,0,0,.06)}",
    ".greet:focus-visible,.greet .x:focus-visible{outline:2px solid " + cfg.accent + ";outline-offset:2px}",
    (cfg.theme === "dark" ? ".greet{--g-bg:#212326;--g-fg:#ECEDEE;--g-mute:#A3A8AE;--g-line:#34373B}" :
     cfg.theme === "light" ? "" :
     "@media (prefers-color-scheme:dark){.greet{--g-bg:#212326;--g-fg:#ECEDEE;--g-mute:#A3A8AE;--g-line:#34373B}}"),
    ".panel{position:fixed;z-index:2147483000;bottom:88px;" + (cfg.side === "left" ? "left" : "right") + ":20px;width:396px;height:min(620px,calc(100vh - 120px));",
    "  border:0;border-radius:14px;box-shadow:0 18px 60px rgba(0,0,0,.3);background:transparent;overflow:hidden;",
    "  opacity:0;transform:translateY(10px) scale(.985);transition:opacity .16s ease,transform .16s ease;pointer-events:none}",
    ".panel.on{opacity:1;transform:none;pointer-events:auto}",
    "@media (max-width:520px){",
    "  .panel{inset:0;width:100%;height:100%;border-radius:0;bottom:0}",
    "  .root{bottom:16px;" + (cfg.side === "left" ? "left" : "right") + ":16px}",
    "  .greet{bottom:66px}",
    "}",
    "@media (prefers-reduced-motion:reduce){.panel,.bubble,.greet{transition:none}}"
  ].join("\n");

  var root = document.createElement("div");
  root.className = "root";

  var bubble = document.createElement("button");
  bubble.className = "bubble";
  bubble.type = "button";
  bubble.setAttribute("aria-label", "Yordamchini ochish");
  bubble.innerHTML = '<img src="' + base + 'logo-96.png" alt="" />';

  var badge = null;
  var greet = null;

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
    window.setTimeout(function () { greetDue = true; tryGreet(); }, cfg.greetDelay);
    // Server javob bermasa ham salomlashish qolib ketmasin — standart matn bilan chiqadi
    window.setTimeout(function () { configReady = true; tryGreet(); }, cfg.greetDelay + 3000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  /* ---------- salomlashish kartasi ----------
   * Sahifa ochilgach bir necha soniyada logo ustida chiqadi va o'zi yo'qolmaydi.
   * Bosilsa chat ochiladi; × bosilsa shu saytda 24 soat ko'rsatilmaydi (localStorage).
   * Chat bir marta ochilgan bo'lsa ham ko'rsatilmaydi — mehmon widget'ni allaqachon topgan.
   */
  var GREET_KEY = "olima_greet_off";
  var greetDue = false;      // kechikish o'tdi
  var configReady = false;   // panel sozlamalari keldi (yoki kutish tugadi)
  var serverCfg = {};        // { greeting, greetingEnabled } — panelda tashkilot admini boshqaradi

  function tryGreet() {
    if (greetDue && configReady) showGreeting(false);
  }
  var DEFAULT_GREETING = "Salom! 👋 Savolingiz bormi? Rasmiy hujjatlar asosida darhol javob beraman.";

  // × dan keyin bir kun ko'rsatilmaydi — keyingi tashrifda yana chiqadi (abadiy yashirish juda qattiq edi)
  var GREET_SNOOZE_MS = 24 * 60 * 60 * 1000;
  function greetingDismissed() {
    try {
      var at = parseInt(window.localStorage.getItem(GREET_KEY) || "0", 10);
      return at > 0 && Date.now() - at < GREET_SNOOZE_MS;
    } catch (e) { return false; }
  }
  function rememberDismiss() {
    try { window.localStorage.setItem(GREET_KEY, String(Date.now())); } catch (e) {}
  }

  function showGreeting(force) {
    if (greet || open) return;
    if (!force && (cfg.greeting === "off" || serverCfg.greetingEnabled === false || greetingDismissed())) return;

    greet = document.createElement("div");
    greet.className = "greet";
    greet.setAttribute("role", "button");
    greet.setAttribute("tabindex", "0");
    greet.setAttribute("aria-label", "Yordamchini ochish");

    var who = document.createElement("div");
    who.className = "who";
    var av = document.createElement("img");
    av.src = base + "logo-96.png";
    av.alt = "";
    who.appendChild(av);
    who.appendChild(document.createTextNode(cfg.title));
    var dot = document.createElement("i");
    dot.title = "Onlayn";
    who.appendChild(dot);

    var msg = document.createElement("p");
    msg.className = "msg";
    // Ustunlik: panel (tashkilot admini) → sahifadagi data-greeting → standart matn
    msg.textContent = serverCfg.greeting ||
      ((cfg.greeting && cfg.greeting !== "off") ? cfg.greeting : DEFAULT_GREETING);

    var cta = document.createElement("div");
    cta.className = "cta";
    cta.textContent = "Savol berish →";

    var x = document.createElement("button");
    x.className = "x";
    x.type = "button";
    x.setAttribute("aria-label", "Yopish");
    x.textContent = "×";
    x.addEventListener("click", function (ev) {
      ev.stopPropagation();
      rememberDismiss();
      hideGreeting();
      emit("greeting", { action: "dismiss" });
    });

    greet.appendChild(x);
    greet.appendChild(who);
    greet.appendChild(msg);
    greet.appendChild(cta);
    greet.addEventListener("click", function () {
      emit("greeting", { action: "click" });
      setOpen(true);
    });
    greet.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); greet.click(); }
    });

    root.appendChild(greet);
    // keyingi kadrda .on — aks holda transition ishlamaydi
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () { if (greet) greet.classList.add("on"); });
    });
    emit("greeting", { action: "show" });
  }

  function hideGreeting() {
    if (greet && greet.parentNode) greet.parentNode.removeChild(greet);
    greet = null;
  }

  /* ---------- ochish / yopish ---------- */
  function setOpen(next) {
    open = next;
    frame.classList.toggle("on", open);
    bubble.setAttribute("aria-label", open ? "Yordamchini yopish" : "Yordamchini ochish");
    if (open) {
      hideGreeting();
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
      case "config":
        serverCfg = d.payload || {};
        configReady = true;
        tryGreet();
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
    /** Salomlashish kartasini qo'lda ko'rsatish (yopilgan bo'lsa ham) */
    greet: function () { configReady = true; showGreeting(true); },
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
