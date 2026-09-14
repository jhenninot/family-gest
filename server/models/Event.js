import mongoose from 'mongoose'

const eventSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true },
  id: { type: Number, required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String },
  endTime: { type: String },
  category: { type: String, default: 'Famille' },
  location: { type: String },
  color: { type: String, default: '#8b5cf6' },
  assignedTo: { type: Number },
  memberIds: { type: [Number], default: [] },
  recurrenceId: { type: Number, default: null, index: true }, // id de la 1ère occurrence de la série (null = événement simple)
  recurrence: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    interval: { type: Number, default: 1 },
    endDate: { type: String } // YYYY-MM-DD, dernière date possible de la série
  }
}, { timestamps: true })

eventSchema.index({ familyId: 1, id: 1 }, { unique: true })

export default mongoose.model('Event', eventSchema)
