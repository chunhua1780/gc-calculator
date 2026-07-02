<#
.SYNOPSIS
  Propagates index.html changes made in gc-calculator (the canonical core) out to
  the sibling disguise-chat-app repos (AChat, gc-weather, ghostchat, ghostchat-site,
  gc-news, gc-clock, gc-notebook). Each sibling has diverged content (different app
  name/branding, sometimes extra features), so this computes a diff of only what
  changed in gc-calculator since the last successful sync per-sibling, and tries to
  apply that diff directly. Commits locally only - never pushes.

.PARAMETER DryRun
  Show what would be synced without writing/committing anything.

.EXAMPLE
  .\sync-siblings.ps1
  .\sync-siblings.ps1 -DryRun
#>
param(
  [switch]$DryRun
)

$configPath = Join-Path $PSScriptRoot 'sync-config.json'
$config = Get-Content $configPath -Raw | ConvertFrom-Json

$corePath = $config.core.path
$coreFile = $config.core.file
$currentSha = (git -C $corePath rev-parse --short HEAD).Trim()

Write-Host "Core: $($config.core.name) @ $currentSha`n"

foreach ($sib in $config.siblings) {
  Write-Host "=== $($sib.name) ==="

  if (-not $sib.lastSynced) {
    Write-Host "  skipped (no baseline set - $($sib.note))`n"
    continue
  }

  if ($sib.lastSynced -eq $currentSha) {
    Write-Host "  already up to date`n"
    continue
  }

  $diff = git -C $corePath diff "$($sib.lastSynced)..HEAD" -- $coreFile
  if (-not $diff) {
    Write-Host "  no relevant changes since last sync ($($sib.lastSynced))`n"
    $sib.lastSynced = $currentSha
    continue
  }

  $diffFile = [System.IO.Path]::GetTempFileName()
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($diffFile, ($diff -join "`n") + "`n", $utf8NoBom)

  $checkOutput = git -C $sib.path apply --check $diffFile 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  CONFLICT - diff does not apply cleanly, needs manual sync (see: coordinate an agent per-repo with the patch, like the 2026-07-02 UI sync)"
    Write-Host "  git apply --check said:`n$checkOutput`n"
    Remove-Item $diffFile -ErrorAction SilentlyContinue
    continue
  }

  if ($DryRun) {
    Write-Host "  would apply cleanly ($($sib.lastSynced) -> $currentSha), dry run - not writing`n"
    Remove-Item $diffFile -ErrorAction SilentlyContinue
    continue
  }

  git -C $sib.path apply $diffFile
  git -C $sib.path add $coreFile
  git -C $sib.path commit -m "sync: pull core UI changes from $($config.core.name)@$currentSha" | Out-Null
  Write-Host "  synced + committed locally (not pushed)`n"

  $sib.lastSynced = $currentSha
  Remove-Item $diffFile -ErrorAction SilentlyContinue
}

if (-not $DryRun) {
  $config | ConvertTo-Json -Depth 5 | Set-Content -Path $configPath -Encoding utf8
  Write-Host "sync-config.json updated with new baselines."
} else {
  Write-Host "Dry run - sync-config.json not modified."
}
