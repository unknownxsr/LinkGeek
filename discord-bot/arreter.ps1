$p = Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq "cmd.exe" -and $_.CommandLine -like "*tourner.cmd*") -or ($_.Name -eq "node.exe" -and $_.CommandLine -like "*bot.js*") }
$p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Write-Host ("Processus arretes : " + @($p).Count)
