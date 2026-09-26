import cron from 'node-cron'
import { runDailyDigest } from './runDigest.js'
import { runTaskDueReminders } from './taskReminders.js'

// Empêche deux exécutions simultanées (tick planifié + déclenchement manuel depuis la console
// Super Admin, ou double-clic sur le bouton d'envoi immédiat).
let isDigestRunning = false

const runDigestSafely = async (ctx, { onSkip } = {}) => {
  if (isDigestRunning) {
    onSkip?.()
    return false
  }
  isDigestRunning = true
  try {
    await runDailyDigest(ctx)
    return true
  } finally {
    isDigestRunning = false
  }
}

const getNowParts = (timezone) => {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now)
  const lookup = Object.fromEntries(parts.map(p => [p.type, p.value]))
  return {
    dateStr: `${lookup.year}-${lookup.month}-${lookup.day}`,
    hour: Number(lookup.hour),
    minute: Number(lookup.minute)
  }
}

// Planifie le récapitulatif quotidien avec une heure configurable dynamiquement par le Super
// Administrateur (GlobalConfig.digestHour/digestMinute), sans redémarrage du serveur : plutôt
// qu'un node-cron à expression figée, le job tourne toutes les minutes et compare l'heure
// courante (dans DIGEST_TIMEZONE) au réglage lu en base à chaque tick. Le champ
// lastDigestRunDate (persisté) empêche un double envoi si le tick correspond plusieurs fois le
// même jour (dérive d'horloge, redémarrage pendant la minute concernée) — suffisant pour ce
// déploiement mono-conteneur (pas de risque multi-instance, voir DOCKGE.md).
export const startDigestScheduler = (ctx) => {
  const timezone = process.env.DIGEST_TIMEZONE || 'Europe/Paris'

  cron.schedule('* * * * *', async () => {
    try {
      const { dateStr, hour, minute } = getNowParts(timezone)

      let config = await ctx.GlobalConfig.findOne()
      if (!config) return

      const targetHour = config.digestHour ?? 8
      const targetMinute = config.digestMinute ?? 0

      if (hour !== targetHour || minute !== targetMinute) return
      if (config.lastDigestRunDate === dateStr) return

      // Verrouille immédiatement avant l'envoi (potentiellement long) pour éviter qu'un tick
      // concurrent ne relance l'envoi pendant que celui-ci est en cours.
      config.lastDigestRunDate = dateStr
      await config.save()

      console.log(`[Digest] Déclenchement du récapitulatif quotidien (${dateStr} ${hour}:${String(minute).padStart(2, '0')} ${timezone})`)
      try {
        await runDigestSafely(ctx, {
          onSkip: () => console.log('[Digest] Tick ignoré : un envoi est déjà en cours (probablement déclenché manuellement).')
        })
        console.log('[Digest] Récapitulatif quotidien terminé.')
      } catch (err) {
        console.error('[Digest] Erreur lors de l\'envoi du récapitulatif quotidien:', err.message)
      }

      // Rappel des tâches à échéance, à la même heure (même verrou quotidien lastDigestRunDate),
      // envoyé même si le récapitulatif a échoué.
      await runTaskDueReminders(ctx, dateStr)
      console.log('[TaskReminders] Rappels des tâches à échéance envoyés.')
    } catch (err) {
      console.error('[Digest] Erreur planificateur récapitulatif quotidien:', err.message)
    }
  }, { timezone })

  console.log(`[Digest] Planificateur enregistré (vérification chaque minute, fuseau="${timezone}", heure configurable depuis la console Super Admin)`)
}

// Route Super Admin permettant de déclencher immédiatement un envoi du récapitulatif quotidien
// (aux utilisateurs y ayant souscrit), sans attendre l'heure planifiée. L'envoi se fait en tâche
// de fond : la réponse HTTP ne bloque pas le temps du traitement de tous les comptes.
export const mountDigestAdminRoutes = (app, ctx, { requireAuth, requireSuperAdmin }) => {
  app.post('/api/super-admin/digest/send-now', requireAuth, requireSuperAdmin, async (req, res) => {
    if (isDigestRunning) {
      return res.status(409).json({ error: req.t('errors.digestAlreadyRunning') })
    }

    res.json({ message: req.t('messages.digestTriggered') })

    runDigestSafely(ctx).catch(err => console.error('[Digest] Erreur lors de l\'envoi manuel:', err.message))
  })
}
