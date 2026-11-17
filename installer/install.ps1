param([switch]$Silent, [switch]$Startup)
$ErrorActionPreference = 'Stop'
$AppName  = 'Linkgeek'
$Src      = Join-Path $PSScriptRoot 'app'
$Version  = '1.0.0'
try { $Version = (Get-Content (Join-Path $Src 'resources\app\package.json') -Raw | ConvertFrom-Json).version } catch { }
$Dest     = Join-Path $env:LOCALAPPDATA "Programs\$AppName"
$Exe      = Join-Path $Dest "$AppName.exe"
$Icon     = Join-Path $Dest 'icon.ico'
$Desktop  = [Environment]::GetFolderPath('Desktop')
$StartDir = Join-Path ([Environment]::GetFolderPath('Programs')) $AppName
$StartupLnk = Join-Path ([Environment]::GetFolderPath('Startup')) "$AppName.lnk"
$RegKey   = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Linkgeek'

function Write-Step($t) { Write-Host "  > $t" -ForegroundColor Cyan }

Write-Host ''
Write-Host "  ==== Installation de $AppName $Version ====" -ForegroundColor Magenta
Write-Host "  Dossier : $Dest"
Write-Host ''

if (-not (Test-Path (Join-Path $Src "$AppName.exe"))) { throw "Fichiers de l'application introuvables dans $Src" }

# Previous name of the app: carry over the startup choice, then remove the old install
$Legacy = 'Nexus Launcher'
$LegacyStartup = Join-Path ([Environment]::GetFolderPath('Startup')) "$Legacy.lnk"
$hadLegacyStartup = Test-Path $LegacyStartup

$DesktopLnk = Join-Path $Desktop "$AppName.lnk"
$alreadyInstalled = Test-Path $Exe
if (-not $Silent) {
  $r = Read-Host '  Creer un raccourci sur le Bureau ? [O/n]'
  $DesktopShortcut = ($r -eq '' -or $r -match '^[oOyY]')
  $r = Read-Host '  Lancer Linkgeek au demarrage de l''ordinateur (suivi du temps de jeu en continu) ? [O/n]'
  $Startup = ($r -eq '' -or $r -match '^[oOyY]')
} else {
  # silent update: keep the user's previous choices (first install: Desktop shortcut yes)
  $DesktopShortcut = (-not $alreadyInstalled) -or (Test-Path $DesktopLnk)
  if (-not $PSBoundParameters.ContainsKey('Startup')) { $Startup = (Test-Path $StartupLnk) -or $hadLegacyStartup }
}

Write-Step 'Fermeture de Linkgeek s''il est ouvert'
Get-Process -Name $AppName, $Legacy -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 600

$LegacyDir = Join-Path $env:LOCALAPPDATA "Programs\$Legacy"
if ((Test-Path $LegacyDir) -or $hadLegacyStartup) {
  Write-Step 'Suppression de l''ancienne version (Nexus Launcher)'
  Remove-Item (Join-Path $Desktop "$Legacy.lnk") -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path ([Environment]::GetFolderPath('Programs')) $Legacy) -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item $LegacyStartup -Force -ErrorAction SilentlyContinue
  Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\NexusLauncher' -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item $LegacyDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Step 'Copie des fichiers'
New-Item -ItemType Directory -Force $Dest | Out-Null
# Keep the 3 files of the install folder's root that are not in the package (full paths: a bare
# "icon.ico" would also skip resources\app\assets\icon.ico, the app's own icon)
robocopy $Src $Dest /MIR /NFL /NDL /NJH /NJS /NP /XF (Join-Path $Dest 'uninstall.ps1') (Join-Path $Dest 'Desinstaller.cmd') (Join-Path $Dest 'icon.ico') | Out-Null
if ($LASTEXITCODE -ge 8) { throw "La copie a echoue (robocopy $LASTEXITCODE)" }
Copy-Item (Join-Path $PSScriptRoot 'icon.ico') $Icon -Force
Copy-Item (Join-Path $PSScriptRoot 'uninstall.ps1') (Join-Path $Dest 'uninstall.ps1') -Force
Set-Content -Path (Join-Path $Dest 'Desinstaller.cmd') -Encoding ASCII -Value "@echo off`r`npowershell.exe -NoProfile -ExecutionPolicy Bypass -File `"%~dp0uninstall.ps1`"`r`npause"

Write-Step 'Creation des raccourcis'
$ws = New-Object -ComObject WScript.Shell
function New-Shortcut($path, $arguments) {
  $sc = $ws.CreateShortcut($path)
  $sc.TargetPath = $Exe; $sc.Arguments = $arguments; $sc.WorkingDirectory = $Dest
  $sc.IconLocation = "$Icon,0"; $sc.Description = $AppName; $sc.Save()
}
New-Item -ItemType Directory -Force $StartDir | Out-Null
if ($DesktopShortcut) { New-Shortcut $DesktopLnk '' } elseif (Test-Path $DesktopLnk) { Remove-Item $DesktopLnk -Force }
New-Shortcut (Join-Path $StartDir "$AppName.lnk") ''
if ($Startup) { New-Shortcut $StartupLnk '--hidden' } elseif (Test-Path $StartupLnk) { Remove-Item $StartupLnk -Force }
# Windows keeps shortcut icons in a cache: ask it to refresh them (new logo shown right away)
try { Start-Process -FilePath "$env:SystemRoot\System32\ie4uinit.exe" -ArgumentList '-show' -WindowStyle Hidden -Wait -ErrorAction Stop } catch { }

Write-Step 'Enregistrement dans Applications installees'
$size = [int]((Get-ChildItem $Dest -Recurse -File | Measure-Object Length -Sum).Sum / 1KB)
New-Item -Path $RegKey -Force | Out-Null
$props = @{
  DisplayName = $AppName; DisplayVersion = $Version; Publisher = 'Zenshyy'
  DisplayIcon = $Icon; InstallLocation = $Dest
  UninstallString = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$Dest\uninstall.ps1`""
}
foreach ($k in $props.Keys) { New-ItemProperty -Path $RegKey -Name $k -Value $props[$k] -PropertyType String -Force | Out-Null }
New-ItemProperty -Path $RegKey -Name EstimatedSize -Value $size -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $RegKey -Name NoModify -Value 1 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $RegKey -Name NoRepair -Value 1 -PropertyType DWord -Force | Out-Null

Write-Host ''
Write-Host "  Installation terminee !" -ForegroundColor Green
if ($Startup) { Write-Host '  Linkgeek demarrera avec Windows (discretement, dans la zone de notification).' }
Write-Host ''
if (-not $Silent) { Start-Process $Exe }
