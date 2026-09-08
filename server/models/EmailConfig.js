import mongoose from 'mongoose'

const emailConfigSchema = new mongoose.Schema({
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
    default: 'FamilyGest'
  },
  isConfigured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

const EmailConfig = mongoose.model('EmailConfig', emailConfigSchema)

export default EmailConfig
