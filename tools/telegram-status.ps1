<#
.SYNOPSIS
  Maintains ONE live-updating Telegram message as a status dashboard, instead of
  spamming a new message per update (like a BitGet-style live screen). First call
  sends a new message and remembers its message_id; every call after that edits
  the same message in place.

.PARAMETER Message
  Full dashboard text to show (this replaces the previous content, so pass the
  complete current status each time, not a diff/delta).

.PARAMETER Reset
  Force a brand-new message instead of editing the existing one (e.g. after the
  old one scrolled far up / a new "session" of work is starting).

.EXAMPLE
  .\telegram-status.ps1 -Message "同步进度:`nAChat 完成`ngc-weather 运行中..."
#>
param(
  [Parameter(Mandatory=$true)]
  [string]$Message,
  [switch]$Reset
)

$configPath = Join-Path $PSScriptRoot 'telegram-config.json'
$statusStatePath = Join-Path $PSScriptRoot 'telegram-status-state.json'

$config = Get-Content $configPath -Raw | ConvertFrom-Json
$statusState = if ((Test-Path $statusStatePath) -and -not $Reset) { Get-Content $statusStatePath -Raw | ConvertFrom-Json } else { $null }

if ($statusState -and $statusState.messageId) {
  $body = @{ chat_id = $config.chatId; message_id = $statusState.messageId; text = $Message }
  try {
    $resp = Invoke-RestMethod -Uri "https://api.telegram.org/bot$($config.botToken)/editMessageText" -Method Post -Body $body
    if ($resp.ok) { return }
  } catch {
    # message likely too old to edit / deleted - fall through and send a new one
  }
}

$body = @{ chat_id = $config.chatId; text = $Message }
$resp = Invoke-RestMethod -Uri "https://api.telegram.org/bot$($config.botToken)/sendMessage" -Method Post -Body $body
[pscustomobject]@{ messageId = $resp.result.message_id } | ConvertTo-Json | Set-Content -Path $statusStatePath -Encoding utf8
