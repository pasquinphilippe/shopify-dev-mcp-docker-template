# Shopify Dev MCP Server (HTTP Streamable)

Dockerized Shopify.dev MCP server that exposes an HTTP endpoint for integration with N8N and other HTTP-based clients.

## Features

- **HTTP Streamable**: Access the Shopify Dev MCP server via HTTP instead of stdio
- **N8N Compatible**: Perfect for connecting to N8N workflows
- **Cloud Deployable**: Ready to deploy to Digital Ocean App Platform
- **Supergateway Powered**: Uses Latitude Data's Supergateway to bridge stdio to HTTP

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

Your MCP server will be available at: `https://your-app-url.do/mcp`

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
   - Server URL: `https://your-app-url/mcp`
   - Protocol: HTTP
   - Transport: SSE or HTTP Stream

3. **Use the available tools** in your N8N workflows

## Environment Variables

You can configure the following environment variables in Digital Ocean:

- `PORT` - Port number (default: 8080) - already configured
- `OPT_OUT_INSTRUMENTATION` - Set to "true" to disable telemetry
- `LIQUID_VALIDATION_MODE` - Set to "full" (default) or "partial"

## Local Development

Run locally with Docker:

```bash
docker build -t shopify-dev-mcp .
docker run -p 8080:8080 -e PORT=8080 shopify-dev-mcp
```

Connect to: `http://localhost:8080/mcp`

## Architecture

```
N8N/Client → HTTP → Supergateway → stdio → Shopify Dev MCP
                    (Port 8080)
```

Supergateway bridges the stdio-based MCP protocol to HTTP, making it accessible to web-based clients.
