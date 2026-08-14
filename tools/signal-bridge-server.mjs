#!/usr/bin/env node
import { createServer } from "node:http"
import { randomBytes, randomUUID } from "node:crypto"
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { extname, join, normalize, resolve } from "node:path"

const root = resolve(new URL("..", import.meta.url).pathname)
const dist = join(root, "dist")
const tokenFile = join(root, ".signal-control-token")
const port = Number(process.env.SIGNAL_PORT ?? 4173)
const token = existsSync(tokenFile)
  ? readFileSync(tokenFile, "utf8").trim()
  : randomBytes(32).toString("hex")

if (!existsSync(tokenFile)) writeFileSync(tokenFile, `${token}\n`, { mode: 0o600 })

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mid": "audio/midi",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
}

const queued = []
const pending = new Map()
let lastBrowserSeen = 0

const json = (response, status, value) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  })
  response.end(JSON.stringify(value))
}

const readJson = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

const isAuthorizedBrowser = (request) =>
  request.headers["x-signal-control-token"] === token

const isLoopback = (request) => {
  const address = request.socket.remoteAddress ?? ""
  return address === "127.0.0.1" || address === "::1" || address.endsWith("::ffff:127.0.0.1")
}

const execute = (operation, args) =>
  new Promise((resolvePromise, rejectPromise) => {
    if (Date.now() - lastBrowserSeen > 15_000) {
      rejectPromise(new Error("Signal is not paired. Open the control URL in the browser first."))
      return
    }
    const id = randomUUID()
    const timeoutMs = operation === "export_audio" ? 10 * 60_000 : 30_000
    const timeout = setTimeout(() => {
      pending.delete(id)
      rejectPromise(new Error(`Signal timed out while executing ${operation}`))
    }, timeoutMs)
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timeout)
        resolvePromise(value)
      },
      reject: (error) => {
        clearTimeout(timeout)
        rejectPromise(error)
      },
    })
    queued.push({ id, operation, arguments: args ?? {} })
  })

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`)

    if (url.pathname === "/api/control/health") {
      json(response, 200, {
        ok: true,
        browserConnected: Date.now() - lastBrowserSeen < 15_000,
        queuedCommands: queued.length,
      })
      return
    }

    if (url.pathname === "/api/control/commands" && request.method === "GET") {
      if (!isAuthorizedBrowser(request)) return json(response, 401, { error: "Unauthorized" })
      lastBrowserSeen = Date.now()
      const commands = queued.splice(0)
      json(response, 200, { commands })
      return
    }

    if (url.pathname === "/api/control/results" && request.method === "POST") {
      if (!isAuthorizedBrowser(request)) return json(response, 401, { error: "Unauthorized" })
      lastBrowserSeen = Date.now()
      const body = await readJson(request)
      const waiter = pending.get(body.id)
      if (waiter) {
        pending.delete(body.id)
        if (body.ok) waiter.resolve(body.result)
        else waiter.reject(new Error(body.error ?? "Unknown browser command error"))
      }
      json(response, 200, { ok: true })
      return
    }

    if (url.pathname === "/api/control/execute" && request.method === "POST") {
      if (!isLoopback(request)) return json(response, 403, { error: "Local access only" })
      const body = await readJson(request)
      if (typeof body.operation !== "string") return json(response, 400, { error: "operation is required" })
      try {
        const result = await execute(body.operation, body.arguments)
        json(response, 200, { ok: true, result })
      } catch (error) {
        json(response, 503, { error: error instanceof Error ? error.message : String(error) })
      }
      return
    }

    let pathname = decodeURIComponent(url.pathname)
    if (pathname === "/" || pathname === "/edit" || pathname === "/edit/") pathname = "/edit.html"
    const relative = normalize(pathname).replace(/^([/\\])+/, "")
    const file = join(dist, relative)
    if (!file.startsWith(`${dist}/`) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" })
      response.end("Not found")
      return
    }
    response.writeHead(200, {
      "content-type": mimeTypes[extname(file)] ?? "application/octet-stream",
      "cache-control": pathname.endsWith(".html") ? "no-cache" : "public, max-age=3600",
    })
    response.end(readFileSync(file))
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : String(error) })
  }
})

server.listen(port, "0.0.0.0", () => {
  console.log(`Signal web + control API: http://localhost:${port}/edit.html`)
  console.log(`Paired browser URL: http://localhost:${port}/edit.html?controlToken=${token}`)
})
