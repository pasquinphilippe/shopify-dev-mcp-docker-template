# N8N Integration Setup for Shopify Dev MCP

Based on the [n8n MCP Client Tool documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp), here's how to configure it with your Shopify Dev MCP server.

## Quick Setup

### Step 1: Add MCP Client Tool Node

In your n8n workflow:
1. Add the **MCP Client Tool** node (under Cluster nodes → Sub-nodes)
2. Click **Test MCP Client** to verify connection

### Step 2: Configure the Connection

**SSE Endpoint:**
```
https://shopify-mcp-dev-nidfy.ondigitalocean.app/sse?apiKey=UTafjWIufSFApp1P3i3HqrRhiXbt9FRae8JLQj7cg1w
```

**Authentication Method:**
- Select **None** (authentication is handled via query parameter in the URL)

OR

If you want to use Bearer authentication:
```
https://shopify-mcp-dev-nidfy.ondigitalocean.app/sse
```

**Authentication:** Bearer Token
**Token:** `UTafjWIufSFApp1P3i3HqrRhiXbt9FRae8JLQj7cg1w`

**Note:** According to n8n documentation, the MCP Client Tool supports "both Bearer and generic header authentication methods."

### Step 3: Select Tools

- **Tools to Include:** Choose **All** to expose all Shopify Dev MCP tools
- Or use **Selected** to pick specific tools like:
  - `search_docs_chunks` - Search Shopify documentation
  - `fetch_full_docs` - Get complete documentation pages
  - `introspect_graphql_schema` - Explore GraphQL schemas
  - `validate_graphql_codeblocks` - Validate GraphQL code

## Available Tools from Shopify Dev MCP

When you select **All**, these tools will be available to your AI Agent:

1. **learn_shopify_api** - Teaches about supported Shopify APIs
2. **search_docs_chunks** - Search across shopify.dev documentation
3. **fetch_full_docs** - Retrieve complete documentation pages
4. **introspect_graphql_schema** - Explore Shopify GraphQL schemas
5. **validate_graphql_codeblocks** - Validate GraphQL code blocks
6. **validate_component_codeblocks** - Validate Shopify component code
7. **validate_theme_codeblocks** - Validate Liquid codeblocks (partial mode)
8. **validate_theme** - Validate entire theme directories

## Troubleshooting

### "Could not connect to your MCP server" Error

This usually means:
1. **Check URL:** Make sure the SSE endpoint URL is correct
2. **Check Authentication:** Verify the API key in the query parameter or Bearer token
3. **Check Server Status:** Visit `https://shopify-mcp-dev-nidfy.ondigitalocean.app/health` to verify the server is running

### Testing the Connection Manually

```bash
# Test SSE endpoint with query parameter (should return initialization message)
curl -N --max-time 3 \
  -H "Accept: text/event-stream" \
  "https://shopify-mcp-dev-nidfy.ondigitalocean.app/sse?apiKey=UTafjWIufSFApp1P3i3HqrRhiXbt9FRae8JLQj7cg1w"

# Expected output:
# data: {"jsonrpc":"2.0","method":"mcp/initialized","params":{"sessionId":"...","serverInfo":{"name":"shopify-dev-mcp-http","version":"1.0.0"}}}
```

## Connect to Your AI Agent

After configuring the MCP Client Tool:
1. Connect it to your **AI Agent** node
2. The agent will now have access to all Shopify documentation and validation tools
3. Your AI can now answer Shopify development questions and validate code

## Reference

- [n8n MCP Client Tool Documentation](https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp)
- [Shopify Dev MCP GitHub Repository](https://github.com/shopify/shopify-dev-mcp)
- Your MCP Server: `https://shopify-mcp-dev-nidfy.ondigitalocean.app`
