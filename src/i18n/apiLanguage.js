import { currentLocale } from './index.js'

// Le serveur répond (messages d'erreur, confirmations) dans la langue indiquée par l'en-tête
// X-Lang. Plutôt que de l'ajouter à chacun des appels fetch de l'application, on l'ajoute ici à
// toutes les requêtes vers l'API du même serveur (chemins relatifs « /api/… »).
const nativeFetch = window.fetch.bind(window)

window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const headers = new Headers(init?.headers)
    if (!headers.has('X-Lang')) headers.set('X-Lang', currentLocale.value)
    return nativeFetch(input, { ...init, headers })
  }
  return nativeFetch(input, init)
}
