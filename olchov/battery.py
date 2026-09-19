# -*- coding: utf-8 -*-
import json, time, urllib.request, io, sys

ORG = "550e8400-e29b-41d4-a716-446655440001"
URL = "http://localhost:8080/api/v1/chat"

Q = [
  ("A-qamrovda", "akad-tatil",   "Akademik ta'til qancha muddatga beriladi va qanday hujjatlar kerak?"),
  ("A-qamrovda", "kochirish-gpa","O'qishni boshqa universitetga ko'chirish uchun GPA qancha bo'lishi kerak?"),
  ("A-qamrovda", "universitet",  "O'zbekistonda qanday universitetlar bor? Ro'yxatini ber."),
  ("A-qamrovsiz","kontrakt-bolib","Kontrakt to'lovini bo'lib-bo'lib to'lasam bo'ladimi, qancha muddatga?"),
  ("A-qamrovsiz","harbiy",       "Harbiy xizmatga chaqirilsam o'qishim saqlanadimi, qaysi hujjat asosida?"),
  ("A-qamrovsiz","stipendiya-26","2026-yilda stipendiya miqdori qancha?"),
  ("A-qamrovsiz","diplom-dublikat","Diplomimni yo'qotib qo'ysam dublikatini qanday olaman?"),
  ("Shaxsiy",    "men-stipendiya","Mening stipendiyam qancha?"),
  ("Shaxsiy",    "stu001",       "STU-001 talabaning kontrakti haqida ma'lumot ber."),
  ("Oqim-B",     "shikoyat",     "Universitet kontrakt pulimni qaytarmayapti. Shikoyat qilmoqchiman."),
  ("Begona",     "php",          "PHP da massivni qanday saralayman? Kod yozib ber."),
]

def ask(msg, conv=None):
    body = {"organizationId": ORG, "message": msg}
    if conv: body["conversationId"] = conv
    req = urllib.request.Request(URL, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type":"application/json"})
    t0=time.time()
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            d = json.loads(r.read().decode("utf-8"))
    except Exception as e:
        d = {"_error": str(e)}
    d["_ms"] = int((time.time()-t0)*1000)
    return d

out=[]
first_conv=None
for cat, key, msg in Q:
    d = ask(msg)
    if key=="akad-tatil": first_conv = d.get("conversationId")
    out.append({"kategoriya":cat,"kalit":key,"savol":msg,"javob":d})
    print(key, "->", d.get("_ms"), "ms", file=sys.stderr)

# kontekst sinovi: 1-savolning davomi
if first_conv:
    d = ask("Buning uchun kim bilan uchrashishim kerak?", first_conv)
    out.append({"kategoriya":"Kontekst","kalit":"davomi","savol":"Buning uchun kim bilan uchrashishim kerak?","javob":d})

io.open("olchov/natija.json","w",encoding="utf-8").write(json.dumps(out,ensure_ascii=False,indent=1))
print("TAYYOR:", len(out), "savol", file=sys.stderr)
