import { randomUUID, timingSafeEqual } from "node:crypto"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { createServer, IncomingMessage, ServerResponse } from "node:http"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { createSignalMcpServer } from "./server.js"

type Artifact = {
  filePath: string
  sessionId: string
  contentType: string
  fileName: string
}

type Session = {
  id: string
  lastAccess: number
  transport: StreamableHTTPServerTransport
  server: ReturnType<typeof createSignalMcpServer>
}

export type HttpServerOptions = {
  host?: string
  port?: number
  token: string
  artifactDirectory?: string
  sessionTtlMs?: number
  maxSessions?: number
  maxRenderSeconds?: number
  maxConcurrentRenders?: number
  maxRequestBytes?: number
}

const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  response.end(JSON.stringify(value))
}

const mcpError = (response: ServerResponse, status: number, message: string) =>
  json(response, status, {
    jsonrpc: "2.0",
    error: { code: -32000, message },
    id: null,
  })

const header = (request: IncomingMessage, name: string) => {
  const value = request.headers[name]
  return Array.isArray(value) ? value[0] : value
}

const authorized = (request: IncomingMessage, token: string) => {
  const authorization = header(request, "authorization") ?? ""
  const provided = Buffer.from(
    authorization.startsWith("Bearer ") ? authorization.slice(7) : "",
  )
  const expected = Buffer.from(token)
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  )
}

const readJson = async (request: IncomingMessage, maxBytes: number) => {
  const chunks: Buffer[] = []
  let byteLength = 0
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk)
    byteLength += bytes.byteLength
    if (byteLength > maxBytes) throw new Error("Request body is too large")
    chunks.push(bytes)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown
}

