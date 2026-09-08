import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import { seedDatabaseIfEmpty } from './seed.js'
import { requireAuth, requireAdmin, generateToken } from './middleware/auth.js'

import User from './models/User.js'
import Task from './models/Task.js'
import Event from './models/Event.js'
import Expense from './models/Expense.js'
import ShoppingItem from './models/ShoppingItem.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API FamilyGest, Authentification & MongoDB opérationnelles' })
})

// === AUTHENTICATION ROUTES ===

// POST /api/auth/login (Connexion par email & mot de passe)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Veuillez saisir une adresse email et un mot de passe' })
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return res.status(401).json({ error: 'Adresse email ou mot de passe incorrect' })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Adresse email ou mot de passe incorrect' })
    }

    const token = generateToken(user.id, user.email, user.isAdmin)

    res.json({
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role,
        avatar: user.avatar,
        color: user.color,
        points: user.points
      }
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/register (Création d'un membre/utilisateur - Réservé aux Administrateurs)
app.post('/api/auth/register', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, avatar, color, isAdmin } = req.body

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Champs nom, prénom, email et mot de passe requis' })
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cette adresse email existe déjà' })
    }

    const newUser = new User({
      id: Date.now(),
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      password,
      isAdmin: Boolean(isAdmin),
      role: role || 'Membre',
      avatar: avatar || '👤',
      color: color || '#6366f1',
      points: 0
    })

    await newUser.save()

    res.status(201).json({
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      name: `${newUser.firstName} ${newUser.lastName}`,
      email: newUser.email,
      isAdmin: newUser.isAdmin,
      role: newUser.role,
      avatar: newUser.avatar,
      color: newUser.color,
      points: newUser.points
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// GET /api/auth/me (Profil utilisateur connecté)
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    name: `${req.user.firstName} ${req.user.lastName}`,
    email: req.user.email,
    isAdmin: req.user.isAdmin,
    role: req.user.role,
    avatar: req.user.avatar,
    color: req.user.color,
    points: req.user.points
  })
})

// PUT /api/auth/profile (Modification de ses propres informations par l'utilisateur)
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id })
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })

    const { firstName, lastName, email, password, role, avatar, color } = req.body

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()
    if (role) user.role = role
    if (avatar) user.avatar = avatar
    if (color) user.color = color

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() })
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: 'Cette adresse email est déjà utilisée par un autre compte' })
      }
      user.email = email.toLowerCase().trim()
    }

    if (password && password.trim().length > 0) {
      user.password = password.trim()
    }

    await user.save()

    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      avatar: user.avatar,
      color: user.color,
      points: user.points
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEMBERS ROUTES ===
app.get('/api/members', requireAuth, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ points: -1 })
    const members = users.map(u => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      isAdmin: u.isAdmin,
      role: u.role,
      avatar: u.avatar,
      color: u.color,
      points: u.points
    }))
    res.json(members)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Ajouter un membre : Réservé à l'Administrateur
