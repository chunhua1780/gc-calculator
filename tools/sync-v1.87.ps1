<#
Mechanical sync of the v1.86 (hardcoded URL / SW cache) + v1.87 (logout modal,
font size, 00000000 switch-account, disguise-flash fix) changes out to a
sibling repo. Reuses the same GC_BASE_URL fix as fix-hardcoded-urls.ps1 plus
the newer changes. Reports anything that didn't match so it can be handled
by hand (or a fresh agent) instead of silently skipping.
#>
param([Parameter(Mandatory=$true)][string]$RepoPath)

$idxPath = Join-Path $RepoPath 'index.html'
$swPath = Join-Path $RepoPath 'sw.js'
$idx = (Get-Content $idxPath -Raw -Encoding UTF8) -replace "`r`n", "`n"
$misses = @()

# -- v1.86: GC_BASE_URL instead of hardcoded ghostchat URL --
if ($idx -notmatch 'var GC_BASE_URL') {
  $comment = "// Deployment root URL - do not hardcode one disguise app's domain here.`n" +
    "// Each disguise app is deployed at a different domain/path; hardcoding breaks`n" +
    "// push icons/deep-links/manifest for every OTHER app. Compute from the current`n" +
    "// page location instead, so it self-adapts to wherever each copy is deployed.`n" +
    "var GC_BASE_URL = location.origin + location.pathname.replace(/[^/]*`$/, '');`n"
  if ($idx -match [regex]::Escape("var ONESIGNAL_APP_ID")) {
    $idx = $idx -replace [regex]::Escape("var ONESIGNAL_APP_ID"), ($comment + "var ONESIGNAL_APP_ID")
  } else { $misses += "ONESIGNAL_APP_ID anchor (for GC_BASE_URL insert)" }
}
$before = $idx
$idx = $idx -replace [regex]::Escape("'https://chunhua1780.github.io/ghostchat/'"), 'GC_BASE_URL'
$idx = $idx -replace [regex]::Escape("window.open('https://chunhua1780.github.io/ghostchat/privacy.html','_blank')"), "window.open(GC_BASE_URL+'privacy.html','_blank')"
$idx = $idx -replace [regex]::Escape("='https://chunhua1780.github.io/ghostchat/#from='+encodeURIComponent(String(myId));"), "=GC_BASE_URL+'#from='+encodeURIComponent(String(myId));"
$idx = $idx -replace [regex]::Escape("'https://chunhua1780.github.io/ghostchat/icon192.png'"), "(GC_BASE_URL+'icon192.png')"
$remaining = ([regex]::Matches($idx, 'chunhua1780\.github\.io')).Count
if ($remaining -gt 0) { $misses += "$remaining hardcoded ghostchat URL(s) still remain" }

# -- v1.87: reg is no longer default-active; dcalc is --
if ($idx -match '<div id="reg" class="screen active">') {
  $idx = $idx -replace '<div id="reg" class="screen active">', '<div id="reg" class="screen">'
} elseif ($idx -notmatch '<div id="reg" class="screen">') { $misses += "reg default-active swap" }
if ($idx -match [regex]::Escape('<div id="dcalc" class="screen" style="background:#000;flex-direction:column;overflow:hidden;">')) {
  $idx = $idx -replace [regex]::Escape('<div id="dcalc" class="screen" style="background:#000;flex-direction:column;overflow:hidden;">'), '<div id="dcalc" class="screen active" style="background:#000;flex-direction:column;overflow:hidden;">'
} elseif ($idx -notmatch '<div id="dcalc" class="screen active"') { $misses += "dcalc default-active swap" }

