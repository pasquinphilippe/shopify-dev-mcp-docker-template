#!/usr/bin/env node

/**
 * HTTP MCP Server for Shopify Dev MCP
 *
 * This server wraps the Shopify Dev MCP server (@shopify/dev-mcp) and exposes it
 * via HTTP endpoints, making it accessible to N8N and other HTTP clients.
 *
 * The server implements the MCP protocol over HTTP using:
 * - SSE (Server-Sent Events) for streaming responses
 * - HTTP POST for sending messages
 */

import { spawn } from "child_process";
import { createServer } from "http";
import { parse } from "url";

const PORT = process.env.PORT || 8080;

// Store active SSE connections by session ID
const connections = new Map();

// Spawn the Shopify Dev MCP server as a child process
const mcpProcess = spawn("npx", ["-y", "@shopify/dev-mcp@latest"], {
  stdio: ["pipe", "pipe", "pipe"]
});

// Handle MCP server stdout (responses from MCP server)
let buffer = "";
mcpProcess.stdout.on("data", (data) => {
  buffer += data.toString();

  // Parse JSON-RPC messages (MCP uses JSON-RPC 2.0)
  const lines = buffer.split("\n");
  buffer = lines.pop() || ""; // Keep incomplete line in buffer

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const message = JSON.parse(line);

      // If message has an id, it's a response - send to the appropriate client
      if (message.id && connections.has(message.id)) {
        const connection = connections.get(message.id);
        if (connection) {
          connection.write(`data: ${JSON.stringify(message)}\n\n`);
        }
        // Clean up one-time requests
        if (!connection.keepAlive) {
          connections.delete(message.id);
        }
      }
    } catch (error) {
      console.error("Error parsing MCP response:", error);
    }
  }
});

// Handle MCP server stderr
mcpProcess.stderr.on("data", (data) => {
  console.error("MCP stderr:", data.toString());
});

// Handle MCP process errors
mcpProcess.on("error", (error) => {
  console.error("Failed to start MCP server:", error);
});

mcpProcess.on("exit", (code) => {
  console.log(`MCP server exited with code ${code}`);
  process.exit(code);
});

/**
 * Create HTTP server
 */
const server = createServer((req, res) => {
  const { pathname, query } = parse(req.url, true);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // SSE endpoint for subscribing to MCP server
  if (pathname === "/sse" || pathname === "/") {
    const sessionId = query.sessionId || `session-${Date.now()}-${Math.random()}`;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Session-Id": sessionId
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      jsonrpc: "2.0",
      method: "mcp/initialized",
      params: {
        sessionId,
        serverInfo: {
          name: "shopify-dev-mcp-http",
          version: "1.0.0"
        }
      }
    })}\n\n`);

    // Store connection
    connections.set(sessionId, {
      write: (data) => res.write(data),
      keepAlive: true
    });

    // Clean up on disconnect
    req.on("close", () => {
      connections.delete(sessionId);
    });

    return;
  }

  // Message endpoint for sending MCP requests
  if (pathname === "/message") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      try {
        const request = JSON.parse(body);

        // Ensure request has an id for tracking
        if (!request.id) {
          request.id = `req-${Date.now()}-${Math.random()}`;
        }

        // Forward request to MCP server via stdin
        mcpProcess.stdin.write(JSON.stringify(request) + "\n");

        // Send acknowledgment
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: { accepted: true }
        }));

      } catch (error) {
        console.error("Error handling message:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
            data: error.message
          }
        }));
      }
    });

    return;
  }

  // Health check endpoint
  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "healthy",
      uptime: process.uptime(),
      connections: connections.size,
      mcpAlive: !mcpProcess.killed
    }));
    return;
  }

  // 404 for all other routes
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, () => {
  console.log(`Shopify Dev MCP HTTP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Message endpoint: http://localhost:${PORT}/message`);
});
