@echo off
title Kashevi Barbershop - Servidor Node.js
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Iniciando Kashevi Barbershop en http://localhost:3000 ...
node server.js
pause
