import crypto from 'crypto'
import AlexaConnector from '../models/AlexaConnector.js'
import Family from '../models/Family.js'
import { getFamilyMembersList } from '../mcp/resolveMember.js'
import { buildInteractionModel, DEFAULT_INVOCATION_NAME } from './interactionModel.js'

// Mise à jour automatique du modèle de dialogue de la skill chez Amazon, par l'API de gestion des
// skills (SMAPI). L'administrateur de la famille crée une fois un profil de sécurité « Login with
// Amazon », renseigne ses identifiants et l'identifiant de la skill, puis autorise FamilyGest :
// le jeton d'actualisation obtenu permet ensuite d'envoyer le modèle sans intervention.
//
// Le modèle est renvoyé seulement s'il a changé (empreinte) : nouvelle version de l'application
// (nouvelles phrases), membre ajouté ou retiré, nom d'invocation modifié. Vérification au
// démarrage puis toutes les 10 minutes ; Amazon relance lui-même la construction (Build).

const LWA_AUTHORIZE_URL = 'https://www.amazon.com/ap/oa'
const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
const SMAPI_URL = 'https://api.amazonalexa.com'
const SCOPES = 'alexa::ask:skills:readwrite alexa::ask:models:readwrite'
const LOCALE = 'fr-FR'
const CHECK_INTERVAL_MS = 10 * 60 * 1000
const BUILD_POLL_MS = 5000
const BUILD_TIMEOUT_MS = 5 * 60 * 1000

// Erreur d'échange avec Amazon ; `code` distingue l'autorisation retirée (à refaire) du reste
export class AlexaSyncError extends Error {
  constructor (message, code = null) {
    super(message)
    this.code = code
  }
}

// Adresse de retour à déclarer dans le profil de sécurité (« Allowed Return URLs »)
export const oauthReturnUrl = (baseServerUrl) => `${baseServerUrl}/api/alexa-oauth/callback`

export const isSyncConfigured = (connector) => Boolean(connector?.sync?.skillId && connector?.sync?.clientId && connector?.sync?.clientSecret)
export const isSyncConnected = (connector) => isSyncConfigured(connector) && Boolean(connector.sync.refreshToken)

// Modèle de dialogue de la famille (prénoms + nom d'invocation) et son empreinte
export const familyModel = async (family, connector) => buildInteractionModel({
  members: await getFamilyMembersList(family._id),
  invocationName: connector?.invocationName || DEFAULT_INVOCATION_NAME
})
export const modelHash = (model) => crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex')

// --- Autorisation « Login with Amazon » ---

// URL de la page de consentement Amazon ; le `state` aléatoire (15 minutes) désigne la famille au retour
export const startAuthorization = async (connector, returnUrl) => {
  const state = crypto.randomBytes(24).toString('hex')
  connector.sync.oauthState = state
  connector.sync.oauthStateExpiresAt = new Date(Date.now() + 15 * 60 * 1000)
  await connector.save()
  const params = new URLSearchParams({
    client_id: connector.sync.clientId,
    scope: SCOPES,
    response_type: 'code',
    redirect_uri: returnUrl,
    state
  })
  return `${LWA_AUTHORIZE_URL}?${params}`
}

const tokenRequest = async (form) => {
  const res = await fetch(LWA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
    signal: AbortSignal.timeout(15000)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new AlexaSyncError(data.error_description || data.error || `HTTP ${res.status}`, data.error === 'invalid_grant' ? 'revoked' : null)
  }
  return data
}

// Jetons d'accès (valables une heure) gardés en mémoire par connecteur
const accessTokens = new Map()
const rememberAccessToken = (connector, data) => {
  accessTokens.set(String(connector._id), { token: data.access_token, expiresAt: Date.now() + (Number(data.expires_in || 3600) - 120) * 1000 })
}

// Retour de la page de consentement : échange du code contre le jeton d'actualisation
export const completeAuthorization = async ({ state, code, returnUrl }) => {
  const connector = state ? await AlexaConnector.findOne({ 'sync.oauthState': state }) : null
  if (!connector || !connector.sync.oauthStateExpiresAt || connector.sync.oauthStateExpiresAt < new Date()) {
    throw new AlexaSyncError('Autorisation expirée ou inconnue', 'state')
  }
  const data = await tokenRequest({
    grant_type: 'authorization_code',
    code,
    client_id: connector.sync.clientId,
    client_secret: connector.sync.clientSecret,
    redirect_uri: returnUrl
  })
  connector.sync.refreshToken = data.refresh_token
  connector.sync.oauthState = ''
  connector.sync.oauthStateExpiresAt = null
  connector.sync.lastSyncError = ''
  connector.sync.failedModelHash = ''
  await connector.save()
  rememberAccessToken(connector, data)
  return connector
}

const getAccessToken = async (connector) => {
  const cached = accessTokens.get(String(connector._id))
  if (cached && cached.expiresAt > Date.now()) return cached.token
  const data = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: connector.sync.refreshToken,
    client_id: connector.sync.clientId,
    client_secret: connector.sync.clientSecret
  })
  rememberAccessToken(connector, data)
  return data.access_token
}

