import mongoose from 'mongoose'

// Journal technique du serveur (console Super Admin › Journal technique), alimenté par
// server/logging/logger.js. Chaque ligne porte sa date d'expiration : 24 heures pour debug/info,
// 30 jours pour warn/error/critical (purge automatique par l'index TTL).
const serverLogSchema = new mongoose.Schema({
  at: { type: Date, required: true },
  level: { type: String, enum: ['debug', 'info', 'warn', 'error', 'critical'], required: true },
  source: { type: String, default: 'system' },
  family: { type: String, default: null },
  message: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { versionKey: false })

serverLogSchema.index({ at: -1 })
serverLogSchema.index({ level: 1, at: -1 })
serverLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('ServerLog', serverLogSchema)
