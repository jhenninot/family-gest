import mongoose from 'mongoose'

const shortcutSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true },
  id: { type: Number, required: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  icon: { type: String, default: '🌐' },
  order: { type: Number, default: 0 }
}, { timestamps: true })

shortcutSchema.index({ familyId: 1, id: 1 }, { unique: true })

export default mongoose.model('Shortcut', shortcutSchema)