export const forgetAccessToken = (connector) => accessTokens.delete(String(connector._id))

// --- API de gestion des skills ---

const smapi = async (connector, method, path, body) => {
  const token = await getAccessToken(connector)
  const res = await fetch(`${SMAPI_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000)
  })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!res.ok) {
    const details = (data?.violations || []).map(v => v.message).filter(Boolean).join(' ; ')
    throw new AlexaSyncError([data?.message, details].filter(Boolean).join(' — ') || `HTTP ${res.status}`, res.status === 401 ? 'revoked' : null)
  }
  return data
}

const markFailure = async (connector, err, hash = null) => {
  connector.sync.lastSyncStatus = 'failed'
  connector.sync.lastSyncAt = new Date()
  // Autorisation retirée chez Amazon : il faudra reconnecter FamilyGest
  connector.sync.lastSyncError = err.code === 'revoked' ? 'revoked' : String(err.message || err).slice(0, 500)
  if (err.code === 'revoked') {
    connector.sync.refreshToken = ''
    forgetAccessToken(connector)
  }
  if (hash) connector.sync.failedModelHash = hash
  await connector.save()
  console.error('[Alexa] Mise à jour du modèle chez Amazon impossible :', connector.sync.lastSyncError)
}

// Suivi de la construction (Build) lancée par Amazon après l'envoi du modèle
const watchBuild = async (connectorId, hash) => {
  const deadline = Date.now() + BUILD_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, BUILD_POLL_MS))
    const connector = await AlexaConnector.findById(connectorId)
    if (!connector || !isSyncConnected(connector)) return
    try {
      const status = await smapi(connector, 'GET', `/v1/skills/${encodeURIComponent(connector.sync.skillId)}/status?resource=interactionModel`)
      const request = status?.interactionModel?.[LOCALE]?.lastUpdateRequest
      if (!request || request.status === 'IN_PROGRESS') continue
      if (request.status === 'SUCCEEDED') {
        connector.sync.lastSyncStatus = 'succeeded'
        connector.sync.lastSyncAt = new Date()
        connector.sync.lastSyncError = ''
        connector.sync.syncedModelHash = hash
        connector.sync.failedModelHash = ''
        await connector.save()
        console.log('[Alexa] Modèle de dialogue mis à jour chez Amazon')
        return
      }
      const messages = (request.errors || []).map(e => e.message).filter(Boolean).join(' ; ')
      return markFailure(connector, new AlexaSyncError(messages || request.status), hash)
    } catch (err) {
      return markFailure(connector, err, err.code === 'revoked' ? null : hash)
    }
  }
  const connector = await AlexaConnector.findById(connectorId)
  if (connector?.sync.lastSyncStatus === 'in_progress') await markFailure(connector, new AlexaSyncError('Build toujours en cours après 5 minutes'))
}

const running = new Set()

// Envoie le modèle de la famille s'il a changé (ou toujours, avec force). Renvoie l'état obtenu :
// 'up_to_date', 'skipped' (déjà en échec pour ce même modèle), 'started' ou 'failed'.
export const pushModel = async (connector, family, { force = false } = {}) => {
  if (!isSyncConnected(connector)) return 'skipped'
  const key = String(connector._id)
  if (running.has(key)) return 'started'

  const model = await familyModel(family, connector)
  const hash = modelHash(model)
  if (!force && hash === connector.sync.syncedModelHash) return 'up_to_date'
  if (!force && hash === connector.sync.failedModelHash) return 'skipped'

  running.add(key)
  try {
    connector.sync.lastSyncStatus = 'in_progress'
    connector.sync.lastSyncError = ''
    await connector.save()
    await smapi(connector, 'PUT', `/v1/skills/${encodeURIComponent(connector.sync.skillId)}/stages/development/interactionModel/locales/${LOCALE}`, model)
    watchBuild(connector._id, hash)
      .catch(err => console.error('[Alexa] Suivi du Build :', err.message))
      .finally(() => running.delete(key))
    return 'started'
  } catch (err) {
    running.delete(key)
    await markFailure(connector, err, err.code === 'revoked' ? null : hash)
    return 'failed'
  }
}

// Vérification périodique de toutes les familles reliées à Amazon
const checkAllFamilies = async () => {
  const connectors = await AlexaConnector.find({ 'sync.refreshToken': { $nin: ['', null] } })
  for (const connector of connectors) {
    try {
      const family = await Family.findById(connector.familyId)
      if (!family || family.isActive === false) continue
      await pushModel(connector, family)
    } catch (err) {
      console.error('[Alexa] Vérification du modèle :', err.message)
    }
  }
}

export const startAlexaSyncScheduler = () => {
  setTimeout(() => checkAllFamilies().catch(() => {}), 60 * 1000)
  setInterval(() => checkAllFamilies().catch(() => {}), CHECK_INTERVAL_MS)
}
