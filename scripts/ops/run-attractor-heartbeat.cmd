@echo off
setlocal
if "%COGENTIA_ATTRACTOR_ENV_FILE%"=="" (
  set "COGENTIA_ATTRACTOR_ENV_FILE=%USERPROFILE%\.cogentia\secrets\attractor-%COMPUTERNAME%.env"
)
node "%~dp0attractor-heartbeat.js"
exit /b %ERRORLEVEL%