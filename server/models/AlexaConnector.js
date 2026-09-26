import mongoose from 'mongoose'
import { encryptSecret, decryptSecret } from '../utils/secretCrypto.js'

// Une skill Alexa privée par famille : l'adresse du point d'accès (configurée dans la console
// développeur Amazon) embarque un jeton qui désigne la famille. Comme pour le connecteur MCP, seul
// l'empreinte sha256 du jeton est conservée (voir server/alexa/auth.js).
const secret = { type: String, default: '', set: encryptSecret, get: decryptSecret }

const alexaConnectorSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, unique: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  tokenPreview: { type: String, required: true },
  createdByUserId: { type: Number, default: null },
  // Nom prononcé après « Alexa, demande à… » (null = nom par défaut du modèle de dialogue)
  invocationName: { type: String, default: null },
  lastUsedAt: { type: Date, default: null },
  requestCount: { type: Number, default: 0 },
  revokedAt: { type: Date, default: null },

  // Mise à jour automatique du modèle de dialogue chez Amazon (API SMAPI, voir server/alexa/sync.js) :
  // identifiant de la skill, profil de sécurité « Login with Amazon » et jeton d'actualisation
  // obtenu quand l'administrateur autorise FamilyGest. Les secrets sont chiffrés au repos.
  sync: {
    skillId: { type: String, default: '' },
    clientId: { type: String, default: '' },
    clientSecret: secret,
    refreshToken: secret,
    oauthState: { type: String, default: '' },
    oauthStateExpiresAt: { type: Date, default: null },
    syncedModelHash: { type: String, default: '' },
    failedModelHash: { type: String, default: '' },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: { type: String, enum: ['', 'in_progress', 'succeeded', 'failed'], default: '' },
    lastSyncError: { type: String, default: '' },
    // Fiche de présentation de la skill (nom, phrases d'exemple, descriptions, icônes)
    syncedManifestHash: { type: String, default: '' },
    failedManifestHash: { type: String, default: '' },
    manifestError: { type: String, default: '' }
  }
}, { timestamps: true })

export default mongoose.model('AlexaConnector', alexaConnectorSchema)
