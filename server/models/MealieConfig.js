import mongoose from 'mongoose'
import { encryptSecret, decryptSecret } from '../utils/secretCrypto.js'

// Connexion d'une famille à son serveur Mealie (gestionnaire de recettes auto-hébergé) : permet de
// chercher une recette Mealie lors de l'ajout d'un repas. Le jeton d'API est chiffré au repos et
// n'est jamais renvoyé au client : toutes les requêtes vers Mealie passent par le serveur
// (routes /api/mealie/* de server/index.js).
const mealieConfigSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, unique: true },
  baseUrl: { type: String, required: true, trim: true }, // ex: https://mealie.exemple.fr (sans / final)
  apiToken: { type: String, required: true, set: encryptSecret, get: decryptSecret },
  tokenPreview: { type: String, default: '' },
  // Slug du groupe Mealie du compte associé au jeton : nécessaire pour construire les liens
  // publics vers les recettes (/g/<groupSlug>/r/<recipeSlug>) depuis Mealie v1.
  groupSlug: { type: String, default: '' },
  updatedByUserId: { type: Number, default: null }
}, { timestamps: true })

export default mongoose.model('MealieConfig', mealieConfigSchema)
