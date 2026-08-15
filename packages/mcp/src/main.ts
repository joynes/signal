#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { startHttpServer } from "./httpServer.js"
import { createSignalMcpServer } from "./server.js"

const transport = process.env.MCP_TRANSPORT ?? "stdio"

if (transport === "http") {
  const token = process.env.SIGNAL_MCP_TOKEN
  if (token === undefined) {
    throw new Error("SIGNAL_MCP_TOKEN is required when MCP_TRANSPORT=http")
  }
  const running = await startHttpServer({
    token,
    host: process.env.HOST,
    port: process.env.PORT === undefined ? undefined : Number(process.env.PORT),
    artifactDirectory: process.env.SIGNAL_ARTIFACT_DIR,
    sessionTtlMs:
      process.env.SIGNAL_SESSION_TTL_MS === undefined
        ? undefined
        : Number(process.env.SIGNAL_SESSION_TTL_MS),
    maxSessions:
      process.env.SIGNAL_MAX_SESSIONS === undefined
        ? undefined
        : Number(process.env.SIGNAL_MAX_SESSIONS),
    maxRenderSeconds:
      process.env.SIGNAL_MAX_RENDER_SECONDS === undefined
        ? undefined
        : Number(process.env.SIGNAL_MAX_RENDER_SECONDS),
    maxConcurrentRenders:
      process.env.SIGNAL_MAX_CONCURRENT_RENDERS === undefined
        ? undefined
        : Number(process.env.SIGNAL_MAX_CONCURRENT_RENDERS),
  })
  console.log(`Signal headless MCP listening at ${running.url}/mcp`)
} else if (transport === "stdio") {
  const server = createSignalMcpServer({ allowLocalFiles: true })
  await server.connect(new StdioServerTransport())
} else {
  throw new Error("MCP_TRANSPORT must be stdio or http")
}
