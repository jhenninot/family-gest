import mongoose from 'mongoose'

const expenseSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  payerId: { type: Number, required: true },
  category: { type: String, default: 'Alimentation' },
  date: { type: String, required: true }
}, { timestamps: true })

export default mongoose.model('Expense', expenseSchema)
