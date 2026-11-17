@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0arreter.ps1"
echo Bot arrete.
echo Pour qu il ne redemarre plus avec Windows, supprime le fichier :
echo %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Bot LinkGeek.vbs
timeout /t 5 >nul
