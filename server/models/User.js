import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  isSuperAdmin: { type: Boolean, default: false },
  role: { type: String, default: 'Membre' },
  avatar: { type: String, default: '👤' },
  color: { type: String, default: '#6366f1' },
  points: { type: Number, default: 0 },
  lastLogin: { type: Date, default: Date.now },
  welcomeToken: { type: String, default: null },
  welcomeTokenExpires: { type: Date, default: null },
  pushNotificationsEnabled: { type: Boolean, default: true },
  emailNotificationsEnabled: { type: Boolean, default: false },
  usualPresence: { type: String, enum: ['present', 'absent'], default: 'present' }
}, { timestamps: true })

// Pre-save hook to hash password if modified (Mongoose 8 async hook syntax without callback parameters)
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  // Ne pas ré-encoder si le mot de passe est déjà un hash bcrypt valide
  if (typeof this.password === 'string' && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

// Method to compare candidate password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password)
}

export default mongoose.model('User', userSchema)
