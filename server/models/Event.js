import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true },
  id: { type: Number, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String },
  category: { type: String, default: 'Famille' },
  location: { type: String },
  color: { type: String, default: '#8b5cf6' },
  assignedTo: { type: Number }
}, { timestamps: true })

eventSchema.index({ familyId: 1, id: 1 }, { unique: true })

export default mongoose.model('Event', eventSchema)
