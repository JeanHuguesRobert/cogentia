# REMOVED AS OPERATIONAL SOURCE OF TRUTH
#
# Live Caddy configuration on fracta is operational state owned by Operium.
# See:
#   operium/docs/magistral-coding-agent-routing.md  (Guide/MCP vs Views split)
#   operium/decisions/views-store-caddy-service.md
#
# App-side path fragment only:
#   deploy/fracta/Caddyfile.snippet
