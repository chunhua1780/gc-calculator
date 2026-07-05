<#
.SYNOPSIS
  Boot/dispatch layer for the Telegram remote control. One call = one tick:
  poll for new messages, ack instantly, and record what the outer Claude
  Code /loop should do next (start a command, or interrupt one in progress).

  Cheap by design: no LLM calls here. Any new message that arrives while
  status is "in_progress" is treated as an interrupt unconditionally (per
  the standing rule that a new instruction always preempts in-flight work).

.EXAMPLE
  .\boot.ps1
#>

$bootStatePath = Join-Path $PSScriptRoot 'boot-state.json'
$statusScript = Join-Path $PSScriptRoot 'telegram-status.ps1'
$pollScript = Join-Path $PSScriptRoot 'check-telegram-commands.ps1'

function Get-BootState {
  if (Test-Path $bootStatePath) {
    Get-Content $bootStatePath -Raw | ConvertFrom-Json
  } else {
    [pscustomobject]@{ status = 'idle'; currentCommand = ''; interruptRequested = $false; interruptCommand = '' }
  }
}

function Set-BootState($state) {
  $state | ConvertTo-Json | Set-Content -Path $bootStatePath -Encoding utf8
}

$messagesJson = & $pollScript
$messages = if ($messagesJson) { $messagesJson | ConvertFrom-Json } else { @() }
if ($messages -isnot [array]) { $messages = @($messages) }

if ($messages.Count -eq 0) {
  Get-BootState | ConvertTo-Json
  return
}

$state = Get-BootState

foreach ($msg in $messages) {
  & $statusScript -Message "收到: $msg"

  if ($state.status -eq 'in_progress') {
    $state.interruptRequested = $true
    $state.interruptCommand = $msg
  } else {
    $state.status = 'in_progress'
    $state.currentCommand = $msg
    $state.interruptRequested = $false
    $state.interruptCommand = ''
  }
}

Set-BootState $state
$state | ConvertTo-Json
