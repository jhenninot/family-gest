import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import Family from '../models/Family.js'
import AlexaConnector from '../models/AlexaConnector.js'
import User from '../models/User.js'

// Anti-abus sur le point d'accès Alexa (une conversation fait quelques requêtes par minute)
export const alexaRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
})

// Résout la famille à partir du jeton de l'adresse (/api/alexa/:familySlug/:token), comme le
// connecteur MCP : pas de session, accès limité aux écritures proposées par la skill.
export const alexaAuth = async (req, res, next) => {
  try {
    const { familySlug, token } = req.params
    if (!token) return res.status(404).end()

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const connector = await AlexaConnector.findOne({ tokenHash, revokedAt: null })
    if (!connector) return res.status(404).end()

    const family = await Family.findById(connector.familyId)
    if (!family || !family.isActive) return res.status(404).end()
    if (family.slug !== String(familySlug || '').toLowerCase().trim()) return res.status(404).end()

    req.family = family
    req.alexaActor = connector.createdByUserId != null
      ? await User.findOne({ id: connector.createdByUserId }).select('-password')
      : null

    AlexaConnector.updateOne(
      { _id: connector._id },
      { $set: { lastUsedAt: new Date() }, $inc: { requestCount: 1 } }
    ).catch(() => {})

    next()
  } catch (err) {
    console.error('[Alexa] Erreur d\'authentification :', err.message)
    res.status(500).end()
  }
}
