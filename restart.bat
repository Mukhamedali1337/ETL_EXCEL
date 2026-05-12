@echo off
echo Stopping pm2 process...
pm2 delete etl-portal 2>nul

echo Killing process on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo Killing PID %%a
    taskkill /PID %%a /F 2>nul
)

echo Starting etl-portal...
cd /d C:\Users\mukhamedali.b\Desktop\etl
pm2 start src/app.js --name etl-portal
pm2 save

echo Done.
pause
