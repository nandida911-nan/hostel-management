@echo off
title HostelPulse AI Dashboard
cd /d "%~dp0"

echo ========================================================
echo          Starting HostelPulse AI Dashboard
echo ========================================================
echo.
echo 1. Launching your web browser to http://localhost:5000 ...
timeout /t 2 /nobreak >nul
start "" "http://localhost:5000"

echo 2. Starting Multi-Threaded WSGI Production Server...
echo.
echo --------------------------------------------------------
echo   Student Login: student@hostel.edu / student123
echo   Warden Login:  warden@hostel.edu  / admin123
echo --------------------------------------------------------
echo.
echo [NOTE] Keep this window open while using the dashboard.
echo To stop the server, press Ctrl + C or close this window.
echo.

python run_prod.py
pause
