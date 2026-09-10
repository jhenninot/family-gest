import mongoose from 'mongoose'

const absenceSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  memberId: { type: Number, required: true },
  date: { type: String, required: true }, // Format YYYY-MM-DD
  type: { type: String, enum: ['absence', 'presence'], default: 'absence' }, // 'absence' ou 'presence'
  lunch: { type: Boolean, default: false }, // Absent/Présent au déjeuner
  dinner: { type: Boolean, default: false }, // Absent/Présent au dîner
  night: { type: Boolean, default: false }, // Absent/Présent la nuit
  note: { type: String, default: '', trim: true } // Motif optionnel
}, { timestamps: true })

export default mongoose.model('Absence', absenceSchema)
