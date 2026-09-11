import mongoose from 'mongoose'

const shoppingItemSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true },
  id: { type: Number, required: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Frais' },
  quantity: { type: Number, default: 1 },
  urgent: { type: Boolean, default: false },
  checked: { type: Boolean, default: false }
}, { timestamps: true })

shoppingItemSchema.index({ familyId: 1, id: 1 }, { unique: true })

export default mongoose.model('ShoppingItem', shoppingItemSchema)
