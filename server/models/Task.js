import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', index: true },
  id: { type: Number, required: true },
  title: { type: String, required: true },
  category: { type: String, default: 'Maison' },
  assignedTo: { type: Number, required: true },
  priority: { type: String, default: 'Moyenne' },
  points: { type: Number, default: 10 },
  completed: { type: Boolean, default: false },
  dueDate: { type: String }
}, { timestamps: true })

taskSchema.index({ familyId: 1, id: 1 }, { unique: true })

export default mongoose.model('Task', taskSchema)
