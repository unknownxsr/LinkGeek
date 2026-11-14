@echo off
title Installation de Linkgeek
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 (
  echo.
  echo   L'installation a echoue.
)
pause
