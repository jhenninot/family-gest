import mongoose from 'mongoose'

const pushSubscriptionSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  endpoint: { type: String, required: true, unique: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  userAgent: { type: String, default: '' },
  // Refus consécutifs du service de notification (voir server/utils/pushFailures.js)
  failureCount: { type: Number, default: 0 }
}, { timestamps: true })

export default mongoose.model('PushSubscription', pushSubscriptionSchema)
