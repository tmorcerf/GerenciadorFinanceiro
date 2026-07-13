# deploy.ps1 - Script de deploy automatico do Corta Gastos
# Uso: .\deploy.ps1 "mensagem do commit"
# Incrementa a versao, atualiza o timestamp e faz commit + push automaticamente.

param(
  [string]$Mensagem = "chore: atualizacao automatica"
)

$ErrorActionPreference = "Stop"
$indexPath = Join-Path $PSScriptRoot "index.html"

# 1. Le o conteudo atual
$conteudo = Get-Content $indexPath -Raw -Encoding UTF8

# 2. Extrai a versao atual
if ($conteudo -match 'v (0\.\d+\.\d+)') {
  $versaoAtual = $Matches[1]
  $partes = $versaoAtual -split '\.'
  $novoMinor = [int]$partes[2] + 1
  $novaVersao = "$($partes[0]).$($partes[1]).$novoMinor"
} else {
  $novaVersao = "0.9.985"
}

# 3. Gera timestamp
$agora = Get-Date -Format "dd/MM/yyyy, HH:mm:ss"
$novoTexto = "v $novaVersao - $agora"

# 4. Substitui no HTML
$conteudo = $conteudo -replace 'v 0\.\d+\.\d+ - \d{2}/\d{2}/\d{4}, \d{2}:\d{2}(:\d{2})?', $novoTexto
Set-Content -Path $indexPath -Value $conteudo -Encoding UTF8 -NoNewline

Write-Host "Versao atualizada: $novoTexto" -ForegroundColor Green

# 5. Commit e push
git -C $PSScriptRoot add -A
git -C $PSScriptRoot commit -m $Mensagem
git -C $PSScriptRoot push origin main

Write-Host "Deploy concluido!" -ForegroundColor Cyan
