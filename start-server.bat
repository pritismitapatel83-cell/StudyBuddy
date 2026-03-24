@echo off
cd /d %~dp0

echo Starting Backend...
start cmd /k node server.js

echo Starting Frontend...
start cmd /k cd public && npx live-server

pause
