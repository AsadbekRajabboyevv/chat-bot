# OLIMA AI widget (SDK) — backend jamoasi uchun

**Sana:** 2026-09-18 · **Muallif:** rol C (yuza va demo) · **Holat:** lokal sinovdan o'tdi, jamoa Wi-Fi'sida ishlayapti

Bu hujjat: widget nima, backend bilan qanday gaplashadi, men BE'da nimalarni o'zgartirdim,
va BE jamoasidan aniq nima kerak.

---

## 1. Bir gapda

Mijoz saytiga **bitta `<script>` qatori** qo'yiladi — sahifaning quyi o'ng burchagida chat pufakchasi paydo
bo'ladi, u bizning `/api/v1/chat/stream` ga ulanadi. SDK alohida qurilmadi: **widget'ning o'zi SDK** —
npm paket emas, skript bilan tarqatiladi.

```html
<script src="http://172.16.9.12:4400/widget.js"
        data-key="wk_test_local"
        data-org="550e8400-e29b-41d4-a716-446655440001"
        data-api="http://172.16.9.12:8090"
        data-title="VTest yordamchisi"
        data-accent="#6366f1"
        data-theme="dark"
        async></script>
```

---

## 2. Fayllar

| Fayl | Nima qiladi |
|---|---|
| `widget/widget.js` | Loader. Shadow DOM ichida pufakcha yaratadi, chatni **iframe** bilan ochadi, `window.OlimaAI` API'sini beradi |
| `widget/app.html` | Chatning o'zi. SSE oqimini o'qiydi, xabarlarni chizadi, manba chiplarini va kartochkalarni ko'rsatadi |

Hech qanday build kerak emas: hammasi statik fayl.

---

## 3. Oqim

```
mijoz brauzeri
  │
  ├─ GET  /widget.js                    (loader, ~7 KB)
  ├─ GET  /app.html?api=…&org=…&theme=… (iframe ichidagi chat)
  │
  └─ POST {api}/api/v1/chat/stream      ← asosiy kanal (SSE)
          ├─ INIT       → conversationId
          ├─ TOOL_CALL  → qaysi tool, necha ms
          ├─ CONTENT    → javob bo'laklari (so'zma-so'z)
          └─ COMPLETE   → sources[], confirmationRequired, pendingComplaintId
```

Oqim ishlamasa widget avtomatik **`POST /api/v1/chat`** ga tushadi (fallback).
Tasdiqlash: **`POST /api/v1/chat/confirm?conversationId=…&complaintId=…`**.

### Widget nimani ko'rsatadi

| BE hodisasi | Ekranda |
|---|---|
| `TOOL_CALL` | «Hujjatlardan qidirilmoqda · 3814 ms» — jonli chiziq, tool nomi o'zbekchaga o'giriladi |
| `CONTENT` | matn kursor bilan oqib chiqadi |
| `COMPLETE.sources` | manba chiplari, bosilsa yangi oynada ochiladi |
| `COMPLETE.sources` **bo'sh** | ⚠️ **«Bu javobga manba biriktirilmadi»** — sariq ogohlantirish |
| `confirmationRequired` | «Tasdiq talab qilinadi» kartochkasi + Tasdiqlash / Bekor |
| `ERROR` yoki tarmoq uzilishi | «Qayta urinish» + «Xodimga uzatish» |

Oxirgidan oldingi qatorga e'tibor bering: **manbasiz javob yashirilmaydi, ochiq belgilanadi.**
Bu ataylab — mahsulot va'dasi «har javobning manbasi bor» bo'lsa, buzilgan holat ko'rinib turishi kerak.
Guard qo'shilgach bu belgi umuman chiqmaydi.

---

## 4. `window.OlimaAI` — klient API

```js
OlimaAI.open() / .close() / .toggle()
OlimaAI.ask("savol")                  // tashqaridan savol yuborish
OlimaAI.identify({ userId, name, hash })
OlimaAI.on("ready" | "open" | "close" | "answer" | "handoff", fn)
OlimaAI.destroy()
```

`identify()` dagi `hash` — **mijoz serverida imzolangan HMAC**. Hozir tekshirilmaydi (pastga qarang).

---

## 5. Men BE'da nimani o'zgartirdim

Uchta kichik o'zgarish, hammasi `git diff` da:

1. **`SecurityConfig`** — CORS `localhost:4200` ga qotib qolgan edi. Endi naqsh bo'yicha:
   `localhost:*`, `127.0.0.1:*`, `172.16.*.*:*`, `192.168.*.*:*`, `10.*.*.*:*`.
   Busiz widget boshqa portdan ham, jamoadoshning qurilmasidan ham ishlamaydi.

2. **`009-fix-university-tool-url.xml`** — `search_universities` tool'ining manzili `/api/universities`
   edi, `UniversityController` da esa `@GetMapping("/")` turibdi → **500**. Endi manzil slash bilan.

