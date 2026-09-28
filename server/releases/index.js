import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Nouveautés de chaque version (releases.json, la plus récente en premier). Une entrée est ajoutée
// pour toute évolution visible ; au démarrage, une version pas encore traitée est proposée au
// Super Admin, qui la publie aux utilisateurs ou l'écarte (voir checkPendingRelease, index.js).

const RELEASES_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'releases.json')

let cache = null
export const listReleases = () => {
  if (!cache) {
    try {
      const data = JSON.parse(readFileSync(RELEASES_PATH, 'utf8'))
      cache = Array.isArray(data) ? data.filter(r => r && typeof r.version === 'string' && r.notes?.fr?.length) : []
    } catch (err) {
      console.error('[Releases] Lecture de releases.json impossible :', err.message)
      cache = []
    }
  }
  return cache
}

export const latestRelease = () => listReleases()[0] || null

export const releaseByVersion = (version) => listReleases().find(r => r.version === version) || null

// État d'une version pour le Super Admin : publiée, écartée, ou à publier
export const releaseState = (config, release) => {
  if (!release) return 'none'
  if (config?.releasePublishedVersion === release.version) return 'published'
  if (config?.releaseDismissedVersion === release.version) return 'dismissed'
  return 'pending'
}

// La version doit être signalée au Super Admin : à publier, et pas encore signalée
export const needsProposal = (config, release) =>
  releaseState(config, release) === 'pending' && config?.releaseProposedVersion !== release.version

// Nouveautés dans une langue, en français à défaut
export const notesFor = (release, lang) => {
  if (!release) return []
  const notes = release.notes?.[lang]
  return Array.isArray(notes) && notes.length > 0 ? notes : release.notes.fr
}
