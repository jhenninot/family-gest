import mongoose from 'mongoose'

// Journal des alertes envoyées (push, email) : consulté depuis la console Super Admin.
// Rétention : purge automatique après 90 jours via l'index TTL ci-dessous.
const alertLogSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', default: null },
  familyName: { type: String, default: null },
  actorUserId: { type: Number, default: null },
  actorName: { type: String, default: 'Système' },
  action: { type: String, required: true },
  actionLabel: { type: String, required: true },
  title: { type: String, default: '' },
  targetType: { type: String, default: null },
  targetId: { type: String, default: null },
  channels: [{
    type: { type: String, enum: ['push', 'email'], required: true },
    status: { type: String, enum: ['sent', 'skipped', 'error'], required: true },
    recipientCount: { type: Number, default: 0 },
    recipients: [{
      userId: { type: Number, default: null },
      name: { type: String, default: '' },
      email: { type: String, default: '' }
    }],
    reason: { type: String, default: null }
  }]
}, { timestamps: true })

alertLogSchema.index({ familyId: 1, createdAt: -1 })
alertLogSchema.index({ action: 1, createdAt: -1 })
// TTL : purge automatique des entrées de plus de 90 jours
alertLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 })

export default mongoose.model('AlertLog', alertLogSchema)