# -- v1.87: logout modal (HTML) --
if ($idx -notmatch 'id="logoutConfirmModal"') {
  $recallModalEnd = @'
<div id="recallModal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:750;display:none;align-items:center;justify-content:center;">
  <div style="background:var(--theme-field-bg,#fff);border-radius:18px;padding:22px;text-align:center;width:220px;box-shadow:0 20px 50px rgba(0,0,0,.25);">
    <div style="font-size:17px;font-weight:700;margin-bottom:18px;color:var(--theme-text);">撤回？</div>
    <div style="display:flex;gap:8px;">
      <button onclick="closeRecallModal()" style="flex:1;background:var(--theme-row-bg,#f2f2f7);color:var(--theme-text);border:none;padding:10px 0;border-radius:12px;font-size:15px;cursor:pointer;">取消</button>
      <button onclick="confirmRecall()" style="flex:1;background:linear-gradient(135deg,var(--theme-accent1),var(--theme-accent2));color:#fff;border:none;padding:10px 0;border-radius:12px;font-size:15px;cursor:pointer;">确定</button>
    </div>
  </div>
</div>
'@
  $logoutModal = @'
<div id="recallModal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:750;display:none;align-items:center;justify-content:center;">
  <div style="background:var(--theme-field-bg,#fff);border-radius:18px;padding:22px;text-align:center;width:220px;box-shadow:0 20px 50px rgba(0,0,0,.25);">
    <div style="font-size:17px;font-weight:700;margin-bottom:18px;color:var(--theme-text);">撤回？</div>
    <div style="display:flex;gap:8px;">
      <button onclick="closeRecallModal()" style="flex:1;background:var(--theme-row-bg,#f2f2f7);color:var(--theme-text);border:none;padding:10px 0;border-radius:12px;font-size:15px;cursor:pointer;">取消</button>
      <button onclick="confirmRecall()" style="flex:1;background:linear-gradient(135deg,var(--theme-accent1),var(--theme-accent2));color:#fff;border:none;padding:10px 0;border-radius:12px;font-size:15px;cursor:pointer;">确定</button>
    </div>
  </div>
</div>

<div id="logoutConfirmModal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:750;display:none;align-items:center;justify-content:center;">
  <div style="background:var(--theme-field-bg,#fff);border-radius:18px;padding:22px;text-align:center;width:260px;box-shadow:0 20px 50px rgba(0,0,0,.25);">
    <div style="font-size:17px;font-weight:700;margin-bottom:8px;color:var(--theme-text);">确定退出登录？</div>
    <div style="font-size:13px;color:#8e8e93;margin-bottom:18px;">退出后需要重新输入密码才能登录</div>
    <div style="display:flex;gap:8px;">
      <button onclick="document.getElementById('logoutConfirmModal').style.display='none'" style="flex:1;background:var(--theme-row-bg,#f2f2f7);color:var(--theme-text);border:none;padding:10px 0;border-radius:12px;font-size:15px;cursor:pointer;">取消</button>
      <button onclick="_doLogoutConfirmed()" style="flex:1;background:#ff3b30;color:#fff;border:none;padding:10px 0;border-radius:12px;font-size:15px;cursor:pointer;">确定退出</button>
    </div>
  </div>
</div>
'@
  if ($idx -match [regex]::Escape($recallModalEnd)) {
    $idx = $idx -replace [regex]::Escape($recallModalEnd), $logoutModal
  } else { $misses += "recallModal anchor (for logout modal insert)" }
}

# -- v1.87: doLogout() -> modal-based confirm --
$oldLogoutFn = "async function doLogout(){`n  if(!confirm('确定退出登录？\n\n退出后需要重新输入密码才能登录。'))return;`n"
$newLogoutFn = "function doLogout(){`n  // 原生 confirm() 在打包成 Cordova/WebView App 时不可靠（部分设备直接不弹或静默返回false），`n  // 会导致这里第一行就直接 return，退出登录看起来完全没反应。改用App自己的弹窗。`n  var m=document.getElementById('logoutConfirmModal');`n  if(m)m.style.display='flex';`n}`nasync function _doLogoutConfirmed(){`n  var m=document.getElementById('logoutConfirmModal');`n  if(m)m.style.display='none';`n"
if ($idx -match [regex]::Escape("if(!confirm('确定退出登录")) {
  if ($idx -match [regex]::Escape($oldLogoutFn)) {
    $idx = $idx -replace [regex]::Escape($oldLogoutFn), $newLogoutFn
  } else { $misses += "doLogout() body didn't match exactly (confirm() call present but surrounding text differs)" }
} elseif ($idx -notmatch 'function _doLogoutConfirmed') { $misses += "doLogout() confirm() call not found at all" }

