import mongoose from 'mongoose'

const longAbsenceSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true, required: true },
  id: { type: Number, required: true },
  memberId: { type: Number, required: true },
  startDate: { type: String, required: true }, // Format YYYY-MM-DD
  startSlot: { type: String, enum: ['lunch', 'dinner', 'night'], default: 'lunch' },
  endDate: { type: String, required: true }, // Format YYYY-MM-DD
  endSlot: { type: String, enum: ['lunch', 'dinner', 'night'], default: 'night' },
  note: { type: String, default: '', trim: true },
  declaredBy: { type: Number, default: null },
  // Absence générée par un événement sur plusieurs jours (supprimée ou mise à jour avec lui)
  eventId: { type: Number, default: null, index: true }
}, { timestamps: true })

longAbsenceSchema.index({ familyId: 1, id: 1 }, { unique: true })
longAbsenceSchema.index({ familyId: 1, memberId: 1, startDate: 1, endDate: 1 })

export default mongoose.model('LongAbsence', longAbsenceSchema)
