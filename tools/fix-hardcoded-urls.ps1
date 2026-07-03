<#
One-off mechanical fix, applied 2026-07-02: replaces the hardcoded
'https://chunhua1780.github.io/ghostchat/' base URL (which made every
sibling app's push icon/deep-link point at ghostchat regardless of which
app sent it) with a GC_BASE_URL constant computed from the page's own
origin at runtime. Also bumps CORE_VERSION +0.01 and syncs sw.js's CACHE
name to match (stale SW cache was the reason previously-shipped fixes
didn't visibly take effect for users).
#>
param([Parameter(Mandatory=$true)][string]$RepoPath)

$idxPath = Join-Path $RepoPath 'index.html'
$swPath = Join-Path $RepoPath 'sw.js'

# -- index.html --
$idx = Get-Content $idxPath -Raw -Encoding UTF8

if ($idx -notmatch 'var GC_BASE_URL') {
  $comment = "// Deployment root URL - do not hardcode one disguise app's domain here.`n" +
    "// Each disguise app is deployed at a different domain/path; hardcoding breaks`n" +
    "// push icons/deep-links/manifest for every OTHER app. Compute from the current`n" +
    "// page location instead, so it self-adapts to wherever each copy is deployed.`n" +
    "var GC_BASE_URL = location.origin + location.pathname.replace(/[^/]*`$/, '');`n"
  $idx = $idx -replace [regex]::Escape("var ONESIGNAL_APP_ID"), ($comment + "var ONESIGNAL_APP_ID")
}

$idx = $idx -replace [regex]::Escape("'https://chunhua1780.github.io/ghostchat/'"), 'GC_BASE_URL'
$idx = $idx -replace [regex]::Escape("window.open('https://chunhua1780.github.io/ghostchat/privacy.html','_blank')"), "window.open(GC_BASE_URL+'privacy.html','_blank')"
$idx = $idx -replace [regex]::Escape("='https://chunhua1780.github.io/ghostchat/#from='+encodeURIComponent(String(myId));"), "=GC_BASE_URL+'#from='+encodeURIComponent(String(myId));"
$idx = $idx -replace [regex]::Escape("'https://chunhua1780.github.io/ghostchat/icon192.png'"), "(GC_BASE_URL+'icon192.png')"

$remaining = ([regex]::Matches($idx, 'chunhua1780\.github\.io')).Count
if ($remaining -gt 0) {
  Write-Host "  WARNING: $remaining hardcoded ghostchat URL(s) still remain in index.html - needs manual check" -ForegroundColor Yellow
}

$newVer = $null
if ($idx -match "var CORE_VERSION='v(\d+)\.(\d+)';") {
  $major = $matches[1]; $minor = [int]$matches[2] + 1
  $newVer = "v$major.$minor"
  $idx = $idx -replace "var CORE_VERSION='v\d+\.\d+';", "var CORE_VERSION='$newVer';"
  Write-Host "  CORE_VERSION -> $newVer"
} else {
  Write-Host "  WARNING: CORE_VERSION pattern not found" -ForegroundColor Yellow
}

Set-Content -Path $idxPath -Value $idx -NoNewline -Encoding UTF8

# -- sw.js --
$sw = Get-Content $swPath -Raw -Encoding UTF8
if ($sw -notmatch 'GC_BASE_URL') {
  $sw = $sw -replace "(const CACHE = 'gc-v[\d.]+';)", "`$1`nconst GC_BASE_URL = self.location.origin + self.location.pathname.replace(/[^/]*`$/, '');"
}
$sw = $sw -replace [regex]::Escape("var targetUrl = 'https://chunhua1780.github.io/ghostchat/';"), "var targetUrl = GC_BASE_URL;"
$sw = $sw -replace [regex]::Escape("c.url.indexOf('chunhua1780.github.io/ghostchat')"), "c.url.indexOf(self.location.origin)"
$sw = $sw -replace [regex]::Escape("data: {url: data.url||'https://chunhua1780.github.io/ghostchat/'}"), "data: {url: data.url||GC_BASE_URL}"
if ($newVer) {
  $sw = $sw -replace "const CACHE = 'gc-v[\d.]+';", "const CACHE = 'gc-$newVer';"
}
Set-Content -Path $swPath -Value $sw -NoNewline -Encoding UTF8

Write-Host "  done: $RepoPath"
