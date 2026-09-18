import User from '../models/User.js'

// Migration idempotente (sûre à ré-exécuter à chaque démarrage) : dérive les nouvelles
// préférences de notification granulaires (User.notificationPreferences) des anciens flags
// globaux du compte (pushNotificationsEnabled/emailNotificationsEnabled). On ne reprend pas
// les éventuels flags FamilyMember (qui pouvaient diverger par famille sous l'ancien système
// de contrôle admin, désormais supprimé) : le flag User est le plus fidèle à ce que la personne
// avait choisi elle-même pour son propre compte. Le récapitulatif quotidien reçoit toujours
// son défaut fixe (push désactivé, email activé), indépendamment des anciens flags.
export const migrateNotificationPreferences = async () => {
  try {
    const usersToMigrate = await User.find({ notificationPreferences: { $exists: false } })
    if (usersToMigrate.length === 0) return

    console.log(`🔄 [Migration] Génération des préférences de notification granulaires pour ${usersToMigrate.length} compte(s)...`)

    for (const user of usersToMigrate) {
      const legacyPush = user.pushNotificationsEnabled !== false
      const legacyEmail = Boolean(user.emailNotificationsEnabled)

      user.notificationPreferences = {
        presence: { push: legacyPush, email: legacyEmail },
        meals: { push: legacyPush, email: legacyEmail },
        tasks: { push: legacyPush, email: legacyEmail },
        events: { push: legacyPush, email: legacyEmail },
        digest: { push: false, email: true }
      }
      await user.save()
    }

    console.log('✅ [Migration] Préférences de notification granulaires générées avec succès.')
  } catch (error) {
    console.error('Erreur lors de la migration des préférences de notification', error)
  }
}
