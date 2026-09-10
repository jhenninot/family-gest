import mongoose from 'mongoose'

const memberSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Membre' },
  avatar: { type: String, default: '👤' },
  color: { type: String, default: '#6366f1' },
  points: { type: Number, default: 0 },
  usualPresence: { type: String, enum: ['present', 'absent'], default: 'present' }
}, { timestamps: true })

export default mongoose.model('Member', memberSchema)
