import mongoose from 'mongoose'

const mealSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true },
  id: { type: Number, required: true },
  date: { type: String, required: true }, // Format YYYY-MM-DD
  slot: { type: String, enum: ['lunch', 'dinner'], required: true }, // 'lunch' (midi) ou 'dinner' (soir)
  dish: { type: String, required: true, trim: true }, // Intitulé du plat / texte libre
  suggestedBy: { type: Number, default: null }, // ID utilisateur (User.id) qui suggère
  notes: { type: String, default: '', trim: true }, // Remarques ou détails facultatifs
  recipeUrl: { type: String, default: '', trim: true }, // Lien vers la recette (ex: recette Mealie)
  recipeImageUrl: { type: String, default: '', trim: true } // Image de la recette liée (Mealie)
}, { timestamps: true })

mealSchema.index({ familyId: 1, id: 1 }, { unique: true })
mealSchema.index({ familyId: 1, date: 1 })

export default mongoose.model('Meal', mealSchema)
