@echo off
setlocal
if "%AGENT_GATEWAY_ENV_FILE%"=="" (
  set "AGENT_GATEWAY_ENV_FILE=%USERPROFILE%\.cogentia\secrets\agent-gateway.env"
)
if "%AGENT_GATEWAY_ATTRACTOR_ENV_FILE%"=="" (
  set "AGENT_GATEWAY_ATTRACTOR_ENV_FILE=%USERPROFILE%\.cogentia\secrets\agent-gateway-blackboard.env"
)
node "%~dp0agent-gateway-heartbeat.js"
exit /b %ERRORLEVEL%