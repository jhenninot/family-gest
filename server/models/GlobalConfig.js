import mongoose from 'mongoose'

const globalConfigSchema = new mongoose.Schema({
  serverUrl: {
    type: String,
    default: 'http://localhost:5173',
    trim: true
  },
  providerPreset: {
    type: String,
    enum: ['gmail', 'outlook', 'yahoo', 'resend', 'brevo-smtp', 'brevo-api', 'custom'],
    default: 'gmail'
  },
  host: {
    type: String,
    default: 'smtp.gmail.com'
  },
  port: {
    type: Number,
    default: 587
  },
  secure: {
    type: Boolean,
    default: false
  },
  user: {
    type: String,
    default: ''
  },
  pass: {
    type: String,
    default: ''
  },
  fromEmail: {
    type: String,
    default: ''
  },
  fromName: {
    type: String,
    default: 'FamilyGest Platform'
  },
  isConfigured: {
    type: Boolean,
    default: false
  },
  // Planification du récapitulatif quotidien (heure locale, fuseau applicatif fixe — voir
  // server/digest/). Modifiable par le Super Administrateur sans redémarrage du serveur.
  digestHour: {
    type: Number,
    min: 0,
    max: 23,
    default: 8
  },
  digestMinute: {
    type: Number,
    min: 0,
    max: 59,
    default: 0
  },
  // Garde-fou anti-double-envoi (persisté pour survivre à un redémarrage) : date (YYYY-MM-DD)
  // du dernier récapitulatif déjà envoyé.
  lastDigestRunDate: {
    type: String,
    default: null
  }
}, { timestamps: true })

export default mongoose.model('GlobalConfig', globalConfigSchema)