export const startHttpServer = async (options: HttpServerOptions) => {
  if (options.token.length < 16) {
    throw new Error("SIGNAL_MCP_TOKEN must contain at least 16 characters")
  }

  const host = options.host ?? "0.0.0.0"
  const port = options.port ?? 3000
  const artifactDirectory = resolve(
    options.artifactDirectory ?? join(tmpdir(), "signal-mcp-artifacts"),
  )
  const sessionTtlMs = options.sessionTtlMs ?? 60 * 60_000
  const maxSessions = options.maxSessions ?? 100
  const maxRenderSeconds = options.maxRenderSeconds ?? 300
  const maxConcurrentRenders = options.maxConcurrentRenders ?? 2
  const maxRequestBytes = options.maxRequestBytes ?? 16 * 1024 * 1024
  const sessions = new Map<string, Session>()
  const artifacts = new Map<string, Artifact>()
  let activeRenders = 0
  await mkdir(artifactDirectory, { recursive: true })

  const removeSession = async (sessionId: string) => {
    const session = sessions.get(sessionId)
    sessions.delete(sessionId)
    for (const [artifactId, artifact] of artifacts) {
      if (artifact.sessionId === sessionId) artifacts.delete(artifactId)
    }
    await rm(join(artifactDirectory, sessionId), {
      recursive: true,
      force: true,
    })
    await session?.server.close().catch(() => undefined)
  }

  const saveArtifact = async (
    sessionId: string,
    bytes: Uint8Array,
    format: "mp3" | "wav",
  ) => {
    const artifactId = randomUUID()
    const fileName = `${artifactId}.${format}`
    const sessionDirectory = join(artifactDirectory, sessionId)
    const filePath = join(sessionDirectory, fileName)
    await mkdir(sessionDirectory, { recursive: true })
    await writeFile(filePath, bytes)
    artifacts.set(artifactId, {
      filePath,
      sessionId,
      fileName,
      contentType: format === "mp3" ? "audio/mpeg" : "audio/wav",
    })
    return {
      artifactId,
      downloadUrl: `/artifacts/${artifactId}`,
      byteLength: bytes.byteLength,
    }
  }

  const handleMcp = async (
    request: IncomingMessage,
    response: ServerResponse,
  ) => {
    const sessionId = header(request, "mcp-session-id")
    let session = sessionId === undefined ? undefined : sessions.get(sessionId)

    if (request.method === "POST") {
      const body = await readJson(request, maxRequestBytes)
      if (
        session === undefined &&
        sessionId === undefined &&
        isInitializeRequest(body)
      ) {
        if (sessions.size >= maxSessions) {
          return mcpError(
            response,
            503,
            "The maximum number of sessions is active",
          )
        }

        let initializedSessionId: string | undefined
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: randomUUID,
          enableJsonResponse: true,
          onsessioninitialized: (id) => {
            initializedSessionId = id
            session = { id, lastAccess: Date.now(), transport, server }
            sessions.set(id, session)
          },
          onsessionclosed: (id) => void removeSession(id),
        })
        const server = createSignalMcpServer({
          allowLocalFiles: false,
          maxRenderSeconds,
          runRender: async (task) => {
            if (activeRenders >= maxConcurrentRenders) {
              throw new Error(
                "The server is at its concurrent audio render limit",
              )
            }
            activeRenders++
            try {
              return await task()
            } finally {
              activeRenders--
            }
          },
          saveArtifact: async (bytes, format) => {
            if (initializedSessionId === undefined) {
              throw new Error("MCP session has not been initialized")
            }
            return saveArtifact(initializedSessionId, bytes, format)
          },
        })
        transport.onclose = () => {
          const id = transport.sessionId
          if (id !== undefined && sessions.has(id)) void removeSession(id)
        }
        await server.connect(transport)
        await transport.handleRequest(request, response, body)
        return
      }

      if (session === undefined) {
        return mcpError(response, 400, "Invalid or missing MCP session ID")
      }
      session.lastAccess = Date.now()
      await session.transport.handleRequest(request, response, body)
      return
    }

    if (session === undefined) {
      return mcpError(response, 400, "Invalid or missing MCP session ID")
    }
    session.lastAccess = Date.now()
    await session.transport.handleRequest(request, response)
  }

  const httpServer = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost")
      if (url.pathname === "/health" && request.method === "GET") {
        return json(response, 200, { ok: true })
      }
      if (!authorized(request, options.token)) {
        response.setHeader("www-authenticate", "Bearer")
        return mcpError(response, 401, "Unauthorized")
      }
      if (url.pathname === "/mcp") {
        if (!["GET", "POST", "DELETE"].includes(request.method ?? "")) {
          return mcpError(response, 405, "Method not allowed")
        }
        return await handleMcp(request, response)
      }
      const artifactMatch = url.pathname.match(
        /^\/artifacts\/([0-9a-f]{8}-[0-9a-f-]{27})$/i,
      )
      if (artifactMatch !== null && request.method === "GET") {
        const artifact = artifacts.get(artifactMatch[1])
        const sessionId = header(request, "mcp-session-id")
        if (artifact === undefined || artifact.sessionId !== sessionId) {
          return mcpError(response, 404, "Artifact not found")
        }
        const bytes = await readFile(artifact.filePath)
        response.writeHead(200, {
          "content-type": artifact.contentType,
          "content-length": bytes.byteLength,
          "content-disposition": `attachment; filename="${artifact.fileName}"`,
          "cache-control": "private, no-store",
        })
        response.end(bytes)
        return
      }
      return mcpError(response, 404, "Not found")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!response.headersSent) mcpError(response, 500, message)
      else response.end()
    }
  })

  const cleanupTimer = setInterval(
    () => {
      const oldestAllowed = Date.now() - sessionTtlMs
      for (const session of sessions.values()) {
        if (session.lastAccess < oldestAllowed) {
          void session.transport
            .close()
            .finally(() => removeSession(session.id))
        }
      }
    },
    Math.min(sessionTtlMs, 60_000),
  )
  cleanupTimer.unref()

  await new Promise<void>((resolvePromise, rejectPromise) => {
    httpServer.once("error", rejectPromise)
    httpServer.listen(port, host, () => {
      httpServer.off("error", rejectPromise)
      resolvePromise()
    })
  })

  const address = httpServer.address()
  const actualPort =
    typeof address === "object" && address ? address.port : port
  return {
    port: actualPort,
    url: `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${actualPort}`,
    close: async () => {
      clearInterval(cleanupTimer)
      await Promise.all(
        [...sessions.values()].map((session) => session.transport.close()),
      )
      await new Promise<void>((resolvePromise, rejectPromise) =>
        httpServer.close((error) =>
          error ? rejectPromise(error) : resolvePromise(),
        ),
      )
    },
  }
}
