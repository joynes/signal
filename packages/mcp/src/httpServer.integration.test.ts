import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import { afterEach, describe, expect, test } from "vitest"
import { startHttpServer } from "./httpServer.js"

const token = "test-token-with-at-least-16-characters"
const runningServers: Array<Awaited<ReturnType<typeof startHttpServer>>> = []

afterEach(async () => {
  await Promise.all(runningServers.splice(0).map((server) => server.close()))
})

const connect = async (url: string, bearerToken = token) => {
  const transport = new StreamableHTTPClientTransport(new URL(`${url}/mcp`), {
    requestInit: {
      headers: { authorization: `Bearer ${bearerToken}` },
    },
  })
  const client = new Client({ name: "signal-http-test", version: "0.1.0" })
  await client.connect(transport)
  return { client, transport }
}

const toolValue = (value: unknown) => {
  const response = value as {
    structuredContent?: unknown
    content: Array<{ type: string; text?: string }>
  }
  return (response.structuredContent ??
    JSON.parse(response.content[0].text ?? "null")) as Record<string, unknown>
}

describe("Signal Streamable HTTP server", () => {
  test("requires bearer authentication", async () => {
    const running = await startHttpServer({ token, host: "127.0.0.1", port: 0 })
    runningServers.push(running)
    await expect(
      connect(running.url, "incorrect-token-value"),
    ).rejects.toThrow()
  })

  test("isolates projects between MCP sessions", async () => {
    const running = await startHttpServer({ token, host: "127.0.0.1", port: 0 })
    runningServers.push(running)
    const first = await connect(running.url)
    const second = await connect(running.url)
    try {
      await first.client.callTool({
        name: "signal_new_project",
        arguments: { name: "First session" },
      })
      const firstState = toolValue(
        await first.client.callTool({
          name: "signal_get_project",
          arguments: {},
        }),
      )
      const secondState = toolValue(
        await second.client.callTool({
          name: "signal_get_project",
          arguments: {},
        }),
      )
      expect((firstState.project as { name: string }).name).toBe(
        "First session",
      )
      expect((secondState.project as { name: string }).name).not.toBe(
        "First session",
      )
    } finally {
      await first.transport.terminateSession()
      await second.transport.terminateSession()
      await first.client.close()
      await second.client.close()
    }
  })

  test("renders and downloads an authenticated MP3 artifact", async () => {
    const running = await startHttpServer({
      token,
      host: "127.0.0.1",
      port: 0,
      maxRenderSeconds: 5,
    })
    runningServers.push(running)
    const { client, transport } = await connect(running.url)
    try {
      const state = toolValue(
        await client.callTool({
          name: "signal_new_project",
          arguments: { name: "HTTP MP3" },
        }),
      )
      const trackId = (
        state.tracks as Array<{ id: number; isConductor: boolean }>
      ).find((track) => !track.isConductor)?.id
      expect(trackId).toBeTypeOf("number")
      await client.callTool({
        name: "signal_add_notes",
        arguments: {
          trackId,
          notes: [{ tick: 0, duration: 480, noteNumber: 60, velocity: 100 }],
        },
      })
      const rendered = toolValue(
        await client.callTool({
          name: "signal_export_audio",
          arguments: {
            format: "mp3",
            durationSeconds: 1,
            sampleRate: 22050,
            bitrateKbps: 96,
          },
        }),
      )
      expect(rendered.byteLength).toBeGreaterThan(1000)
      expect(rendered.downloadUrl).toMatch(/^\/artifacts\//)

      const unauthorized = await fetch(
        `${running.url}${String(rendered.downloadUrl)}`,
      )
      expect(unauthorized.status).toBe(401)

      const downloaded = await fetch(
        `${running.url}${String(rendered.downloadUrl)}`,
        {
          headers: {
            authorization: `Bearer ${token}`,
            "mcp-session-id": transport.sessionId ?? "",
          },
        },
      )
      expect(downloaded.status).toBe(200)
      expect(downloaded.headers.get("content-type")).toBe("audio/mpeg")
      const bytes = new Uint8Array(await downloaded.arrayBuffer())
      expect(bytes.byteLength).toBe(rendered.byteLength)
      expect(
        Buffer.from(bytes.subarray(0, 3)).toString("ascii") === "ID3" ||
          bytes[0] === 0xff,
      ).toBe(true)
    } finally {
      await transport.terminateSession()
      await client.close()
    }
  }, 30_000)
})
