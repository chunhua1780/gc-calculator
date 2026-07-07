<#
Sync v1.88: desktop-viewport centering fix (.screen/#chat/#installBanner/#huaweiBanner
get a max-width:420px centered frame above 560px viewport width) + version bump.
#>
param([Parameter(Mandatory=$true)][string]$RepoPath)

$idxPath = Join-Path $RepoPath 'index.html'
$swPath = Join-Path $RepoPath 'sw.js'
$idx = (Get-Content $idxPath -Raw -Encoding UTF8) -replace "`r`n", "`n"
$misses = @()

$anchor = "#chat > .ibar{flex-shrink:0;width:100%;}"
$newBlock = @'
#chat > .ibar{flex-shrink:0;width:100%;}
/* desktop: this mobile-first UI should render as a centered "phone frame" on
   wide browser windows, not stretch full-width (an instant disguise giveaway) */
@media (min-width:560px){
  .screen,#chat{left:50%;right:auto;width:420px;transform:translateX(-50%);box-shadow:0 0 0 1px rgba(0,0,0,.06),0 20px 60px rgba(0,0,0,.18);}
  #installBanner,#huaweiBanner{left:50%;right:auto;width:420px;transform:translateX(-50%);}
}
'@
if ($idx -notmatch [regex]::Escape('@media (min-width:560px)')) {
  if ($idx -match [regex]::Escape($anchor)) {
    $idx = $idx -replace [regex]::Escape($anchor), $newBlock
  } else { $misses += "#chat > .ibar anchor (for desktop centering CSS insert)" }
}

$newVer = $null
if ($idx -match "var CORE_VERSION='v(\d+)\.(\d+)';") {
  $major = $matches[1]; $minor = [int]$matches[2] + 1
  $newVer = "v$major.$minor"
  $idx = $idx -replace "var CORE_VERSION='v\d+\.\d+';", "var CORE_VERSION='$newVer';"
} else { $misses += "CORE_VERSION pattern not found" }

$idx = $idx -replace "`n", "`r`n"
Set-Content -Path $idxPath -Value $idx -NoNewline -Encoding UTF8

$sw = (Get-Content $swPath -Raw -Encoding UTF8) -replace "`r`n", "`n"
if ($newVer) { $sw = $sw -replace "const CACHE = 'gc-v[\d.]+';", "const CACHE = 'gc-$newVer';" }
$sw = $sw -replace "`n", "`r`n"
Set-Content -Path $swPath -Value $sw -NoNewline -Encoding UTF8

if ($misses.Count -gt 0) {
  Write-Host "  MISSES for $RepoPath :" -ForegroundColor Yellow
  $misses | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
} else {
  Write-Host "  clean: $RepoPath (CORE_VERSION -> $newVer)"
}
