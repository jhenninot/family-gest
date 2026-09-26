import util from 'util'
import mongoose from 'mongoose'
import ServerLog from '../models/ServerLog.js'

// Journal technique du serveur, consultable par le Super Admin (onglet « Journal technique »).
//
// installConsoleCapture() intercepte console.debug/log/info/warn/error : tous les messages
// existants (« [Alexa] … », « [Digest] … ») sont donc journalisés sans modifier leur code, en plus
// d'être écrits comme avant dans la sortie du conteneur. Le code peut aussi appeler
// logger.debug/info/warn/error/critical(message, { source, family }) directement.
//
// Seules les lignes au niveau choisi par le Super Admin ou au-dessus sont gardées : les dernières
// en mémoire (consultables même si la base est injoignable) et toutes en base, par lots, avec une
// durée de vie de 24 h (debug, info) ou 30 jours (warn, error, critical). Le niveau debug revient
// de lui-même à info après 24 h.

export const LEVELS = ['debug', 'info', 'warn', 'error', 'critical']
const rank = (level) => LEVELS.indexOf(level)

const MEMORY_SIZE = 2000
const MAX_MESSAGE = 4000
const FLUSH_MS = 5000
const SHORT_RETENTION_MS = 24 * 60 * 60 * 1000
const LONG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000
export const DEBUG_DURATION_MS = 24 * 60 * 60 * 1000

const original = {
  debug: console.debug.bind(console),
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console)
}

const state = { level: 'info', debugUntil: null }
const memory = []
let pending = []
let flushTimer = null
let capturing = false

// Secrets retirés avant tout enregistrement : jetons des adresses Alexa/MCP, en-têtes et champs sensibles
const maskSecrets = (text) => text
  .replace(/(\/api\/(?:alexa|mcp)\/[^/\s?]+\/)[^/\s?"']+/g, '$1****')
  .replace(/(Bearer\s+)[\w.~+/=|-]+/gi, '$1****')
  .replace(/((?:password|passwd|pass|secret|token|refresh_token|access_token|client_secret|authorization)["']?\s*[:=]\s*["']?)[^\s"',&}]+/gi, '$1****')

// Source déduite du préfixe « [Alexa] … » des messages existants
const detectSource = (message) => {
  const prefixed = /^\s*\[([\w-]{2,20})\]/.exec(message)
  if (prefixed) return prefixed[1]
  if (/mongo/i.test(message)) return 'database'
  return 'system'
}

const formatArgs = (args) => args.map(arg => {
  if (typeof arg === 'string') return arg
  if (arg instanceof Error) return arg.stack || arg.message
  return util.inspect(arg, { depth: 3, breakLength: Infinity })
}).join(' ')

export const currentLevel = () => {
  if (state.level === 'debug' && state.debugUntil && state.debugUntil < new Date()) {
    state.level = 'info'
    state.debugUntil = null
  }
  return state.level
}

export const getLogSettings = () => ({ level: currentLevel(), debugUntil: state.level === 'debug' ? state.debugUntil : null })

export const configureLogger = ({ level, debugUntil = null }) => {
  state.level = LEVELS.includes(level) ? level : 'info'
  state.debugUntil = state.level === 'debug' ? (debugUntil ? new Date(debugUntil) : null) : null
  currentLevel()
}

const scheduleFlush = () => {
  if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = null; flushLogs().catch(() => {}) }, FLUSH_MS)
}

// Écrit en base les lignes en attente (si la base est disponible ; sinon elles restent en mémoire)
export const flushLogs = async () => {
  if (pending.length === 0 || mongoose.connection.readyState !== 1) return
  const batch = pending
  pending = []
  try {
    await ServerLog.insertMany(batch, { ordered: false })
  } catch (err) {
    original.error('[Logger] Écriture du journal impossible :', err.message)
  }
}

export const record = (level, message, { source = null, family = null } = {}) => {
  if (rank(level) < rank(currentLevel())) return
  const text = maskSecrets(String(message)).slice(0, MAX_MESSAGE)
  const at = new Date()
  const entry = {
    at,
    level,
    source: source || detectSource(text),
    family: family || null,
    message: text,
    expiresAt: new Date(at.getTime() + (rank(level) >= rank('warn') ? LONG_RETENTION_MS : SHORT_RETENTION_MS))
  }
  memory.push(entry)
  if (memory.length > MEMORY_SIZE) memory.splice(0, memory.length - MEMORY_SIZE)
  pending.push(entry)
  if (pending.length > MEMORY_SIZE) pending.splice(0, pending.length - MEMORY_SIZE)
  scheduleFlush()
}

