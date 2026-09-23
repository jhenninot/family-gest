import FamilyMember from '../models/FamilyMember.js'
import { fullGrid } from '../../shared/presence.js'

// Migration idempotente (sûre à ré-exécuter à chaque démarrage) : initialise la présence
// habituelle détaillée (usualPresenceConfig) des adhésions créées avant cette fonctionnalité.
//
// Elle n'est PAS indispensable au fonctionnement : normalizeUsualPresenceConfig() retombe de
// toute façon sur usualPresence quand la config est absente, et le mode reste 'simple', donc le
// comportement est strictement identique à avant. Son intérêt est ergonomique : quand la
// personne bascule pour la première fois en mode « personnalisé par jour », sa grille est
// pré-remplie avec son habitude actuelle plutôt qu'avec un « tout présent » arbitraire.
//
// Rien à migrer pour Family.presenceWeekAnchor : son défaut fixe rend la parité A/B
// déterministe sans écriture.
export const migrateUsualPresenceGrid = async () => {
  try {
    const membersToMigrate = await FamilyMember.find({ usualPresenceConfig: { $exists: false } })
    if (membersToMigrate.length === 0) return

    console.log(`🔄 [Migration] Initialisation de la présence habituelle détaillée pour ${membersToMigrate.length} adhésion(s)...`)

    for (const membership of membersToMigrate) {
      const base = membership.usualPresence !== 'absent'
      membership.usualPresenceConfig = {
        mode: 'simple',
        alternating: false,
        weekA: fullGrid(base),
        weekB: fullGrid(base)
      }
      await membership.save()
    }

    console.log('✅ [Migration] Présence habituelle détaillée initialisée avec succès.')
  } catch (error) {
    console.error('Erreur lors de la migration de la présence habituelle', error)
  }
}
