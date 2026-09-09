import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { connectDB } from './config/db.js'
import { seedDatabaseIfEmpty } from './seed.js'
import { requireAuth, requireAdmin, generateToken } from './middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import nodemailer from 'nodemailer'

import User from './models/User.js'
import Task from './models/Task.js'
import Event from './models/Event.js'
import ShoppingItem from './models/ShoppingItem.js'
import EmailConfig from './models/EmailConfig.js'
import Shortcut from './models/Shortcut.js'
import Absence from './models/Absence.js'
import MealGuest from './models/MealGuest.js'

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

// Modifier un membre : Réservé à l'Administrateur
app.put('/api/members/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Membre non trouvé' })

    const { name, firstName, lastName, email, password, role, avatar, color, points, isAdmin } = req.body

    if (firstName) user.firstName = firstName.trim()
    if (lastName) user.lastName = lastName.trim()
    if (name && !firstName && !lastName) {
      user.firstName = name.split(' ')[0]
      user.lastName = name.split(' ').slice(1).join(' ') || user.lastName
    }

    if (role) user.role = role
    if (avatar) user.avatar = avatar
    if (color) user.color = color
    if (points !== undefined && points !== null) user.points = Number(points)

    if (isAdmin !== undefined && isAdmin !== null) {
      const newAdminState = Boolean(isAdmin)
      if (user.id === req.user.id && !newAdminState && user.isAdmin) {
        return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres privilèges d\'administrateur' })
      }
      if (user.isAdmin && !newAdminState) {
        const adminCount = await User.countDocuments({ isAdmin: true })
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Impossible de retirer le statut administrateur car il s\'agit du dernier administrateur du système.' })
        }
      }
      user.isAdmin = newAdminState
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() })
      if (existing && existing.id !== user.id) {
        return res.status(400).json({ error: 'Un membre avec cette adresse email existe déjà' })
      }
      user.email = email.toLowerCase().trim()
    }

    if (password && password.trim().length > 0) {
      user.password = password.trim()
    }

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

// Modifier le statut Administrateur d'un membre : Réservé à l'Administrateur
app.put('/api/members/:id/toggle-admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.id)
    const user = await User.findOne({ id: memberId })
    if (!user) return res.status(404).json({ error: 'Membre non trouvé' })

    if (user.id === req.user.id && user.isAdmin) {
      return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres privilèges d\'administrateur' })
    }

    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Impossible de retirer le statut administrateur car il s\'agit du dernier administrateur du système.' })
      }
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
    const member = await User.findOne({ id: memberId })
    if (!member) return res.status(404).json({ error: 'Membre non trouvé' })

    if (member.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer cet administrateur car il s\'agit du dernier administrateur du système.' })
      }
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