export const logger = {
  debug: (message, meta) => { if (rank('debug') >= rank(currentLevel())) original.debug(message); record('debug', message, meta) },
  info: (message, meta) => { original.log(message); record('info', message, meta) },
  warn: (message, meta) => { original.warn(message); record('warn', message, meta) },
  error: (message, meta) => { original.error(message); record('error', message, meta) },
  critical: (message, meta) => { original.error(message); record('critical', message, meta) }
}
export const installConsoleCapture = () => {
  const wrap = (method, level) => (...args) => {
    // console.debug n'est affiché qu'en mode debug, comme il sera journalisé
    if (method !== 'debug' || rank('debug') >= rank(currentLevel())) original[method](...args)
    if (capturing) return
    capturing = true
    try { record(level, formatArgs(args)) } catch { /* le journal ne doit jamais faire échouer l'appelant */ } finally { capturing = false }
  }
  console.debug = wrap('debug', 'debug')
  console.log = wrap('log', 'info')
  console.info = wrap('info', 'info')
  console.warn = wrap('warn', 'warn')
  console.error = wrap('error', 'error')
}

// Lecture pour la console Super Admin : la base si elle répond, sinon la mémoire
export const queryLogs = async ({ minLevel = 'debug', source = '', family = '', search = '', before = null, limit = 200 }) => {
  await flushLogs()
  const levels = LEVELS.filter(l => rank(l) >= rank(minLevel))
  const max = Math.min(Math.max(Number(limit) || 200, 1), 5000)
  const escaped = search ? search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : ''

  if (mongoose.connection.readyState === 1) {
    const filter = { level: { $in: levels } }
    if (source) filter.source = source
    if (family) filter.family = family
    if (escaped) filter.message = { $regex: escaped, $options: 'i' }
    if (before) filter.at = { $lt: new Date(before) }
    const [entries, sources, families] = await Promise.all([
      ServerLog.find(filter).sort({ at: -1 }).limit(max).lean(),
      ServerLog.distinct('source'),
      ServerLog.distinct('family')
    ])
    return { entries: entries.map(({ _id, expiresAt, ...e }) => ({ id: String(_id), ...e })), sources, families: families.filter(Boolean), fromMemory: false }
  }

  const pattern = escaped ? new RegExp(escaped, 'i') : null
  const entries = memory
    .filter(e => levels.includes(e.level) && (!source || e.source === source) && (!family || e.family === family) &&
      (!pattern || pattern.test(e.message)) && (!before || e.at < new Date(before)))
    .slice(-max)
    .reverse()
    .map(({ expiresAt, ...e }, i) => ({ id: `m${i}-${e.at.getTime()}`, ...e }))
  return {
    entries,
    sources: [...new Set(memory.map(e => e.source))],
    families: [...new Set(memory.map(e => e.family).filter(Boolean))],
    fromMemory: true
  }
}

// Erreurs imprévues : notées comme critiques avant l'arrêt éventuel du processus
export const installProcessHandlers = () => {
  process.on('unhandledRejection', (reason) => {
    logger.critical(`Promesse rejetée sans traitement : ${reason instanceof Error ? reason.stack : String(reason)}`, { source: 'system' })
  })
  process.on('uncaughtException', (err) => {
    logger.critical(`Erreur imprévue, arrêt du serveur : ${err.stack || err.message}`, { source: 'system' })
    flushLogs().finally(() => process.exit(1))
    setTimeout(() => process.exit(1), 3000).unref()
  })
  mongoose.connection.on('disconnected', () => logger.critical('Connexion à MongoDB perdue', { source: 'database' }))
  mongoose.connection.on('reconnected', () => logger.warn('Connexion à MongoDB rétablie', { source: 'database' }))
}

// Requêtes de l'API : erreurs 5xx toujours notées, toutes les autres en debug
export const httpLogMiddleware = (req, res, next) => {
  if (!req.path.startsWith('/api/') || req.path.startsWith('/api/super-admin/server-logs')) return next()
  const start = Date.now()
  res.on('finish', () => {
    const line = `${req.method} ${req.originalUrl.split('?')[0]} → ${res.statusCode} (${Date.now() - start} ms)`
    if (res.statusCode >= 500) logger.error(line, { source: 'http', family: req.family?.slug || null })
    else if (currentLevel() === 'debug') record('debug', line, { source: 'http', family: req.family?.slug || null })
  })
  next()
}
