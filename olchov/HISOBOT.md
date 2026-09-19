# O'lchov #1 — chat-bot (OLIMA) javoblarining ishonchliligi

**Sana:** 2026-09-18 · **Tizim:** mahalliy stek, gpt-4o-mini, tashkilot = Higher Education Ministry
**Usul:** 12 ta savol `POST /api/v1/chat` ga yuborildi, har javobning tool chaqiruvlari,
`sources` maydoni va matni qo'lda tekshirildi. Xom ma'lumot: `olchov/natija.json`, skript: `olchov/battery.py`.

## Natija

| Ko'rsatkich | Raqam |
|---|---|
| Jami savol | 12 |
| **Manba (`sources`) qaytgan javob** | **1 / 12** |
| Ichki tool asosidagi javoblarda iqtibos | **0 / 6** |
| O'ylab topilgan mazmun aniqlangan javob | **3 / 12** |
| To'g'ri «bilmayman» degan javob | 2 |
| Domen chegarasi ishladi (PHP savoli rad etildi) | ✅ |
| Kontekst saqlandi (davomiy savol) | ✅ |
| **Oqim B (shikoyat qoralamasi) ishga tushdi** | ❌ |

## Eng muhim uchta topilma

**1. Ichki tool javoblarida iqtibos umuman yo'q.** Hujjat nomi ham, bandi ham, havolasi ham
qaytmaydi — `sources` bo'sh. Foydalanuvchi javobni tekshira olmaydi. «Har bir javobning
sanadi bor» pozitsiyasi hozirgi kodda mavjud emas.

**2. Bilmagan savolga ishonch bilan o'ylab topadi.** Eng yorqin misol — *«Diplomimni yo'qotsam
dublikatini qanday olaman?»*: hech qanday tool chaqirilmagan, manba nol, lekin javob
4 bosqichli tartib, hujjatlar ro'yxati va to'lov haqida gapiradi. *«Harbiy xizmat»* savolida ham
mock bazada yo'q hujjatlar ro'yxati qo'shib yuborilgan.
Teskarisi ham bor: *«2026-yilda stipendiya qancha?»* savoliga to'g'ri «topilmadi» dedi — ya'ni
xulq **beqaror**, qoidaga bo'ysunmaydi.

**3. Oqim B birinchi navbatda ishga tushmadi.** *«Kontrakt pulimni qaytarmayapti, shikoyat
qilmoqchiman»* — `create_complaint_draft` chaqirilmadi, `confirmationRequired=false`.
Model avval mavzu/tavsif/kategoriya so'radi. Ya'ni bizni «yana bitta chatbot»dan ajratadigan
lahza sahnada birinchi urinishda ko'rinmaydi.

## Ikkinchi darajali

- *«Kontrakt to'lovini bo'lib to'lasam bo'ladimi?»* — bu **qoida** savoli, lekin agent uni
  shaxsiy ma'lumot deb tushunib, talaba ID so'radi. Qoida javobsiz qoldi.
- Javob tezligi: 1,2–9,2 sekund (o'rtacha ~4 s). Demo uchun yetarli.
- `search_universities` tuzatilgandan keyin ishlayapti (avval 500 qaytarardi).

## Xulosa

Muhandislik ishlaydi: toollar chaqiriladi, kontekst saqlanadi, begona mavzu rad etiladi, tezlik yaxshi.
**Ishonchlilik ishlamaydi:** iqtibos yo'q, «bilmayman» qoidasi beqaror, oqim B kechikadi.
Sahnada hakam bitta «qaysi hujjatning qaysi bandi?» savoli bilan shu uchalasini ham ochib tashlaydi.
