import mongoose from 'mongoose'

// Nombre d'utilisations des assistants par famille, par canal et par jour (statistiques de la
// console Super Admin, voir server/stats/channels.js). Aucun contenu : un compteur et une date.
const usageCounterSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true },
  channel: { type: String, enum: ['alexa', 'mcp', 'voice'], required: true },
  day: { type: String, required: true }, // AAAA-MM-JJ (UTC)
  count: { type: Number, default: 0 },
  lastAt: { type: Date, default: null },
  // Purge automatique après ~13 mois
  expireAt: { type: Date, required: true }
})

usageCounterSchema.index({ familyId: 1, channel: 1, day: 1 }, { unique: true })
usageCounterSchema.index({ day: 1 })
usageCounterSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.model('UsageCounter', usageCounterSchema)
