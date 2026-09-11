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
  }
}, { timestamps: true })

familySchema.index({ slug: 1 })

export default mongoose.model('Family', familySchema)
