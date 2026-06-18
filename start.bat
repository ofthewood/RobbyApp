@echo off
title Robby Gateway
echo =========================================
echo  Robby Gateway Loader
echo  Running on Port 8010
echo =========================================
echo.
python -m backend.server
if %ERRORLEVEL% neq 0 (
    echo.
    echo An error occurred while running the server.
    pause
)
