<#
.SYNOPSIS
  Polls the Telegram bot for new messages from the authorized chat only,
  since the last processed update_id, and prints them as JSON. Advances
  the stored offset so messages are not re-processed on the next poll.

.EXAMPLE
  .\check-telegram-commands.ps1
#>

$configPath = Join-Path $PSScriptRoot 'telegram-config.json'
$statePath = Join-Path $PSScriptRoot 'telegram-state.json'

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$state = if (Test-Path $statePath) { Get-Content $statePath -Raw | ConvertFrom-Json } else { [pscustomobject]@{ lastUpdateId = 0 } }

$offset = [int64]$state.lastUpdateId + 1
$resp = Invoke-RestMethod -Uri "https://api.telegram.org/bot$($config.botToken)/getUpdates?offset=$offset&timeout=0"

$newMessages = @()
$maxUpdateId = [int64]$state.lastUpdateId

foreach ($update in $resp.result) {
  if ($update.update_id -gt $maxUpdateId) { $maxUpdateId = $update.update_id }
  if ($update.message -and [string]$update.message.chat.id -eq [string]$config.chatId -and $update.message.text) {
    $newMessages += $update.message.text
  }
}

if ($maxUpdateId -ne [int64]$state.lastUpdateId) {
  [pscustomobject]@{ lastUpdateId = $maxUpdateId } | ConvertTo-Json | Set-Content -Path $statePath -Encoding utf8
}

$newMessages | ConvertTo-Json