// === ABSENCES & MEALS ROUTES ===
app.get('/api/absences', requireAuth, async (req, res) => {
  try {
    const absences = await Absence.find().sort({ date: 1 })
    res.json(absences)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/absences', requireAuth, async (req, res) => {
  try {
    const { memberId, date, lunch, dinner, night, note } = req.body

    if (!memberId || !date) {
      return res.status(400).json({ error: 'Membre et date requis' })
    }

    if (!lunch && !dinner && !night) {
      return res.status(400).json({ error: 'Veuillez sélectionner au moins un créneau (Déjeuner, Dîner ou Nuit)' })
    }

    let existing = await Absence.findOne({ memberId: Number(memberId), date: date.trim() })
    if (existing) {
      existing.lunch = Boolean(lunch)
      existing.dinner = Boolean(dinner)
      existing.night = Boolean(night)
      if (note !== undefined) existing.note = note.trim()
      await existing.save()
      return res.json(existing)
    }

    const newAbsence = new Absence({
      id: Date.now(),
      memberId: Number(memberId),
      date: date.trim(),
      lunch: Boolean(lunch),
      dinner: Boolean(dinner),
      night: Boolean(night),
      note: (note || '').trim()
    })

    await newAbsence.save()
    res.status(201).json(newAbsence)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/absences/:id', requireAuth, async (req, res) => {
  try {
    const absence = await Absence.findOne({ id: Number(req.params.id) })
    if (!absence) return res.status(404).json({ error: 'Absence non trouvée' })

    if (absence.memberId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Vous ne pouvez modifier que vos propres absences' })
    }

    const { memberId, date, lunch, dinner, night, note } = req.body
    if (memberId !== undefined && req.user.isAdmin) absence.memberId = Number(memberId)
    if (date) absence.date = date.trim()
    if (lunch !== undefined) absence.lunch = Boolean(lunch)
    if (dinner !== undefined) absence.dinner = Boolean(dinner)
    if (night !== undefined) absence.night = Boolean(night)
    if (note !== undefined) absence.note = note.trim()

    if (!absence.lunch && !absence.dinner && !absence.night) {
      await Absence.deleteOne({ id: absence.id })
      return res.json({ message: 'Absence supprimée car aucun créneau n\'est sélectionné' })
    }

    await absence.save()
    res.json(absence)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/absences/:id', requireAuth, async (req, res) => {
  try {
    const absence = await Absence.findOne({ id: Number(req.params.id) })
    if (!absence) return res.status(404).json({ error: 'Absence non trouvée' })

    if (absence.memberId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Vous ne pouvez supprimer que vos propres absences' })
    }

    await Absence.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Absence supprimée' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === MEAL GUESTS ROUTES (INVITÉS AUX REPAS) ===
app.get('/api/meal-guests', requireAuth, async (req, res) => {
  try {
    const guests = await MealGuest.find().sort({ date: 1, createdAt: 1 })
    res.json(guests)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/meal-guests', requireAuth, async (req, res) => {
  try {
    const { name, names, date, lunch, dinner, night, invitedBy, note } = req.body

    if (!date) {
      return res.status(400).json({ error: 'La date est requise' })
    }

    if (!lunch && !dinner && !night) {
      return res.status(400).json({ error: 'Veuillez sélectionner au moins un créneau (Déjeuner, Dîner ou Nuit)' })
    }

    // Support single name or list of names (separated by commas or array)
    let guestNames = []
    if (Array.isArray(names) && names.length > 0) {
      guestNames = names.map(n => String(n).trim()).filter(Boolean)
    } else if (name && typeof name === 'string') {
      // Split by comma if user typed multiple names separated by comma
      guestNames = name.split(',').map(n => n.trim()).filter(Boolean)
    }

    if (guestNames.length === 0) {
      return res.status(400).json({ error: 'Veuillez renseigner le nom de l\'invité' })
    }

    const createdGuests = []
    const hostId = invitedBy ? Number(invitedBy) : req.user.id

    for (let i = 0; i < guestNames.length; i++) {
      const gName = guestNames[i]
      const newGuest = new MealGuest({
        id: Date.now() + i + Math.floor(Math.random() * 100),
        name: gName,
        date: date.trim(),
        lunch: Boolean(lunch),
        dinner: Boolean(dinner),
        night: Boolean(night),
        invitedBy: hostId,
        note: (note || '').trim()
      })
      await newGuest.save()
      createdGuests.push(newGuest)
    }

    // Return the created guest or array of guests
    if (createdGuests.length === 1) {
      res.status(201).json(createdGuests[0])
    } else {
      res.status(201).json(createdGuests)
    }
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/meal-guests/:id', requireAuth, async (req, res) => {
  try {
    const guest = await MealGuest.findOne({ id: Number(req.params.id) })
    if (!guest) return res.status(404).json({ error: 'Invité non trouvé' })

    const { name, date, lunch, dinner, night, invitedBy, note } = req.body
    if (name) guest.name = name.trim()
    if (date) guest.date = date.trim()
    if (lunch !== undefined) guest.lunch = Boolean(lunch)
    if (dinner !== undefined) guest.dinner = Boolean(dinner)
    if (night !== undefined) guest.night = Boolean(night)
    if (invitedBy !== undefined) guest.invitedBy = invitedBy ? Number(invitedBy) : null
    if (note !== undefined) guest.note = note.trim()

    if (!guest.lunch && !guest.dinner && !guest.night) {
      await MealGuest.deleteOne({ id: guest.id })
      return res.json({ message: 'Invité supprimé car aucun créneau n\'est sélectionné' })
    }

    await guest.save()
    res.json(guest)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/meal-guests/:id', requireAuth, async (req, res) => {
  try {
    const guest = await MealGuest.findOne({ id: Number(req.params.id) })
    if (!guest) return res.status(404).json({ error: 'Invité non trouvé' })

    await MealGuest.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Invité supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// === EMAIL SETTINGS ROUTES (ADMIN ONLY) ===
app.get('/api/settings/email', requireAuth, requireAdmin, async (req, res) => {
  try {
    let config = await EmailConfig.findOne()
    if (!config) {
      config = new EmailConfig()
      await config.save()
    }
    res.json({
      providerPreset: config.providerPreset || 'gmail',
      host: config.host || 'smtp.gmail.com',
      port: config.port || 587,
      secure: Boolean(config.secure),
      user: config.user || '',
      hasPassword: Boolean(config.pass && config.pass.length > 0),
      fromEmail: config.fromEmail || config.user || '',
      fromName: config.fromName || 'FamilyGest',
      isConfigured: Boolean(config.isConfigured)
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/settings/email', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { providerPreset, host, port, secure, user, pass, fromEmail, fromName } = req.body

    let config = await EmailConfig.findOne()
    if (!config) {
      config = new EmailConfig()
    }

    if (providerPreset) config.providerPreset = providerPreset
    if (host !== undefined) config.host = host.trim()
    if (port !== undefined) config.port = Number(port)
    if (secure !== undefined) config.secure = Boolean(secure)
    if (user !== undefined) config.user = user.trim()
    if (pass !== undefined && pass !== '') config.pass = pass.trim()
    if (fromEmail !== undefined) config.fromEmail = fromEmail.trim()
    if (fromName !== undefined) config.fromName = fromName.trim()

    config.isConfigured = Boolean(config.host && config.user && config.pass)
    await config.save()

    res.json({
      message: 'Configuration email enregistrée avec succès',
      providerPreset: config.providerPreset,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      hasPassword: Boolean(config.pass && config.pass.length > 0),
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      isConfigured: config.isConfigured
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/settings/email/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { recipientEmail } = req.body
    if (!recipientEmail || !recipientEmail.trim()) {
      return res.status(400).json({ error: 'Veuillez renseigner une adresse email destinataire' })
    }

    const config = await EmailConfig.findOne()
    if (!config || !config.host || !config.user || !config.pass) {
      return res.status(400).json({ error: 'Le serveur email n\'est pas encore configuré' })
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const mailOptions = {
      from: `"${config.fromName || 'FamilyGest'}" <${config.fromEmail || config.user}>`,
      to: recipientEmail.trim(),
      subject: '✨ Test de configuration Email - FamilyGest',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 12px; border: 1px solid #e0e7ff; background-color: #f8fafc;">
          <h2 style="color: #4f46e5; margin-top: 0;">🎉 Connexion Email Réussie !</h2>
          <p>Bonjour,</p>
          <p>Ceci est un message de test envoyé depuis votre application <strong>FamilyGest</strong>.</p>
          <p>Vos paramètres de serveur d'envoi Email (SMTP / IMAP) sont enregistrés et opérationnels :</p>
          <ul>
            <li><strong>Serveur :</strong> ${config.host}:${config.port}</li>
            <li><strong>Compte :</strong> ${config.user}</li>
            <li><strong>Expéditeur :</strong> ${config.fromName || 'FamilyGest'}</li>
          </ul>
          <p style="color: #64748b; font-size: 0.9em; margin-top: 30px;">Envoyé automatiquement par FamilyGest • Espace Familial</p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    res.json({ message: `Email de test envoyé avec succès à ${recipientEmail}` })
  } catch (err) {
    console.error('Erreur lors de l\'envoi de l\'email de test:', err)
    res.status(500).json({ error: `Échec de l'envoi de l'email : ${err.message}` })
  }
})

// === SHORTCUTS / APPS ROUTES ===
app.get('/api/shortcuts', requireAuth, async (req, res) => {
  try {
    const shortcuts = await Shortcut.find().sort({ order: 1, createdAt: 1 })
    res.json(shortcuts)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/shortcuts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, url, icon, order } = req.body
    if (!title || !url) {
      return res.status(400).json({ error: 'Le titre et l\'adresse URL sont requis' })
    }

    let validUrl = url.trim()
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = `https://${validUrl}`
    }

    const newShortcut = new Shortcut({
      id: Date.now(),
      title: title.trim(),
      url: validUrl,
      icon: icon ? icon.trim() : '🌐',
      order: Number(order) || 0
    })

    await newShortcut.save()
    res.status(201).json(newShortcut)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/shortcuts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const shortcut = await Shortcut.findOne({ id: Number(req.params.id) })
    if (!shortcut) return res.status(404).json({ error: 'Raccourci non trouvé' })

    const { title, url, icon, order } = req.body
    if (title) shortcut.title = title.trim()
    if (url) {
      let validUrl = url.trim()
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = `https://${validUrl}`
      }
      shortcut.url = validUrl
    }
    if (icon !== undefined) shortcut.icon = icon.trim() || '🌐'
    if (order !== undefined) shortcut.order = Number(order) || 0

    await shortcut.save()
    res.json(shortcut)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/shortcuts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Shortcut.deleteOne({ id: Number(req.params.id) })
    res.json({ message: 'Raccourci supprimé' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// === STATIC FILES & SPA FALLBACK (Production / Docker) ===
const distPath = path.resolve(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  console.log(`📦 Fichiers frontend détectés (${distPath}) : activation du service statique`)
  app.use(express.static(distPath))

  // Redirection SPA vers index.html pour les pages client (hors /api)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Start server
const startServer = async () => {
  await connectDB()
  await seedDatabaseIfEmpty()

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur API Express Sécurisé démarré sur http://localhost:${PORT}`)
  })
}

startServer()
