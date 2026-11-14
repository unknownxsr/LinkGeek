$ErrorActionPreference = 'SilentlyContinue'
$AppName = 'Linkgeek'
$Dest    = Join-Path $env:LOCALAPPDATA "Programs\$AppName"

Write-Host ''
Write-Host "  ==== Desinstallation de $AppName ====" -ForegroundColor Magenta
Get-Process -Name $AppName | Stop-Process -Force
Start-Sleep -Milliseconds 600

Remove-Item (Join-Path ([Environment]::GetFolderPath('Desktop')) "$AppName.lnk") -Force
Remove-Item (Join-Path ([Environment]::GetFolderPath('Programs')) $AppName) -Recurse -Force
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) "$AppName.lnk") -Force
Remove-Item 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Linkgeek' -Recurse -Force

# Folder removal is deferred so this script (which lives inside it) can exit first.
# Your library data (playtime, favorites) in %APPDATA%\Linkgeek is kept.
Start-Process cmd.exe -ArgumentList "/c timeout /t 2 >nul & rmdir /s /q `"$Dest`"" -WindowStyle Hidden

Write-Host '  Linkgeek a ete desinstalle. Tes statistiques sont conservees dans %APPDATA%\Linkgeek.' -ForegroundColor Green
Write-Host ''
