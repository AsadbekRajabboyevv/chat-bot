# Deploy — OLIMA AI

## Branch'lar

| Branch | Vazifasi |
|---|---|
| `dev`  | kundalik ish. Hamma o'zgarish shu yerga push/PR qilinadi |
| `prod` | **serverda ishlab turgan versiya.** Bu yerga push = avtomatik deploy |

Prodga chiqarish — `dev` ni `prod` ga merge qilish:

```bash
git checkout prod && git pull
git merge --ff-only dev        # yoki GitHub'da dev -> prod PR
git push origin prod
```

~1 daqiqada server o'zgarishni sezadi, build qiladi (5–8 daqiqa) va ko'taradi.

## Server qanday tinglaydi

Server: Hetzner `178.105.158.192`, papka `/opt/olima/`

```
/opt/olima/
├── .env            # parollar, OpenAI kaliti — git'da YO'Q
├── src/            # shu repo'ning prod branch'i (git clone)
├── deploy.log      # har deploy yozuvi
└── .deployed-sha   # hozir ishlab turgan commit
```

`olima-autodeploy.timer` (systemd) har 60 sekundda `deploy/autodeploy.sh` ni chaqiradi:

1. `git fetch origin prod` — yangi commit yo'q bo'lsa hech narsa qilmaydi
2. `docker compose build` — ketma-ket, **build yiqilsa eski versiya ishlashda qoladi**
3. `docker compose up -d`
4. `/actuator/health` 3 daqiqa ichida `UP` bo'lmasa — **oldingi image'larga rollback**,
   yiqilgan commit qayta urinilmaydi (keyingi push'gacha)
5. Natija Telegram'ga (`notifier send`) yuboriladi

Build manbadan qilinadi: panel `olima-frontend/` dan, backend `olima-backend/` dan,
widget va landing `widget/` dan. Demo portal `portal/index.html` deploy oxirida
`/opt/caddy-sites/www/oliytalim/` ga nusxalanadi. Qo'lda jar yoki dist nusxalash yo'q.

## Foydali buyruqlar (serverda)

```bash
journalctl -u olima-autodeploy -f          # jonli log
tail -50 /opt/olima/deploy.log
/opt/olima/src/deploy/autodeploy.sh --force   # majburan qayta deploy
systemctl stop olima-autodeploy.timer      # auto-deploy'ni vaqtincha o'chirish
```

## Manzillar

- Panel: https://olima.178-105-158-192.sslip.io/
- Landing: https://olima.178-105-158-192.sslip.io/demo/
- Demo portal (alohida host, Caddy file_server): https://oliytalim.178-105-158-192.sslip.io/
- Widget: https://olima.178-105-158-192.sslip.io/widget.js

⚠️ Server VTest (vtest.uz) prodini ham ko'taradi. OLIMA alohida Postgres, alohida
tarmoq va xotira chegaralari bilan ishlaydi — MT konteynerlariga tegmang.
Caddy marshruti: `deploy/caddy/olima.caddy` → serverda `/opt/caddy-sites/`.
