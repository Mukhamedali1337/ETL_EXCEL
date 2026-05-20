@echo off
echo Stopping pm2 process...
call pm2 stop etl-portal 2>nul
call pm2 delete etl-portal 2>nul

echo Killing any remaining process on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo Killing PID %%a
    taskkill /PID %%a /F 2>nul
)

echo Waiting for port to be released...
timeout /t 4 /nobreak >nul

echo Starting etl-portal...
cd /d C:\apps\etl
call pm2 start src/app.js --name etl-portal
call pm2 save

echo Done.
pause
