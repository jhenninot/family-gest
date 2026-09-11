import mongoose from 'mongoose'

const shoppingCategorySchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true },
  id: { type: Number, required: true },
  name: { type: String, required: true, trim: true },
  icon: { type: String, default: '🛒' },
  rank: { type: Number, required: true, default: 0 }
}, { timestamps: true })

shoppingCategorySchema.index({ familyId: 1, id: 1 }, { unique: true })
shoppingCategorySchema.index({ familyId: 1, rank: 1 })

export default mongoose.model('ShoppingCategory', shoppingCategorySchema)