# -- v1.87: 00000000 switch-account code in the calculator PIN check --
$oldPinCheck = "    var gatePin=(lg('testGatePin')||TEST_GATE_DEFAULT).replace(/[^0-9]/g,'');`n    // 密码匹配：进入App`n    if(entered&&(entered===pin||entered===gatePin)){"
$newPinCheck = @'
    var gatePin=(lg('testGatePin')||TEST_GATE_DEFAULT).replace(/[^0-9]/g,'');
    // 特殊码 00000000：始终跳到登录/注册页（切换账号用），不管当前是否已登录。
    // show('reg') 本身在已登录时会被安全守卫拦截（防止意外跳回注册页），
    // 所以这里走和"退出登录"完全一样的清理流程，清完凭据后 reload 自然落到 reg，不会撞上守卫。
    if(entered==='00000000'){
      CALC.buf='';CALC.op='';CALC.prev='';CALC.result=null;
      var elz=document.getElementById('cNum');if(elz)elz.textContent='0';
      if(expr)expr.textContent='';
      window._gcDisguiseMode=false;
      if(lg('registered')==='true'&&lg('myId')){
        _doLogoutConfirmed();
      }else{
        ls('gatePassedPersist','1');
        sessionStorage.setItem('testGatePassed','1');
        show('reg');
      }
      return;
    }
    // 密码匹配：进入App
    if(entered&&(entered===pin||entered===gatePin)){
'@
if ($idx -match [regex]::Escape($oldPinCheck)) {
  $idx = $idx -replace [regex]::Escape($oldPinCheck), $newPinCheck
} elseif ($idx -notmatch "entered==='00000000'") { $misses += "calculator PIN-check anchor (for 00000000 insert)" }

# -- v1.87: font size setting UI (anchor: end of theme drawer, before language row - universal, doesn't need chat-style feature) --
if ($idx -notmatch 'id="fontSizeGrid"') {
  if ($idx -match '(<div id="themeDrawer"[^\n]*</div>)\r?\n(\s*<!-- 语言 -->)') {
    $fontSizeBlock = "`$1`n      <!-- 字体大小 -->`n      <div style=`"border-top:1px solid var(--theme-border);padding:14px 16px 12px;`">`n        <div style=`"font-size:17px;margin-bottom:10px;`">字体大小</div>`n        <div id=`"fontSizeGrid`" style=`"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;`"></div>`n      </div>`n`$2"
    $idx = $idx -replace '(<div id="themeDrawer"[^\n]*</div>)\r?\n(\s*<!-- 语言 -->)', $fontSizeBlock
  } else { $misses += "themeDrawer anchor (for font size UI insert)" }
}

# -- v1.87: font size JS (anchor: end of toggleChatStyleDrawer, universal since that function itself is only in some repos - fallback to end of applyChatStyle-less repos: anchor on _buildFontSizeGrid absence + look for a stable universal anchor instead: right before "function gt(){" (timestamp helper), which is universal) --
if ($idx -notmatch 'function applyFontSize') {
  $fontSizeJs = @'
// -- font size --
var _FONT_SIZES=[
  {id:'sm',name:'小',px:13.5},
  {id:'md',name:'标准',px:15.5},
  {id:'lg',name:'大',px:17.5},
  {id:'xl',name:'超大',px:19.5}
];
function applyFontSize(id){
  var s=_FONT_SIZES.filter(function(x){return x.id===id;})[0]||_FONT_SIZES[1];
  var chat=document.getElementById('chat');
  if(chat)chat.style.setProperty('--chat-font-size',s.px+'px');
  ls('chatFontSize',s.id);
  _buildFontSizeGrid();
}
function _buildFontSizeGrid(){
  var g=document.getElementById('fontSizeGrid');
  if(!g)return;
  var cur=lg('chatFontSize')||'md';
  g.innerHTML='';
  _FONT_SIZES.forEach(function(s){
    var sel=s.id===cur;
    var d=document.createElement('div');
    d.style.cssText='cursor:pointer;border-radius:12px;padding:10px 4px;text-align:center;background:var(--theme-row-bg);border:2px solid '+(sel?'var(--theme-accent1)':'transparent')+';-webkit-tap-highlight-color:transparent;';
    d.innerHTML='<div style="font-weight:'+(sel?'700':'400')+';color:var(--theme-text);font-size:'+s.px+'px;">A</div>'+
      '<div style="font-size:11px;color:#8e8e93;margin-top:4px;">'+s.name+'</div>';
    (function(sid){d.onclick=function(){applyFontSize(sid);};})(s.id);
    g.appendChild(d);
  });
}
(function(){var _f=lg('chatFontSize');if(_f&&_f!=='md'){var _s=_FONT_SIZES.filter(function(x){return x.id===_f;})[0];if(_s){var _ce=document.getElementById('chat');if(_ce)_ce.style.setProperty('--chat-font-size',_s.px+'px');}}})();

'@
  if ($idx -match '(?m)^function gt\(\)\{') {
    $idx = $idx -replace '(?m)^function gt\(\)\{', ($fontSizeJs + 'function gt(){')
  } else { $misses += "gt() anchor (for font size JS insert)" }
}
# make sure the settings show() handler builds the font size grid too
if ($idx -match "_buildChatStyleGrid\(\);" -and $idx -notmatch "_buildFontSizeGrid\(\);") {
  $idx = $idx -replace [regex]::Escape("_buildChatStyleGrid();}"), "_buildChatStyleGrid();_buildFontSizeGrid();}"
} elseif ($idx -match "_updateChatStyleHeader\(lg\('chatStyle'\)\|\|'default'\);" -and $idx -notmatch "_buildFontSizeGrid\(\);") {
  $idx = $idx -replace [regex]::Escape("_updateChatStyleHeader(lg('chatStyle')||'default');}"), "_updateChatStyleHeader(lg('chatStyle')||'default');_buildFontSizeGrid();}"
} elseif ($idx -notmatch "_buildFontSizeGrid\(\);") {
  if ($idx -match "AdManager\._updateConsentUI\(\);\}") {
    $idx = $idx -replace [regex]::Escape("AdManager._updateConsentUI();}"), "AdManager._updateConsentUI();_buildFontSizeGrid();}"
  } else { $misses += "show(id) settings-init anchor (for _buildFontSizeGrid() wiring)" }
}

# -- font-size CSS var in .bub rules --
# newer redesigned repos (v1.81+ bubble redesign)
if ($idx -match [regex]::Escape("font-size:15.5px;line-height:1.5;word-break:break-word;")) {
  $idx = $idx -replace [regex]::Escape("font-size:15.5px;line-height:1.5;word-break:break-word;"), "font-size:var(--chat-font-size,15.5px);line-height:1.5;word-break:break-word;"
  $idx = $idx -replace [regex]::Escape("font-size:15.5px;line-height:1.5;}"), "font-size:var(--chat-font-size,15.5px);line-height:1.5;}"
}
# older repos that never got that redesign - plain .bub{...font-size:16px;...}
elseif ($idx -match [regex]::Escape("font-size:16px;line-height:1.45;word-break:break-word;")) {
  $idx = $idx -replace [regex]::Escape("font-size:16px;line-height:1.45;word-break:break-word;"), "font-size:var(--chat-font-size,16px);line-height:1.45;word-break:break-word;"
}
else { $misses += ".bub base font-size rule (neither known pattern matched)" }

# -- version bump --
$newVer = $null
if ($idx -match "var CORE_VERSION='v(\d+)\.(\d+)';") {
  $major = $matches[1]; $minor = [int]$matches[2] + 1
  $newVer = "v$major.$minor"
  $idx = $idx -replace "var CORE_VERSION='v\d+\.\d+';", "var CORE_VERSION='$newVer';"
} else { $misses += "CORE_VERSION pattern not found" }

$idx = $idx -replace "`n", "`r`n"
Set-Content -Path $idxPath -Value $idx -NoNewline -Encoding UTF8

# -- sw.js (same as before) --
$sw = (Get-Content $swPath -Raw -Encoding UTF8) -replace "`r`n", "`n"
if ($sw -notmatch 'GC_BASE_URL') {
  $sw = $sw -replace "(const CACHE = 'gc-v[\d.]+';)", "`$1`nconst GC_BASE_URL = self.location.origin + self.location.pathname.replace(/[^/]*`$/, '');"
}
$sw = $sw -replace [regex]::Escape("var targetUrl = 'https://chunhua1780.github.io/ghostchat/';"), "var targetUrl = GC_BASE_URL;"
$sw = $sw -replace [regex]::Escape("c.url.indexOf('chunhua1780.github.io/ghostchat')"), "c.url.indexOf(self.location.origin)"
$sw = $sw -replace [regex]::Escape("data: {url: data.url||'https://chunhua1780.github.io/ghostchat/'}"), "data: {url: data.url||GC_BASE_URL}"
if ($newVer) { $sw = $sw -replace "const CACHE = 'gc-v[\d.]+';", "const CACHE = 'gc-$newVer';" }
$sw = $sw -replace "`n", "`r`n"
Set-Content -Path $swPath -Value $sw -NoNewline -Encoding UTF8

if ($misses.Count -gt 0) {
  Write-Host "  MISSES for $RepoPath :" -ForegroundColor Yellow
  $misses | ForEach-Object { Write-Host "    - $_" -ForegroundColor Yellow }
} else {
  Write-Host "  clean: $RepoPath (CORE_VERSION -> $newVer)"
}
