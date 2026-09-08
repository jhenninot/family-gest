import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String },
  category: { type: String, default: 'Famille' },
  location: { type: String },
  color: { type: String, default: '#8b5cf6' },
  assignedTo: { type: Number }
}, { timestamps: true })

export default mongoose.model('Event', eventSchema)
