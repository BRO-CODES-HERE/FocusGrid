@echo off
taskkill //F //IM node.exe 2>nul
timeout /t 2 /nobreak >nul
cd /c/Users/meena/Desktop/Heck/FocusGrid/server
start /B node src/index.js
timeout /t 3 /nobreak >nul
echo HEALTH:
curl -s http://localhost:5000/api/health
echo.
echo SYNC:
curl -s -X POST http://localhost:5000/api/auth/sync -H "Content-Type: application/json" -H "Authorization: Bearer user1.tok.abc" -d "{\"email\":\"hero@fg.dev\"}"
echo.
echo PROFILE:
curl -s -H "Authorization: Bearer user1.tok.abc" http://localhost:5000/api/profile
echo.
echo TASKS:
curl -s -H "Authorization: Bearer user1.tok.abc" http://localhost:5000/api/tasks
echo.
echo DONE