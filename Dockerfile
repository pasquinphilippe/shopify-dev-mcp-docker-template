FROM node:18-alpine

# Install Shopify Dev MCP and Supergateway globally
RUN npm i -g @shopify/dev-mcp @latitude-data/supergateway

# Expose the Supergateway HTTP endpoint to bridge the MCP server to HTTP
# This allows clients like N8N to connect via HTTP instead of stdio
CMD sh -c 'npx -y @latitude-data/supergateway --stdio "npx -y @shopify/dev-mcp@latest" --port $PORT --path /mcp'
