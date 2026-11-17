@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist jeton.txt (
  echo Lance d abord "Lancer le bot" une fois pour enregistrer le jeton.
  pause
  exit /b
)
set "RAC=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Bot LinkGeek.vbs"
(echo CreateObject^("WScript.Shell"^).Run """%~dp0bot-invisible.vbs""", 0, False) > "%RAC%"
start "" wscript "%~dp0bot-invisible.vbs"
echo.
echo Le bot tourne maintenant en arriere-plan et demarrera avec Windows.
echo Pour l arreter : double-clique sur "Arreter le bot".
pause
