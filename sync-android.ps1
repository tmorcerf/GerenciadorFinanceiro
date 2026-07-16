Write-Host "Limpando pasta www..."
if (Test-Path "www") { Remove-Item -Recurse -Force "www" }
New-Item -ItemType Directory -Force -Path "www" | Out-Null

Write-Host "Copiando arquivos web..."
Copy-Item -Path ".\*.html", ".\*.js", ".\*.css", ".\*.png", ".\manifest.json", ".\*.svg" -Destination "www\" -ErrorAction SilentlyContinue
if (Test-Path ".\scripts") { Copy-Item ".\scripts" -Destination "www\" -Recurse }
if (Test-Path ".\scanner") { Copy-Item ".\scanner" -Destination "www\" -Recurse }
if (Test-Path ".\scanner_ean") { Copy-Item ".\scanner_ean" -Destination "www\" -Recurse }

Write-Host "Sincronizando Capacitor..."
npx cap sync

Write-Host "Concluído!"
