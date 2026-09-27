// Connexion avec Google activée par le Super Admin ? Un seul appel par chargement de l'application.
let statusPromise = null
export const isGoogleAuthEnabled = () => {
  statusPromise ||= fetch('/api/auth/google/status').then(r => r.json()).then(d => Boolean(d.enabled)).catch(() => false)
  return statusPromise
}
