/**
 * Vide intégralement les caches PWA / Service Worker / CacheStorage
 * et force le rechargement de la toute dernière version de l'application.
 * Conserve la session utilisateur (stockée dans localStorage).
 */
export async function forceAppRefresh() {
  try {
    // 1. Vider tous les caches de CacheStorage (PWA / Workbox / polices)
    if ('caches' in window) {
      const cacheNames = await window.caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
    }

    // 2. Désenregistrer tous les Service Workers enregistrés
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const reg of registrations) {
        try {
          await reg.unregister()
        } catch (swErr) {
          console.warn('Erreur lors du désenregistrement du service worker:', swErr)
        }
      }
    }

    // 3. Vider sessionStorage temporaire (ne touche pas à localStorage pour préserver la connexion)
    try {
      sessionStorage.clear()
    } catch (e) {}

    // 4. Tenter une requête réseau directe pour index.html avec cache: 'reload'
    try {
      await fetch(window.location.pathname, { cache: 'reload', mode: 'no-cors' })
    } catch (e) {}

  } catch (err) {
    console.error('Erreur lors du nettoyage du cache:', err)
  } finally {
    // 5. Recharger la page avec un paramètre d'horodatage pour contourner le cache HTTP du navigateur
    const url = new URL(window.location.href)
    url.searchParams.set('_v', Date.now().toString())
    window.location.replace(url.toString())
  }
}
