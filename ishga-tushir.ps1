# ===========================================================
#  OLIMA / chat-bot - mahalliy ishga tushirish (Dockersiz)
#  Ishlatish:  PowerShell da ushbu faylni ishga tushiring
#              .\ishga-tushir.ps1
# ===========================================================

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root
Write-Host ""
Write-Host "=== OLIMA local ===" -ForegroundColor Cyan
Write-Host "Papka: $root"

# --- 1. Postgres (5433) ---------------------------------------------------
$pg = Get-NetTCPConnection -State Listen -LocalPort 5433 -ErrorAction SilentlyContinue
if (-not $pg) {
    Write-Host "[1/4] Postgres 5433 da eshitmayapti - xizmat yoqilmoqda..." -ForegroundColor Yellow
    Get-Service *postgres* | Where-Object { $_.Status -ne 'Running' } | Start-Service
    Start-Sleep -Seconds 6
    $pg = Get-NetTCPConnection -State Listen -LocalPort 5433 -ErrorAction SilentlyContinue
}
if ($pg) {
    Write-Host "[1/4] Postgres 5433 - OK" -ForegroundColor Green
} else {
    Write-Host "[1/4] XATO: Postgres 5433 da ko'tarilmadi. To'xtatildi." -ForegroundColor Red
    Read-Host "Chiqish uchun Enter"
    exit 1
}

# --- 2. .env --------------------------------------------------------------
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "[2/4] XATO: .env fayli yo'q." -ForegroundColor Red
    Read-Host "Chiqish uchun Enter"
    exit 1
}
$envMap = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $envMap[$matches[1]] = $matches[2].Trim()
    }
}
$key = $envMap["OPENAI_API_KEY"]
if ([string]::IsNullOrWhiteSpace($key)) {
    Write-Host "[2/4] OGOHLANTIRISH: .env da OPENAI_API_KEY bo'sh - chat javob bermaydi." -ForegroundColor Yellow
} else {
    Write-Host "[2/4] .env - OK (OPENAI_API_KEY joyida)" -ForegroundColor Green
}

# --- 3. jar'lar -----------------------------------------------------------
$beJar = "olima-backend\target\olima-backend-0.0.1-SNAPSHOT.jar"
$mgJar = "mock-government\target\mock-government-0.0.1-SNAPSHOT.jar"
if ((-not (Test-Path $beJar)) -or (-not (Test-Path $mgJar))) {
    Write-Host "[3/4] jar topilmadi - Maven build (bir necha daqiqa)..." -ForegroundColor Yellow
    # -Dmaven.compiler.proc=full  -> JDK 23+ da Lombok uchun SHART
    & .\mvnw.cmd -B -s central-settings.xml -DskipTests -Dmaven.compiler.proc=full package
    if (-not (Test-Path $beJar)) {
        Write-Host "[3/4] XATO: build yiqildi." -ForegroundColor Red
        Read-Host "Chiqish uchun Enter"
        exit 1
    }
}
Write-Host "[3/4] jar'lar joyida" -ForegroundColor Green

# --- 4. servislar ---------------------------------------------------------
$db = "`$env:DB_HOST='localhost'; `$env:DB_PORT='5433'; `$env:DB_USERNAME='olima'; `$env:DB_PASSWORD='olima';"

# 4a. mock-government -> 8081
$c1 = "$db `$env:DB_NAME='mock_government'; " +
      "Set-Location '$root'; " +
      "java -jar '$mgJar'"
Start-Process powershell -ArgumentList "-NoExit","-Command",$c1
Write-Host "[4/4] mock-government ishga tushdi -> http://localhost:8081" -ForegroundColor Green
Start-Sleep -Seconds 18

# 4b. olima-backend -> 8080
$c2 = "$db `$env:DB_NAME='olima'; "
foreach ($k in @("OPENAI_API_KEY","OPENAI_MODEL","GOOGLE_SEARCH_API_KEY","GOOGLE_SEARCH_CX","TAVILY_API_KEY","SERPAPI_API_KEY")) {
    $v = $envMap[$k]
    if (-not [string]::IsNullOrWhiteSpace($v)) { $c2 += "`$env:$k='$v'; " }
}
$c2 += "Set-Location '$root'; java -jar '$beJar'"
Start-Process powershell -ArgumentList "-NoExit","-Command",$c2
Write-Host "      olima-backend ishga tushdi  -> http://localhost:8080/api/v1" -ForegroundColor Green
Start-Sleep -Seconds 20

# 4c. frontend -> 4200
$fe = Join-Path $root "olima-frontend"
$c3 = "Set-Location '$fe'; if (-not (Test-Path node_modules)) { npm install }; npm start"
Start-Process powershell -ArgumentList "-NoExit","-Command",$c3
Write-Host "      frontend ishga tushdi      -> http://localhost:4200" -ForegroundColor Green

Write-Host ""
Write-Host "Uchta oyna ochildi. Brauzerda oching: http://localhost:4200" -ForegroundColor Cyan
Write-Host "To'xtatish uchun: .\to-xtat.ps1  (yoki uchala oynani yoping)"
Write-Host ""
