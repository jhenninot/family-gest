// Utilitaires de gestion des notifications Web Push pour FamilyGest

/**
 * Convertit une clé VAPID base64 URL-safe en Uint8Array pour le PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Vérifie si le navigateur supporte les notifications Web Push et les Service Workers
 */
export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Retourne l'état actuel de la permission ('default', 'granted', 'denied')
 */
export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

/**
 * Récupère la clé publique VAPID depuis le serveur
 */
export async function getVapidPublicKey() {
  try {
    const res = await fetch('/api/push/vapid-public-key')
    if (!res.ok) throw new Error('Impossible de récupérer la clé VAPID')
    const data = await res.json()
    return data.publicKey
  } catch (err) {
    console.error('[WebPush] Erreur récupération clé VAPID:', err)
    return null
  }
}

export const FG_PUSH_DEVICE_PREF_KEY = 'fg_device_push_pref'
export const FG_PUSH_DEVICE_REMIND_AT_KEY = 'fg_device_push_remind_at'

/**
 * Lit la préférence enregistrée pour cet appareil ('granted', 'remind_later', 'never', null)
 */
export function getDevicePushPref() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(FG_PUSH_DEVICE_PREF_KEY)
}

/**
 * Enregistre la préférence sur cet appareil :
 * - 'granted' : autorisé / activé sur cet appareil
 * - 'remind_later' : pas pour le moment (rappel dans 7 jours)
 * - 'never' : ne jamais recevoir sur cet appareil
 */
export function setDevicePushPref(value) {
  if (typeof window === 'undefined') return
  localStorage.setItem(FG_PUSH_DEVICE_PREF_KEY, value)

  if (value === 'remind_later') {
    const remindAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 jours
    localStorage.setItem(FG_PUSH_DEVICE_REMIND_AT_KEY, remindAt.toString())
  } else {
    localStorage.removeItem(FG_PUSH_DEVICE_REMIND_AT_KEY)
  }
}

/**
 * Vérifie si cet appareil / navigateur possède actuellement un abonnement push actif
 * @returns {Promise<boolean>}
 */
export async function isDeviceSubscribedToPush() {
  if (!isPushSupported()) return false
  if (Notification.permission !== 'granted') return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return Boolean(subscription)
  } catch (err) {
    console.warn('[WebPush] Erreur vérification souscription appareil:', err)
    return false
  }
}

/**
 * Vérifie si l'on doit afficher l'invite de notification à la connexion sur cet appareil
 * @returns {Promise<boolean>}
 */
export async function shouldPromptDeviceForPush() {
  if (!isPushSupported()) return false

  // Si l'utilisateur a explicitement refusé au niveau système du navigateur
  if (Notification.permission === 'denied') return false

  // Vérifier la préférence enregistrée sur cet appareil
  const pref = getDevicePushPref()
  if (pref === 'never') return false

  if (pref === 'remind_later') {
    const remindAt = localStorage.getItem(FG_PUSH_DEVICE_REMIND_AT_KEY)
    if (remindAt && Date.now() < parseInt(remindAt, 10)) {
      return false // Le délai de rappel n'a pas encore expiré
    }
  }

  // Si l'appareil est déjà souscrit, inutile d'afficher l'invite
  const isSubscribed = await isDeviceSubscribedToPush()
  if (isSubscribed) return false

  return true
}

/**
 * Demande la permission et abonne l'appareil aux notifications Web Push
 * @param {string|null} customToken - Token JWT optionnel (utile lors de la première connexion avant mise à jour du store)
 */
export async function subscribeUserToPush(customToken = null) {
  if (!isPushSupported()) {
    console.warn('[WebPush] Les notifications push ne sont pas supportées par ce navigateur.')
    return { success: false, reason: 'unsupported' }
  }

  try {
    // 1. Demande d'autorisation système/navigateur
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log(`[WebPush] Permission refusée ou ignorée : ${permission}`)
      if (permission === 'denied') {
        setDevicePushPref('never')
      }
      return { success: false, reason: permission }
    }

    // 2. Récupération de la clé VAPID
    const publicKey = await getVapidPublicKey()
    if (!publicKey) {
      return { success: false, reason: 'no_vapid_key' }
    }

    // 3. Attendre que le Service Worker soit prêt
    const registration = await navigator.serviceWorker.ready

    // 4. Récupérer ou créer la souscription push
    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey)
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })
    }

    // 5. Enregistrer la souscription sur le backend
    const token = customToken || localStorage.getItem('familygest_token') || localStorage.getItem('token')
    const headers = { 'Content-Type': 'application/json' }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent
      })
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Erreur serveur lors de l\'enregistrement')
    }

    // Mémoriser le choix accordé sur cet appareil
    setDevicePushPref('granted')

    console.log('[WebPush] Appareil abonné avec succès aux notifications !')
    return { success: true, subscription }
  } catch (err) {
    console.error('[WebPush] Erreur lors de l\'abonnement push:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Désabonne l'appareil des notifications Web Push
 */
export async function unsubscribeUserFromPush() {
  if (!isPushSupported()) {
    return { success: true }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()

      const token = localStorage.getItem('familygest_token') || localStorage.getItem('token')
      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({ endpoint })
      })
    }

    // Mémoriser la désactivation sur cet appareil
    setDevicePushPref('never')

    console.log('[WebPush] Appareil désabonné des notifications.')
    return { success: true }
  } catch (err) {
    console.error('[WebPush] Erreur lors du désabonnement push:', err)
    return { success: false, error: err.message }
  }
}
