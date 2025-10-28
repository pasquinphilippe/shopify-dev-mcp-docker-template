FROM node:18-alpine

# Install Shopify Dev MCP globally
RUN npm i -g @shopify/dev-mcp

# Copy server files
COPY server.js /app/server.js
COPY package.json /app/package.json

WORKDIR /app

# Expose the custom HTTP MCP server
EXPOSE 8080

CMD ["node", "server.js"]
