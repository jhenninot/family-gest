import mongoose from 'mongoose'

const pushConfigSchema = new mongoose.Schema({
  publicKey: { type: String, required: true },
  privateKey: { type: String, required: true }
}, { timestamps: true })

export default mongoose.model('PushConfig', pushConfigSchema)
