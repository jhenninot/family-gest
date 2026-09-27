// Échecs d'envoi Web Push : message utile dans le journal (code, service, réponse) et nettoyage
// des abonnements devenus inutilisables.
//
// - 404/410 : abonnement expiré ou désinscrit, supprimé aussitôt ;
// - 400/401/403 : refus du service (abonnement invalide, ou créé avec d'autres clés VAPID :
//   il ne sera jamais accepté) ; supprimé après 3 refus consécutifs, pour ne pas perdre un
//   appareil sur un incident ponctuel ;
// - autres (429, 5xx, réseau) : incident passager, simplement signalé.
const MAX_REJECTIONS = 3

const describe = (sub, err) => {
  let host = '?'
  try { host = new URL(sub.endpoint).host } catch { /* adresse illisible */ }
  const body = String(err.body || '').replace(/\s+/g, ' ').trim().slice(0, 200)
  return `code ${err.statusCode ?? '—'}, ${host}${body ? ` : ${body}` : ''}`
}

export const handlePushFailure = async (PushSubscription, sub, err) => {
  const status = err.statusCode
  if (status === 404 || status === 410) {
    console.log(`[WebPush] Nettoyage souscription obsolète (${describe(sub, err)})`)
    await PushSubscription.deleteOne({ _id: sub._id })
    return
  }
  if ([400, 401, 403].includes(status)) {
    const updated = await PushSubscription.findOneAndUpdate({ _id: sub._id }, { $inc: { failureCount: 1 } }, { new: true })
    const count = updated?.failureCount ?? 1
    if (count >= MAX_REJECTIONS) {
      console.warn(`[WebPush] Abonnement supprimé après ${count} refus (${describe(sub, err)})`)
      await PushSubscription.deleteOne({ _id: sub._id })
    } else {
      console.warn(`[WebPush] Envoi refusé, ${count}/${MAX_REJECTIONS} (${describe(sub, err)})`)
    }
    return
  }
  console.error(`[WebPush] Erreur envoi push (${describe(sub, err)}) : ${err.message}`)
}

// Envoi réussi : les refus précédents ne comptent plus
export const handlePushSuccess = async (PushSubscription, sub) => {
  if (sub.failureCount > 0) await PushSubscription.updateOne({ _id: sub._id }, { $set: { failureCount: 0 } })
}
