import mongoose from 'mongoose'
import Family from '../models/Family.js'
import FamilyMember from '../models/FamilyMember.js'
import User from '../models/User.js'
import GlobalConfig from '../models/GlobalConfig.js'
import EmailConfig from '../models/EmailConfig.js'
import Task from '../models/Task.js'
import Event from '../models/Event.js'
import ShoppingItem from '../models/ShoppingItem.js'
import ShoppingCategory from '../models/ShoppingCategory.js'
import Shortcut from '../models/Shortcut.js'
import Absence from '../models/Absence.js'
import MealGuest from '../models/MealGuest.js'

export const migrateToMultiFamily = async () => {
  try {
    console.log('🔄 [Migration] Vérification de l\'état de la base de données multi-familles...')

    // 1. Trouver ou créer la famille par défaut
    let defaultFamily = await Family.findOne({ slug: 'famille-principale' })
    if (!defaultFamily) {
      defaultFamily = await Family.findOne()
    }

    if (!defaultFamily) {
      defaultFamily = new Family({
        name: 'Famille Principale',
        slug: 'famille-principale',
        maxMembers: 10,
        isActive: true
      })
      await defaultFamily.save()
      console.log(`✅ [Migration] Famille par défaut créée : "${defaultFamily.name}" (slug: ${defaultFamily.slug})`)
    }

    const familyId = defaultFamily._id

    // 2. Vérification du Super Administrateur
    const superAdminCount = await User.countDocuments({ isSuperAdmin: true })
    if (superAdminCount === 0) {
      // Trouver l'administrateur historique ou le premier utilisateur
      let primaryAdmin = await User.findOne({ isAdmin: true }).sort('id')
      if (!primaryAdmin) {
        primaryAdmin = await User.findOne().sort('id')
      }
      if (primaryAdmin) {
        primaryAdmin.isSuperAdmin = true
        await primaryAdmin.save()
        console.log(`👑 [Migration] Utilisateur ${primaryAdmin.email} (ID: ${primaryAdmin.id}) promu Super Administrateur`)
      }
    }

    // 3. Migration des utilisateurs orphelins vers FamilyMember pour la famille par défaut
    const allUsers = await User.find()
    for (const u of allUsers) {
      // Si l'utilisateur appartient déjà à au moins une famille, on ne le force pas dans la famille par défaut
      const anyMember = await FamilyMember.findOne({ userId: u.id })
      if (!anyMember) {
        const newMember = new FamilyMember({
          familyId,
          userId: u.id,
          userRef: u._id,
          role: u.role || 'Membre',
          isAdmin: Boolean(u.isAdmin || u.isSuperAdmin),
          usualPresence: u.usualPresence || 'present',
          points: typeof u.points === 'number' ? u.points : 0,
          pushNotificationsEnabled: u.pushNotificationsEnabled !== false,
          emailNotificationsEnabled: Boolean(u.emailNotificationsEnabled)
        })
        await newMember.save()
        console.log(`👤 [Migration] Membre orphelin ${u.firstName} ${u.lastName} (ID: ${u.id}) rattaché à "${defaultFamily.name}"`)
      }
    }

    // 4. Rattachement des entités orphelines à la famille par défaut
    const tasksUpdated = await Task.updateMany({ $or: [{ familyId: null }, { familyId: { $exists: false } }] }, { $set: { familyId } })
    if (tasksUpdated.modifiedCount > 0) {
      console.log(`📋 [Migration] ${tasksUpdated.modifiedCount} tâches rattachées à "${defaultFamily.name}"`)
    }

    const eventsUpdated = await Event.updateMany({ $or: [{ familyId: null }, { familyId: { $exists: false } }] }, { $set: { familyId } })
    if (eventsUpdated.modifiedCount > 0) {
      console.log(`📅 [Migration] ${eventsUpdated.modifiedCount} événements rattachés à "${defaultFamily.name}"`)
    }

    const shoppingUpdated = await ShoppingItem.updateMany({ $or: [{ familyId: null }, { familyId: { $exists: false } }] }, { $set: { familyId } })
    if (shoppingUpdated.modifiedCount > 0) {
      console.log(`🛒 [Migration] ${shoppingUpdated.modifiedCount} articles de courses rattachés à "${defaultFamily.name}"`)
    }

    const categoriesUpdated = await ShoppingCategory.updateMany({ $or: [{ familyId: null }, { familyId: { $exists: false } }] }, { $set: { familyId } })
    if (categoriesUpdated.modifiedCount > 0) {
      console.log(`🏷️ [Migration] ${categoriesUpdated.modifiedCount} catégories de courses rattachées à "${defaultFamily.name}"`)
    }

    const shortcutsUpdated = await Shortcut.updateMany({ $or: [{ familyId: null }, { familyId: { $exists: false } }] }, { $set: { familyId } })
    if (shortcutsUpdated.modifiedCount > 0) {
      console.log(`🌐 [Migration] ${shortcutsUpdated.modifiedCount} raccourcis rattachés à "${defaultFamily.name}"`)
    }

    const absencesUpdated = await Absence.updateMany({ $or: [{ familyId: null }, { familyId: { $exists: false } }] }, { $set: { familyId } })
    if (absencesUpdated.modifiedCount > 0) {
      console.log(`🟢 [Migration] ${absencesUpdated.modifiedCount} déclarations d'absence/présence rattachées à "${defaultFamily.name}"`)
    }

    const guestsUpdated = await MealGuest.updateMany({ $or: [{ familyId: null }, { familyId: { $exists: false } }] }, { $set: { familyId } })
    if (guestsUpdated.modifiedCount > 0) {
      console.log(`🍽️ [Migration] ${guestsUpdated.modifiedCount} invités repas rattachés à "${defaultFamily.name}"`)
    }

    // 5. Migration EmailConfig -> GlobalConfig & EmailConfig familial
    let existingEmailConfig = await EmailConfig.findOne({ $or: [{ familyId: null }, { familyId: { $exists: false } }] })
    if (existingEmailConfig) {
      existingEmailConfig.familyId = familyId
      await existingEmailConfig.save()
    }

    let globalConfig = await GlobalConfig.findOne()
    if (!globalConfig) {
      const source = existingEmailConfig || await EmailConfig.findOne()
      globalConfig = new GlobalConfig({
        serverUrl: source?.serverUrl || 'http://localhost:5173',
        providerPreset: source?.providerPreset || 'gmail',
        host: source?.host || 'smtp.gmail.com',
        port: source?.port || 587,
        secure: Boolean(source?.secure),
        user: source?.user || '',
        pass: source?.pass || '',
        fromEmail: source?.fromEmail || '',
        fromName: source?.fromName || 'FamilyGest Platform',
        isConfigured: Boolean(source?.isConfigured)
      })
      await globalConfig.save()
      console.log(`📧 [Migration] GlobalConfig initialisé avec succès depuis les paramètres existants`)
    }

    console.log('✅ [Migration] Migration multi-familles terminée avec succès.')
    return { success: true, defaultFamily }
  } catch (error) {
    console.error('❌ [Migration] Erreur lors de la migration multi-familles:', error)
    throw error
  }
}
