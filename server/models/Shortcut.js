import mongoose from 'mongoose'

const shortcutSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  url: { type: String, required: true },
  icon: { type: String, default: '🌐' },
  order: { type: Number, default: 0 }
}, { timestamps: true })

export default mongoose.model('Shortcut', shortcutSchema)
