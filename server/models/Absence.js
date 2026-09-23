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
  declaredBy: { type: Number, default: null }, // ID de l'utilisateur ayant saisi la déclaration
  longAbsenceId: { type: Number, default: null, index: true }, // ID de l'absence longue parente
  eventId: { type: Number, default: null, index: true }, // ID de l'événement d'agenda à l'origine de cette absence
  recurrenceId: { type: Number, default: null, index: true } // ID de la série d'événements récurrents à l'origine de cette absence
}, { timestamps: true })

absenceSchema.index({ familyId: 1, id: 1 }, { unique: true })
absenceSchema.index({ familyId: 1, memberId: 1, date: 1 })
// Une ligne 'absence' et une ligne 'presence' peuvent coexister pour un même membre et une même
// date : c'est ce qui permet d'être absent à midi mais exceptionnellement présent le soir, et de
// ne plus écraser une présence exceptionnelle quand une absence longue couvre le même jour.
//
// NON unique, volontairement : des doublons (membre, date, type) préexistent en base, créés par
// la génération d'absences depuis les événements d'agenda qui ne passe pas par
// upsertAbsenceRecord. Un index unique ferait échouer la construction des index à chaque
// démarrage. Le départage se fait à la lecture, par pickDeclaredRecord() (shared/presence.js).
absenceSchema.index({ familyId: 1, memberId: 1, date: 1, type: 1 })

export default mongoose.model('Absence', absenceSchema)
