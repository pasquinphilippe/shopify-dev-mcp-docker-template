# N8N Integration Guide

This guide explains how to connect N8N to the Shopify Dev MCP HTTP Server.

## Server Endpoints

- **SSE Endpoint**: `https://shopify-mcp-dev-nidfy.ondigitalocean.app/sse`
- **Message Endpoint**: `https://shopify-mcp-dev-nidfy.ondigitalocean.app/message`
- **Health Endpoint**: `https://shopify-mcp-dev-nidfy.ondigitalocean.app/health`

## N8N Configuration

### Option 1: Using HTTP Request Nodes

Since N8N supports SSE (Server-Sent Events) in newer versions, you can use it to connect to the MCP server:

1. **Create an SSE Connection Node**
   - Add an HTTP Request node
   - Method: GET
   - URL: `https://shopify-mcp-dev-nidfy.ondigitalocean.app/sse`
   - Options → Response → Response Format: `Stream`
   - Options → Response → Include Response Headers: `Yes`
   - Headers (if API_KEY is configured):
     - `Authorization`: `Bearer YOUR_API_KEY`

2. **Send MCP Messages**
   - Add another HTTP Request node
   - Method: POST
   - URL: `https://shopify-mcp-dev-nidfy.ondigitalocean.app/message`
   - Headers:
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer YOUR_API_KEY` (if API_KEY is configured)
   - Body (JSON):
     ```json
     {
       "jsonrpc": "2.0",
       "id": "{{ $json.id }}",
       "method": "tools/call",
       "params": {
         "name": "search_docs_chunks",
         "arguments": {
           "query": "how to create a product"
         }
       }
     }
     ```

## Example MCP Message Format

### Initialize Connection
```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "id": 1
}
```

### Search Shopify Docs
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_docs_chunks",
    "arguments": {
      "query": "shopify graphql products"
    }
  }
}
```

### List Available Tools
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/list"
}
```

## Available Tools

The Shopify Dev MCP server provides these tools:

- `learn_shopify_api` - Learn about Shopify APIs
- `search_docs_chunks` - Search Shopify documentation
- `fetch_full_docs` - Get complete documentation pages
- `introspect_graphql_schema` - Explore GraphQL schemas
- `validate_graphql_codeblocks` - Validate GraphQL code
- `validate_component_codeblocks` - Validate Shopify components
- `validate_theme_codeblocks` - Validate Liquid codeblocks
- `validate_theme` - Validate entire theme directories

## Example Workflow

```
┌─────────────────┐
│   Webhook       │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  HTTP Request   │
│  GET /sse       │ (Listen for MCP responses)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  HTTP Request   │
│  POST /message  │ (Send MCP requests)
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Function Node  │ (Process MCP responses)
└─────────────────┘
```

## Testing the Connection

You can test the server manually with curl:

### 1. Subscribe to SSE stream:
```bash
curl -N -H "Accept: text/event-stream" \
  https://shopify-mcp-dev-nidfy.ondigitalocean.app/sse
```

### 2. Send a message in another terminal:
```bash
curl -X POST \
  https://shopify-mcp-dev-nidfy.ondigitalocean.app/message \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### 3. Check server health:
```bash
curl https://shopify-mcp-dev-nidfy.ondigitalocean.app/health
```

## Response Format

MCP responses follow the JSON-RPC 2.0 protocol:

### Success Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [...]
  }
}
```

### Error Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

## Troubleshooting

### Connection Issues
- Ensure the health endpoint returns "OK"
- Check that SSE endpoint returns HTTP 200 with `text/event-stream` content type

### No Responses
- Verify message IDs are unique
- Check that SSE connection is established before sending messages
- Ensure proper Content-Type header (`application/json`)

### Timeout Errors
- The server maintains long-lived SSE connections
- Some tools may take time to respond (e.g., fetching full docs)
- Increase timeout settings in N8N if needed
