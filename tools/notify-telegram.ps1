<#
.SYNOPSIS
  Sends a message to the user's Telegram bot. Used to report sync/task progress
  in real time instead of the user having to ask for status.

.EXAMPLE
  .\notify-telegram.ps1 -Message "ghostchat-site synced and pushed."
#>
param(
  [Parameter(Mandatory=$true)]
  [string]$Message
)

$configPath = Join-Path $PSScriptRoot 'telegram-config.json'
if (-not (Test-Path $configPath)) {
  Write-Host "telegram-config.json not found - skipping notification."
  exit 0
}

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$body = @{ chat_id = $config.chatId; text = $Message }
try {
  Invoke-RestMethod -Uri "https://api.telegram.org/bot$($config.botToken)/sendMessage" -Method Post -Body $body | Out-Null
} catch {
  Write-Host "Telegram notify failed: $_"
}
