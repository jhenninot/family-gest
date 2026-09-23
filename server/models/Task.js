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
  notes: { type: String, default: '', trim: true }, // Description libre
  dueDate: { type: String, default: null } // Échéance « AAAA-MM-JJ » : urgente et rappelée chaque jour une fois atteinte
}, { timestamps: true })

taskSchema.index({ familyId: 1, id: 1 }, { unique: true })

export default mongoose.model('Task', taskSchema)
