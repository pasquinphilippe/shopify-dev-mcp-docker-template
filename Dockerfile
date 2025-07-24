FROM node:18-alpine
RUN npm i -g @shopify/dev-mcp @latitude-data/supergateway
CMD sh -c 'npx -y @latitude-data/supergateway --stdio "npx -y @shopify/dev-mcp@latest" --port $PORT'
