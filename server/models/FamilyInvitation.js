import mongoose from 'mongoose'

const familyInvitationSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  familyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Family',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
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
  invitedBy: {
    type: Number,
    default: null
  },
  firstName: {
    type: String,
    default: ''
  },
  lastName: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, { timestamps: true })

familyInvitationSchema.index({ token: 1 })
familyInvitationSchema.index({ email: 1, familyId: 1 })

export default mongoose.model('FamilyInvitation', familyInvitationSchema)
