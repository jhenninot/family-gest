import mongoose from 'mongoose'
import { encryptSecret, decryptSecret } from '../utils/secretCrypto.js'

// Repli « langage naturel » de l'assistant vocal de l'application (voir server/voice/ai.js) :
// une clé API Mistral par famille, saisie par un administrateur de la famille. Sans clé, la
// fonction n'existe pas. La clé est chiffrée au repos et ne repart jamais vers le navigateur.
const voiceAiConfigSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, unique: true },
  apiKey: { type: String, required: true, set: encryptSecret, get: decryptSecret },
  model: { type: String, default: 'ministral-8b-latest' },
  enabled: { type: Boolean, default: true },
  // L'IA ne peut piloter l'agenda / les tâches (dont les tâches privées de celui qui parle) que si
  // l'administrateur de la famille l'a explicitement autorisé
  allowAgenda: { type: Boolean, default: false },
  allowPrivateTasks: { type: Boolean, default: false },
  createdByUserId: { type: Number, default: null },
  lastUsedAt: { type: Date, default: null },
  lastError: { type: String, default: '' }
}, { timestamps: true })

export default mongoose.model('VoiceAiConfig', voiceAiConfigSchema)
