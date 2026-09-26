import { SkillRequestSignatureVerifier, TimestampVerifier } from 'ask-sdk-express-adapter'
import { normalizeLanguage } from '../i18n/index.js'
import { alexaAuth, alexaRateLimiter } from './auth.js'
import { createAlexaApi } from './actions.js'
import { buildSkill } from './handlers.js'

// Point d'accès de la skill Alexa privée d'une famille : POST /api/alexa/:familySlug/:token
// (adresse à renseigner dans la console développeur Amazon, section Endpoint › HTTPS).
//
// Chaque requête est vérifiée avant tout traitement : signature d'Amazon (certificat et empreinte
// du corps brut, conservé par express.json dans req.rawBody) et horodatage récent (anti-rejeu).
const signatureVerifier = new SkillRequestSignatureVerifier()
const timestampVerifier = new TimestampVerifier()

export const mountAlexaSkill = (app, ctx) => {
  app.post('/api/alexa/:familySlug/:token', alexaRateLimiter, alexaAuth, async (req, res) => {
    const rawBody = req.rawBody
    if (!rawBody) return res.status(400).end()
    try {
      await signatureVerifier.verify(rawBody, req.headers)
      await timestampVerifier.verify(rawBody)
    } catch (err) {
      console.warn('[Alexa] Requête refusée :', err.message)
      return res.status(400).end()
    }

    try {
      // Le corps brut est relu ici : req.body a été modifié par express-mongo-sanitize, qui retire
      // les clés contenant un point (ex. « Alexa.Presentation.APL » dans supportedInterfaces).
      const envelope = JSON.parse(rawBody)
      const lang = normalizeLanguage(envelope.request?.locale)
      const skill = buildSkill(createAlexaApi(req, ctx, lang))
      res.json(await skill.invoke(envelope))
    } catch (err) {
      console.error('[Alexa] Erreur de traitement :', err.message)
      res.status(500).end()
    }
  })
}
