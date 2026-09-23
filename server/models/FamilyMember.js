import mongoose from 'mongoose'
import { DAY_KEYS } from '../../shared/presence.js'

// Présence habituelle d'un créneau (midi / soir / nuit) pour un jour de la semaine.
const daySlotsSchema = new mongoose.Schema({
  lunch: { type: Boolean, default: true },
  dinner: { type: Boolean, default: true },
  night: { type: Boolean, default: true }
}, { _id: false, minimize: false })

// Grille d'une semaine type : 7 jours × 3 créneaux, à clés nommées ('mon' … 'sun').
// Clés nommées plutôt qu'un tableau indexé : le repo mélange les conventions JS (0 = dimanche)
// et ISO (0 = lundi), un tableau rouvrirait cette ambiguïté à chaque lecture.
const weekGridSchema = new mongoose.Schema(
  Object.fromEntries(DAY_KEYS.map(d => [d, { type: daySlotsSchema, default: () => ({}) }])),
  { _id: false, minimize: false }
)

const familyMemberSchema = new mongoose.Schema({
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true,
    index: true
  },
  userId: {
    type: Number,
    required: true,
    index: true
  },
  userRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  role: {
    type: String,
    default: 'Membre',
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  // Valeur du mode simple, ET dénormalisation grossière du mode hebdomadaire. Conservée parce
  // qu'elle est sérialisée par une vingtaine de routes, l'export RGPD et l'outil MCP
  // list_members : la réécrire (via summarizeUsualPresence) à CHAQUE sauvegarde de
  // usualPresenceConfig, sinon ces consommateurs se mettent à mentir.
  usualPresence: {
    type: String,
    enum: ['present', 'absent'],
    default: 'present'
  },
  // Présence habituelle détaillée : par jour de la semaine et par créneau, avec alternance
  // optionnelle semaine A / semaine B (garde alternée). La phase A/B d'une date se calcule à
  // partir de Family.presenceWeekAnchor — voir weekPhaseFor() dans shared/presence.js.
  //
  // Un membre créé avant cette fonctionnalité n'a pas ce sous-document : toute lecture doit
  // passer par normalizeUsualPresenceConfig(), qui retombe alors sur usualPresence.
  // 'alternating' est distinct de 'mode' pour pouvoir désactiver l'alternance sans perdre weekB.
  usualPresenceConfig: {
    mode: { type: String, enum: ['simple', 'weekly'], default: 'simple' },
    alternating: { type: Boolean, default: false }, // false => weekA s'applique toutes les semaines
    weekA: { type: weekGridSchema, default: () => ({}) },
    weekB: { type: weekGridSchema, default: () => ({}) }
  },
  points: {
    type: Number,
    default: 0
  }
  // Les préférences de notification (push/email) ont été retirées d'ici : elles sont désormais
  // gérées au niveau du compte utilisateur (User.notificationPreferences), valables sur toutes
  // les familles — un administrateur de famille ne peut plus les forcer pour un autre membre.
}, { timestamps: true })

familyMemberSchema.index({ familyId: 1, userId: 1 }, { unique: true })

export default mongoose.model('FamilyMember', familyMemberSchema)
