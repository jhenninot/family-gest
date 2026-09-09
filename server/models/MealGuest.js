import mongoose from 'mongoose'

const mealGuestSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true }, // Un seul champ pour nom et prénom
  date: { type: String, required: true }, // Format YYYY-MM-DD
  lunch: { type: Boolean, default: false }, // Présent au déjeuner (midi)
  dinner: { type: Boolean, default: false }, // Présent au dîner (soir)
  night: { type: Boolean, default: false }, // Dort à la maison (nuit)
  invitedBy: { type: Number, default: null }, // ID du membre qui invite (optionnel)
  note: { type: String, default: '', trim: true } // Remarques éventuelles
}, { timestamps: true })

export default mongoose.model('MealGuest', mealGuestSchema)
