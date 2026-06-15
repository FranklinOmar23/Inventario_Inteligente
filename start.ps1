# InvenAI - Start both backend and frontend
Write-Host "`n=== InvenAI Smart Inventory ===" -ForegroundColor Cyan

# Start backend
Write-Host "Starting backend on http://localhost:3001 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; node server.js"

Start-Sleep -Seconds 2

# Start frontend
Write-Host "Starting frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Start-Sleep -Seconds 3
Write-Host "`nApp running at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Login: admin@inventario.com / admin123`n" -ForegroundColor Yellow

Start-Process "http://localhost:5173"
