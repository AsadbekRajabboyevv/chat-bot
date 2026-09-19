# ===========================================================
#  OLIMA / chat-bot - to'xtatish
#  8081 / 8080 / 4200 portlarini egallagan jarayonlarni yopadi
# ===========================================================

foreach ($p in 8081, 8080, 4200) {
    $conns = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($procId in ($conns.OwningProcess | Select-Object -Unique)) {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "port $p -> $($proc.ProcessName) (PID $procId) to'xtatilmoqda" -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Host "port $p - bo'sh"
    }
}
Write-Host "Tayyor. (Postgres xizmatiga tegilmadi.)" -ForegroundColor Green