app.post('/api/members', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, role, avatar, color, points, isAdmin } = req.body

    const fName = firstName || (name ? name.split(' ')[0] : 'Membre')
    const lName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : 'Famille')
    const userEmail = email ? email.toLowerCase().trim() : `membre.${Date.now()}@family-gest.org`
    const userPassword = password || 'Family123!'

    const existingUser = await User.findOne({ email: userEmail })
    if (existingUser) {
      return res.status(400).json({ error: 'Un membre avec cet email existe déjà' })
    }

    const newUser = new User({
      id: Date.now(),
      firstName: fName,
      lastName: lName,
      email: userEmail,
      password: userPassword,
      isAdmin: Boolean(isAdmin),
      role: role || (isAdmin ? 'Administrateur' : 'Membre'),
      avatar: avatar || '👤',
      color: color || '#6366f1',
      points: Number(points) || 0
    })

    await newUser.save()

    res.status(201).json({
      id: newUser.id,
      name: `${newUser.firstName} ${newUser.lastName}`,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      isAdmin: newUser.isAdmin,
      role: newUser.role,
      avatar: newUser.avatar,
      color: newUser.color,
      points: newUser.points
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Modifier le statut Administrateur d'un membre : Réservé à l'Administrateur
app.put('/api/members/:id/toggle-admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Membre non trouvé' })

    if (user.id === req.user.id && user.isAdmin) {
      return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres privilèges d\'administrateur' })
    }

    user.isAdmin = !user.isAdmin
    await user.save()

    res.json({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isAdmin: user.isAdmin,
      role: user.role,
      avatar: user.avatar,
      color: user.color,
      points: user.points
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Supprimer un membre : Réservé à l'Administrateur
app.delete('/api/members/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    if (req.user.id === memberId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte administrateur' })
    }
    await User.deleteOne({ id: memberId })
    res.json({ message: 'Membre supprimé par l\'administrateur' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === TASKS ROUTES ===
app.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 })
    res.json(tasks)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/tasks', requireAuth, async (req, res) => {
  try {
    const newTask = new Task({
      id: Date.now(),
      title: req.body.title,
      category: req.body.category || 'Maison',
      assignedTo: Number(req.body.assignedTo),
      priority: req.body.priority || 'Moyenne',
      points: Number(req.body.points) || 10,
      completed: false,
      dueDate: req.body.dueDate
    })
    await newTask.save()
    res.status(201).json(newTask)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/tasks/:id/toggle', requireAuth, async (req, res) => {
  try {
    const task = await Task.findOne({ id: Number(req.params.id) })
    if (!task) return res.status(404).json({ error: 'Tâche non trouvée' })

    task.completed = !task.completed
    await task.save()

    const user = await User.findOne({ id: task.assignedTo })
    if (user) {
      if (task.completed) {
        user.points += task.points
      } else {
        user.points = Math.max(0, user.points - task.points)
      }
      await user.save()
    }

    res.json(task)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    await Task.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Tâche supprimée' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === EVENTS ROUTES ===
app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 })
    res.json(events)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/events', requireAuth, async (req, res) => {
  try {
    const newEvent = new Event({
      id: Date.now(),
      title: req.body.title,
      date: req.body.date,
      time: req.body.time,
      category: req.body.category || 'Famille',
      location: req.body.location,
      color: req.body.color || '#8b5cf6',
      assignedTo: req.body.assignedTo
    })
    await newEvent.save()
    res.status(201).json(newEvent)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/events/:id', requireAuth, async (req, res) => {
  try {
    await Event.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Événement supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === EXPENSES ROUTES ===
app.get('/api/expenses', requireAuth, async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ date: -1 })
    res.json(expenses)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/expenses', requireAuth, async (req, res) => {
  try {
    const newExpense = new Expense({
      id: Date.now(),
      title: req.body.title,
      amount: Number(req.body.amount),
      payerId: Number(req.body.payerId),
      category: req.body.category || 'Alimentation',
      date: req.body.date || new Date().toISOString().split('T')[0]
    })
    await newExpense.save()
    res.status(201).json(newExpense)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/expenses/:id', requireAuth, async (req, res) => {
  try {
    await Expense.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Dépense supprimée' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === SHOPPING ROUTES ===
app.get('/api/shopping', requireAuth, async (req, res) => {
  try {
    const items = await ShoppingItem.find().sort({ createdAt: -1 })
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shopping', requireAuth, async (req, res) => {
  try {
    const newItem = new ShoppingItem({
      id: Date.now(),
      name: req.body.name,
      category: req.body.category || 'Frais',
      quantity: Number(req.body.quantity) || 1,
      urgent: Boolean(req.body.urgent),
      checked: false
    })
    await newItem.save()
    res.status(201).json(newItem)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/shopping/:id/toggle', requireAuth, async (req, res) => {
  try {
    const item = await ShoppingItem.findOne({ id: Number(req.params.id) })
    if (!item) return res.status(404).json({ error: 'Article non trouvé' })

    item.checked = !item.checked
    await item.save()
    res.json(item)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/shopping/:id', requireAuth, async (req, res) => {
  try {
    await ShoppingItem.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Article supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Start server
const startServer = async () => {
  await connectDB()
  await seedDatabaseIfEmpty()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur API Express Sécurisé démarré sur http://localhost:${PORT}`)
  })
}

startServer()
