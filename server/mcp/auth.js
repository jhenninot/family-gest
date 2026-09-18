import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import Family from '../models/Family.js'
import McpConnector from '../models/McpConnector.js'
import User from '../models/User.js'

// Anti-abus sur le endpoint MCP (le token de 256 bits rend le brute-force infaisable ; ce
// limiteur borne surtout un client MCP en boucle ou mal configuré).
export const mcpRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
})

// Résout la famille à partir du token opaque (pas de session/JWT). Distinct de attachFamilyContext :
// ne déclenche jamais l'auto-acceptation d'invitation, ne pose jamais de req.user réel. Le connecteur
// MCP est un credential admin-équivalent par conception (CRUD complet) mais reste strictement scopé à
// la famille propriétaire du token, et n'ouvre l'accès à aucune route qui n'appelle pas explicitement
// les fonctions injectées dans server/mcp/index.js (jamais l'admin membres, l'export, le super-admin...).
export const mcpAuth = async (req, res, next) => {
  try {
    const { familySlug, token } = req.params
    if (!token) return res.status(404).end()

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const connector = await McpConnector.findOne({ tokenHash, revokedAt: null })
    if (!connector) return res.status(404).end()

    const family = await Family.findById(connector.familyId)
    if (!family || !family.isActive) return res.status(404).end()
    if (family.slug !== String(familySlug || '').toLowerCase().trim()) return res.status(404).end()

    const fallbackActor = connector.createdByUserId != null
      ? await User.findOne({ id: connector.createdByUserId }).select('-password')
      : null

    req.family = family
    req.mcpConnector = connector
    req.mcpFallbackActor = fallbackActor
    // Membership synthétique : n'affecte que la logique métier réutilisée (contournement de
    // propriété dans Absence/LongAbsence) — n'accorde jamais d'accès aux routes que le connecteur
    // n'appelle pas, puisque req.user reste absent et que celles-ci exigent requireAuth.
    req.membership = { isAdmin: true, role: 'Connecteur MCP', points: 0 }

    McpConnector.updateOne(
      { _id: connector._id },
      { $set: { lastUsedAt: new Date() }, $inc: { requestCount: 1 } }
    ).catch(() => {})

    next()
  } catch (err) {
    console.error('[MCP] Erreur d\'authentification:', err.message)
    res.status(500).json({ error: 'internal error' })
  }
}
