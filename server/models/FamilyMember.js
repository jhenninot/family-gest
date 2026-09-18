import mongoose from 'mongoose'

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
  usualPresence: {
    type: String,
    enum: ['present', 'absent'],
    default: 'present'
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
