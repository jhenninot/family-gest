import mongoose from 'mongoose'

const shoppingCategorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '🛒' },
  rank: { type: Number, required: true, default: 0 }
}, { timestamps: true })

shoppingCategorySchema.index({ rank: 1 })

export default mongoose.model('ShoppingCategory', shoppingCategorySchema)
