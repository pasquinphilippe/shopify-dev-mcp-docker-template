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

// Authentication
const API_KEY = process.env.API_KEY;
const ENABLE_AUTH = API_KEY && API_KEY.length > 0;

// Store active SSE connections by session ID and request IDs
const connections = new Map();
const requestMap = new Map(); // Map request IDs to SSE connections

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
      
      // If message has an id, route to the appropriate SSE connection
      if (message.id && requestMap.has(message.id)) {
        const connectionId = requestMap.get(message.id);
        const connection = connections.get(connectionId);
        if (connection) {
          console.log(`Routing response ${message.id} to session ${connectionId}`);
          connection.write(`data: ${JSON.stringify(message)}\n\n`);
        } else {
          console.log(`Warning: Connection ${connectionId} not found for response ${message.id}`);
        }
        requestMap.delete(message.id);
      } else if (message.id) {
        console.log(`Warning: No mapped connection for response ${message.id}`);
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
 * Authentication middleware
 */
function authenticate(req, query) {
  if (!ENABLE_AUTH) return true;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token === API_KEY) return true;
  }

  // Check query parameter
  if (query.apiKey && query.apiKey === API_KEY) {
    return true;
  }

  return false;
}

/**
 * Send unauthorized response
 */
function sendUnauthorized(res) {
  res.writeHead(401, {
    "Content-Type": "application/json",
    "WWW-Authenticate": "Bearer realm=\"MCP Server\""
  });
  res.end(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32001,
      message: "Unauthorized",
      data: "API key required"
    }
  }));
}

/**
 * Create HTTP server
 */
const server = createServer((req, res) => {
  const { pathname, query } = parse(req.url, true);

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  // Skip authentication for health check
  if (pathname === "/health") {
    // Continue to health endpoint handling
  } else if (!authenticate(req, query)) {
    sendUnauthorized(res);
    return;
  }

  // HTTP Stream endpoint for bidirectional communication
  if (pathname === "/stream" && req.method === "PUT") {
    const sessionId = query.sessionId || `stream-${Date.now()}-${Math.random()}`;

    res.writeHead(200, {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Transfer-Encoding": "chunked"
    });

    // Store connection
    connections.set(sessionId, {
      write: (data) => res.write(data + "\n"),
      keepAlive: true
    });

    // Send initial connection message
    res.write(JSON.stringify({
      jsonrpc: "2.0",
      method: "mcp/initialized",
      params: {
        sessionId,
        serverInfo: {
          name: "shopify-dev-mcp-http",
          version: "1.0.0",
          transport: "http-stream"
        }
      }
    }) + "\n");

    // Handle incoming messages from client
    let buffer = "";
    req.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const request = JSON.parse(line);
          // Forward to MCP server
          mcpProcess.stdin.write(JSON.stringify(request) + "\n");
        } catch (error) {
          console.error("Error parsing stream request:", error);
        }
      }
    });

    // Clean up on disconnect
    req.on("close", () => {
      connections.delete(sessionId);
    });

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

    // Store connection
    connections.set(sessionId, {
      write: (data) => res.write(data),
      keepAlive: true
    });

    // Clean up on disconnect
    req.on("close", () => {
      connections.delete(sessionId);
      // Clean up any pending requests for this session
      for (const [reqId, connId] of requestMap.entries()) {
        if (connId === sessionId) {
          requestMap.delete(reqId);
        }
      }
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
        
        // Get session from query or headers
        const sessionId = query.sessionId || req.headers["x-session-id"];

        // Ensure request has an id for tracking
        if (!request.id) {
          request.id = `req-${Date.now()}-${Math.random()}`;
        }

      // Map request ID to session for response routing
      if (sessionId && connections.has(sessionId)) {
        requestMap.set(request.id, sessionId);
        console.log(`Mapped request ${request.id} to session ${sessionId}`);
      } else {
        console.log(`Warning: No session found for request ${request.id}`);
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
  console.log(`HTTP Stream endpoint: http://localhost:${PORT}/stream (PUT) - Recommended`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse (GET) - Legacy`);
  console.log(`Message endpoint: http://localhost:${PORT}/message (POST) - For SSE`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  if (ENABLE_AUTH) {
    console.log("🔐 Authentication: ENABLED");
  } else {
    console.log("⚠️  Authentication: DISABLED (set API_KEY to enable)");
  }
});
