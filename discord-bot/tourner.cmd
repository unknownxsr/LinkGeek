@echo off
cd /d "%~dp0"
:boucle
node bot.js >> bot.log 2>&1
timeout /t 15 /nobreak >nul
goto boucle
