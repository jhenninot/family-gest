import mongoose from 'mongoose'

// Une skill Alexa privée par famille : l'adresse du point d'accès (configurée dans la console
// développeur Amazon) embarque un jeton qui désigne la famille. Comme pour le connecteur MCP, seul
// l'empreinte sha256 du jeton est conservée (voir server/alexa/auth.js).
const alexaConnectorSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, unique: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  tokenPreview: { type: String, required: true },
  createdByUserId: { type: Number, default: null },
  // Nom prononcé après « Alexa, demande à… » (null = nom par défaut du modèle de dialogue)
  invocationName: { type: String, default: null },
  lastUsedAt: { type: Date, default: null },
  requestCount: { type: Number, default: 0 },
  revokedAt: { type: Date, default: null }
}, { timestamps: true })

export default mongoose.model('AlexaConnector', alexaConnectorSchema)
