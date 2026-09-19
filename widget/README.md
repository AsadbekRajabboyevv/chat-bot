# OLIMA AI widget (SDK)

Mijoz saytiga qo'yiladigan chat yordamchisi. Alohida paket o'rnatish shart emas — bitta `<script>` qatori.

| Fayl | Vazifasi |
|---|---|
| `widget.js` | yuklovchi: logo tugmasi, salomlashish kartasi, chat oynasini ochadi |
| `app.html` | chat oynasi (iframe ichida): javob oqimi, manbalar, tasdiqlash |
| `index.html` | landing sahifa (`/demo/`) |

## Ulash

Admin panel → **Tashkilotlar** → **Ulanish ma'lumotlari** — tayyor qator va kalit shu yerda:

```html
<script src="https://<olima-host>/widget.js"
        data-key="wk_…"
        async></script>
```

| Atribut | Majburiy | Tavsif |
|---|---|---|
| `data-key` | ha | tashkilot widget kaliti |
| `data-title` | yo'q | oyna sarlavhasi |
| `data-subtitle` | yo'q | sarlavha ostidagi matn |
| `data-accent` | yo'q | asosiy rang, masalan `#1457B8` |
| `data-theme` | yo'q | `light`, `dark` yoki `auto` |
| `data-greeting` | yo'q | salomlashish matni; `off` — o'chirish. Panelda berilgan matn ustun turadi |
| `data-suggest` | yo'q | tayyor savollar: `savol 1|savol 2` |
| `data-side` | yo'q | `left` — chap burchakda |

## JavaScript API

```js
OlimaAI.open();                 // oynani ochish
OlimaAI.ask("Kontrakt qancha?"); // oynani ochib savol yuborish
OlimaAI.greet();                // salomlashish kartasini ko'rsatish
OlimaAI.on("answer", e => {});  // hodisalar: ready, open, close, answer, handoff, greeting
```

## Xavfsizlik

- Tashkilot **kalit orqali server tomonda** aniqlanadi; brauzerdan kelgan tashkilot ID'siga ishonilmaydi.
- Kalit faqat chat qilishga ruxsat beradi — admin panelga kira olmaydi.
- Chat oynasi iframe'da: mijoz sahifasi bilan CSS, DOM va cookie almashilmaydi.
