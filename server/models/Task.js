import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  category: { type: String, default: 'Maison' },
  assignedTo: { type: Number, required: true },
  priority: { type: String, default: 'Moyenne' },
  points: { type: Number, default: 10 },
  completed: { type: Boolean, default: false },
  dueDate: { type: String }
}, { timestamps: true })

export default mongoose.model('Task', taskSchema)
