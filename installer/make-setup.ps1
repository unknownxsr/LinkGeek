# Builds dist\Linkgeek-Setup (folder + .zip) ready to share or install.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$version = (Get-Content package.json -Raw | ConvertFrom-Json).version
$out = Join-Path $root 'dist\Linkgeek-Setup'
$zip = Join-Path $root "dist\Linkgeek-Setup-$version.zip"

# Bundle the online configuration (Google client + Firebase project) saved in
# this PC's Linkgeek settings, so friends who install this package join the same server.
$onlineCfg = Join-Path $env:APPDATA 'Linkgeek\online-config.json'
$bundled = Join-Path $root 'online-config.json'
if (Test-Path $onlineCfg) { Copy-Item $onlineCfg $bundled -Force; Write-Host 'Online config bundled.' }
elseif (Test-Path $bundled) { Remove-Item $bundled -Force }

Write-Host 'Packaging app (electron-builder --win dir)...'
if (Test-Path "$root\dist\win-unpacked") { Remove-Item -Recurse -Force "$root\dist\win-unpacked" }
npx electron-builder --win dir
if ($LASTEXITCODE -ne 0) { throw 'electron-builder failed' }

if (Test-Path $out) { Remove-Item -Recurse -Force $out }
New-Item -ItemType Directory -Force $out | Out-Null
Copy-Item -Recurse "$root\dist\win-unpacked" (Join-Path $out 'app')
Copy-Item "$root\installer\install.ps1", "$root\installer\uninstall.ps1", "$root\installer\Installer Linkgeek.cmd", "$root\installer\LISEZ-MOI-TESTEURS.txt" $out
Copy-Item "$root\installer\LISEZ-MOI-TESTEURS.txt" (Join-Path $root 'dist') -Force
Copy-Item "$root\assets\icon.ico" $out
if (Test-Path $bundled) { Remove-Item $bundled -Force }   # don't leave it lying in the source folder

if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path "$out\*" -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Done: $out"
Write-Host "      $zip"
