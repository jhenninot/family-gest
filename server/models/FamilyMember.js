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
  },
  pushNotificationsEnabled: {
    type: Boolean,
    default: true
  },
  emailNotificationsEnabled: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

familyMemberSchema.index({ familyId: 1, userId: 1 }, { unique: true })

export default mongoose.model('FamilyMember', familyMemberSchema)
