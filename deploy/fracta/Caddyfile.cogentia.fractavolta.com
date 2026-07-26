# Managed public router for Fracta.

# Views Store + Guide/MCP facade
cogentia.fractavolta.com {
	# Public Guide + MCP HTTP (mcp-cogentia.service :8791)
	@mcp path /mcp /sse /tools /tools/* /guide /guide/* /ops/blackboard /ops/blackboard/* /ops/status /ops/dashboard /ops/route/* /ops/edge/* /ops/node/*
	handle @mcp {
		reverse_proxy 127.0.0.1:8791
	}

	# Views Store (explorer, generated views, /api/views, /health)
	handle {
		reverse_proxy localhost:3423
	}
	encode gzip
}

fracta.fractavolta.com {
	respond "Fracta node online" 200
}

rhuma.fractavolta.com {
	reverse_proxy 127.0.0.1:8501
	encode gzip
}

simplijs.fractavolta.com {
	reverse_proxy 127.0.0.1:8080
	encode gzip
}

simpliwiki.fractavolta.com {
	reverse_proxy 127.0.0.1:8081
	encode gzip
}
