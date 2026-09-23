import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  role: { type: String, default: 'Membre' },
  avatar: { type: String, default: '👤' },
  color: { type: String, default: '#6366f1' },
  points: { type: Number, default: 0 },
  lastLogin: { type: Date, default: Date.now },
  welcomeToken: { type: String, default: null },
  welcomeTokenExpires: { type: Date, default: null },
  // Champs historiques (dépréciés) — remplacés par notificationPreferences ci-dessous.
  // Conservés uniquement pour permettre à migrate-notification-preferences.js de lire leur
  // dernière valeur au démarrage ; plus jamais écrits par aucune route. À supprimer dans un
  // futur nettoyage une fois la migration considérée stabilisée en production.
  pushNotificationsEnabled: { type: Boolean, default: true },
  emailNotificationsEnabled: { type: Boolean, default: false },
  // Préférences de notification granulaires, au niveau du compte (valables sur toutes les
  // familles de l'utilisateur) — remplace le double modèle User+FamilyMember précédent.
  // Chemin imbriqué "classique" (pas de wrapper `type`) : les défauts de chaque booléen
  // suffisent, Mongoose les applique en cascade à la création d'un nouveau document.
  notificationPreferences: {
    presence: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    meals: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    tasks: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    // Rappel quotidien (à l'heure du récapitulatif) des tâches assignées dont l'échéance est
    // atteinte ou dépassée.
    taskReminders: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    events: {
      push: { type: Boolean, default: true },
      email: { type: Boolean, default: false }
    },
    // Le récapitulatif quotidien est un contenu multi-sections, plus adapté à l'email :
    // désactivé par push par défaut pour ne pas surprendre les comptes existants.
    digest: {
      push: { type: Boolean, default: false },
      email: { type: Boolean, default: true }
    }
  },
  usualPresence: { type: String, enum: ['present', 'absent'], default: 'present' }
}, { timestamps: true })

// Pre-save hook to hash password if modified (Mongoose 8 async hook syntax without callback parameters)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  // Ne pas ré-encoder si le mot de passe est déjà un hash bcrypt valide
  if (typeof this.password === 'string' && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare candidate password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

export default mongoose.model('User', userSchema)
