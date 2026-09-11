import mongoose from 'mongoose'

const globalConfigSchema = new mongoose.Schema({
  serverUrl: {
    type: String,
    default: 'http://localhost:5173',
    trim: true
  },
  providerPreset: {
    type: String,
    enum: ['gmail', 'outlook', 'yahoo', 'custom'],
    default: 'gmail'
  },
  host: {
    type: String,
    default: 'smtp.gmail.com'
  },
  port: {
    type: Number,
    default: 587
  },
  secure: {
    type: Boolean,
    default: false
  },
  user: {
    type: String,
    default: ''
  },
  pass: {
    type: String,
    default: ''
  },
  fromEmail: {
    type: String,
    default: ''
  },
  fromName: {
    type: String,
    default: 'FamilyGest Platform'
  },
  isConfigured: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

export default mongoose.model('GlobalConfig', globalConfigSchema)
