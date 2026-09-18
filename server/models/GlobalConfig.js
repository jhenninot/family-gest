import mongoose from 'mongoose'
import crypto from 'crypto'

const ENC_PREFIX = 'enc:v1:'

// Clé dérivée de JWT_SECRET (déjà présent dans tous les déploiements, voir compose.yaml) : évite
// d'imposer une nouvelle variable d'environnement dédiée au chiffrement du mot de passe SMTP.
const getEncryptionKey = () => crypto
  .createHash('sha256')
  .update(process.env.JWT_SECRET || 'familygest_secret_jwt_key_2026_change_in_production')
  .digest()

// Chiffrement du mot de passe SMTP plateforme au repos (AES-256-GCM). Le getter reconnaît aussi
// les valeurs historiques stockées en clair (avant l'introduction du chiffrement) et les renvoie
// telles quelles ; elles seront rechiffrées à la prochaine sauvegarde de la config SMTP.
const encryptSecret = (plainText) => {
  if (!plainText) return plainText
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return ENC_PREFIX + [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

const decryptSecret = (storedValue) => {
  if (!storedValue || !storedValue.startsWith(ENC_PREFIX)) return storedValue
  try {
    const [ivHex, authTagHex, dataHex] = storedValue.slice(ENC_PREFIX.length).split(':')
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8')
  } catch (err) {
    console.error('[GlobalConfig] Erreur déchiffrement mot de passe SMTP:', err.message)
    return ''
  }
}

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
    default: '',
    set: encryptSecret,
    get: decryptSecret
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
