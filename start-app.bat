@echo off
echo Starting FlashCards App...

:: Start Backend Server in a new window
start "FlashCards Backend" cmd /k "node server.js"

:: Start Frontend Dev Server in the current window
echo Starting Frontend...
npm run dev