3. **Port** — olima backend `SERVER_PORT=8090` bilan ishga tushiriladi, chunki **VTest'ning mt-api'si
   ham 8080 da**. Ikkalasi bir vaqtda kerak bo'lganda to'qnashadi.

Docker va build bo'yicha oldingi tuzatishlar `docker-compose.yml` va Dockerfile'larda (ildiz konteksti,
qo'shni modul pom'i, qidiruv kalitlarini konteynerga uzatish).

---

## 6. ⚠️ BE jamoasidan kerak — muhimlik tartibida

### 6.1 Tashkilot kalitdan aniqlansin (xavfsizlik, eng muhimi)

Hozir:

```json
POST /api/v1/chat
{ "organizationId": "550e8400-…", "message": "…" }
```

Ya'ni **qaysi tashkilot botiga murojaat qilish brauzerdan yuborilyapti.** Widget ochiq sahifada turadi —
har kim `organizationId` ni almashtirib **boshqa mijozning hujjatlaridan** javob oladi.

Kerak: `wk_…` kalit ↔ bitta `organization_id`, server tomonda bog'langan. So'rov tanasidagi
`organizationId` **umuman e'tiborga olinmasin**. Widget tayyor — `data-key` allaqachon uzatilyapti.

### 6.2 Ichki tool javoblariga iqtibos qaytsin

O'lchov: **12 savoldan 1 tasida** `sources` qaytdi, ichki tool asosidagi **6 javobning hech birida** yo'q.
Ya'ni widget ko'rsatadigan narsa yo'q va har javobda sariq ogohlantirish chiqadi.

Kerak: `ToolResult.sources` ichki toollarda ham to'ldirilsin — hujjat nomi, raqami, **bandi** va havolasi.
Faqat URL emas: foydalanuvchiga «VMQ 578-son, 12-band» kerak, `lex.uz/docs/-7726569` emas.

Taklif: `sources` ni `List<String>` emas, tuzilma qilish —
`{ doc, docNo, clause, status, url }`. Widget shu zahoti kartochka qilib chizadi.

### 6.3 Oqim B — shikoyat qoralamasi birinchi navbatda chiqsin

Sinov: *«Universitet kontrakt pulimni qaytarmayapti. Shikoyat qilmoqchiman.»*
→ `create_complaint_draft` **chaqirilmadi**, `confirmationRequired=false`.
Model shunchaki mavzu, tavsif va kategoriya so'radi.

Bu bizning yagona farqlovchi lahzamiz va u sahnada **birinchi urinishda ko'rinmaydi**.
Widget tomoni tayyor — `confirmationRequired=true` kelishi bilan tasdiq kartochkasi chiqadi.

### 6.4 «Bilmayman» qoidasi barqaror bo'lsin

O'lchovda xulq beqaror: *«2026-yilda stipendiya qancha?»* savolini **begona mavzu** deb rad etdi
(aslida to'liq o'z domenida), *«diplom dublikati»* savoliga esa hech qanday hujjatsiz
4 bosqichli tartib o'ylab topdi.

### 6.5 Qolganlari

- **Rate limit va kvota** — widget ochiq endpoint, hozir hech qanday chegara yo'q
- **Admin API himoyasi** — hozir ochiq; tool registratsiyasi ixtiyoriy URL qabul qiladi (SSRF)
- **Sozlamalar serverdan** — hozir `title`, `accent`, `theme`, `org` URL'da ochiq ketyapti.
  Kerak: `GET /api/v1/widget/config` kalit bo'yicha
- **`identify()` imzosini tekshirish** — imzosiz shaxsiy toollar ochilmasin
- **Javob matnini sanitizatsiya** — widget markdown'ni HTML qilib chizmaydi (hozir toza matn),
  lekin admin paneldagi chat `marked` + `innerHTML` ishlatadi → korpusdagi hujjat ichidan XSS mumkin

---

## 7. Sinash

Backend allaqachon ishlayotgan bo'lsa:

```bash
cd chat-bot/widget
python -m http.server 4400 --bind 0.0.0.0
```

Keyin oching:

| Nima | Havola |
|---|---|
| Landing sahifa | http://172.16.9.12:4400 |
| VTest (widget ulangan) | http://172.16.9.12:4300 |

VTest'dagi ulanish `mt-web/src/index.html` da, `feature/javobnoma-widget-sinov` branch'ida.
Skript **faqat lokal tarmoq manzillarida** yuklanadi — prodga chiqsa ham hech narsa qilmaydi.

---

## 8. Qisqa xulosa

Yuza tayyor: oqim, tool ko'rsatkichi, manba chiplari, tasdiq kartochkasi, xato holati, mobil ko'rinish,
qorong'i mavzu, izolyatsiya. **Yetishmayotgani — backend tomonidagi to'rtta narsa:** kalitdan tashkilot,
iqtibos, oqim B va barqaror «bilmayman». Ular qo'shilsa, widget'da qo'shimcha kod kerak emas —
hammasi allaqachon kutib turibdi.
