# Shopify Dev MCP Server (HTTP Streamable)

Dockerized Shopify.dev MCP server that exposes an HTTP endpoint for integration with N8N and other HTTP-based clients.

## Features

- **HTTP Streamable**: Access the Shopify Dev MCP server via HTTP instead of stdio
- **N8N Compatible**: Perfect for connecting to N8N workflows
- **Cloud Deployable**: Ready to deploy to Digital Ocean App Platform
- **Custom HTTP Server**: Custom Node.js server that wraps the Shopify Dev MCP
- **Real-time Communication**: Uses SSE (Server-Sent Events) for streaming responses

## Quick Start

### Deploy to Digital Ocean

1. **Authenticate with Digital Ocean:**
   ```bash
   doctl auth init
   ```

2. **Deploy the app:**
   ```bash
   doctl apps create --spec .do/app.yaml
   ```

3. **Get your app URL:**
   ```bash
   doctl apps get <app-id> --format Domains
   ```

Your MCP server will be available at:
- **SSE endpoint**: `https://your-app-url.do/sse` - Server-Sent Events for subscribing to responses
- **Message endpoint**: `https://your-app-url.do/message` - Send MCP requests
- **Health endpoint**: `https://your-app-url.do/health` - Check server status

## Available Tools

This MCP server provides access to all Shopify development tools:

- `learn_shopify_api` - Teaches about supported Shopify APIs
- `search_docs_chunks` - Search across shopify.dev documentation
- `fetch_full_docs` - Retrieve complete documentation pages
- `introspect_graphql_schema` - Explore Shopify GraphQL schemas
- `validate_graphql_codeblocks` - Validate GraphQL code blocks
- `validate_component_codeblocks` - Validate Shopify component code
- `validate_theme_codeblocks` - Validate Liquid codeblocks (partial mode)
- `validate_theme` - Validate entire theme directories

## Connecting to N8N

After deploying, configure N8N to connect to your MCP server:

1. **Get your deployed app URL** (e.g., `https://shopify-mcp-server-xyz.ondigitalocean.app`)

2. **Add the MCP Server configuration in N8N:**
   - Server URL: `https://your-app-url/sse`
   - Protocol: HTTP
   - Transport: SSE (Server-Sent Events)

3. **Use the available tools** in your N8N workflows

## Environment Variables

You can configure the following environment variables in Digital Ocean:

- `PORT` - Port number (default: 8080) - already configured
- `API_KEY` - (Optional) API key for authentication. If not set, the server runs without authentication
- `OPT_OUT_INSTRUMENTATION` - Set to "true" to disable Shopify Dev MCP telemetry
- `LIQUID_VALIDATION_MODE` - Set to "full" (default) or "partial"

### Authentication

The server supports optional API key authentication via:
1. **Authorization Header**: `Authorization: Bearer <API_KEY>`
2. **Query Parameter**: `?apiKey=<API_KEY>`

Example with auth:
```bash
# Using Authorization header
curl -H "Authorization: Bearer your-api-key" \
  https://your-app-url/sse

# Using query parameter (for SSE)
curl https://your-app-url/sse?apiKey=your-api-key
```

## Local Development

Run locally with Node.js:

```bash
npm start
```

Or with Docker:

```bash
docker build -t shopify-dev-mcp .
docker run -p 8080:8080 -e PORT=8080 shopify-dev-mcp
```

Connect to:
- SSE: `http://localhost:8080/sse` - Subscribe to MCP responses
- Message: `http://localhost:8080/message` - Send MCP requests
- Health: `http://localhost:8080/health` - Check status

## Architecture

```
N8N/Client → HTTP → Custom HTTP Server → stdio → Shopify Dev MCP
                         (Node.js)         (Port 8080)
```

The custom Node.js server:
1. Spawns the Shopify Dev MCP server as a child process
2. Bridges stdio communication to HTTP endpoints
3. Implements JSON-RPC 2.0 protocol over HTTP
4. Uses SSE for real-time streaming responses
5. Handles message routing between multiple clients
