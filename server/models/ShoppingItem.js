import mongoose from 'mongoose'

const shoppingItemSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, default: 'Frais' },
  quantity: { type: Number, default: 1 },
  urgent: { type: Boolean, default: false },
  checked: { type: Boolean, default: false }
}, { timestamps: true })

export default mongoose.model('ShoppingItem', shoppingItemSchema)
