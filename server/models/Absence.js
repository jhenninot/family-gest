import mongoose from 'mongoose'

const absenceSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true },
  id: { type: Number, required: true },
  memberId: { type: Number, required: true },
  date: { type: String, required: true }, // Format YYYY-MM-DD
  type: { type: String, enum: ['absence', 'presence'], default: 'absence' }, // 'absence' ou 'presence'
  lunch: { type: Boolean, default: false }, // Absent/Présent au déjeuner
  dinner: { type: Boolean, default: false }, // Absent/Présent au dîner
  night: { type: Boolean, default: false }, // Absent/Présent la nuit
  note: { type: String, default: '', trim: true }, // Motif optionnel
  declaredBy: { type: Number, default: null } // ID de l'utilisateur ayant saisi la déclaration
}, { timestamps: true })

absenceSchema.index({ familyId: 1, id: 1 }, { unique: true })
absenceSchema.index({ familyId: 1, memberId: 1, date: 1 })

export default mongoose.model('Absence', absenceSchema)
