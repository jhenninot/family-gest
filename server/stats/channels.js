// Comptage des utilisations des assistants (Alexa, connecteur Claude/MCP, micro de l'appli)
// pour les statistiques de la console Super Admin. Une écriture par commande, sans contenu.
import UsageCounter from '../models/UsageCounter.js'

export const CHANNELS = ['alexa', 'mcp', 'voice']
const RETENTION_DAYS = 400

export const recordChannelUsage = (familyId, channel) => {
  if (!familyId || !CHANNELS.includes(channel)) return
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  UsageCounter.updateOne(
    { familyId, channel, day },
    {
      $inc: { count: 1 },
      $set: { lastAt: now },
      $setOnInsert: { expireAt: new Date(now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000) }
    },
    { upsert: true }
  ).catch(err => console.debug('[Stats] Compteur d\'utilisation :', err.message))
}

// Requête Alexa : seules les commandes (IntentRequest) comptent, pas l'ouverture ni la fin de session
export const isAlexaCommand = (body) => body?.request?.type === 'IntentRequest'

// Requête MCP (JSON-RPC, éventuellement groupée) : nombre d'outils réellement appelés
export const mcpToolCalls = (body) => {
  const messages = Array.isArray(body) ? body : [body]
  return messages.filter(m => m && m.method === 'tools/call').length
}
