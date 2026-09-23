import mongoose from 'mongoose'

const familySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  maxMembers: {
    type: Number,
    default: 10,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Lundi de référence de l'alternance des présences habituelles : les semaines civiles
  // contenant ce lundi, +2, +4… sont des « semaines A », les autres des « semaines B ».
  //
  // L'ancrage est au niveau de la famille et non du membre : « semaine A » doit désigner la
  // même semaine civile pour tout le monde (badge du calendrier, récapitulatif quotidien,
  // grille de chaque membre). Deux parents en phases opposées s'expriment en inversant leurs
  // grilles, pas leur ancrage — c'est ce que fait le bouton « Inverser A et B ».
  //
  // Le défaut est un lundi fixe et arbitraire : la parité reste ainsi déterministe et partagée
  // sans qu'aucune famille existante ait besoin d'être migrée.
  presenceWeekAnchor: {
    type: String,
    default: '1970-01-05'
  }
}, { timestamps: true })

familySchema.index({ slug: 1 })

export default mongoose.model('Family', familySchema)
