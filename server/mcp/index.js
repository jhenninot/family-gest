import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { mcpAuth, mcpRateLimiter } from './auth.js'
import { buildMcpServerForRequest } from './buildServer.js'

// Monte le endpoint MCP à /api/mcp/:familySlug/:token. Un McpServer + transport Streamable HTTP
// stateless (sessionIdGenerator: undefined) est recréé à chaque requête : chaque appel est déjà
// entièrement scopé par l'URL (token -> famille), il n'y a aucun état à partager entre deux requêtes.
export const mountMcpServer = (app, ctx) => {
  app.all('/api/mcp/:familySlug/:token', mcpRateLimiter, mcpAuth, async (req, res) => {
    try {
      const server = buildMcpServerForRequest(req, ctx)
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })

      res.on('close', () => {
        transport.close()
        server.close()
      })

      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch (err) {
      console.error('[MCP] Erreur de traitement de la requête:', err.message)
      if (!res.headersSent) {
        res.status(500).json({ error: 'internal error' })
      }
    }
  })
}
